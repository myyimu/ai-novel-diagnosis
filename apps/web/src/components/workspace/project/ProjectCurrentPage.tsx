"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { diagnosisExampleOptions } from "@/lib/diagnosis-examples";
import { hashString } from "@/lib/workspace-cache";
import type { QuickReviewResult } from "@/stores/workspace-store";
import * as textQuoteAnchor from "dom-anchor-text-quote";
import { BookOpen, Download, FileText, FolderOpen, Lightbulb, Plus } from "lucide-react";

type QuickReviewIssue = NonNullable<QuickReviewResult["issues"]>[number];
type ChapterTab = "annotation" | "diagnosis" | "rewrite" | "retest";
type IssueState = "pending" | "accepted" | "ignored" | "disputed" | "resolved";
type IssueFilter = "all" | "must" | "accepted" | "resolved" | "disputed";
type PreviewDecision = "accepted" | "rejected";

export function ProjectCurrentPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const {
		activeProject,
		activeProjectId,
		projectRevisionSessions,
		projectMethodologyCards,
		exportProjectMarkdown,
		providerLabel,
		quickReviewResult,
		chapterTitle,
		chapterText,
		loading,
		runQuickExperience,
	} = useWorkspaceHandlers("overview");

	const chapterId = searchParams.get("chapter");
	if (chapterId) {
		const requestedProjectId =
			searchParams.get("id") || activeProjectId || activeProject?.id || "default-project";
		const routeExample = diagnosisExampleOptions.find((example) => {
			const exampleChapterId = `chapter-${hashString(
				[
					requestedProjectId,
					example.chapterTitle.trim() || "第一章",
					example.chapterText.trim(),
				].join("|"),
			)}`;
			return exampleChapterId === chapterId;
		});
		const resolvedChapterTitle = chapterTitle.trim() || routeExample?.chapterTitle || "第一章";
		const resolvedChapterText = chapterText.trim()
			? chapterText
			: routeExample?.chapterText || "";
		const resolvedQuickReviewResult = quickReviewResult ?? routeExample?.result ?? null;

		return (
			<ProjectChapterWorkspace
				projectName={activeProject?.name || "默认书籍"}
				chapterTitle={resolvedChapterTitle}
				chapterText={resolvedChapterText}
				result={resolvedQuickReviewResult}
				loading={loading === "quick"}
				revisionCount={projectRevisionSessions.length}
				methodologyCount={projectMethodologyCards.length}
				onBack={() => router.push("/project/current")}
				onRerun={() => runQuickExperience(true)}
			/>
		);
	}

	const revisionCount = projectRevisionSessions.length;
	const methodologyCount = projectMethodologyCards.length;
	const totalAssets = revisionCount + methodologyCount;
	const completion = Math.min(100, totalAssets ? 42 + totalAssets * 12 : 18);

	return (
		<RedesignWorkspaceShell
			active="history"
			providerLabel={providerLabel}
			crumb={
				<>
					项目 / <b className="text-[#1f2329]">书籍列表</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton
						variant="ghost"
						onClick={() => router.push("/diagnose/quick")}
					>
						快速诊断
					</RedesignTopButton>
					<RedesignTopButton onClick={() => router.push("/research/book")}>
						导入整本
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/diagnose/quick")}
					>
						新建诊断
					</RedesignTopButton>
				</>
			}
		>
			<div className="mx-auto w-[min(1380px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[780px]:w-[calc(100%_-_24px)] max-[780px]:py-[22px]">
				<section className="mb-[22px] flex items-end justify-between gap-6 max-[780px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							诊断工作台
						</h1>
						<p className="m-0 max-w-[740px] text-sm leading-6 text-[#69707d]">
							所有内容按“书籍 - 章节 - 诊断 - 修改 -
							复诊”保存，快速诊断也会进入同一套项目上下文。
						</p>
					</div>
					<div className="flex flex-wrap gap-2 max-[780px]:mt-4">
						<Button
							variant="outline"
							onClick={() => router.push("/diagnose/quick")}
							className="rounded-[9px] border-[#d8dbe0] bg-white font-bold"
						>
							<Plus className="mr-2 size-4" />
							快速诊断一章
						</Button>
						<Button
							onClick={() => router.push("/research/book")}
							className="rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
						>
							<Plus className="mr-2 size-4" />
							导入整本书籍
						</Button>
					</div>
				</section>

				<section className="mb-4 rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
					<div className="grid gap-3 p-5 md:grid-cols-2">
						<EntryCard
							title="快速诊断"
							description="粘贴一章正文，先得到最大流失点、正文证据和可复制修改指令。"
							onClick={() => router.push("/diagnose/quick")}
						/>
						<EntryCard
							title="整书拆解"
							description="上传多章 TXT，先检查章节拆分，再创建完整小说目录。"
							onClick={() => router.push("/research/book")}
						/>
					</div>
				</section>

				<section className="grid items-start gap-5 [grid-template-columns:minmax(0,1fr)_340px] max-[1100px]:grid-cols-1">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						<article className="relative overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white p-[18px] shadow-[0_4px_18px_rgba(22,27,34,.06)] transition hover:-translate-y-0.5 hover:border-[#ffc3aa] hover:shadow-[0_12px_28px_rgba(255,90,31,.09)]">
							<div className="absolute inset-y-0 left-0 w-1 bg-[#ff5a1f]" />
							<div className="flex items-start justify-between gap-3">
								<div className="grid h-9 w-10 place-items-center rounded-[9px] bg-[#fff2ec] text-[#ff5a1f]">
									<FolderOpen className="size-5" />
								</div>
								<span className="rounded-full bg-[#fff7e6] px-2 py-1 text-[11px] font-bold text-[#8c5009]">
									{totalAssets ? `${totalAssets} 个资产` : "空书籍"}
								</span>
							</div>
							<h3 className="mb-1 mt-3 text-[15px] font-bold">
								{activeProject?.name || "默认书籍"}
							</h3>
							<p className="min-h-10 text-xs leading-5 text-[#69707d]">
								查看和管理书籍的章节诊断、修改方案和修改效果。
							</p>
							<div className="mt-4 h-[7px] overflow-hidden rounded-full bg-[#edf0f3]">
								<div
									className="h-full rounded-full bg-[#ff5a1f]"
									style={{ width: `${completion}%` }}
								/>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-2">
								<MiniStat label="章节" value="1" />
								<MiniStat label="修改效果" value={String(revisionCount)} />
								<MiniStat label="方法论" value={String(methodologyCount)} />
							</div>
							<div className="mt-4 flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => router.push("/project/revisions")}
									className="rounded-[9px] border-[#d8dbe0]"
								>
									<FileText className="mr-2 size-4" />
									修改效果
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => router.push("/project/methodology")}
									className="rounded-[9px] border-[#d8dbe0]"
								>
									<Lightbulb className="mr-2 size-4" />
									方法论
								</Button>
							</div>
						</article>

						<button
							type="button"
							onClick={() => router.push("/research/book")}
							className="flex min-h-[228px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#d4d8de] bg-[#fbfcfd] p-6 text-center shadow-[0_4px_18px_rgba(22,27,34,.06)] transition hover:border-[#ffc3aa] hover:bg-white"
						>
							<div className="mb-2.5 grid size-[46px] place-items-center rounded-[14px] bg-[#fff2ec] text-[#ff5a1f]">
								<BookOpen className="size-5" />
							</div>
							<strong>导入一本完整书籍</strong>
							<p className="mt-1 text-xs leading-5 text-[#69707d]">
								上传多章 TXT，自动检查章节拆分并建立小说目录。
							</p>
						</button>
					</div>

					<aside className="sticky top-[84px] grid gap-3.5 max-[1100px]:static">
						<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-[18px] shadow-[0_4px_18px_rgba(22,27,34,.06)]">
							<div className="mb-3 flex items-start justify-between gap-3">
								<div>
									<h3 className="text-sm font-bold">书籍资产</h3>
									<p className="mt-1 text-xs leading-5 text-[#69707d]">
										导出修改效果、方法论和当前书籍信息。
									</p>
								</div>
								<Download className="size-5 text-[#ff5a1f]" />
							</div>
							<div className="grid gap-2">
								<AssetRow title="修改效果" value={`${revisionCount} 条记录`} />
								<AssetRow title="方法论库" value={`${methodologyCount} 张卡片`} />
							</div>
							<Button
								className="mt-4 w-full rounded-[9px] border-[#d8dbe0]"
								variant="outline"
								onClick={exportProjectMarkdown}
								disabled={!totalAssets}
							>
								<Download className="mr-2 size-4" />
								导出书籍资产
							</Button>
						</div>

						<div className="rounded-[11px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-[13px] text-xs leading-5 text-[#7f4a0c]">
							入口页只展示书籍和资产概览。要复刻你给的快速诊断交互，请进入“快速诊断”。
						</div>
					</aside>
				</section>
			</div>
		</RedesignWorkspaceShell>
	);
}

