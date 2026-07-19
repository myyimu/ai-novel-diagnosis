"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	BarChart3,
	CalendarDays,
	CheckCircle2,
	FileSearch,
	GitBranch,
	RefreshCcw,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import {
	readBookAnalysisJob,
	readStoryAuditFindingReviews,
	upsertStoryAuditFindingReview,
} from "@/lib/workspace-analysis-client";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
	BookAnalysisResult,
	ChapterPosition,
	StoryAuditFindingReview,
	StoryAuditResult,
} from "@/stores/workspace-store";
import type { StoryAuditFinding } from "@ai-novel-diagnosis/ai-core";
import { ProjectAssetTabs } from "./ProjectAssetTabs";

const reviewOptions: Array<{
	state: StoryAuditFindingReview["reviewState"];
	label: string;
}> = [
	{ state: "confirmed", label: "确认问题" },
	{ state: "author_intent", label: "作者意图" },
	{ state: "insufficient_evidence", label: "证据不足" },
	{ state: "false_positive", label: "误报" },
	{ state: "planned", label: "计划处理" },
	{ state: "resolved", label: "已解决" },
];

const topFindingLimit = 3;
const plotHoleCategories = new Set<StoryAuditFinding["category"]>([
	"causal_gap",
	"dropped_goal",
	"unresolved_setup",
	"knowledge_violation",
	"ability_violation",
	"motivation_gap",
	"world_rule_violation",
]);
const wholeBookMissingCategories = new Set<StoryAuditFinding["category"]>([
	"dropped_goal",
	"unresolved_setup",
]);

type StructureTemplate = "none" | "three-act" | "hero-journey" | "story-circle";
type TimelineMode = "narrative" | "story";

const structureTemplates: Array<{
	id: StructureTemplate;
	label: string;
}> = [
	{ id: "none", label: "未选择" },
	{ id: "three-act", label: "三幕" },
	{ id: "hero-journey", label: "英雄之旅" },
	{ id: "story-circle", label: "故事圆环" },
];

