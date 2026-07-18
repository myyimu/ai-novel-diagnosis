"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	FileSearch,
	RefreshCcw,
	ShieldCheck,
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
						<div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
							<TextStatistics audit={storyAudit} />
							<FindingInspector
								audit={storyAudit}
								projectId={projectId}
								reviewByFindingId={reviewByFindingId}
								reviewLoading={reviewLoading}
								onSaveReview={saveReview}
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

function HealthOverview({ audit, reviewCount }: { audit: StoryAuditResult; reviewCount: number }) {
	const findingCounts = countFindings(audit.findings);
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
				value={`${audit.findings.length}`}
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
}: {
	audit: StoryAuditResult;
	projectId: string;
	reviewByFindingId: Map<string, StoryAuditFindingReview>;
	reviewLoading: boolean;
	onSaveReview: (
		finding: StoryAuditFinding,
		reviewState: StoryAuditFindingReview["reviewState"],
	) => void;
}) {
	const visibleFindings = audit.findings.slice(0, 8);

	return (
		<section className="rounded-md border border-border bg-card p-4 shadow-sm">
			<div className="mb-3">
				<h2 className="text-base font-semibold text-card-foreground">候选 Inspector</h2>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					每条候选保留证据和替代解释；人工判断不会写入 storyAudit 原始结果。
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
					href={`/project/current?id=${encodeURIComponent(projectId)}&chapter=${encodeURIComponent(
						anchor.chapterId,
					)}&anchor=${encodeURIComponent(anchor.anchorId)}`}
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