function ProjectChapterWorkspace({
	projectName,
	chapterTitle,
	chapterText,
	result,
	loading,
	revisionCount,
	methodologyCount,
	onBack,
	onRerun,
}: {
	projectName: string;
	chapterTitle: string;
	chapterText: string;
	result: QuickReviewResult | null;
	loading: boolean;
	revisionCount: number;
	methodologyCount: number;
	onBack: () => void;
	onRerun: () => void;
}) {
	const issues = Array.isArray(result?.issues)
		? result.issues.filter((issue) => issue?.title)
		: [];
	const fixes = Array.isArray(result?.actionableFixes)
		? result.actionableFixes.filter(Boolean)
		: [];
	const score = typeof result?.quickScore === "number" ? `${result.quickScore}/10` : "待诊断";
	const rewritePrompt = result?.nextPrompt?.prompt || buildFallbackPrompt(result, fixes);
	const statusLabel = result ? "诊断完成" : "待诊断";
	const [chapterTab, setChapterTab] = useState<ChapterTab>("annotation");
	const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
	const [issueStates, setIssueStates] = useState<Record<string, IssueState>>({});
	const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
	const [treeOpen, setTreeOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [rewritePreviewOpen, setRewritePreviewOpen] = useState(false);
	const [previewDecisions, setPreviewDecisions] = useState<Record<string, PreviewDecision>>({});
	const getIssueState = useCallback(
		(issueId: string): IssueState => issueStates[issueId] ?? "pending",
		[issueStates],
	);
	const acceptedCount = issues.filter((issue) => getIssueState(issue.id) === "accepted").length;
	const resolvedCount = issues.filter((issue) => getIssueState(issue.id) === "resolved").length;
	const disputedCount = issues.filter((issue) => getIssueState(issue.id) === "disputed").length;
	const pendingCount = issues.filter((issue) => getIssueState(issue.id) === "pending").length;
	const acceptedIssues = issues.filter((issue) => getIssueState(issue.id) === "accepted");
	const previewAcceptedCount = acceptedIssues.filter(
		(issue) => previewDecisions[issue.id] !== "rejected",
	).length;
	const visibleIssueEntries = issues
		.map((issue, index) => ({ issue, index }))
		.filter(({ issue }) => matchesIssueFilter(issue, getIssueState(issue.id), issueFilter));
	const workflow = buildChapterWorkflow({
		hasResult: Boolean(result),
		acceptedCount,
		resolvedCount,
	});
	const activeIssueId =
		selectedIssueId && issues.some((issue) => issue.id === selectedIssueId)
			? selectedIssueId
			: issues[0]?.id;
	const annotatedParagraphs = buildAnnotatedParagraphs(chapterText, issues);
	const workspaceGridRef = useRef<HTMLElement | null>(null);
	const contentScrollRef = useRef<HTMLDivElement | null>(null);
	const pendingTextScrollIssueIdRef = useRef<string | null>(null);
	const [connectorPath, setConnectorPath] = useState<string | null>(null);
	const activeIssue = issues.find((issue) => issue.id === activeIssueId);
	const scrollIssueTextIntoView = useCallback((issueId: string) => {
		const scroller = contentScrollRef.current;
		const grid = workspaceGridRef.current;
		if (!scroller || !grid) {
			return false;
		}

		const anchor = grid.querySelector<HTMLElement>(
			`[data-annotation-anchor="${CSS.escape(issueId)}"]`,
		);
		if (!anchor) {
			return false;
		}

		const scrollerRect = scroller.getBoundingClientRect();
		const anchorRect = anchor.getBoundingClientRect();
		const targetTop =
			scroller.scrollTop +
			anchorRect.top -
			scrollerRect.top -
			Math.min(120, scrollerRect.height * 0.2);
		scroller.scrollTo({
			top: Math.max(0, targetTop),
			behavior: "smooth",
		});
		return true;
	}, []);
	const updateConnector = useCallback(() => {
		const grid = workspaceGridRef.current;
		if (!grid || !activeIssueId || window.innerWidth <= 920) {
			setConnectorPath(null);
			return;
		}

		const anchor = grid.querySelector<HTMLElement>(
			`[data-annotation-anchor="${CSS.escape(activeIssueId)}"]`,
		);
		const card = grid.querySelector<HTMLElement>(
			`[data-issue-card="${CSS.escape(activeIssueId)}"]`,
		);
		if (!anchor || !card) {
			setConnectorPath(null);
			return;
		}

		const gridRect = grid.getBoundingClientRect();
		const anchorRect = anchor.getBoundingClientRect();
		const cardRect = card.getBoundingClientRect();
		const startX = anchorRect.right - gridRect.left + 7;
		const startY = anchorRect.top - gridRect.top + anchorRect.height / 2;
		const endX = cardRect.left - gridRect.left - 7;
		const endY = cardRect.top - gridRect.top + 30;

		if (
			startY < 45 ||
			startY > gridRect.height ||
			endY < 45 ||
			endY > gridRect.height ||
			endX <= startX
		) {
			setConnectorPath(null);
			return;
		}

		const delta = Math.max(50, Math.min(145, (endX - startX) * 0.42));
		setConnectorPath(
			`M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}`,
		);
	}, [activeIssueId]);
	function updateIssueState(issueId: string, state: IssueState) {
		setIssueStates((current) => {
			const currentState = current[issueId] ?? "pending";
			const nextState = currentState === state ? "pending" : state;
			if (
				nextState === "accepted" &&
				Object.entries(current).filter(
					([id, value]) => id !== issueId && value === "accepted",
				).length >= 3
			) {
				return current;
			}
			return { ...current, [issueId]: nextState };
		});
		setSelectedIssueId(issueId);
		if (state === "accepted") {
			setIssueFilter("all");
		}
	}

	function selectIssueFromCard(issueId: string) {
		pendingTextScrollIssueIdRef.current = issueId;
		setChapterTab("annotation");
		setSelectedIssueId(issueId);
	}

	function openRewritePreview() {
		if (!acceptedIssues.length) {
			setChapterTab("annotation");
			setCommentsOpen(true);
			return;
		}
		setPreviewDecisions(
			Object.fromEntries(acceptedIssues.map((issue) => [issue.id, "accepted"])),
		);
		setRewritePreviewOpen(true);
	}

	function applyRewritePreview() {
		const selectedIds = new Set(
			acceptedIssues
				.filter((issue) => previewDecisions[issue.id] !== "rejected")
				.map((issue) => issue.id),
		);
		if (!selectedIds.size) {
			return;
		}
		setIssueStates((current) => {
			const next = { ...current };
			selectedIds.forEach((issueId) => {
				next[issueId] = "resolved";
			});
			return next;
		});
		setRewritePreviewOpen(false);
		setChapterTab("retest");
		setIssueFilter("resolved");
		setCommentsOpen(false);
	}

	function handlePrimaryChapterAction() {
		if (!result) {
			onRerun();
			return;
		}
		if (resolvedCount > 0) {
			setChapterTab("retest");
			return;
		}
		if (acceptedCount > 0) {
			openRewritePreview();
			return;
		}
		setChapterTab("annotation");
		setCommentsOpen(true);
	}

	useEffect(() => {
		let frame = 0;
		const requestConnector = () => {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(updateConnector);
		};

		requestConnector();
		const grid = workspaceGridRef.current;
		grid?.addEventListener("scroll", requestConnector, true);
		window.addEventListener("resize", requestConnector);

		return () => {
			window.cancelAnimationFrame(frame);
			grid?.removeEventListener("scroll", requestConnector, true);
			window.removeEventListener("resize", requestConnector);
		};
	}, [updateConnector, annotatedParagraphs.length, issues.length]);

	useEffect(() => {
		const issueId = pendingTextScrollIssueIdRef.current;
		if (!issueId || chapterTab !== "annotation" || issueId !== activeIssueId) {
			return;
		}

		let attempts = 0;
		let frame = 0;
		const tryScroll = () => {
			attempts += 1;
			if (scrollIssueTextIntoView(issueId) || attempts >= 3) {
				pendingTextScrollIssueIdRef.current = null;
				window.requestAnimationFrame(updateConnector);
				return;
			}
			frame = window.requestAnimationFrame(tryScroll);
		};

		frame = window.requestAnimationFrame(tryScroll);
		return () => window.cancelAnimationFrame(frame);
	}, [activeIssueId, chapterTab, scrollIssueTextIntoView, updateConnector]);

	return (
		<div className="grid h-screen grid-rows-[62px_minmax(0,1fr)] overflow-hidden bg-[#f5f6f8] text-[#20242b]">
			<header className="sticky top-0 z-50 flex h-[62px] items-center justify-between gap-[18px] border-b border-[#e4e7eb] bg-white/95 px-[22px] backdrop-blur">
				<div className="flex min-w-[220px] items-center gap-2.5">
					<button
						type="button"
						onClick={() => setTreeOpen((open) => !open)}
						className="hidden min-h-[30px] rounded-lg border border-[#d4d8de] bg-white px-2 text-[11px] font-bold max-lg:inline-flex"
					>
						☰
					</button>
					<div className="grid size-[35px] place-items-center rounded-[10px] bg-gradient-to-br from-[#ff7b3f] to-[#ff4f12] text-sm font-black text-white shadow-[0_7px_18px_rgba(255,90,31,.22)]">
						诊
					</div>
					<div>
						<strong className="block text-sm leading-tight">AI 网文诊断台</strong>
						<span className="mt-0.5 block text-[11px] text-[#6f7782]">
							书籍诊断工作区
						</span>
					</div>
				</div>
				<div className="min-w-0 flex-1 text-center">
					<strong className="block truncate text-[13px]">{projectName}</strong>
					<span className="block text-[11px] text-[#6f7782]">每章一张独立诊断页</span>
				</div>
				<div className="flex min-w-[220px] items-center justify-end gap-2 max-lg:min-w-0">
					<button
						type="button"
						onClick={onBack}
						className="min-h-9 rounded-[9px] border border-transparent bg-transparent px-[13px] text-sm font-bold text-[#6f7782] transition hover:border-[#bfc4cb] hover:bg-[#fafafa] max-lg:hidden"
					>
						退出工作区
					</button>
					<button
						type="button"
						onClick={onBack}
						className="min-h-9 rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-[13px] text-sm font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.16)] transition hover:bg-[#e64b13] disabled:opacity-60"
					>
						＋ 新增书籍
					</button>
					<button
						type="button"
						onClick={() => setCommentsOpen((open) => !open)}
						className="hidden min-h-[30px] rounded-lg border border-[#d4d8de] bg-white px-2 text-[11px] font-bold max-lg:inline-flex"
					>
						意见
					</button>
				</div>
			</header>

			<section
				ref={workspaceGridRef}
				className="relative grid min-h-0 grid-cols-[250px_minmax(560px,1fr)_390px] bg-[#f6f7f9] max-[1180px]:grid-cols-[220px_minmax(520px,1fr)_345px] max-lg:block max-lg:h-auto"
			>
				{treeOpen || commentsOpen ? (
					<button
						type="button"
						aria-label="关闭侧栏"
						onClick={() => {
							setTreeOpen(false);
							setCommentsOpen(false);
						}}
						className="fixed inset-x-0 bottom-0 top-[62px] z-30 hidden bg-[rgba(24,30,38,.28)] max-lg:block"
					/>
				) : null}
				<aside
					className={`flex min-h-0 flex-col border-r border-[#e4e7eb] bg-white max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:top-[62px] max-lg:z-40 max-lg:w-[min(330px,88vw)] max-lg:shadow-[0_14px_38px_rgba(28,34,42,.18)] max-lg:transition-transform ${
						treeOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-[103%]"
					}`}
				>
					<div className="flex h-[52px] items-center justify-between border-b border-[#e6e8eb] px-3">
						<strong className="text-xs">小说目录</strong>
						<span className="text-[10px] text-[#69707d]">1 章</span>
					</div>
					<div className="min-h-0 flex-1 overflow-auto p-2.5 pb-6">
						<button
							type="button"
							onClick={() => setTreeOpen(false)}
							className="flex min-h-9 w-full items-center gap-2 rounded-lg bg-[#fff2ec] px-2 text-left text-[11px] font-bold text-[#c94413]"
						>
							<span className="w-[18px] text-center text-[#9299a3]">▣</span>
							<span className="min-w-0 flex-1 truncate">小说概览</span>
						</button>
						<div className="mx-2 mb-1 mt-3 text-[9px] font-black uppercase tracking-[.08em] text-[#989fa8]">
							章节诊断页
						</div>
						<button
							type="button"
							onClick={() => setTreeOpen(false)}
							className="flex min-h-9 w-full items-center gap-2 rounded-lg bg-[#fff2ec] px-2 pl-6 text-left text-[11px] font-bold text-[#c94413]"
						>
							<span className="w-[18px] text-center text-[#9299a3]">1</span>
							<span className="min-w-0 flex-1 truncate">{chapterTitle}</span>
							<span className="size-2 rounded-full bg-[#168a5b]" />
						</button>
						<div className="mx-2 mb-1 mt-3 text-[9px] font-black uppercase tracking-[.08em] text-[#989fa8]">
							修改资产
						</div>
						<TreeAssetRow label="本轮修改计划" value={acceptedCount} />
						<TreeAssetRow label="修改效果" value={resolvedCount || revisionCount} />
						<TreeAssetRow label="方法论卡片" value={methodologyCount} />
					</div>
					<div className="grid grid-cols-3 gap-1 border-t border-[#e6e8eb] px-2.5 py-2 text-[9px] text-[#6f7782]">
						<span className="inline-flex items-center gap-1">
							<i className="size-2 rounded-full bg-[#ef9809]" />
							未诊断
						</span>
						<span className="inline-flex items-center gap-1">
							<i className="size-2 rounded-full bg-[#16885b]" />
							诊断完成
						</span>
						<span className="inline-flex items-center gap-1">
							<i className="size-2 rounded-full bg-[#3970e8]" />
							待复诊
						</span>
					</div>
					<div className="grid gap-1.5 border-t border-[#e6e8eb] p-2.5">
						<button
							type="button"
							className="min-h-9 rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-3 text-xs font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.16)]"
						>
							＋ 新增章节
						</button>
						<button
							type="button"
							onClick={onBack}
							className="min-h-9 rounded-[9px] border border-[#d4d8de] bg-white px-3 text-xs font-bold text-[#20242b]"
						>
							返回书籍列表
						</button>
					</div>
				</aside>

				<main className="flex min-h-0 min-w-0 flex-col bg-[#f6f7f9]">
					<div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#e4e7eb] bg-white/95 px-[17px]">
						<div className="flex min-w-0 items-center gap-1.5 text-[10px] text-[#6f7782]">
							<span className="truncate">{projectName}</span>
							<span>/</span>
							<span className="truncate">{chapterTitle}</span>
							<span>/</span>
							<strong className="truncate text-[#20242b]">正文批注</strong>
						</div>
						<div className="flex items-center gap-2">
							<span className="hidden items-center gap-1.5 text-[9px] text-[#6f7782] md:inline-flex">
								<i className="size-[7px] rounded-full bg-[#16885b]" />
								已自动保存
							</span>
							<button
								type="button"
								className="min-h-[30px] rounded-lg border border-[#d4d8de] bg-white px-2.5 text-[11px] font-bold text-[#20242b]"
							>
								版本 1
							</button>
							<button
								type="button"
								onClick={onRerun}
								disabled={loading}
								className="min-h-[30px] rounded-lg border border-[#ff5a1f] bg-[#ff5a1f] px-2.5 text-[11px] font-bold text-white disabled:opacity-60"
							>
								{loading ? "分析中..." : result ? "再次分析" : "开始诊断"}
							</button>
						</div>
					</div>

					<div
						ref={contentScrollRef}
						className="min-h-0 flex-1 overflow-auto px-[28px] py-[14px] pb-[44px] max-[1180px]:px-[18px] max-lg:px-3"
					>
						<div className="mx-auto w-[min(1040px,100%)]">
							<nav className="sticky top-0 z-10 mb-2 flex items-center gap-1 overflow-x-auto rounded-[11px] border border-[#e8ebef] bg-white/95 p-1 shadow-[0_6px_18px_rgba(20,25,35,.045)] backdrop-blur">
								{[
									{ id: "annotation", label: "正文批注", count: issues.length },
									{ id: "diagnosis", label: "诊断总览", count: result ? 1 : 0 },
									{ id: "rewrite", label: "修改方案", count: acceptedCount },
									{ id: "retest", label: "修改效果", count: resolvedCount },
								].map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setChapterTab(tab.id as ChapterTab)}
										className={`min-h-8 rounded-[9px] px-3 text-xs font-bold ${
											chapterTab === tab.id
												? "bg-[#fff2ec] text-[#c94413] shadow-[inset_0_0_0_1px_rgba(255,90,31,.12)]"
												: "text-[#69707d] hover:bg-[#f5f6f8]"
										}`}
									>
										{tab.label}
										<span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#69707d]">
											{tab.count}
										</span>
									</button>
								))}
							</nav>

							<section className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e6e8eb] bg-white px-3 py-2 shadow-[0_4px_16px_rgba(28,34,42,.05)]">
								<div className="flex min-w-[220px] flex-[1_1_220px] flex-wrap items-center gap-2">
									{["诊断", "改稿", "复诊", "完成"].map((label, index) => (
										<div key={label} className="flex items-center gap-2">
											{index ? (
												<span className="h-px w-5 bg-[#d8dbe0]" />
											) : null}
											<span
												className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
													index < workflow.stage
														? "border-[#c9e7d9] bg-[#eaf8f2] text-[#14764f]"
														: index === workflow.stage
															? "border-[#ffd1bd] bg-[#fff2ec] text-[#c94413]"
															: "border-[#e6e8eb] bg-[#fbfcfd] text-[#69707d]"
												}`}
											>
												<i className="grid size-[18px] place-items-center rounded-full bg-white text-[9px] not-italic">
													{index < workflow.stage ? "✓" : index + 1}
												</i>
												{label}
											</span>
										</div>
									))}
								</div>
								<div className="min-w-[160px] flex-[1_1_180px]">
									<strong className="block text-[10px]">{workflow.title}</strong>
									<span className="mt-0.5 block text-[9px] leading-4 text-[#69707d]">
										{workflow.description}
									</span>
								</div>
								<div className="flex flex-[1_1_260px] flex-wrap items-center justify-end gap-2">
									<Button
										onClick={handlePrimaryChapterAction}
										className="min-h-9 rounded-[9px] bg-[#ff5a1f] px-4 font-bold text-white hover:bg-[#e84b13]"
									>
										{workflow.action}
									</Button>
									<Button
										variant="outline"
										className="min-h-9 rounded-[9px] border-[#d8dbe0] px-4"
									>
										编辑正文
									</Button>
									<Button
										variant="outline"
										className="min-h-9 rounded-[9px] border-[#d8dbe0] px-4"
									>
										替换正文
									</Button>
								</div>
							</section>

							{chapterTab === "annotation" ? (
								<article className="mx-auto min-h-[calc(100vh-138px)] w-[min(860px,100%)] rounded-[16px] border border-[#e0e4e8] bg-white px-[50px] py-8 pb-14 shadow-[0_10px_28px_rgba(24,30,38,.065)] max-[1180px]:px-9 max-[620px]:px-5">
									<header className="mb-5 flex items-start justify-between gap-4 border-b border-[#e6e8eb] pb-4">
										<div>
											<h1 className="text-[22px] font-bold leading-snug tracking-normal">
												{chapterTitle}
											</h1>
											<div className="mt-2 flex flex-wrap gap-3 text-[9px] text-[#6f7782]">
												<span>来源：快速诊断</span>
												<span>{chapterText.trim().length} 字</span>
												<span>1 个版本</span>
												<span className="rounded-full bg-[#f0f2f5] px-1.5 py-0.5">
													原始正文
												</span>
												<span>{statusLabel}</span>
											</div>
										</div>
										<span
											className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
												result
													? "border-[#c9e7d9] bg-[#eaf8f2] text-[#14764f]"
													: "bg-[#fff7e6] text-[#955208]"
											}`}
										>
											{statusLabel}
										</span>
									</header>
									<div className="font-serif text-[16px] leading-[1.92] text-[#313741]">
										{annotatedParagraphs.length
											? annotatedParagraphs.map((item, index) => (
													<AnnotatedParagraph
														key={`${index}-${item.markers.map((marker) => marker.issue.id).join("-") || "plain"}`}
														annotation={item}
														activeIssueId={activeIssueId}
														onFocusIssue={setSelectedIssueId}
													/>
												))
											: "暂无正文。"}
									</div>
								</article>
							) : null}

							{chapterTab === "diagnosis" ? (
								<DiagnosisOverviewPanel
									result={result}
									issues={issues}
									acceptedCount={acceptedCount}
									disputedCount={disputedCount}
									pendingCount={pendingCount}
								/>
							) : null}

							{chapterTab === "rewrite" ? (
								<RewritePlanPanel
									issues={issues}
									getIssueState={getIssueState}
									rewritePrompt={rewritePrompt}
								/>
							) : null}

							{chapterTab === "retest" ? (
								<RetestPanel
									chapterTitle={chapterTitle}
									resolvedCount={resolvedCount}
									revisionCount={revisionCount}
								/>
							) : null}
						</div>
					</div>
				</main>

				<aside
					className={`flex min-h-0 flex-col border-l border-[#e4e7eb] bg-white max-lg:fixed max-lg:bottom-0 max-lg:right-0 max-lg:top-[62px] max-lg:z-40 max-lg:w-[min(330px,88vw)] max-lg:shadow-[0_14px_38px_rgba(28,34,42,.18)] max-lg:transition-transform ${
						commentsOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-[103%]"
					}`}
				>
					<div className="flex h-12 items-center justify-between border-b border-[#e6e8eb] px-3">
						<strong className="text-xs">诊断意见</strong>
						<span className="text-[10px] text-[#69707d]">{issues.length}</span>
					</div>
					<div className="flex flex-wrap gap-1 border-b border-[#e6e8eb] bg-[#fafbfc] p-2">
						{[
							{ id: "all", label: "全部" },
							{ id: "must", label: "必须先改" },
							{ id: "accepted", label: "已加入计划" },
							{ id: "resolved", label: "已应用" },
							{ id: "disputed", label: "待人工判断" },
						].map((filter) => (
							<button
								key={filter.id}
								type="button"
								onClick={() => setIssueFilter(filter.id as IssueFilter)}
								className={`rounded-full border px-2 py-1 text-[9px] ${
									issueFilter === filter.id
										? "border-[#ffd0bd] bg-[#fff2ec] font-bold text-[#c74413]"
										: "border-[#e6e8eb] bg-white text-[#6f7782]"
								}`}
							>
								{filter.label}
							</button>
						))}
					</div>
					<div className="min-h-0 flex-1 overflow-auto p-2.5 pb-4">
						<div className="mb-2.5 rounded-[12px] border border-[#f3dacd] bg-gradient-to-br from-[#fffaf7] to-white p-2.5">
							<div className="flex items-start justify-between gap-2">
								<div>
									<h3 className="m-0 text-[13px] font-bold">本章状态</h3>
									<p className="mt-1 line-clamp-3 text-[10px] leading-[18px] text-[#69707d]">
										{result?.mainProblem || "诊断结果已经保存到章节工作区。"}
									</p>
								</div>
								<span className="rounded-full bg-[#fff2ec] px-2 py-1 text-[10px] font-bold text-[#c94413]">
									{score}
								</span>
							</div>
							<div className="mt-2 grid grid-cols-3 gap-1.5">
								<RightMetric label="问题" value={String(issues.length)} />
								<RightMetric label="方案" value={String(fixes.length)} />
								<RightMetric label="效果" value={String(revisionCount)} />
							</div>
						</div>

						<div className="grid gap-2">
							{visibleIssueEntries.length ? (
								visibleIssueEntries.slice(0, 6).map(({ issue, index }) => {
									const state = getIssueState(issue.id);
									return (
										<article
											key={issue.id || issue.title}
											onClick={() => selectIssueFromCard(issue.id)}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													selectIssueFromCard(issue.id);
												}
											}}
											role="button"
											tabIndex={0}
											data-issue-card={issue.id}
											className={`relative w-full rounded-[12px] border bg-white py-2.5 pl-4 pr-3 text-left transition before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-r ${
												issue.id === activeIssueId
													? "border-[#ffb493] shadow-[0_8px_20px_rgba(255,90,31,.09)]"
													: "border-[#e6e8eb] hover:border-[#ffb493] hover:shadow-[0_8px_20px_rgba(255,90,31,.09)]"
											} ${getIssueBeforeClass(issue.severity)}`}
										>
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-1.5 text-[9px] text-[#69707d]">
													<i className="grid size-[19px] place-items-center rounded-full bg-[#ff5a1f] text-[8px] font-black not-italic text-white">
														{index + 1}
													</i>
													{issue.severity || "suggest"}
												</div>
												<span className={getIssueStateBadgeClass(state)}>
													{getIssueStateLabel(state)}
												</span>
											</div>
											<h3 className="mb-1 mt-2 text-xs font-bold leading-snug">
												{issue.title}
											</h3>
											<p className="line-clamp-2 text-[10px] leading-[18px] text-[#606873]">
												{issue.description || issue.readerImpact}
											</p>
											{issue.evidence?.[0]?.quote ? (
												<div className="mt-2 line-clamp-2 rounded-lg border border-[#eceef1] bg-[#f7f8fa] px-2 py-1.5 text-[9px] leading-4 text-[#505762]">
													证据：{issue.evidence[0].quote}
												</div>
											) : null}
											{issue.fixAction ? (
												<div className="mt-2 line-clamp-2 rounded-lg bg-[#fff2ec] px-2 py-1.5 text-[9px] leading-4 text-[#773a20]">
													{issue.fixAction}
												</div>
											) : null}
											<div className="mt-2 grid grid-cols-[1.2fr_1fr_1fr] gap-1.5">
												<button
													type="button"
													disabled={
														state !== "accepted" && acceptedCount >= 3
													}
													onClick={(event) => {
														event.stopPropagation();
														updateIssueState(issue.id, "accepted");
													}}
													className={`grid min-h-[27px] place-items-center rounded-[7px] border text-[8px] ${
														state === "accepted"
															? "border-[#82d4a9] bg-[#dff7eb] text-[#176c4d]"
															: "border-[#c9e7d9] bg-[#eaf8f2] text-[#176c4d] disabled:cursor-not-allowed disabled:opacity-45"
													}`}
												>
													{state === "accepted" ? "移出计划" : "加入计划"}
												</button>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														updateIssueState(issue.id, "ignored");
													}}
													className={`grid min-h-[27px] place-items-center rounded-[7px] border text-[8px] ${
														state === "ignored"
															? "border-[#d0d4da] bg-[#f2f3f5] text-[#555d68]"
															: "border-[#e6e8eb] bg-white text-[#626a75]"
													}`}
												>
													忽略
												</button>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														updateIssueState(issue.id, "disputed");
													}}
													className={`grid min-h-[27px] place-items-center rounded-[7px] border text-[8px] ${
														state === "disputed"
															? "border-[#efc16a] bg-[#fff0c9] text-[#8d520a]"
															: "border-[#f1d8a9] bg-[#fff7e8] text-[#8d520a]"
													}`}
												>
													有误
												</button>
											</div>
										</article>
									);
								})
							) : (
								<div className="rounded-xl border border-dashed border-[#d4d8de] bg-[#fbfcfd] p-5 text-center">
									<p className="text-[11px] leading-5 text-[#69707d]">
										当前筛选下暂无诊断意见。
									</p>
								</div>
							)}
						</div>
					</div>
					<div className="border-t border-[#e6e8eb] bg-white p-2.5">
						<div className="mb-2 rounded-lg border border-[#d8e2f6] bg-[#edf4ff] px-2.5 py-1.5 text-[9px] leading-4 text-[#405a85]">
							接受意见后，系统先生成修改预览；只有你确认的修改才会保存为新版本。
						</div>
						<div className="mb-2 text-[9px] text-[#6f7782]">
							当前已接受 {acceptedCount} 条意见。
						</div>
						<div className="grid grid-cols-[1fr_1.15fr] gap-2">
							<button
								type="button"
								onClick={() => setChapterTab("rewrite")}
								disabled={!acceptedCount}
								className="min-h-9 rounded-[9px] border border-[#d4d8de] bg-white px-2 text-[11px] font-bold text-[#20242b] disabled:opacity-50"
							>
								查看修改指令
							</button>
							<button
								type="button"
								onClick={openRewritePreview}
								disabled={!acceptedCount}
								className="min-h-9 rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-2 text-[11px] font-bold text-white disabled:opacity-50"
							>
								预览一键改稿
							</button>
						</div>
					</div>
				</aside>
				<svg
					className="pointer-events-none absolute inset-0 z-[4] size-full max-lg:hidden"
					aria-hidden="true"
				>
					{connectorPath ? (
						<path
							d={connectorPath}
							className={getConnectorClass(activeIssue?.severity)}
							fill="none"
							strokeLinecap="round"
							strokeWidth="1.6"
						/>
					) : null}
				</svg>
			</section>
			{rewritePreviewOpen ? (
				<RewritePreviewModal
					chapterTitle={chapterTitle}
					chapterText={chapterText}
					issues={acceptedIssues}
					decisions={previewDecisions}
					selectedCount={previewAcceptedCount}
					onDecisionChange={(issueId, decision) =>
						setPreviewDecisions((current) => ({ ...current, [issueId]: decision }))
					}
					onClose={() => setRewritePreviewOpen(false)}
					onApply={applyRewritePreview}
				/>
			) : null}
		</div>
	);
}