export function ProjectHealthPage() {
	const router = useRouter();
	const {
		activeProject,
		activeProjectId,
		projectRevisionSessions,
		projectMethodologyCards,
		providerLabel,
		bookAnalysisResult,
		bookJob,
		setChapterTitle,
		setQuickReviewChapterPosition,
		setQuickReviewDiagnosticFocus,
		setQuickReviewInputKind,
		setQuickReviewMustKeepMechanisms,
		setQuickReviewTargetReaderPleasures,
	} = useWorkspaceHandlers("overview");
	const bookAnalysisCache = useWorkspaceStore((state) => state.bookAnalysisCache);
	const setBookAnalysisResult = useWorkspaceStore((state) => state.setBookAnalysisResult);
	const setBookJob = useWorkspaceStore((state) => state.setBookJob);
	const [reviews, setReviews] = useState<StoryAuditFindingReview[]>([]);
	const [reviewLoading, setReviewLoading] = useState(false);
	const [syncingJob, setSyncingJob] = useState(false);

	const projectId = activeProjectId || activeProject?.id || "default-project";
	const projectAudit = useMemo(
		() =>
			resolveProjectStoryAudit({
				activeProjectBookJobId: activeProject?.bookJobId,
				bookAnalysisResult,
				bookJobId: bookJob?.id,
				bookAnalysisCache,
			}),
		[activeProject?.bookJobId, bookAnalysisCache, bookAnalysisResult, bookJob?.id],
	);
	const storyAudit = projectAudit?.storyAudit ?? null;
	const reviewByFindingId = useMemo(
		() => new Map(reviews.map((review) => [review.findingId, review])),
		[reviews],
	);

	useEffect(() => {
		let cancelled = false;
		setReviewLoading(true);
		readStoryAuditFindingReviews(projectId)
			.then((items) => {
				if (!cancelled) {
					setReviews(items);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setReviews([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setReviewLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [projectId]);

	async function openBoundBookJob() {
		const jobId = activeProject?.bookJobId;
		if (!jobId) {
			router.push("/research/book");
			return;
		}

		setSyncingJob(true);
		try {
			const job = await readBookAnalysisJob(jobId, true);
			setBookJob(job);
			if (job.result) {
				setBookAnalysisResult(job.result);
			}
			toast.success("整书体检已同步", {
				description: job.result?.storyAudit
					? "已加载 storyAudit 结果。"
					: "任务存在，但还没有故事体检结果。",
			});
		} catch (error) {
			toast.error("同步失败", {
				description: error instanceof Error ? error.message : "无法读取整书任务。",
			});
		} finally {
			setSyncingJob(false);
		}
	}

	async function saveReview(
		finding: StoryAuditFinding,
		reviewState: StoryAuditFindingReview["reviewState"],
	) {
		if (!storyAudit) {
			return;
		}

		const review: StoryAuditFindingReview = {
			projectId,
			auditId: storyAudit.auditId,
			findingId: finding.id,
			reviewState,
			updatedAt: new Date().toISOString(),
		};
		setReviews((current) => upsertReview(current, review));
		try {
			const saved = await upsertStoryAuditFindingReview(review);
			setReviews((current) => upsertReview(current, saved));
			toast.success("复核状态已保存");
		} catch (error) {
			toast.error("复核状态未同步", {
				description: error instanceof Error ? error.message : "后端暂时不可用。",
			});
		}
	}

	async function planFindingRevision(finding: StoryAuditFinding) {
		const seed = buildStoryAuditRevisionSeed(finding);
		await saveReview(finding, "planned");
		setQuickReviewInputKind("human-draft");
		setQuickReviewChapterPosition(seed.chapterPosition);
		setQuickReviewDiagnosticFocus(seed.diagnosticFocus);
		setQuickReviewMustKeepMechanisms(seed.mustKeepMechanisms);
		setQuickReviewTargetReaderPleasures(seed.targetReaderPleasures);
		if (seed.chapterTitle) {
			setChapterTitle(seed.chapterTitle);
		}
		toast.success("已加入改稿计划", {
			description: "已把候选证据写入快速诊断上下文，请粘贴真实章节正文后复诊。",
		});
		router.push("/diagnose/quick");
	}

	return (
		<RedesignWorkspaceShell
			active="history"
			providerLabel={providerLabel}
			crumb={
				<>
					我的书籍 / <b className="text-foreground">故事体检</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						返回书籍
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/research/book")}
					>
						导入整本
					</RedesignTopButton>
				</>
			}
		>
			<main className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[820px]:w-[calc(100%_-_24px)] max-[820px]:py-[22px]">
				<section className="mb-5 flex items-start justify-between gap-5 max-[760px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							故事体检
						</h1>
						<p className="max-w-[760px] text-sm leading-6 text-muted-foreground">
							只展示整书任务已经给出的证据、统计和候选问题；人工复核单独保存，不覆盖模型结果。
						</p>
					</div>
					<div className="flex flex-wrap gap-2 max-[760px]:mt-4">
						<Button
							variant="outline"
							onClick={openBoundBookJob}
							disabled={syncingJob}
							className="min-h-10 rounded-md border-border bg-background font-semibold"
						>
							<RefreshCcw className="mr-2 size-4" />
							{syncingJob ? "同步中" : "同步结果"}
						</Button>
						<Button
							onClick={() => router.push("/research/book")}
							className="min-h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
						>
							<FileSearch className="mr-2 size-4" />
							整书分析
						</Button>
					</div>
				</section>

				<ProjectAssetTabs
					active="health"
					revisionCount={projectRevisionSessions.length}
					methodologyCount={projectMethodologyCards.length}
				/>

				{storyAudit ? (
					<div className="mt-4 grid gap-4">
						<HealthOverview audit={storyAudit} reviewCount={reviews.length} />
						<StructureView
							audit={storyAudit}
							projectId={projectId}
							result={projectAudit}
						/>
						<CharacterArcView
							audit={storyAudit}
							projectId={projectId}
							result={projectAudit}
						/>
						<PlotHoleCandidateView audit={storyAudit} projectId={projectId} />
						<div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
							<TextStatistics audit={storyAudit} />
							<FindingInspector
								audit={storyAudit}
								projectId={projectId}
								reviewByFindingId={reviewByFindingId}
								reviewLoading={reviewLoading}
								onSaveReview={saveReview}
								onPlanRevision={planFindingRevision}
							/>
						</div>
					</div>
				) : (
					<EmptyHealthState
						projectName={activeProject?.name || "默认书籍"}
						bookJobId={activeProject?.bookJobId}
						onOpenBook={() => router.push("/research/book")}
						onSync={openBoundBookJob}
						syncing={syncingJob}
					/>
				)}
			</main>
		</RedesignWorkspaceShell>
	);
}

function PlotHoleCandidateView({
	audit,
	projectId,
}: {
	audit: StoryAuditResult;
	projectId: string;
}) {
	const candidates = getDisplayFindings(audit)
		.filter((finding) => plotHoleCategories.has(finding.category))
		.slice(0, topFindingLimit);

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-4 max-[760px]:block">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
						<AlertTriangle className="size-4" />
						剧情漏洞候选
					</div>
					<h2 className="mt-1 text-base font-semibold text-card-foreground">
						默认只推顶部 {topFindingLimit} 个待确认问题
					</h2>
					<p className="mt-1 max-w-[780px] text-xs leading-5 text-muted-foreground">
						只输出候选、证据和替代解释；这里不会自动宣判作品“有硬伤”。
					</p>
				</div>
				<span className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground max-[760px]:mt-3">
					{audit.coverage.isPartial
						? "partial：隐藏全书缺失结论"
						: `${candidates.length}/${topFindingLimit} 已展示`}
				</span>
			</div>

			{candidates.length ? (
				<div className="grid gap-3 md:grid-cols-3">
					{candidates.map((finding) => {
						const evidenceStatus = evidenceQualificationLabel(finding);
						return (
							<article
								key={finding.id}
								className="rounded-md border border-border bg-background p-3"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
										{findingCategoryLabel(finding.category)}
									</span>
									<span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
										{finding.severity}
									</span>
								</div>
								<h3 className="mt-2 text-sm font-semibold leading-5">
									{finding.title}
								</h3>
								<p className="mt-1 text-xs leading-5 text-muted-foreground">
									{finding.claim}
								</p>
								<div className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs leading-5">
									<div className="font-semibold text-card-foreground">
										{evidenceStatus.label}
									</div>
									<div className="text-muted-foreground">
										{evidenceStatus.detail}
									</div>
								</div>
								<EvidenceList evidence={finding.evidence} projectId={projectId} />
								{finding.alternativeExplanations.length ? (
									<div className="mt-3 rounded-md bg-muted p-3">
										<div className="text-xs font-semibold text-muted-foreground">
											替代解释
										</div>
										<ul className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
											{finding.alternativeExplanations
												.slice(0, 2)
												.map((item) => (
													<li key={item}>{item}</li>
												))}
										</ul>
									</div>
								) : null}
							</article>
						);
					})}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border bg-background px-4 py-10 text-center">
					<div className="text-sm font-semibold">暂无可展示的剧情漏洞候选</div>
					<p className="mt-1 text-xs text-muted-foreground">
						partial 输入不会展示 dropped_goal 或 unresolved_setup 这类全书缺失结论。
					</p>
				</div>
			)}
		</section>
	);
}

function CharacterArcView({
	audit,
	projectId,
	result,
}: {
	audit: StoryAuditResult;
	projectId: string;
	result: BookAnalysisResult | null;
}) {
	const sceneById = useMemo(
		() => new Map(audit.scenes.map((scene) => [scene.id, scene])),
		[audit.scenes],
	);
	const characterRows = useMemo(
		() => buildCharacterStateRows(audit, sceneById),
		[audit, sceneById],
	);
	const visibleRows = characterRows.slice(0, 5);
	const omittedStateCount = audit.characterStates.filter(
		(state) => !state.evidence.length || !sceneById.has(state.sceneId),
	).length;

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-4 max-[760px]:block">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
						<UserRound className="size-4" />
						人物视图
					</div>
					<h2 className="mt-1 text-base font-semibold text-card-foreground">
						人物状态账本与弧光变化点
					</h2>
					<p className="mt-1 max-w-[780px] text-xs leading-5 text-muted-foreground">
						按场景追踪目标距离、能动性、信念、关系、代价和选择；不合成为人物成长总分。
					</p>
				</div>
				<div className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground max-[760px]:mt-3">
					{audit.characterStates.length} 条状态 · {omittedStateCount} 条缺证据未展示
				</div>
			</div>

			<div className="mb-4 rounded-md border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
				合理成长、伪装、情境变化和不可靠叙述先作为可能解释保留；只有证据充分的 finding
				才进入人工复核，不在这里自动判错。
			</div>

			{visibleRows.length ? (
				<div className="grid gap-4">
					{visibleRows.map((row) => (
						<div
							key={row.characterId}
							className="rounded-md border border-border bg-background p-3"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h3 className="text-sm font-semibold text-foreground">
										{resolveCharacterLabel(row.characterId, result)}
									</h3>
									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										展示 {row.points.length} 个有 scene/chapter/evidence
										的变化点。
									</p>
								</div>
								<span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
									{row.points.length} 个变化点
								</span>
							</div>
							<div className="mt-3 grid gap-3 md:grid-cols-2">
								{row.points.map(({ state, scene }) => (
									<div
										key={`${state.characterId}-${state.sceneId}-${state.evidence[0]?.anchorId}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<a
												href={evidenceHref(
													projectId,
													scene.chapterId,
													state.evidence[0]?.anchorId,
												)}
												className="text-xs font-semibold text-primary hover:underline"
											>
												第 {chapterLabel(scene.chapterId)} 章 ·{" "}
												{scene.title}
											</a>
											<span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
												{goalDistanceLabel(state.goalDistance)}
											</span>
										</div>
										<div className="mt-3 grid gap-2">
											<ArcSignal
												label="能动性"
												value={agencyLabel(state.agency)}
											>
												<div className="h-2 overflow-hidden rounded-full bg-muted">
													<div
														className="h-full rounded-full bg-primary"
														style={{
															width: `${agencyPercent(state.agency)}%`,
														}}
													/>
												</div>
											</ArcSignal>
											{state.beliefState ? (
												<ArcSignal label="信念" value={state.beliefState} />
											) : null}
											{state.cost ? (
												<ArcSignal label="代价" value={state.cost} />
											) : null}
											{state.irreversibleChoice ? (
												<ArcSignal
													label="选择"
													value={state.irreversibleChoice}
												/>
											) : null}
											{state.relationshipStates.length ? (
												<ArcSignal
													label="关系变化"
													value={state.relationshipStates
														.slice(0, 2)
														.map((relationship) =>
															relationshipStateLabel(
																relationship,
																result,
															),
														)
														.join("；")}
												/>
											) : null}
										</div>
										<EvidenceList
											evidence={state.evidence.slice(0, 2)}
											projectId={projectId}
										/>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border bg-background px-4 py-10 text-center">
					<div className="text-sm font-semibold">暂无可展示的人物状态变化点</div>
					<p className="mt-1 text-xs text-muted-foreground">
						需要同时具备 scene、chapter 和 evidence，才会进入人物弧光视图。
					</p>
				</div>
			)}
		</section>
	);
}

function ArcSignal({
	label,
	value,
	children,
}: {
	label: string;
	value: string;
	children?: ReactNode;
}) {
	return (
		<div>
			<div className="flex items-center justify-between gap-2 text-xs leading-5">
				<span className="font-semibold text-muted-foreground">{label}</span>
				<span className="text-right text-card-foreground">{value}</span>
			</div>
			{children ? <div className="mt-1">{children}</div> : null}
		</div>
	);
}

function StructureView({
	audit,
	projectId,
	result,
}: {
	audit: StoryAuditResult;
	projectId: string;
	result: BookAnalysisResult | null;
}) {
	const [timelineMode, setTimelineMode] = useState<TimelineMode>("narrative");
	const [template, setTemplate] = useState<StructureTemplate>("none");
	const sceneById = useMemo(
		() => new Map(audit.scenes.map((scene) => [scene.id, scene])),
		[audit.scenes],
	);
	const eventById = useMemo(
		() => new Map(audit.events.map((event) => [event.id, event])),
		[audit.events],
	);
	const timelineEvents = useMemo(
		() => buildTimelineEvents(audit, sceneById, timelineMode),
		[audit, sceneById, timelineMode],
	);
	const setupPayoffEdges = audit.views.setupPayoffEdges.slice(0, 6);
	const legacyForeshadowing = result?.writingSupport?.foreshadowingLedger ?? [];

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-4 max-[760px]:block">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
						<GitBranch className="size-4" />
						结构视图
					</div>
					<h2 className="mt-1 text-base font-semibold text-card-foreground">
						剧情线、时间与伏笔回收
					</h2>
					<p className="mt-1 max-w-[780px] text-xs leading-5 text-muted-foreground">
						复用整书体检事实层和现有拆书资产；结构模板只用于对照，不输出质量分。
					</p>
				</div>
				<div className="flex flex-wrap gap-2 max-[760px]:mt-3">
					{structureTemplates.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setTemplate(option.id)}
							className={`min-h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
								template === option.id
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			<div className="mb-4 rounded-md border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
				{template === "none"
					? "未选择模板：仅展示事实结构，不评分。"
					: `${structureTemplateLabel(template)}：仅作节拍对照，不按模板偏离扣分。`}
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
				<div className="grid gap-4">
					<PlotlineMatrix
						audit={audit}
						projectId={projectId}
						result={result}
						sceneById={sceneById}
					/>
					<SetupPayoffMap
						audit={audit}
						projectId={projectId}
						result={result}
						setupPayoffEdges={setupPayoffEdges}
						legacyForeshadowing={legacyForeshadowing}
					/>
				</div>
				<TimelinePanel
					audit={audit}
					eventById={eventById}
					mode={timelineMode}
					projectId={projectId}
					timelineEvents={timelineEvents}
					onModeChange={setTimelineMode}
				/>
			</div>
		</section>
	);
}

function PlotlineMatrix({
	audit,
	projectId,
	result,
	sceneById,
}: {
	audit: StoryAuditResult;
	projectId: string;
	result: BookAnalysisResult | null;
	sceneById: Map<string, StoryAuditResult["scenes"][number]>;
}) {
	const rows = audit.views.plotlineMatrix.slice(0, 6);

	return (
		<div className="rounded-md border border-border bg-background p-3">
			<div className="mb-3">
				<h3 className="text-sm font-semibold text-foreground">章节 × 剧情线矩阵</h3>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					每格来自场景证据；没有场景证据时只保留旧拆书摘要作为参考。
				</p>
			</div>
			{rows.length ? (
				<div className="grid gap-2">
					{rows.map((row, index) => {
						const scenes = row.sceneIds
							.map((sceneId) => sceneById.get(sceneId))
							.filter((scene): scene is StoryAuditResult["scenes"][number] =>
								Boolean(scene),
							);
						const evidence = scenes.flatMap((scene) => scene.evidence).slice(0, 2);
						return (
							<div
								key={row.plotlineId}
								className="rounded-md border border-border bg-card p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-sm font-semibold text-card-foreground">
										{resolvePlotlineLabel(row.plotlineId, result, index)}
									</div>
									<span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
										{plotlineStatusLabel(row.status)}
									</span>
								</div>
								<div className="mt-2 flex flex-wrap gap-1.5">
									{scenes.length ? (
										scenes.slice(0, 8).map((scene) => (
											<a
												key={scene.id}
												href={evidenceHref(
													projectId,
													scene.chapterId,
													scene.evidence[0]?.anchorId,
												)}
												className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
											>
												第 {chapterLabel(scene.chapterId)} 章 ·{" "}
												{scene.title}
											</a>
										))
									) : (
										<span className="text-xs text-muted-foreground">
											暂无可定位场景
										</span>
									)}
								</div>
								<EvidenceList evidence={evidence} projectId={projectId} />
							</div>
						);
					})}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
					暂无 storyAudit 剧情线矩阵；下方仍可查看旧拆书结构资产。
				</div>
			)}
			{result?.plotlines?.length ? (
				<div className="mt-3 grid gap-2">
					<div className="text-xs font-semibold text-muted-foreground">
						旧拆书剧情线参考
					</div>
					{result.plotlines.slice(0, 3).map((line) => (
						<div
							key={line.name}
							className="rounded-md bg-muted px-3 py-2 text-xs leading-5"
						>
							<span className="font-semibold text-foreground">{line.name}</span>
							<span className="text-muted-foreground">：{line.start}</span>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

function TimelinePanel({
	audit,
	eventById,
	mode,
	projectId,
	timelineEvents,
	onModeChange,
}: {
	audit: StoryAuditResult;
	eventById: Map<string, StoryAuditResult["events"][number]>;
	mode: TimelineMode;
	projectId: string;
	timelineEvents: StoryAuditResult["events"];
	onModeChange: (mode: TimelineMode) => void;
}) {
	return (
		<div className="rounded-md border border-border bg-background p-3">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
						<CalendarDays className="size-4" />
						时间切换
					</div>
					<h3 className="mt-1 text-sm font-semibold text-foreground">
						{mode === "narrative" ? "叙事顺序" : "故事内时间"}
					</h3>
				</div>
				<div className="flex rounded-md border border-border bg-card p-1">
					{[
						{ id: "narrative", label: "叙事顺序" },
						{ id: "story", label: "故事内时间" },
					].map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => onModeChange(item.id as TimelineMode)}
							className={`min-h-7 rounded px-2 text-xs font-semibold ${
								mode === item.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground"
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
			<p className="mb-3 text-xs leading-5 text-muted-foreground">
				故事内时间只按已抽取的明确时间线索排序；unknown 不会被强制日期化。
			</p>
			{timelineEvents.length ? (
				<div className="grid gap-2">
					{timelineEvents.slice(0, 8).map((event) => (
						<div key={event.id} className="rounded-md border border-border bg-card p-3">
							<div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
								<span>
									{event.absoluteTime || event.relativeTimeText || "unknown"}
								</span>
								<span>·</span>
								<span>{event.sceneId}</span>
							</div>
							<div className="mt-1 text-sm font-semibold text-card-foreground">
								{event.summary}
							</div>
							<EvidenceList
								evidence={event.evidence.slice(0, 2)}
								projectId={projectId}
							/>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
					暂无可排序事件。
				</div>
			)}
			{audit.views.temporalGraph.relationEdges.length ? (
				<div className="mt-3 grid gap-2">
					<div className="text-xs font-semibold text-muted-foreground">时间关系证据</div>
					{audit.views.temporalGraph.relationEdges.slice(0, 4).map((edge) => {
						const source = eventById.get(edge.sourceEventId);
						const target = eventById.get(edge.targetEventId);
						const evidence = resolveTemporalEdgeEvidence(edge, source, target);
						return (
							<div
								key={`${edge.sourceEventId}-${edge.targetEventId}-${edge.ruleId}`}
								className="rounded-md bg-muted p-3 text-xs leading-5"
							>
								<div className="font-semibold text-foreground">
									{source?.summary || edge.sourceEventId}{" "}
									{temporalRelationLabel(edge.relation)}{" "}
									{target?.summary || edge.targetEventId}
								</div>
								<EvidenceList
									evidence={evidence.slice(0, 2)}
									projectId={projectId}
								/>
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

function SetupPayoffMap({
	audit,
	projectId,
	result,
	setupPayoffEdges,
	legacyForeshadowing,
}: {
	audit: StoryAuditResult;
	projectId: string;
	result: BookAnalysisResult | null;
	setupPayoffEdges: StoryAuditResult["views"]["setupPayoffEdges"];
	legacyForeshadowing: NonNullable<BookAnalysisResult["writingSupport"]>["foreshadowingLedger"];
}) {
	const factById = new Map(audit.facts.map((fact) => [fact.id, fact]));
	const legacyRows = legacyForeshadowing.slice(0, Math.max(0, 4 - setupPayoffEdges.length));

	return (
		<div className="rounded-md border border-border bg-background p-3">
			<div className="mb-3">
				<h3 className="text-sm font-semibold text-foreground">伏笔—回收边</h3>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					setup、reminder、payoff、unknown 都按证据边展示；partial 不宣判全书未回收。
				</p>
			</div>
			{setupPayoffEdges.length || legacyRows.length ? (
				<div className="grid gap-2">
					{setupPayoffEdges.map((edge) => {
						const setup = factById.get(edge.setupFactId);
						const payoff = edge.payoffFactId
							? factById.get(edge.payoffFactId)
							: undefined;
						const evidence = [...(setup?.evidence ?? []), ...(payoff?.evidence ?? [])];
						return (
							<div
								key={`${edge.setupFactId}-${edge.payoffFactId ?? edge.status}`}
								className="rounded-md border border-border bg-card p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-sm font-semibold text-card-foreground">
										{setup?.object || setup?.predicate || edge.setupFactId}
									</div>
									<span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
										{setupPayoffStatusLabel(edge.status)}
									</span>
								</div>
								{payoff ? (
									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										回收：{payoff.object || payoff.predicate}
									</p>
								) : null}
								<EvidenceList
									evidence={evidence.slice(0, 3)}
									projectId={projectId}
								/>
							</div>
						);
					})}
					{legacyRows.map((item) => {
						const evidence = resolveLegacyForeshadowingEvidence(
							item.setupChapter,
							result,
						);
						return (
							<div
								key={`${item.setupChapter}-${item.setup}`}
								className="rounded-md border border-dashed border-border bg-card p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-sm font-semibold text-card-foreground">
										{item.setup}
									</div>
									<span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
										章节级参考 · {item.status}
									</span>
								</div>
								<p className="mt-1 text-xs leading-5 text-muted-foreground">
									回收：{item.payoff || "待确认"}；风险：{item.risk || "未标注"}
								</p>
								<EvidenceList evidence={evidence} projectId={projectId} />
							</div>
						);
					})}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
					暂无伏笔回收边。
				</div>
			)}
		</div>
	);
}

function HealthOverview({ audit, reviewCount }: { audit: StoryAuditResult; reviewCount: number }) {
	const displayFindings = getDisplayFindings(audit);
	const findingCounts = countFindings(displayFindings);
	return (
		<section className="grid gap-3 md:grid-cols-4">
			<MetricTile
				icon={<ShieldCheck className="size-4" />}
				label="覆盖章节"
				value={`${audit.coverage.analyzedChapterIds.length}/${audit.coverage.totalChapterCount}`}
				detail={audit.coverage.isPartial ? "partial 结果" : "完整结果"}
			/>
			<MetricTile
				icon={<BarChart3 className="size-4" />}
				label="证据校验"
				value={`${Math.round(audit.coverage.evidenceValidationRate * 100)}%`}
				detail={`${audit.scenes.length} 个场景`}
			/>
			<MetricTile
				icon={<AlertTriangle className="size-4" />}
				label="候选问题"
				value={`${displayFindings.length}`}
				detail={`${findingCounts.verified} 已复核 / ${findingCounts.candidate} 候选`}
			/>
			<MetricTile
				icon={<CheckCircle2 className="size-4" />}
				label="人工复核"
				value={`${reviewCount}`}
				detail="独立保存"
			/>
		</section>
	);
}

function TextStatistics({ audit }: { audit: StoryAuditResult }) {
	const bookDialogue =
		audit.metrics.dialogue.find((item) => item.scopeId === "book") ?? audit.metrics.dialogue[0];

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-card-foreground">文本统计</h2>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						对话占比是确定性统计，只用于观察叙述形态。
					</p>
				</div>
				<span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
					非评分
				</span>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				<StatBlock
					label="对话字数占比"
					value={
						bookDialogue
							? `${Math.round(bookDialogue.dialogueCharacterRatio * 100)}%`
							: "暂无"
					}
				/>
				<StatBlock
					label="对话回合"
					value={bookDialogue ? `${bookDialogue.dialogueTurnCount}` : "暂无"}
				/>
				<StatBlock
					label="解析提示"
					value={bookDialogue ? `${bookDialogue.parserWarnings.length}` : "暂无"}
				/>
			</div>
			<div className="mt-4 overflow-hidden rounded-md border border-border">
				<div className="grid grid-cols-[1fr_96px_96px] bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
					<span>范围</span>
					<span>对话占比</span>
					<span>回合</span>
				</div>
				{audit.metrics.dialogue.slice(0, 8).map((metric) => (
					<div
						key={metric.scopeId}
						className="grid grid-cols-[1fr_96px_96px] border-t border-border px-3 py-2 text-sm"
					>
						<span className="truncate">{metric.scopeId}</span>
						<span>{Math.round(metric.dialogueCharacterRatio * 100)}%</span>
						<span>{metric.dialogueTurnCount}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function FindingInspector({
	audit,
	projectId,
	reviewByFindingId,
	reviewLoading,
	onSaveReview,
	onPlanRevision,
}: {
	audit: StoryAuditResult;
	projectId: string;
	reviewByFindingId: Map<string, StoryAuditFindingReview>;
	reviewLoading: boolean;
	onSaveReview: (
		finding: StoryAuditFinding,
		reviewState: StoryAuditFindingReview["reviewState"],
	) => void;
	onPlanRevision: (finding: StoryAuditFinding) => void;
}) {
	const visibleFindings = getDisplayFindings(audit).slice(0, topFindingLimit);

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-3">
				<h2 className="text-base font-semibold text-card-foreground">候选 Inspector</h2>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					默认只展示顶部 {topFindingLimit}{" "}
					条；每条候选保留证据和替代解释，人工判断不会写入 storyAudit 原始结果。
				</p>
			</div>
			{visibleFindings.length ? (
				<div className="grid gap-3">
					{visibleFindings.map((finding) => {
						const review = reviewByFindingId.get(finding.id);
						return (
							<article
								key={finding.id}
								className="rounded-md border border-border bg-background p-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
												{finding.category}
											</span>
											<span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
												{finding.status}
											</span>
											{review ? (
												<span className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
													{reviewStateLabel(review.reviewState)}
												</span>
											) : null}
										</div>
										<h3 className="mt-2 text-sm font-semibold leading-5">
											{finding.title}
										</h3>
										<p className="mt-1 text-sm leading-6 text-muted-foreground">
											{finding.claim}
										</p>
									</div>
								</div>
								<EvidenceList evidence={finding.evidence} projectId={projectId} />
								{finding.alternativeExplanations.length ? (
									<div className="mt-3 rounded-md bg-muted p-3">
										<div className="text-xs font-semibold text-muted-foreground">
											替代解释
										</div>
										<ul className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
											{finding.alternativeExplanations
												.slice(0, 3)
												.map((item) => (
													<li key={item}>{item}</li>
												))}
										</ul>
									</div>
								) : null}
								<div className="mt-3 flex flex-wrap gap-2">
									<Button
										type="button"
										onClick={() => onPlanRevision(finding)}
										disabled={reviewLoading}
										className="min-h-8 rounded-md px-2.5 text-xs"
									>
										<GitBranch className="mr-1.5 size-3.5" />
										加入改稿计划
									</Button>
									{reviewOptions.map((option) => (
										<Button
											key={option.state}
											type="button"
											variant={
												review?.reviewState === option.state
													? "default"
													: "outline"
											}
											disabled={reviewLoading}
											onClick={() => onSaveReview(finding, option.state)}
											className="min-h-8 rounded-md px-2.5 text-xs"
										>
											{option.label}
										</Button>
									))}
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<div className="rounded-md border border-dashed border-border bg-background px-4 py-10 text-center">
					<div className="text-sm font-semibold">暂无候选 finding</div>
					<p className="mt-1 text-xs text-muted-foreground">
						partial 结果不会输出全书缺失结论；完整体检后才会出现候选。
					</p>
				</div>
			)}
		</section>
	);
}

function EvidenceList({
	evidence,
	projectId,
}: {
	evidence: StoryAuditFinding["evidence"];
	projectId: string;
}) {
	return (
		<div className="mt-3 grid gap-2">
			{evidence.slice(0, 3).map((anchor) => (
				<a
					key={anchor.anchorId}
					href={evidenceHref(projectId, anchor.chapterId, anchor.anchorId)}
					className="block rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 text-card-foreground hover:bg-muted"
				>
					<span className="font-semibold">
						第 {anchor.chapterOrder} 章 · {anchor.anchorId}
					</span>
					<span className="mt-1 block text-muted-foreground">“{anchor.quote}”</span>
				</a>
			))}
		</div>
	);
}

function EmptyHealthState({
	projectName,
	bookJobId,
	onOpenBook,
	onSync,
	syncing,
}: {
	projectName: string;
	bookJobId?: string;
	onOpenBook: () => void;
	onSync: () => void;
	syncing: boolean;
}) {
	return (
		<section className="mt-4 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
			<div className="mx-auto grid size-12 place-items-center rounded-md bg-muted text-muted-foreground">
				<FileSearch className="size-6" />
			</div>
			<h2 className="mt-4 text-lg font-semibold text-card-foreground">
				{projectName} 还没有可展示的故事体检
			</h2>
			<p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-muted-foreground">
				先从“我的作品”导入整本 TXT，完成整书分析后，storyAudit 会嵌入现有整书任务结果。
			</p>
			<div className="mt-5 flex justify-center gap-2">
				<Button
					variant="outline"
					onClick={onSync}
					disabled={!bookJobId || syncing}
					className="min-h-10 rounded-md"
				>
					<RefreshCcw className="mr-2 size-4" />
					{syncing ? "同步中" : "同步已有任务"}
				</Button>
				<Button onClick={onOpenBook} className="min-h-10 rounded-md">
					<FileSearch className="mr-2 size-4" />
					导入整本
				</Button>
			</div>
		</section>
	);
}

function MetricTile({
	icon,
	label,
	value,
	detail,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
				{icon}
				{label}
			</div>
			<div className="mt-2 text-2xl font-semibold text-card-foreground">{value}</div>
			<div className="mt-1 text-xs text-muted-foreground">{detail}</div>
		</div>
	);
}

function StatBlock({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-border bg-background p-3">
			<div className="text-xs font-semibold text-muted-foreground">{label}</div>
			<div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
		</div>
	);
}

function getDisplayFindings(audit: StoryAuditResult) {
	const findings = audit.coverage.isPartial
		? audit.findings.filter((finding) => !wholeBookMissingCategories.has(finding.category))
		: audit.findings;

	return [...findings].sort((left, right) => {
		const leftScore = severityWeight(left.severity) * left.confidence;
		const rightScore = severityWeight(right.severity) * right.confidence;
		return rightScore - leftScore;
	});
}

function evidenceQualificationLabel(finding: StoryAuditFinding) {
	const hasTextEvidence = finding.evidence.some((anchor) => anchor.source === "text");
	const hasCanonEvidence = finding.evidence.some((anchor) => anchor.source === "author-canon");
	const hasDoubleEvidence = countDistinctEvidencePositions(finding.evidence) >= 2;
	const qualifies = hasDoubleEvidence || (hasTextEvidence && hasCanonEvidence);
	if (finding.severity === "high" || finding.severity === "critical") {
		return qualifies
			? {
					label: "高优证据达标",
					detail: hasDoubleEvidence
						? "至少两个不同位置的证据。"
						: "正文证据加作者 canon。",
				}
			: {
					label: "证据不足，需人工复核",
					detail: "高优候选需要双证据，或正文证据加作者 canon；当前不得自动确认。",
				};
	}

	return {
		label: qualifies ? "证据较完整" : "候选证据",
		detail: qualifies ? "可进入优先复核。" : "当前只作为候选提示，不是定论。",
	};
}

function countDistinctEvidencePositions(evidence: StoryAuditFinding["evidence"]) {
	return new Set(
		evidence.map(
			(anchor) =>
				`${anchor.source}:${anchor.chapterId}:${anchor.startOffset}:${anchor.endOffset}`,
		),
	).size;
}

export function buildStoryAuditRevisionSeed(finding: StoryAuditFinding): {
	chapterTitle: string;
	chapterPosition: ChapterPosition;
	diagnosticFocus: string;
	mustKeepMechanisms: string;
	targetReaderPleasures: string;
} {
	const firstEvidence = finding.evidence[0];
	const evidenceQuotes = finding.evidence
		.slice(0, 3)
		.map((anchor) => `第${anchor.chapterOrder}章「${anchor.quote}」`);
	const alternatives = finding.alternativeExplanations.slice(0, 2);
	const chapterTitle = firstEvidence
		? `第${firstEvidence.chapterOrder}章 · ${finding.title}`
		: finding.title;

	return {
		chapterTitle: truncatePlainText(chapterTitle, 60),
		chapterPosition: inferChapterPosition(firstEvidence?.chapterOrder),
		diagnosticFocus: truncatePlainText(`整书体检候选：${finding.title}。${finding.claim}`, 100),
		mustKeepMechanisms: [
			finding.fixAction ? `优先验证修改动作：${finding.fixAction}` : "",
			evidenceQuotes.length ? `证据短引文：${evidenceQuotes.join("；")}` : "",
			alternatives.length ? `保留替代解释：${alternatives.join("；")}` : "",
		]
			.filter(Boolean)
			.join("；"),
		targetReaderPleasures:
			finding.readerImpact ||
			"降低读者理解成本；修正前先确认这不是作者有意保留的误导或悬念。",
	};
}

function inferChapterPosition(chapterOrder: number | undefined): ChapterPosition {
	if (!chapterOrder || chapterOrder < 1) {
		return "unknown";
	}
	if (chapterOrder === 1) {
		return "first";
	}
	if (chapterOrder <= 3) {
		return "early";
	}
	return "middle";
}

function truncatePlainText(value: string, maxLength: number) {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function findingCategoryLabel(category: StoryAuditFinding["category"]) {
	const labels = {
		timeline_conflict: "时间冲突",
		location_conflict: "地点冲突",
		fact_contradiction: "事实矛盾",
		knowledge_violation: "信息越权",
		ability_violation: "能力越界",
		motivation_gap: "动机缺口",
		relationship_jump: "关系跳变",
		world_rule_violation: "规则破坏",
		causal_gap: "因果缺口",
		dropped_goal: "目标断线",
		unresolved_setup: "线索未回收",
		dialogue_attribution: "对白归属",
		structure_signal: "结构信号",
	} satisfies Record<typeof category, string>;
	return labels[category];
}

function severityWeight(severity: StoryAuditFinding["severity"]) {
	const weights = {
		critical: 4,
		high: 3,
		medium: 2,
		low: 1,
	} satisfies Record<typeof severity, number>;
	return weights[severity];
}

function buildCharacterStateRows(
	audit: StoryAuditResult,
	sceneById: Map<string, StoryAuditResult["scenes"][number]>,
) {
	const rows = new Map<
		string,
		Array<{
			state: StoryAuditResult["characterStates"][number];
			scene: StoryAuditResult["scenes"][number];
		}>
	>();

	for (const state of audit.characterStates) {
		const scene = sceneById.get(state.sceneId);
		if (!scene || !state.evidence.length) {
			continue;
		}

		const current = rows.get(state.characterId) ?? [];
		current.push({ state, scene });
		rows.set(state.characterId, current);
	}

	return [...rows.entries()]
		.map(([characterId, points]) => ({
			characterId,
			points: points.sort(
				(left, right) =>
					left.scene.narrativeOrder - right.scene.narrativeOrder ||
					left.scene.orderInChapter - right.scene.orderInChapter,
			),
		}))
		.sort((left, right) => right.points.length - left.points.length);
}

function resolveCharacterLabel(characterId: string, result: BookAnalysisResult | null) {
	const graphNode = result?.relationships?.nodes.find((node) => node.id === characterId);
	if (graphNode?.label) {
		return graphNode.label;
	}

	const character = result?.characters?.find((item) =>
		[item.sourceName, ...(item.names ?? [])].includes(characterId),
	);
	if (character?.sourceName) {
		return character.sourceName;
	}

	return characterId;
}

function goalDistanceLabel(
	goalDistance: StoryAuditResult["characterStates"][number]["goalDistance"],
) {
	const labels = {
		closer: "目标更近",
		neutral: "目标持平",
		farther: "目标更远",
		unknown: "目标未知",
	} satisfies Record<typeof goalDistance, string>;
	return labels[goalDistance];
}

function agencyLabel(agency: number) {
	if (agency >= 0.67) {
		return "主动性较强";
	}
	if (agency >= 0.34) {
		return "主动性中等";
	}
	return "主动性较弱";
}

function agencyPercent(agency: number) {
	return Math.round(Math.min(1, Math.max(0, agency)) * 100);
}

function relationshipStateLabel(
	relationship: StoryAuditResult["characterStates"][number]["relationshipStates"][number],
	result: BookAnalysisResult | null,
) {
	const target = resolveCharacterLabel(relationship.targetCharacterId, result);
	const parts = [
		relationship.trust === undefined ? null : `信任 ${relationship.trust}`,
		relationship.intimacy === undefined ? null : `亲密 ${relationship.intimacy}`,
		relationship.power === undefined ? null : `权力 ${relationship.power}`,
	].filter((item): item is string => Boolean(item));

	return parts.length ? `${target}（${parts.join(" / ")}）` : target;
}

function buildTimelineEvents(
	audit: StoryAuditResult,
	sceneById: Map<string, StoryAuditResult["scenes"][number]>,
	mode: TimelineMode,
) {
	const sourceEvents = audit.views.temporalGraph.eventIds.length
		? audit.views.temporalGraph.eventIds
				.map((eventId) => audit.events.find((event) => event.id === eventId))
				.filter((event): event is StoryAuditResult["events"][number] => Boolean(event))
		: audit.events;
	const scoredEvents = sourceEvents.map((event, index) => ({
		event,
		index,
		narrativeOrder: sceneById.get(event.sceneId)?.narrativeOrder ?? index,
		storyOrderKey: event.absoluteTime || event.relativeTimeText || "unknown",
	}));

	return scoredEvents
		.sort((left, right) => {
			if (mode === "narrative") {
				return left.narrativeOrder - right.narrativeOrder || left.index - right.index;
			}

			if (left.storyOrderKey === "unknown" && right.storyOrderKey !== "unknown") {
				return 1;
			}
			if (left.storyOrderKey !== "unknown" && right.storyOrderKey === "unknown") {
				return -1;
			}
			return (
				left.storyOrderKey.localeCompare(right.storyOrderKey) || left.index - right.index
			);
		})
		.map((item) => item.event);
}

function resolveTemporalEdgeEvidence(
	edge: StoryAuditResult["views"]["temporalGraph"]["relationEdges"][number],
	source?: StoryAuditResult["events"][number],
	target?: StoryAuditResult["events"][number],
) {
	const sourceEvidence = source?.evidence ?? [];
	const targetEvidence = target?.evidence ?? [];
	if (!edge.evidenceAnchorIds.length) {
		return [...sourceEvidence, ...targetEvidence];
	}

	const evidenceById = new Map(
		[...sourceEvidence, ...targetEvidence].map((anchor) => [anchor.anchorId, anchor]),
	);
	return edge.evidenceAnchorIds
		.map((anchorId) => evidenceById.get(anchorId))
		.filter((anchor): anchor is StoryAuditFinding["evidence"][number] => Boolean(anchor));
}

function resolveLegacyForeshadowingEvidence(
	setupChapter: number,
	result: BookAnalysisResult | null,
) {
	const chapter =
		result?.mapReduce?.chunkEvidenceIndex?.find((item) => item.order === setupChapter) ??
		result?.mapReduce?.chapterMaps.find((item) => item.order === setupChapter);
	const anchor = chapter?.sourceAnchors?.[0];
	if (!chapter || !anchor) {
		return [];
	}

	return [
		{
			anchorId: anchor.anchorId,
			chapterId: chapter.chapterId,
			chapterOrder: chapter.order,
			quote: anchor.quote,
			startOffset: anchor.startOffset,
			endOffset: anchor.endOffset,
			source: "text" as const,
		},
	];
}

function evidenceHref(projectId: string, chapterId: string, anchorId?: string) {
	const params = new URLSearchParams({
		id: projectId,
		chapter: chapterId,
	});
	if (anchorId) {
		params.set("anchor", anchorId);
	}

	return `/project/current?${params.toString()}`;
}

function resolvePlotlineLabel(
	plotlineId: string,
	result: BookAnalysisResult | null,
	index: number,
) {
	return result?.plotlines?.[index]?.name || plotlineId;
}

function chapterLabel(chapterId: string) {
	const match = chapterId.match(/(\d+)$/);
	return match?.[1] ?? chapterId;
}

function structureTemplateLabel(template: Exclude<StructureTemplate, "none">) {
	const label = structureTemplates.find((item) => item.id === template)?.label;
	return label || template;
}

function plotlineStatusLabel(
	status: StoryAuditResult["views"]["plotlineMatrix"][number]["status"],
) {
	const labels = {
		active: "推进中",
		quiet: "静默",
		resolved: "已回收",
		unknown: "待确认",
	} satisfies Record<typeof status, string>;
	return labels[status];
}

function setupPayoffStatusLabel(
	status: StoryAuditResult["views"]["setupPayoffEdges"][number]["status"],
) {
	const labels = {
		open: "打开",
		reminded: "提醒",
		paid: "已回收",
		abandoned: "可能断线",
		unknown: "待确认",
	} satisfies Record<typeof status, string>;
	return labels[status];
}

function temporalRelationLabel(
	relation: StoryAuditResult["events"][number]["relations"][number]["relation"],
) {
	const labels = {
		before: "早于",
		after: "晚于",
		overlaps: "重叠",
		during: "处于",
		same_time: "同时",
		unknown: "关系未知",
	} satisfies Record<typeof relation, string>;
	return labels[relation];
}

function resolveProjectStoryAudit(input: {
	activeProjectBookJobId?: string;
	bookAnalysisResult: BookAnalysisResult | null;
	bookJobId?: string;
	bookAnalysisCache: Array<{
		job: { id: string };
		result: BookAnalysisResult | null;
	}>;
}) {
	const targetJobId = input.activeProjectBookJobId || input.bookJobId;
	if (targetJobId) {
		const cached = input.bookAnalysisCache.find(
			(entry) => entry.job.id === targetJobId && entry.result?.storyAudit,
		);
		if (cached?.result?.storyAudit) {
			return cached.result;
		}
		if (input.bookJobId === targetJobId && input.bookAnalysisResult?.storyAudit) {
			return input.bookAnalysisResult;
		}
	}

	return input.bookAnalysisResult?.storyAudit ? input.bookAnalysisResult : null;
}

function countFindings(findings: StoryAuditFinding[]) {
	return findings.reduce(
		(total, finding) => ({
			candidate: total.candidate + (finding.status === "candidate" ? 1 : 0),
			verified: total.verified + (finding.status === "verified" ? 1 : 0),
		}),
		{ candidate: 0, verified: 0 },
	);
}

function upsertReview(reviews: StoryAuditFindingReview[], review: StoryAuditFindingReview) {
	return [
		review,
		...reviews.filter(
			(item) =>
				!(
					item.projectId === review.projectId &&
					item.auditId === review.auditId &&
					item.findingId === review.findingId
				),
		),
	];
}

function reviewStateLabel(state: StoryAuditFindingReview["reviewState"]) {
	return reviewOptions.find((option) => option.state === state)?.label || state;
}
