"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import type { DiagnosisExampleOption } from "@/lib/diagnosis-examples";
import type { QuickReviewResult } from "@/stores/workspace-store";
import { CheckCircle2, Clipboard, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";

type QuickIssue = NonNullable<QuickReviewResult["issues"]>[number];

interface QuickDiagnosisHandlers {
	provider: { kind: "mock" | "openai-compatible"; model: string };
	providerLabel: string;
	isBackendFreeProvider: boolean;
	loading: import("@/hooks/use-workspace-handlers").LoadingState;
	quickReviewElapsedSeconds: number;
	quickReviewResult: QuickReviewResult | null;
	quickReviewError: string | null;
	previousQuickReviewResult: QuickReviewResult | null;
	quickReviewGenre: string;
	quickReviewInputKind: import("@/stores/workspace-store").QuickReviewInputKind;
	quickReviewPreviousPrompt: string;
	quickReviewCoreSellingPoint: string;
	quickReviewMustKeepMechanisms: string;
	quickReviewTargetReaderPleasures: string;
	chapterText: string;
	chapterTitle: string;
	projectRevisionSessions: import("@/stores/workspace-store").RevisionSession[];
	projectMethodologyCards: import("@/stores/workspace-store").ProjectMethodologyCard[];
	bookTitle: string;
	bookGenre: string;
	bookText: string;
	bookFile: File | null;
	bookUpload: import("@/stores/workspace-store").BookUploadPreview | null;
	quickReviewCacheHit?: unknown;
	handleChapterTextChange: (value: string) => void;
	setQuickReviewGenre: (value: string) => void;
	setQuickReviewInputKind: (
		value: import("@/stores/workspace-store").QuickReviewInputKind,
	) => void;
	setQuickReviewPreviousPrompt: (value: string) => void;
	setQuickReviewCoreSellingPoint: (value: string) => void;
	setQuickReviewMustKeepMechanisms: (value: string) => void;
	setQuickReviewTargetReaderPleasures: (value: string) => void;
	runQuickExperience: () => void;
	useExampleChapter: (exampleId: string) => void;
	openView: (view: "provider" | "chapter" | "book") => void;
	diagnosisExampleOptions: DiagnosisExampleOption[];
}

interface QuickDiagnosisComposeProps {
	handlers: QuickDiagnosisHandlers;
}

const focusOptions = [
	"为什么没人追读",
	"开头是否抓人",
	"节奏是否拖沓",
	"AI 味是否明显",
	"改稿优先级",
];

export function QuickDiagnosisCompose({ handlers }: QuickDiagnosisComposeProps) {
	const [activeFocus, setActiveFocus] = useState(focusOptions[0]);
	const [customFocus, setCustomFocus] = useState("");

	const isLoading = handlers.loading === "quick";
	const hasQuickResult = Boolean(handlers.quickReviewResult);
	const issues = useMemo(
		() =>
			Array.isArray(handlers.quickReviewResult?.issues)
				? handlers.quickReviewResult.issues.filter((issue): issue is QuickIssue =>
						Boolean(issue && issue.title),
					)
				: [],
		[handlers.quickReviewResult],
	);
	const fixes = useMemo(
		() =>
			Array.isArray(handlers.quickReviewResult?.actionableFixes)
				? handlers.quickReviewResult.actionableFixes.filter(Boolean)
				: [],
		[handlers.quickReviewResult],
	);
	const focusValue = customFocus.trim() || activeFocus;
	const chapterTitle = handlers.chapterTitle.trim() || "第一章：失去资格";
	const bookName = handlers.bookTitle.trim() || "未命名书籍";
	const charCount = handlers.chapterText.trim().length;
	const quickScore =
		typeof handlers.quickReviewResult?.quickScore === "number"
			? handlers.quickReviewResult.quickScore.toFixed(1)
			: "5.8";
	const confidence =
		typeof handlers.quickReviewResult?.confidence === "number"
			? `${Math.round(handlers.quickReviewResult.confidence * 100)}%`
			: "82%";
	const rewritePrompt = buildRewritePrompt(handlers.quickReviewResult);

	const chooseFocus = (focus: string) => {
		setActiveFocus(focus);
		setCustomFocus("");
		handlers.setQuickReviewCoreSellingPoint(focus);
	};

	const setCustom = (value: string) => {
		setCustomFocus(value);
		handlers.setQuickReviewCoreSellingPoint(value || activeFocus);
	};

	const loadFirstExample = () => {
		const first = handlers.diagnosisExampleOptions[0];
		if (first) {
			handlers.useExampleChapter(first.id);
		}
	};

	return (
		<RedesignWorkspaceShell
			active="quick"
			providerLabel={handlers.providerLabel}
			crumb={
				<>
					诊断工作区 / <b className="text-[#1f2329]">快速诊断</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton variant="ghost" onClick={() => handlers.openView("chapter")}>
						查看使用说明
					</RedesignTopButton>
					<RedesignTopButton onClick={loadFirstExample}>载入示例</RedesignTopButton>
					<RedesignTopButton onClick={() => handlers.openView("book")}>
						书籍列表
					</RedesignTopButton>
				</>
			}
		>
			<div className="mx-auto w-[min(1380px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[780px]:w-[calc(100%_-_24px)] max-[780px]:py-[22px]">
				<section className="mb-[22px] flex items-end justify-between gap-6 max-[780px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							快速诊断
						</h1>
						<p className="m-0 max-w-[740px] text-sm leading-6 text-[#69707d]">
							聚焦一个问题：这篇开头为什么留不住读者，下一版应该先改哪里。
						</p>
					</div>
					<div className="flex gap-1 rounded-xl border border-[#e6e8eb] bg-white p-1 shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[780px]:mt-4 max-[780px]:overflow-x-auto">
						{["输入稿件", "查看诊断", "复制修改指令"].map((label, index) => (
							<div
								key={label}
								className={`flex min-h-[34px] items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-xs ${
									index === 0
										? "bg-[#fff2ec] font-bold text-[#c94413]"
										: "text-[#69707d]"
								}`}
							>
								<span
									className={`grid size-5 place-items-center rounded-full text-[11px] ${
										index === 0 ? "bg-[#ff5a1f] text-white" : "bg-[#eef0f3]"
									}`}
								>
									{index + 1}
								</span>
								{label}
							</div>
						))}
					</div>
				</section>

				<section className="mb-4 flex items-center justify-between gap-3.5 rounded-[11px] border border-[#e6e8eb] bg-white px-[15px] py-[13px] shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[780px]:items-stretch max-[780px]:flex-col">
					<div className="flex min-w-0 items-center gap-2.5">
						<div className="grid h-8 w-[34px] shrink-0 place-items-center rounded-[9px] bg-[#fff2ec] font-extrabold text-[#ff5a1f]">
							▰
						</div>
						<div>
							<strong className="block text-xs">
								{hasQuickResult
									? "当前分析已接入书籍工作区"
									: "诊断完成后会接入当前书籍工作区"}
							</strong>
							<span className="mt-0.5 block text-[10px] text-[#69707d]">
								若当前书籍已存在，会更新章节诊断和改稿资产；不会重复创建一本书。
							</span>
						</div>
					</div>
					<RedesignTopButton onClick={() => handlers.openView("book")}>
						改为导入整本书籍
					</RedesignTopButton>
				</section>

				<section className="grid items-start gap-5 [grid-template-columns:minmax(0,1.55fr)_minmax(330px,.75fr)] max-[1100px]:grid-cols-1">
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<header className="flex items-start justify-between gap-4 border-b border-[#e6e8eb] px-5 py-[18px] pb-3.5">
							<div>
								<h2 className="m-0 text-base font-bold leading-snug">
									输入待诊断内容
								</h2>
								<p className="mt-1 text-xs text-[#69707d]">
									只需要正文即可；平台、修改指令 等信息可以稍后补充。
								</p>
							</div>
							<RedesignTopButton onClick={loadFirstExample}>
								填充示例
							</RedesignTopButton>
						</header>

						<div className="p-5">
							<div className="grid grid-cols-2 gap-3.5 max-[780px]:grid-cols-1">
								<label className="col-span-2 grid gap-[7px] max-[780px]:col-auto">
									<span className="text-xs font-bold text-[#4d535d]">
										书籍名称
									</span>
									<input
										value={bookName}
										readOnly
										className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									/>
									<small className="text-[#69707d]">
										可以先使用默认名称，进入小说工作台后再修改。
									</small>
								</label>

								<label className="grid gap-[7px]">
									<span className="text-xs font-bold text-[#4d535d]">
										内容类型
									</span>
									<select
										value={handlers.quickReviewInputKind}
										onChange={(event) =>
											handlers.setQuickReviewInputKind(
												event.target
													.value as import("@/stores/workspace-store").QuickReviewInputKind,
											)
										}
										className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									>
										<option value="human-draft">人工写作稿</option>
										<option value="ai-draft">AI 生成初稿</option>
										<option value="outline">故事大纲</option>
										<option value="idea">创意 / 脑洞</option>
									</select>
								</label>

								<label className="grid gap-[7px]">
									<span className="text-xs font-bold text-[#4d535d]">题材</span>
									<select
										value={handlers.quickReviewGenre}
										onChange={(event) =>
											handlers.setQuickReviewGenre(event.target.value)
										}
										className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									>
										<option value="">暂不指定</option>
										<option value="xuanhuan">玄幻</option>
										<option value="urban">都市</option>
										<option value="romance">言情</option>
										<option value="suspense">悬疑</option>
										<option value="infinite-flow">无限流</option>
										<option value="other">其他</option>
									</select>
								</label>

								<div className="col-span-2 grid gap-[7px] max-[780px]:col-auto">
									<div className="text-xs font-bold text-[#4d535d]">
										本次最关心的问题{" "}
										<small className="font-normal text-[#69707d]">
											（可选择预设，也可直接输入）
										</small>
									</div>
									<div className="flex flex-wrap gap-2">
										{focusOptions.map((focus) => (
											<button
												key={focus}
												type="button"
												onClick={() => chooseFocus(focus)}
												className={`rounded-full border px-2.5 py-1.5 text-xs ${
													!customFocus && activeFocus === focus
														? "border-[#ffd1bd] bg-[#fff2ec] font-bold text-[#c94413]"
														: "border-[#e6e8eb] bg-white text-[#59606b]"
												}`}
											>
												{focus}
											</button>
										))}
									</div>
									<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-[620px]:grid-cols-1">
										<div className="relative">
											<input
												value={customFocus}
												onChange={(event) =>
													setCustom(event.target.value.slice(0, 100))
												}
												placeholder="例如：重点检查男女主关系推进是否自然"
												className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 pr-[62px] text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
											/>
											<span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#69707d]">
												{customFocus.length}/100
											</span>
										</div>
										<Button
											type="button"
											variant="outline"
											onClick={() => setCustom("")}
											className="rounded-[9px] border-[#d8dbe0]"
										>
											清空自定义
										</Button>
									</div>
									<span className="text-[10px] text-[#69707d]">
										自定义内容优先于预设标签；重新点击预设标签会清空自定义输入。
									</span>
									<div
										className={`rounded-lg border px-2.5 py-2 text-[11px] ${
											customFocus
												? "border-[#d4e0f7] bg-[#eef4ff] text-[#2f5eaa]"
												: "border-[#e6e8eb] bg-[#f8f9fa] text-[#59616c]"
										}`}
									>
										当前诊断重点：{focusValue}
									</div>
								</div>

								<label className="col-span-2 grid gap-[7px] max-[780px]:col-auto">
									<span className="text-xs font-bold text-[#4d535d]">
										章节标题{" "}
										<small className="font-normal text-[#69707d]">
											（可选）
										</small>
									</span>
									<input
										value={chapterTitle}
										readOnly
										className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									/>
								</label>

								<label className="col-span-2 grid gap-[7px] max-[780px]:col-auto">
									<span className="text-xs font-bold text-[#4d535d]">正文</span>
									<div className="relative">
										<textarea
											value={handlers.chapterText}
											onChange={(event) =>
												handlers.handleChapterTextChange(event.target.value)
											}
											placeholder="粘贴第一章或待诊断片段。建议 1500-6000 字。"
											className="min-h-80 w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3.5 py-[13px] text-sm leading-7 outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
										/>
										<span className="absolute bottom-2.5 right-3 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-[#69707d]">
											{charCount} 字
										</span>
									</div>
								</label>
							</div>

							<details className="mt-4 border-t border-[#e6e8eb] pt-3.5">
								<summary className="cursor-pointer text-[13px] font-bold text-[#555c67]">
									补充上下文（可选）
								</summary>
								<div className="mt-3.5 grid gap-3">
									<label className="grid gap-[7px]">
										<span className="text-xs font-bold text-[#4d535d]">
											上一条生成 修改指令
										</span>
										<textarea
											value={handlers.quickReviewPreviousPrompt}
											onChange={(event) =>
												handlers.setQuickReviewPreviousPrompt(
													event.target.value,
												)
											}
											placeholder="稿件由 AI 生成时，可粘贴上一条 修改指令，帮助判断是正文执行问题还是 修改指令 约束问题。"
											className="min-h-[110px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3.5 py-[13px] text-sm leading-7 outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
										/>
									</label>
									<div className="grid grid-cols-2 gap-3.5 max-[780px]:grid-cols-1">
										<label className="grid gap-[7px]">
											<span className="text-xs font-bold text-[#4d535d]">
												必须保留机制
											</span>
											<input
												value={handlers.quickReviewMustKeepMechanisms}
												onChange={(event) =>
													handlers.setQuickReviewMustKeepMechanisms(
														event.target.value,
													)
												}
												placeholder="例如：倒计时、论坛体、主角拒绝"
												className="min-h-[42px] rounded-[10px] border border-[#d8dbe0] px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
											/>
										</label>
										<label className="grid gap-[7px]">
											<span className="text-xs font-bold text-[#4d535d]">
												目标读者爽点
											</span>
											<input
												value={handlers.quickReviewTargetReaderPleasures}
												onChange={(event) =>
													handlers.setQuickReviewTargetReaderPleasures(
														event.target.value,
													)
												}
												placeholder="例如：误判主角、反差爽感、强钩子"
												className="min-h-[42px] rounded-[10px] border border-[#d8dbe0] px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
											/>
										</label>
									</div>
								</div>
							</details>

							<div className="flex items-center justify-between gap-3.5 pt-[18px] max-[780px]:flex-col max-[780px]:items-stretch">
								<div className="flex items-center gap-2 text-xs text-[#69707d]">
									<ShieldCheck className="size-4" />
									生成后接入“书籍 &gt; 章节”，数据仅保存在当前浏览器。
								</div>
								<Button
									onClick={handlers.runQuickExperience}
									disabled={isLoading || charCount < 50}
									className="min-h-11 min-w-[168px] rounded-[9px] bg-[#ff5a1f] font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:bg-[#e84b13]"
								>
									{isLoading ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									开始诊断
								</Button>
							</div>
						</div>
					</div>

					<aside className="sticky top-[84px] grid gap-3.5 max-[1100px]:static">
						<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
							<header className="border-b border-[#e6e8eb] px-5 py-[18px] pb-3.5">
								<h2 className="m-0 text-base font-bold leading-snug">你将得到</h2>
								<p className="mt-1 text-xs text-[#69707d]">
									报告先给结论，再展开证据。
								</p>
							</header>
							<div className="p-5">
								<div className="grid gap-3">
									{[
										[
											"1",
											"最大流失点",
											"只突出最需要先处理的问题，避免一次给十几条泛泛意见。",
										],
										["2", "正文证据", "每个关键判断都对应原文摘录和读者反应。"],
										["3", "三步修改方案", "按优先级给出立即可执行的修改动作。"],
										[
											"4",
											"下一轮 修改指令",
											"直接复制给写作模型，并附带复诊检查点。",
										],
									].map(([num, title, description]) => (
										<div key={num} className="flex items-start gap-[11px]">
											<div className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#eef4ff] text-xs font-extrabold text-[#2f6feb]">
												{num}
											</div>
											<div>
												<strong className="mb-0.5 block text-[13px]">
													{title}
												</strong>
												<span className="block text-xs text-[#69707d]">
													{description}
												</span>
											</div>
										</div>
									))}
								</div>
								<div className="mt-4 grid grid-cols-3 gap-2">
									{[
										["预计耗时", "30-60 秒"],
										["建议字数", "1.5k-6k"],
										["诊断模式", "证据优先"],
									].map(([label, value]) => (
										<div
											key={label}
											className="rounded-[10px] border border-[#e6e8eb] bg-[#fafafa] p-2.5"
										>
											<span className="block text-[11px] text-[#69707d]">
												{label}
											</span>
											<strong className="mt-0.5 block text-[13px]">
												{value}
											</strong>
										</div>
									))}
								</div>
							</div>
						</div>
						<div className="rounded-[11px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-[13px] text-xs text-[#7f4a0c]">
							诊断结果用于发现文本风险和改稿优先级，不等同于平台流量预测或专业编辑定稿意见。
						</div>
					</aside>
				</section>

				{handlers.quickReviewError && !handlers.quickReviewResult ? (
					<section className="mt-[22px] rounded-[14px] border border-[#f5d9a8] bg-[#fff7e6] p-4 text-[#7f4a0c]">
						<div className="flex items-start gap-3">
							<TriangleAlert className="mt-0.5 size-5 shrink-0" />
							<div>
								<strong>诊断未完成</strong>
								<p className="mt-1 text-sm leading-6">
									{handlers.quickReviewError}
								</p>
							</div>
						</div>
					</section>
				) : null}

				{handlers.quickReviewResult ? (
					<ResultSection
						result={handlers.quickReviewResult}
						issues={issues}
						fixes={fixes}
						quickScore={quickScore}
						confidence={confidence}
						focusValue={focusValue}
						rewritePrompt={rewritePrompt}
						revisionCount={handlers.projectRevisionSessions.length}
					/>
				) : null}
			</div>

			{isLoading ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-[#f6f7f9]/90 backdrop-blur-sm">
					<div className="w-[min(390px,calc(100%_-_30px))] rounded-[14px] border border-[#e6e8eb] bg-white p-[22px] shadow-[0_12px_34px_rgba(22,27,34,.07)]">
						<h3 className="mb-[11px] text-base font-bold">正在接入书籍工作区</h3>
						{["保存诊断结果", "更新当前章节", "沉淀改稿资产", "打开章节工作区"].map(
							(step, index) => (
								<div
									key={step}
									className={`py-[7px] text-[11px] ${
										index <= loadingStep(handlers.quickReviewElapsedSeconds)
											? "font-bold text-[#2f6feb]"
											: "text-[#69707d]"
									}`}
								>
									{index + 1}. {step}
								</div>
							),
						)}
					</div>
				</div>
			) : null}
		</RedesignWorkspaceShell>
	);
}

function ResultSection({
	result,
	issues,
	fixes,
	quickScore,
	confidence,
	focusValue,
	rewritePrompt,
	revisionCount,
}: {
	result: QuickReviewResult;
	issues: QuickIssue[];
	fixes: string[];
	quickScore: string;
	confidence: string;
	focusValue: string;
	rewritePrompt: string;
	revisionCount: number;
}) {
	return (
		<section className="mt-[22px]">
			<div className="grid items-start gap-5 [grid-template-columns:minmax(0,1fr)_340px] max-[1100px]:grid-cols-1">
				<div className="grid gap-3.5">
					<div className="grid grid-cols-[104px_minmax(0,1fr)] gap-5 rounded-[14px] border border-[#e6e8eb] bg-[radial-gradient(circle_at_top_right,rgba(255,90,31,.09),transparent_36%),#fff] p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[780px]:grid-cols-1">
						<div className="grid size-24 place-items-center rounded-full bg-[conic-gradient(#ff5a1f_0_58%,#eceef1_58%_100%)] p-2">
							<div className="grid size-20 place-items-center rounded-full bg-white text-center leading-none">
								<strong className="block text-[25px]">{quickScore}</strong>
								<span className="text-[11px] text-[#69707d]">/ 10</span>
							</div>
						</div>
						<div>
							<div className="flex items-start justify-between gap-[18px]">
								<div>
									<h2 className="m-0 text-[19px] font-bold leading-snug">
										诊断结论：
										{result.oneLineDiagnosis ||
											result.mainProblem ||
											"开局冲突存在，但读者还不知道为什么必须继续看"}
									</h2>
									<p className="mt-1.5 text-sm leading-6 text-[#4f5661]">
										{result.positioning ||
											"当前稿件并非没有事件，而是卖点、损失与主角下一步目标没有形成同一条追读链。"}
									</p>
									<div className="mt-2.5">
										<span className="rounded-full bg-[#eef4ff] px-[9px] py-1 text-[11px] font-bold text-[#295ec2]">
											本次关注：{focusValue}
										</span>
									</div>
								</div>
								<span className="shrink-0 rounded-full bg-[#fff7e6] px-[9px] py-1 text-[11px] font-bold text-[#955208]">
									建议修改后继续
								</span>
							</div>
							<div className="mt-[17px] grid grid-cols-4 gap-2 max-[780px]:grid-cols-2">
								{[
									["最大问题", result.mainProblem || "开局承诺不清"],
									["置信度", confidence],
									["Gate", formatGateLabel(result.gateDecision)],
									["优点", result.sellingPoints?.[0] || "冲突进入较快"],
								].map(([label, value]) => (
									<div
										key={label}
										className="rounded-[10px] border border-[#e6e8eb] bg-white/80 px-[11px] py-2.5"
									>
										<span className="block text-[11px] text-[#69707d]">
											{label}
										</span>
										<strong className="mt-0.5 block text-[13px]">
											{value}
										</strong>
									</div>
								))}
							</div>
						</div>
					</div>

					<SectionCard
						title="关键问题"
						subtitle="只展示会直接影响追读的高优先级问题。"
						badge={`${issues.length || 2} 个高优先级`}
					>
						<div className="grid gap-3">
							{(issues.length ? issues : fallbackIssues)
								.slice(0, 3)
								.map((issue, index) => (
									<article
										key={issue.id || issue.title}
										className={`rounded-xl border border-[#e6e8eb] p-4 ${
											index === 0
												? "border-l-4 border-l-[#d33b39]"
												: "border-l-4 border-l-[#c46a06]"
										}`}
									>
										<div className="flex items-start justify-between gap-3.5">
											<div>
												<h3 className="m-0 text-[15px] font-bold">
													{String(index + 1).padStart(2, "0")}.{" "}
													{issue.title}
												</h3>
												<p className="mt-1.5 text-sm leading-6 text-[#545b66]">
													{issue.description || issue.readerImpact}
												</p>
											</div>
											<span
												className={`rounded-full px-[9px] py-1 text-[11px] font-bold ${
													index === 0
														? "bg-[#fff0f0] text-[#a82f2d]"
														: "bg-[#fff7e6] text-[#955208]"
												}`}
											>
												{index === 0 ? "严重" : "高"}
											</span>
										</div>
										<div className="mt-3 rounded-[10px] border border-[#eceef1] bg-[#f7f8fa] px-3.5 py-3 text-[13px] leading-6 text-[#464d57]">
											<b className="mb-1 block text-xs text-[#303640]">
												正文证据
											</b>
											{issue.evidence?.[0]?.quote ||
												"信息明确，但没有立即给出失去后的具体代价。"}
										</div>
										<div className="mt-3 grid grid-cols-2 gap-2.5 max-[780px]:grid-cols-1">
											<div className="rounded-[10px] bg-[#fff2ec] px-3 py-[11px] text-xs leading-5 text-[#7a381c]">
												<b className="mb-0.5 block text-[#b63f12]">
													修改动作
												</b>
												{issue.fixAction ||
													fixes[index] ||
													"补出会失去的资源、身份或重要关系。"}
											</div>
											<div className="rounded-[10px] bg-[#eef4ff] px-3 py-[11px] text-xs leading-5 text-[#354d78]">
												<b className="mb-0.5 block text-[#2e5ca8]">
													复诊检查点
												</b>
												读者能否用一句话说清：主角若不反击，会永久失去什么？
											</div>
										</div>
									</article>
								))}
						</div>
					</SectionCard>

					<SectionCard
						title="三步修改方案"
						subtitle="按顺序执行，不建议同时重写所有内容。"
					>
						<div className="grid gap-2.5 [counter-reset:plan]">
							{(fixes.length ? fixes : fallbackFixes).slice(0, 3).map((fix) => (
								<div
									key={fix}
									className="relative rounded-[11px] border border-[#e6e8eb] bg-white py-[13px] pl-[46px] pr-3.5 before:absolute before:left-[13px] before:top-[13px] before:grid before:size-[22px] before:place-items-center before:rounded-full before:bg-[#ff5a1f] before:text-[11px] before:font-extrabold before:text-white before:[content:counter(plan)] [counter-increment:plan]"
								>
									<b className="mb-0.5 block">{fix}</b>
									<span className="text-xs text-[#69707d]">
										先处理一个明确目标，再通过复诊确认是否引入新问题。
									</span>
								</div>
							))}
						</div>
					</SectionCard>

					<SectionCard
						title="可复制的修改指令"
						subtitle="保留原有人物和事件，只修正本次诊断发现的问题。"
						action={
							<Button
								variant="outline"
								className="rounded-[9px] border-[#d8dbe0]"
								onClick={() => {
									void navigator.clipboard?.writeText(rewritePrompt);
								}}
							>
								<Clipboard className="mr-2 size-4" />
								复制 修改指令
							</Button>
						}
					>
						<div className="whitespace-pre-wrap rounded-xl border border-[#d7e3fb] bg-[#f7faff] p-[15px] text-xs leading-7 text-[#35435b]">
							{rewritePrompt}
						</div>
					</SectionCard>
				</div>

				<aside className="sticky top-[84px] grid gap-3.5 max-[1100px]:static">
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<header className="border-b border-[#e6e8eb] px-5 py-[18px] pb-3.5">
							<h2 className="m-0 text-base font-bold leading-snug">本次决策</h2>
							<p className="mt-1 text-xs text-[#69707d]">
								先完成一个改稿目标，再进入复诊。
							</p>
						</header>
						<div className="grid gap-3 p-5">
							{[
								["建议动作", "修改开局承诺"],
								["不建议", "整章推倒重写"],
								["预计工作量", "30-60 分钟"],
								["下次复诊重点", result.mainProblem || "代价与行动链"],
							].map(([label, value]) => (
								<div
									key={label}
									className="flex items-center justify-between gap-4 border-b border-[#e6e8eb] pb-2.5 last:border-b-0 last:pb-0"
								>
									<span className="text-xs text-[#69707d]">{label}</span>
									<strong className="text-right text-[13px]">{value}</strong>
								</div>
							))}
						</div>
					</div>
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<div className="grid gap-[9px]">
							<Button className="w-full rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]">
								<CheckCircle2 className="mr-2 size-4" />
								开始改稿复诊
							</Button>
							<Button
								variant="outline"
								className="w-full rounded-[9px] border-[#d8dbe0]"
							>
								保存到项目
							</Button>
							<Button
								variant="outline"
								className="w-full rounded-[9px] border-[#d8dbe0]"
							>
								导出 Markdown
							</Button>
						</div>
					</div>
					<div className="rounded-[11px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-[13px] text-xs text-[#7f4a0c]">
						报告刻意减少了低优先级建议。完成当前问题后，再通过复诊确认是否引入新问题。
					</div>
					<div className="rounded-[11px] border border-[#e6e8eb] bg-white px-3.5 py-[13px] text-xs text-[#69707d]">
						已沉淀 {revisionCount} 次修改效果。
					</div>
				</aside>
			</div>
		</section>
	);
}

function SectionCard({
	title,
	subtitle,
	badge,
	action,
	children,
}: {
	title: string;
	subtitle: string;
	badge?: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<header className="flex items-center justify-between gap-4 border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-[18px] pb-3.5">
				<div>
					<h2 className="m-0 text-base font-bold leading-snug">{title}</h2>
					<p className="mt-1 text-xs text-[#69707d]">{subtitle}</p>
				</div>
				{action ??
					(badge ? (
						<span className="rounded-full bg-[#fff0f0] px-[9px] py-1 text-[11px] font-bold text-[#a82f2d]">
							{badge}
						</span>
					) : null)}
			</header>
			<div className="p-5">{children}</div>
		</div>
	);
}

function loadingStep(elapsedSeconds: number) {
	if (elapsedSeconds >= 12) return 3;
	if (elapsedSeconds >= 8) return 2;
	if (elapsedSeconds >= 4) return 1;
	return 0;
}

function formatGateLabel(gate: string | undefined) {
	const map: Record<string, string> = {
		continue: "Continue",
		revise: "Revise",
		rebuild: "Rebuild",
		discard: "Discard",
	};

	return map[gate || ""] || "Revise";
}

function buildRewritePrompt(result: QuickReviewResult | null) {
	if (result?.nextPrompt?.prompt) {
		return result.nextPrompt.prompt;
	}

	const fixes = Array.isArray(result?.actionableFixes)
		? result.actionableFixes.filter(Boolean)
		: [];

	return [
		"请在不改变人物姓名、核心事件顺序和叙事视角的前提下，重写本章开头。",
		"",
		"目标：",
		`1. ${fixes[0] || "在宣布主角失去资格后的 100-200 字内，明确一个具体且不可逆的损失；"}`,
		`2. ${fixes[1] || "在前 20% 的正文中埋入隐藏能力的异常信号，但不要解释完整设定；"}`,
		`3. ${fixes[2] || "让隐藏能力与当前冲突发生因果关系，推动主角做出一个明确选择；"}`,
		"4. 章末钩子必须包含“新信息 + 下一步行动”，避免只停留在异象展示。",
		"",
		"禁止：",
		"- 不新增新的主要人物；",
		"- 不用旁白直接说明“读者会期待”；",
		"- 不用空泛排比和总结性升华；",
		"- 不把所有设定一次解释完。",
	].join("\n");
}

const fallbackIssues: QuickIssue[] = [
	{
		id: "fallback-1",
		title: "主角失去资格，但“失去什么”仍然抽象",
		description:
			"读者知道主角遭遇了失败，却不清楚这会导致怎样的现实后果，因此情绪债没有真正建立。",
		severity: "critical",
		category: "opening",
		evidence: [
			{
				quote: "长老宣布，林澈失去本次内门选拔资格。",
				locationHint: "开篇冲突",
				confidence: 0.82,
			},
		],
		readerImpact: "读者无法判断主角不反击会付出什么代价。",
		fixAction: "在宣布结果后的 100-200 字内，补出会失去的资源、身份或重要关系。",
		promptConstraint: "不要只用旁白解释代价，要让代价在场景里可见。",
		blocksNextStep: true,
	},
	{
		id: "fallback-2",
		title: "隐藏能力出现得太晚，卖点没有参与当前冲突",
		description: "能力设定在结尾才被提及，前面的冲突与核心卖点处于分离状态。",
		severity: "high",
		category: "hook",
		evidence: [
			{
				quote: "他掌心那道沉寂三年的纹路，忽然亮了一瞬。",
				locationHint: "章末钩子",
				confidence: 0.78,
			},
		],
		readerImpact: "读者看到钩子时，已经错过了前文的情绪投入点。",
		fixAction: "在前 20% 埋入一次异常感受，让能力线从开篇就参与主角困境。",
		promptConstraint: "提前埋异常信号，但不要一次解释完整能力设定。",
		blocksNextStep: true,
	},
];

const fallbackFixes = ["把失败代价具体化", "让核心能力提前参与冲突", "重写章末钩子的行动指向"];