function EntryCard({
	title,
	description,
	onClick,
}: {
	title: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-[11px] border border-[#e6e8eb] bg-white p-3.5 text-left transition hover:border-[#ffc3aa] hover:shadow-[0_12px_28px_rgba(255,90,31,.09)]"
		>
			<strong className="block text-[13px]">{title}</strong>
			<span className="mt-1 block text-xs leading-5 text-[#69707d]">{description}</span>
		</button>
	);
}

function RewritePreviewModal({
	chapterTitle,
	chapterText,
	issues,
	decisions,
	selectedCount,
	onDecisionChange,
	onClose,
	onApply,
}: {
	chapterTitle: string;
	chapterText: string;
	issues: QuickReviewIssue[];
	decisions: Record<string, PreviewDecision>;
	selectedCount: number;
	onDecisionChange: (issueId: string, decision: PreviewDecision) => void;
	onClose: () => void;
	onApply: () => void;
}) {
	const paragraphs = splitChapterParagraphs(chapterText);

	return (
		<div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(22,27,34,.42)] p-4">
			<section className="flex max-h-[88vh] w-[min(940px,100%)] flex-col overflow-hidden rounded-[18px] border border-[#dfe3e8] bg-white shadow-[0_22px_70px_rgba(20,25,35,.28)]">
				<header className="flex items-start justify-between gap-4 border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-4">
					<div>
						<h2 className="text-lg font-bold">确认本次正文修改</h2>
						<p className="mt-1 text-xs leading-5 text-[#69707d]">
							先逐项确认，再保存为新版本。未接受的修改不会进入正文。
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="grid size-8 place-items-center rounded-lg border border-[#d4d8de] bg-white text-sm font-bold text-[#69707d]"
					>
						×
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-auto p-5">
					<div className="mb-4 rounded-[13px] border border-[#d8e2f6] bg-[#edf4ff] p-3 text-xs leading-6 text-[#405a85]">
						<b>本次修改范围</b>
						<span className="ml-2">
							仅修改 {issues.length}{" "}
							个相关段落，不修改其他章节、人物姓名、事件顺序和世界观设定。
						</span>
						<div className="mt-2 flex flex-wrap gap-1.5">
							<span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold">
								当前章节：{chapterTitle}
							</span>
							<span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold">
								保存方式：创建新版本
							</span>
							<span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold">
								执行后：进入待复诊
							</span>
						</div>
					</div>

					<div className="grid gap-3">
						{issues.map((issue, index) => {
							const paragraph = getIssuePreviewParagraph(issue, paragraphs);
							const decision = decisions[issue.id] ?? "accepted";
							return (
								<article
									key={issue.id}
									className={`rounded-[14px] border p-4 ${
										decision === "accepted"
											? "border-[#c9e7d9] bg-[#fbfffd]"
											: "border-[#d8e2f6] bg-[#fbfdff]"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="text-sm font-bold">
												{index + 1}. {issue.title}
											</h3>
											<p className="mt-1 text-[10px] text-[#69707d]">
												正文相关段落 · 可逐项接受或保留原文
											</p>
										</div>
										<span
											className={`rounded-full px-2 py-1 text-[10px] font-bold ${
												decision === "accepted"
													? "bg-[#eaf8f2] text-[#176c4d]"
													: "bg-[#edf4ff] text-[#2e5cb9]"
											}`}
										>
											{decision === "accepted" ? "准备应用" : "保留原文"}
										</span>
									</div>
									<div className="mt-3 grid gap-3 md:grid-cols-2">
										<div className="rounded-[12px] border border-[#e6e8eb] bg-white p-3">
											<b className="text-[10px] text-[#69707d]">修改前</b>
											<p className="mt-2 text-xs leading-6 text-[#424a55]">
												{paragraph}
											</p>
										</div>
										<div className="rounded-[12px] border border-[#c9e7d9] bg-[#f5fff9] p-3">
											<b className="text-[10px] text-[#176c4d]">修改后</b>
											<p className="mt-2 text-xs leading-6 text-[#2d473b]">
												{buildPreviewRewrite(paragraph, issue)}
											</p>
										</div>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => onDecisionChange(issue.id, "accepted")}
											className={`min-h-8 rounded-lg border px-3 text-[11px] font-bold ${
												decision === "accepted"
													? "border-[#82d4a9] bg-[#dff7eb] text-[#176c4d]"
													: "border-[#d4d8de] bg-white text-[#505762]"
											}`}
										>
											接受本处
										</button>
										<button
											type="button"
											onClick={() => onDecisionChange(issue.id, "rejected")}
											className={`min-h-8 rounded-lg border px-3 text-[11px] font-bold ${
												decision === "rejected"
													? "border-[#b9cdee] bg-[#edf4ff] text-[#2e5cb9]"
													: "border-[#d4d8de] bg-white text-[#505762]"
											}`}
										>
											保留原文
										</button>
									</div>
								</article>
							);
						})}
					</div>
				</div>

				<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e8eb] bg-white px-5 py-4">
					<span className="text-xs text-[#69707d]">
						{selectedCount}/{issues.length} 处修改将进入新版本
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-9 rounded-[9px] border border-[#d4d8de] bg-white px-4 text-xs font-bold"
						>
							取消
						</button>
						<button
							type="button"
							onClick={onApply}
							disabled={!selectedCount}
							className="min-h-9 rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-4 text-xs font-bold text-white disabled:opacity-50"
						>
							应用已接受修改
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[9px] border border-[#e6e8eb] bg-[#fbfcfd] p-2">
			<span className="block text-[11px] text-[#69707d]">{label}</span>
			<strong className="mt-0.5 block text-xs">{value}</strong>
		</div>
	);
}

function AssetRow({ title, value }: { title: string; value: string }) {
	return (
		<div className="rounded-[10px] border border-[#e6e8eb] p-3">
			<b className="block text-xs">{title}</b>
			<span className="text-[11px] text-[#69707d]">{value}</span>
		</div>
	);
}

function TreeAssetRow({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[11px] text-[#4b525c]">
			<span className="w-[18px] text-center text-[#9299a3]">✓</span>
			<span className="min-w-0 flex-1 truncate">{label}</span>
			<span className="rounded-full bg-[#f0f2f5] px-1.5 py-0.5 text-[9px] text-[#777f89]">
				{value}
			</span>
		</div>
	);
}

function DiagnosisOverviewPanel({
	result,
	issues,
	acceptedCount,
	disputedCount,
	pendingCount,
}: {
	result: QuickReviewResult | null;
	issues: QuickReviewIssue[];
	acceptedCount: number;
	disputedCount: number;
	pendingCount: number;
}) {
	return (
		<section className="mx-auto grid w-[min(900px,100%)] gap-4">
			<div className="rounded-[18px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
				<div className="flex items-start justify-between gap-5">
					<div>
						<span className="rounded-full bg-[#fff7e8] px-2 py-1 text-[10px] font-bold text-[#8c5009]">
							结论优先
						</span>
						<h1 className="mt-3 text-[21px] font-bold leading-snug">
							{result?.mainProblem || "暂无诊断总览"}
						</h1>
						<p className="mt-2 text-xs leading-6 text-[#606873]">
							{result?.oneLineDiagnosis ||
								result?.readyReason ||
								"完成快速诊断后，这里会汇总本章最大流失点、读者反应和下一步动作。"}
						</p>
					</div>
					<div className="min-w-[92px] rounded-[12px] border border-[#e6e8eb] bg-[#fbfcfd] p-3 text-center">
						<strong className="block text-2xl leading-none">
							{typeof result?.quickScore === "number" ? result.quickScore : "-"}
						</strong>
						<span className="mt-1 block text-[9px] text-[#69707d]">快速诊断分</span>
					</div>
				</div>
				<div className="mt-4 grid grid-cols-4 gap-2 max-[720px]:grid-cols-2">
					<ChapterStat label="问题总数" value={String(issues.length)} />
					<ChapterStat label="待处理" value={String(pendingCount)} />
					<ChapterStat label="已加入计划" value={String(acceptedCount)} />
					<ChapterStat label="待人工判断" value={String(disputedCount)} />
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				{issues.map((issue, index) => (
					<div
						key={issue.id}
						className="rounded-[13px] border border-[#e6e8eb] bg-white p-4"
					>
						<div className="flex items-center gap-2 text-[10px] text-[#69707d]">
							<i className="grid size-6 place-items-center rounded-lg bg-[#ff5a1f] text-[10px] font-black not-italic text-white">
								{index + 1}
							</i>
							{issue.severity} · {issue.category}
						</div>
						<h3 className="mt-3 text-sm font-bold">{issue.title}</h3>
						<p className="mt-2 text-xs leading-6 text-[#606873]">
							{issue.readerImpact}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

function RewritePlanPanel({
	issues,
	getIssueState,
	rewritePrompt,
}: {
	issues: QuickReviewIssue[];
	getIssueState: (issueId: string) => IssueState;
	rewritePrompt: string;
}) {
	const acceptedIssues = issues.filter((issue) => getIssueState(issue.id) === "accepted");

	return (
		<section className="mx-auto grid w-[min(900px,100%)] gap-4">
			<div className="rounded-[18px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
				<span className="rounded-full bg-[#fff2ec] px-2 py-1 text-[10px] font-bold text-[#c74413]">
					本轮修改方案
				</span>
				<h1 className="mt-3 text-[21px] font-bold">只处理已加入计划的问题</h1>
				<p className="mt-2 text-xs leading-6 text-[#69707d]">
					参考页的逻辑是先选 1-3
					条关键问题，再生成修改指令；未加入计划的问题不会进入本轮改稿。
				</p>
			</div>

			<div className="grid gap-3">
				{acceptedIssues.length ? (
					acceptedIssues.map((issue, index) => (
						<div
							key={issue.id}
							className="rounded-[13px] border border-[#e6e8eb] bg-white p-4"
						>
							<div className="flex items-start justify-between gap-3">
								<h3 className="text-sm font-bold">
									{index + 1}. {issue.title}
								</h3>
								<span className="rounded-full bg-[#eaf8f2] px-2 py-1 text-[10px] font-bold text-[#176c4d]">
									已加入计划
								</span>
							</div>
							<p className="mt-2 text-xs leading-6 text-[#606873]">
								{issue.fixAction}
							</p>
						</div>
					))
				) : (
					<div className="rounded-[13px] border border-dashed border-[#d4d8de] bg-white p-8 text-center text-xs text-[#69707d]">
						请先在右侧把问题加入改稿计划。
					</div>
				)}
			</div>

			<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
				<header className="border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-4">
					<h2 className="text-base font-bold">可复制的修改指令</h2>
					<p className="mt-1 text-xs text-[#69707d]">
						保留原有人物和事件，只修正本次诊断发现的问题。
					</p>
				</header>
				<div className="p-5">
					<textarea
						readOnly
						value={rewritePrompt}
						className="min-h-[260px] w-full resize-y rounded-xl border border-[#d7e3fb] bg-[#f7faff] p-4 text-xs leading-7 text-[#35435b] outline-none"
					/>
				</div>
			</div>
		</section>
	);
}

function RetestPanel({
	chapterTitle,
	resolvedCount,
	revisionCount,
}: {
	chapterTitle: string;
	resolvedCount: number;
	revisionCount: number;
}) {
	return (
		<section className="mx-auto grid w-[min(900px,100%)] gap-4">
			<div className="rounded-[18px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
				<span className="rounded-full bg-[#edf4ff] px-2 py-1 text-[10px] font-bold text-[#2e5cb9]">
					修改效果
				</span>
				<h1 className="mt-3 text-[21px] font-bold">{chapterTitle}</h1>
				<p className="mt-2 text-xs leading-6 text-[#69707d]">
					这里对齐参考页的“修改效果”入口：展示版本、复诊记录和已应用问题。当前先提供本地预览状态。
				</p>
				<div className="mt-4 grid grid-cols-3 gap-2">
					<ChapterStat label="已应用" value={String(resolvedCount)} />
					<ChapterStat label="修改记录" value={String(revisionCount)} />
					<ChapterStat label="当前版本" value="1" />
				</div>
			</div>
			<div className="rounded-[13px] border border-dashed border-[#d4d8de] bg-white p-8 text-center text-xs leading-6 text-[#69707d]">
				应用修改后，本页会显示绿色改动、版本链路和复诊结论。
			</div>
		</section>
	);
}

function ChapterStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[10px] border border-[#e6e8eb] bg-white p-3">
			<span className="block text-[10px] text-[#69707d]">{label}</span>
			<strong className="mt-1 block text-sm">{value}</strong>
		</div>
	);
}

type ParagraphAnnotation = {
	paragraph: string;
	markers: ParagraphIssueMarker[];
};

type ParagraphIssueMarker = {
	issue: QuickReviewIssue;
	issueIndex: number;
	start?: number;
	end?: number;
};

type ParagraphMatch = {
	paragraphIndex: number;
	start?: number;
	end?: number;
};

function AnnotatedParagraph({
	annotation,
	activeIssueId,
	onFocusIssue,
}: {
	annotation: ParagraphAnnotation;
	activeIssueId?: string;
	onFocusIssue: (issueId: string) => void;
}) {
	const { paragraph, markers } = annotation;

	if (!markers.length) {
		return <p className="mb-[0.72em] text-left last:mb-0">{paragraph}</p>;
	}

	const inlineMarkers = markers
		.filter((marker) => marker.start !== undefined && marker.end !== undefined)
		.sort((left, right) => (left.start || 0) - (right.start || 0));
	const renderedIssueIds = new Set<string>();
	const nodes: ReactNode[] = [];
	let cursor = 0;

	inlineMarkers.forEach((marker) => {
		const start = marker.start ?? -1;
		const end = marker.end ?? -1;
		if (start < cursor || end <= start) {
			return;
		}

		const markerActive = marker.issue.id === activeIssueId;
		const anchorClass = getAnchorClass(marker.issue.severity, markerActive);
		nodes.push(paragraph.slice(cursor, start));
		nodes.push(
			<button
				key={`quote-${marker.issue.id}`}
				type="button"
				onClick={() => onFocusIssue(marker.issue.id)}
				data-annotation-anchor={marker.issue.id}
				className={anchorClass}
				title={marker.issue.title}
			>
				{paragraph.slice(start, end)}
			</button>,
		);
		cursor = end;
		renderedIssueIds.add(marker.issue.id);
	});
	nodes.push(paragraph.slice(cursor));

	return (
		<p className="mb-[0.72em] text-left last:mb-0">
			{nodes}
			<span className="ml-1.5 inline-flex flex-wrap items-center gap-1 align-[2px]">
				{markers.map((marker) => {
					const markerActive = marker.issue.id === activeIssueId;
					const anchorNumberClass = `inline-grid size-[18px] place-items-center rounded-full bg-[#ff5a1f] font-sans text-[9px] font-black text-white transition ${
						markerActive ? "scale-110 shadow-[0_0_0_3px_rgba(255,90,31,.18)]" : ""
					}`;
					return (
						<button
							key={`number-${marker.issue.id}`}
							type="button"
							onClick={() => onFocusIssue(marker.issue.id)}
							data-annotation-anchor={
								renderedIssueIds.has(marker.issue.id) ? undefined : marker.issue.id
							}
							className={anchorNumberClass}
							aria-label={`查看诊断意见 ${marker.issueIndex + 1}`}
						>
							{marker.issueIndex + 1}
						</button>
					);
				})}
			</span>
		</p>
	);
}

function buildAnnotatedParagraphs(
	chapterText: string,
	issues: QuickReviewIssue[],
): ParagraphAnnotation[] {
	const paragraphs = splitChapterParagraphs(chapterText);
	if (!paragraphs.length) {
		return [];
	}

	const annotations: ParagraphAnnotation[] = paragraphs.map((paragraph) => ({
		paragraph,
		markers: [],
	}));
	const paragraphIndex = buildParagraphIndex(paragraphs);

	issues.forEach((issue, issueIndex) => {
		const match = findIssueParagraphMatch(issue, paragraphIndex, issueIndex, issues.length);
		if (!match) {
			return;
		}
		annotations[match.paragraphIndex]?.markers.push({
			issue,
			issueIndex,
			start: match.start,
			end: match.end,
		});
	});

	return annotations;
}

function splitChapterParagraphs(chapterText: string) {
	const text = chapterText.replace(/\r\n?/g, "\n").trim();
	if (!text) {
		return [];
	}

	const blocks = (/\n\s*\n/.test(text) ? text.split(/\n\s*\n+/) : text.split(/\n+/))
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);

	return blocks.flatMap(splitLongParagraph);
}

function buildParagraphIndex(paragraphs: string[]) {
	const separator = "\n\n";
	let cursor = 0;
	const starts = paragraphs.map((paragraph) => {
		const start = cursor;
		cursor += paragraph.length + separator.length;
		return start;
	});

	return {
		fullText: paragraphs.join(separator),
		paragraphs,
		starts,
	};
}

function splitLongParagraph(paragraph: string) {
	const normalized = paragraph.replace(/[ \t]{2,}/g, " ").trim();
	if (normalized.length <= 180) {
		return [normalized];
	}

	const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;」”』】）)]*|[^。！？!?；;]+$/g);
	if (!sentences?.length) {
		return [normalized];
	}

	const chunks: string[] = [];
	let current = "";
	sentences.forEach((sentence) => {
		const next = `${current}${sentence}`.trim();
		if (current && next.length > 180) {
			chunks.push(current);
			current = sentence.trim();
			return;
		}
		current = next;
	});
	if (current) {
		chunks.push(current);
	}

	return chunks;
}

function findIssueParagraphMatch(
	issue: QuickReviewIssue,
	paragraphIndex: ReturnType<typeof buildParagraphIndex>,
	issueIndex: number,
	issueCount: number,
): ParagraphMatch {
	const { fullText } = paragraphIndex;
	const quotes = getEvidenceQuotes(issue);
	for (const quote of quotes) {
		if (!quote.trim()) {
			continue;
		}

		const position = textQuoteAnchor.toTextPosition(
			{ textContent: fullText },
			{ exact: quote.trim() },
			{ hint: estimateIssueOffset(issueIndex, issueCount, fullText.length) },
		);
		if (position) {
			const mapped = mapTextPositionToParagraph(position, paragraphIndex);
			if (mapped) {
				return mapped;
			}
		}
	}

	return {
		paragraphIndex: Math.min(issueIndex, paragraphIndex.paragraphs.length - 1),
	};
}

function mapTextPositionToParagraph(
	position: { start: number; end: number },
	paragraphIndex: ReturnType<typeof buildParagraphIndex>,
): ParagraphMatch | null {
	for (let index = 0; index < paragraphIndex.paragraphs.length; index += 1) {
		const paragraph = paragraphIndex.paragraphs[index];
		const startOffset = paragraphIndex.starts[index] ?? 0;
		const endOffset = startOffset + paragraph.length;
		if (position.start >= startOffset && position.start <= endOffset) {
			const start = Math.max(0, position.start - startOffset);
			const end = Math.min(paragraph.length, Math.max(position.end - startOffset, start));
			return {
				paragraphIndex: index,
				start: end > start ? start : undefined,
				end: end > start ? end : undefined,
			};
		}
	}
	return null;
}

function estimateIssueOffset(issueIndex: number, issueCount: number, textLength: number) {
	return Math.round(((issueIndex + 0.5) / Math.max(issueCount, 1)) * textLength);
}

function getIssuePreviewParagraph(issue: QuickReviewIssue, paragraphs: string[]) {
	const evidenceQuote = getEvidenceQuotes(issue)[0];
	if (evidenceQuote) {
		const matchedParagraph = paragraphs.find((paragraph) => paragraph.includes(evidenceQuote));
		if (matchedParagraph) {
			return matchedParagraph;
		}
	}
	return paragraphs[0] || "暂无可预览正文。";
}

function buildPreviewRewrite(paragraph: string, issue: QuickReviewIssue) {
	const action = issue.fixAction || issue.readerImpact || "补强目标、代价和行动指向。";
	const trimmed = paragraph.trim();
	if (!trimmed || trimmed === "暂无可预览正文。") {
		return action;
	}
	return `${trimmed}${trimmed.endsWith("。") ? "" : "。"} ${action}`;
}

function getEvidenceQuotes(issue: QuickReviewIssue) {
	return Array.isArray(issue.evidence)
		? issue.evidence
				.map((evidence) => evidence?.quote?.trim())
				.filter((quote): quote is string => Boolean(quote))
		: [];
}

function getAnchorClass(severity: QuickReviewIssue["severity"], active: boolean) {
	const colorClass =
		severity === "critical"
			? "bg-[linear-gradient(transparent_58%,rgba(216,59,59,.23)_58%)]"
			: severity === "high"
				? "bg-[linear-gradient(transparent_58%,rgba(239,152,9,.25)_58%)]"
				: "bg-[linear-gradient(transparent_58%,rgba(57,112,232,.2)_58%)]";
	const activeClass = active
		? "outline outline-2 outline-[rgba(255,90,31,.4)] bg-[#fff0e8]"
		: "hover:outline hover:outline-2 hover:outline-[rgba(255,90,31,.22)]";

	return `inline rounded px-0.5 text-left transition ${colorClass} ${activeClass}`;
}

function getIssueBeforeClass(severity: QuickReviewIssue["severity"]) {
	if (severity === "critical") {
		return "before:bg-[#d83b3b]";
	}
	if (severity === "medium" || severity === "low") {
		return "before:bg-[#3970e8]";
	}
	return "before:bg-[#ef9809]";
}

function getConnectorClass(severity: QuickReviewIssue["severity"] | undefined) {
	if (severity === "critical") {
		return "stroke-[rgba(216,59,59,.58)]";
	}
	if (severity === "medium" || severity === "low") {
		return "stroke-[rgba(57,112,232,.52)]";
	}
	return "stroke-[rgba(239,152,9,.62)]";
}

function matchesIssueFilter(issue: QuickReviewIssue, state: IssueState, filter: IssueFilter) {
	if (filter === "all") {
		return true;
	}
	if (filter === "must") {
		return issue.severity === "critical";
	}
	return state === filter;
}

function buildChapterWorkflow({
	hasResult,
	acceptedCount,
	resolvedCount,
}: {
	hasResult: boolean;
	acceptedCount: number;
	resolvedCount: number;
}) {
	if (!hasResult) {
		return {
			stage: 0,
			title: "本章尚未诊断",
			description: "先生成诊断意见，再进入改稿和复诊。",
			action: "开始诊断",
		};
	}
	if (resolvedCount > 0) {
		return {
			stage: 2,
			title: "正文已经修改",
			description: "下一步验证旧问题是否解决，并检查是否出现新问题。",
			action: "运行复诊",
		};
	}
	if (acceptedCount > 0) {
		return {
			stage: 1,
			title: `已选择 ${acceptedCount} 条诊断意见`,
			description: "先预览修改，再决定哪些内容进入新版本。",
			action: "预览本轮改稿",
		};
	}
	return {
		stage: 0,
		title: "诊断已经完成",
		description: "从右侧选择 1-3 个最重要的问题加入本轮改稿计划。",
		action: "选择本轮问题",
	};
}

function getIssueStateLabel(state: IssueState) {
	const labels: Record<IssueState, string> = {
		pending: "待处理",
		accepted: "已加入计划",
		ignored: "已忽略",
		disputed: "待人工判断",
		resolved: "已应用",
	};
	return labels[state];
}

function getIssueStateBadgeClass(state: IssueState) {
	const base = "rounded-full px-2 py-0.5 text-[9px] font-bold";
	if (state === "accepted") {
		return `${base} bg-[#eaf8f2] text-[#176c4d]`;
	}
	if (state === "ignored") {
		return `${base} bg-[#f2f3f5] text-[#69707d]`;
	}
	if (state === "disputed") {
		return `${base} bg-[#fff7e8] text-[#8d520a]`;
	}
	if (state === "resolved") {
		return `${base} bg-[#edf4ff] text-[#2e5cb9]`;
	}
	return `${base} bg-[#fff2ec] text-[#c94413]`;
}

function RightMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-[#e6e8eb] bg-white p-2">
			<span className="block text-[8px] text-[#69707d]">{label}</span>
			<b className="block text-[11px]">{value}</b>
		</div>
	);
}

function buildFallbackPrompt(result: QuickReviewResult | null, fixes: string[]) {
	return [
		"请在不改变人物姓名、核心事件顺序和叙事视角的前提下，重写本章开头。",
		"",
		"目标：",
		`1. ${fixes[0] || result?.mainProblem || "明确当前版本最大的追读流失点"}；`,
		`2. ${fixes[1] || "补强主角目标、损失代价和下一步行动"}；`,
		`3. ${fixes[2] || "让章末钩子包含新信息和明确行动指向"}。`,
		"",
		"禁止：",
		"- 不新增新的主要人物；",
		"- 不用旁白直接说明“读者会期待”；",
		"- 不把所有设定一次解释完。",
	].join("\n");
}
