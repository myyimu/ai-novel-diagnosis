"use client";

import { CheckCircle2, Clipboard, Loader2, Target } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { summarizeRevisionTrend } from "@/lib/workspace-iteration";
import type {
	ProjectMethodologyCard,
	QuickReviewInputKind,
	QuickReviewResult,
	RevisionSession,
} from "@/stores/workspace-store";

export function QuickExperiencePanel({
	chapterText,
	providerLabel,
	loading,
	elapsedSeconds,
	quickReviewResult,
	previousQuickReviewResult,
	quickReviewGenre,
	quickReviewInputKind,
	quickReviewPreviousPrompt,
	revisionSessions,
	methodologyCards: projectMethodologyCards,
	onChapterTextChange,
	onQuickReviewGenreChange,
	onQuickReviewInputKindChange,
	onQuickReviewPreviousPromptChange,
	onRun,
	onRerun,
	hasCachedResult,
	onUseExample,
	onOpenModel,
	onOpenCritique,
	onOpenBook,
}: {
	chapterText: string;
	providerLabel: string;
	loading: boolean;
	elapsedSeconds: number;
	quickReviewResult: QuickReviewResult | null;
	previousQuickReviewResult?: QuickReviewResult | null;
	quickReviewGenre: string;
	quickReviewInputKind: QuickReviewInputKind;
	quickReviewPreviousPrompt: string;
	revisionSessions: RevisionSession[];
	methodologyCards: ProjectMethodologyCard[];
	onChapterTextChange: (value: string) => void;
	onQuickReviewGenreChange: (value: string) => void;
	onQuickReviewInputKindChange: (value: QuickReviewInputKind) => void;
	onQuickReviewPreviousPromptChange: (value: string) => void;
	onRun: () => void;
	onRerun: () => void;
	hasCachedResult: boolean;
	onUseExample: () => void;
	onOpenModel: () => void;
	onOpenCritique: () => void;
	onOpenBook: () => void;
}) {
	const sellingPoints = Array.isArray(quickReviewResult?.sellingPoints)
		? quickReviewResult.sellingPoints.filter(Boolean)
		: [];
	const actionableFixes = Array.isArray(quickReviewResult?.actionableFixes)
		? quickReviewResult.actionableFixes.filter(Boolean)
		: [];
	const recommendedPlatforms = Array.isArray(quickReviewResult?.recommendedPlatforms)
		? quickReviewResult.recommendedPlatforms.filter(
				(platform) => platform && platform.label && platform.reason,
			)
		: [];
	const issues = Array.isArray(quickReviewResult?.issues)
		? quickReviewResult.issues.filter((issue) => issue && issue.title)
		: [];
	const methodologyCards = Array.isArray(quickReviewResult?.methodologyCards)
		? quickReviewResult.methodologyCards.filter((card) => card && card.title)
		: [];
	const gate = buildGateView(quickReviewResult);
	const quickScore =
		typeof quickReviewResult?.quickScore === "number"
			? `${quickReviewResult.quickScore}/10`
			: "待确认";
	const confidence =
		typeof quickReviewResult?.confidence === "number"
			? Math.round(quickReviewResult.confidence * 100)
			: null;
	const activeProgress = getQuickReviewProgress(elapsedSeconds);
	const rewritePrompt = buildRewritePrompt(quickReviewResult);
	const sharpDiagnosis = buildSharpDiagnosis(quickReviewResult);
	const reviewComparison = buildReviewComparison(previousQuickReviewResult, quickReviewResult);
	const revisionTrend = summarizeRevisionTrend(revisionSessions);
	const latestProjectCards = projectMethodologyCards.slice(0, 4);

	return (
		<section className="rounded-md border border-primary/30 bg-card p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="max-w-3xl">
					<div className="flex items-center gap-2">
						<Target className="size-5 text-primary" />
						<h2 className="text-xl font-semibold">30 秒小说诊断</h2>
					</div>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						先别让 AI 重写。粘贴第一章，先看为什么没人追、证据在哪、下一版先改什么。
					</p>
				</div>
				<div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
					当前 AI: {providerLabel}
				</div>
			</div>
			<div className="mt-5 grid gap-4 xl:grid-cols-[1fr_220px]">
				<div>
					<Label htmlFor="quick-chapter-text">把你最想救的一章粘贴到这里</Label>
					<textarea
						id="quick-chapter-text"
						value={chapterText}
						onChange={(event) => onChapterTextChange(event.target.value)}
						className="mt-2 min-h-48 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						placeholder="至少 50 字。推荐粘贴第一章或最近卡住的一章。"
					/>
					<details className="mt-4 rounded-md border border-border bg-background p-3">
						<summary className="cursor-pointer list-none text-sm font-medium">
							可选：指定题材、稿件来源和上一条 Prompt
							<span className="ml-2 text-xs font-normal text-muted-foreground">
								不懂就保持自动判断
							</span>
						</summary>
						<div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,220px)_1fr] lg:items-start">
							<div className="space-y-2">
								<Label htmlFor="quick-review-genre">题材</Label>
								<select
									id="quick-review-genre"
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
									value={quickReviewGenre}
									onChange={(event) =>
										onQuickReviewGenreChange(event.target.value)
									}
								>
									<option value="">自动判断</option>
									<option value="xuanhuan">玄幻</option>
									<option value="urban">都市</option>
									<option value="romance">言情</option>
									<option value="suspense">悬疑</option>
									<option value="infinite-flow">无限流</option>
									<option value="other">其他</option>
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="quick-review-input-kind">稿件来源</Label>
								<select
									id="quick-review-input-kind"
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
									value={quickReviewInputKind}
									onChange={(event) =>
										onQuickReviewInputKindChange(
											event.target.value as QuickReviewInputKind,
										)
									}
								>
									<option value="human-draft">作者正文</option>
									<option value="ai-draft">AI 生成稿</option>
									<option value="idea">脑洞/设定</option>
									<option value="outline">大纲</option>
									<option value="prompt">Prompt 草稿</option>
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="quick-review-previous-prompt">上一条 Prompt</Label>
								<textarea
									id="quick-review-previous-prompt"
									value={quickReviewPreviousPrompt}
									onChange={(event) =>
										onQuickReviewPreviousPromptChange(event.target.value)
									}
									className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
									placeholder="如果正文来自 AI，把上一条写作 Prompt 粘贴到这里。系统会判断问题出在正文还是 Prompt。"
								/>
								<p className="text-xs leading-5 text-muted-foreground">
									题材和来源只帮助模型少走弯路；上一条 Prompt
									会参与诊断和下一轮改稿指令。
								</p>
							</div>
						</div>
					</details>
				</div>
				<div className="flex flex-col justify-between gap-3 rounded-md border border-border bg-background p-4">
					<div className="space-y-2 text-sm text-muted-foreground">
						<p className="font-medium text-foreground">这一步只回答一个问题：</p>
						<p>为什么写出来没人追？</p>
						<p>跑完后拿到证据链和下一版改稿 Prompt。</p>
						{hasCachedResult ? <p>当前文本命中过往结果，默认优先复用缓存。</p> : null}
					</div>
					<div className="space-y-2">
						<Button className="w-full" onClick={onRun} disabled={loading}>
							{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							生成改稿方案
						</Button>
						{hasCachedResult ? (
							<Button
								className="w-full"
								variant="outline"
								onClick={onRerun}
								disabled={loading}
							>
								重新分析
							</Button>
						) : null}
						<Button
							className="w-full"
							variant="outline"
							onClick={onUseExample}
							disabled={loading}
						>
							填入示例章节
						</Button>
						<Button className="w-full" variant="outline" onClick={onOpenModel}>
							选择模型
						</Button>
					</div>
				</div>
			</div>
			{loading ? (
				<div className="mt-5 rounded-md border border-border bg-background p-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-medium">{activeProgress.label}</p>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								已等待 {elapsedSeconds} 秒。返回后会自动显示结果。
							</p>
						</div>
						<span className="text-xs text-muted-foreground">
							{activeProgress.percent}%
						</span>
					</div>
					<div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${activeProgress.percent}%` }}
						/>
					</div>
					<ol className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
						{quickReviewProgressSteps.map((step) => (
							<li
								key={step.label}
								className={
									elapsedSeconds >= step.startsAt
										? "text-foreground"
										: "text-muted-foreground"
								}
							>
								{step.label}
							</li>
						))}
					</ol>
				</div>
			) : null}
			{quickReviewResult ? (
				<div className="mt-5 space-y-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-5">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="size-5 text-success-foreground" />
						<h3 className="text-base font-semibold">改稿急诊结果：{quickScore}</h3>
						<span className="ml-auto rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
							{quickReviewResult.genre || "类型待确认"} ·{" "}
							{confidence === null ? "置信度待确认" : `置信度 ${confidence}%`}
						</span>
					</div>
					<p className="text-sm leading-6">
						<span className="font-medium">定位：</span>
						{quickReviewResult.positioning ||
							"模型没有返回明确定位，请重试或进入完整点评。"}
					</p>
					<div className="rounded-md border border-border bg-background p-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm font-medium">总判断</p>
							<span
								className={`rounded-md border px-2 py-1 text-xs ${gate.className}`}
							>
								{gate.label}
							</span>
						</div>
						<p className="mt-2 text-sm leading-6">
							{quickReviewResult.oneLineDiagnosis || sharpDiagnosis}
						</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{quickReviewResult.gateReason ||
								"这是当前稿件的改稿优先级建议，不代表平台流量预测。"}
						</p>
					</div>
					<div>
						<p className="text-sm font-medium">现在还能打的卖点</p>
						<ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
							{sellingPoints.length ? (
								sellingPoints.map((point, index) => <li key={index}>{point}</li>)
							) : (
								<li>模型没有返回明确卖点，请重试或进入完整点评。</li>
							)}
						</ul>
					</div>
					<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
						<p className="text-sm font-medium text-warning-foreground">最大追读问题</p>
						<p className="mt-1 text-sm leading-6">
							{quickReviewResult.mainProblem ||
								"模型没有返回明确问题，请重试或进入完整点评。"}
						</p>
					</div>
					<div className="rounded-md border border-primary/30 bg-primary/10 p-4">
						<p className="text-sm font-medium">产品诊断</p>
						<p className="mt-2 text-base font-semibold leading-6">{sharpDiagnosis}</p>
					</div>
					{issues.length ? (
						<div className="rounded-md border border-border bg-background p-4">
							<p className="text-sm font-medium">关键问题证据链</p>
							<div className="mt-3 space-y-3">
								{issues.slice(0, 3).map((issue) => (
									<div
										key={issue.id || issue.title}
										className="rounded-md border border-border bg-card p-3"
									>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm font-semibold">{issue.title}</p>
											<span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
												{formatIssueSeverity(issue.severity)}
												{" · "}
												{formatIssueCategory(issue.category)}
											</span>
										</div>
										<p className="mt-2 text-sm leading-6 text-muted-foreground">
											{issue.description}
										</p>
										{issue.evidence?.length ? (
											<div className="mt-2 rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
												<p className="font-medium text-foreground">
													正文证据
												</p>
												{issue.evidence.slice(0, 2).map((item, index) => (
													<p
														key={`${item.quote}-${index}`}
														className="mt-1"
													>
														{item.locationHint
															? `${item.locationHint}：`
															: ""}
														{item.quote}
													</p>
												))}
											</div>
										) : null}
										<p className="mt-2 text-sm leading-6">
											<span className="font-medium">读者影响：</span>
											{issue.readerImpact}
										</p>
										<p className="mt-1 text-sm leading-6">
											<span className="font-medium">下一步动作：</span>
											{issue.fixAction}
										</p>
									</div>
								))}
							</div>
						</div>
					) : null}
					<div>
						<p className="text-sm font-medium">立刻改这三处</p>
						<ol className="mt-1 list-inside list-decimal space-y-1 text-sm leading-6 text-muted-foreground">
							{actionableFixes.length ? (
								actionableFixes.map((fix, index) => <li key={index}>{fix}</li>)
							) : (
								<li>模型没有返回具体改法，请重试或进入完整点评。</li>
							)}
						</ol>
					</div>
					<div className="rounded-md border border-border bg-background p-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm font-medium">可复制给写作 AI 的改稿 Prompt</p>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									void navigator.clipboard?.writeText(rewritePrompt);
								}}
							>
								<Clipboard className="mr-2 size-4" />
								复制
							</Button>
						</div>
						<textarea
							readOnly
							className="mt-3 min-h-32 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-xs leading-5 text-muted-foreground outline-none"
							value={rewritePrompt}
						/>
					</div>
					{methodologyCards.length ? (
						<div className="rounded-md border border-border bg-background p-4">
							<p className="text-sm font-medium">可沉淀的方法论卡片</p>
							<div className="mt-3 grid gap-3 md:grid-cols-2">
								{methodologyCards.slice(0, 4).map((card) => (
									<div
										key={card.id || card.title}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="text-sm font-semibold">{card.title}</p>
										<p className="mt-2 text-sm leading-5 text-muted-foreground">
											{card.reusableRule}
										</p>
										<p className="mt-2 text-xs leading-5 text-muted-foreground">
											自查：{card.selfCheckQuestion}
										</p>
									</div>
								))}
							</div>
						</div>
					) : null}
					{reviewComparison ? (
						<div className="rounded-md border border-border bg-background p-4">
							<p className="text-sm font-medium">改稿后复诊对比</p>
							<div className="mt-3 grid gap-3 md:grid-cols-3">
								<div className="rounded-md border border-border bg-card p-3">
									<p className="text-xs text-muted-foreground">急诊分</p>
									<p className="mt-2 text-lg font-semibold">
										{reviewComparison.previousScore}
										{" -> "}
										{reviewComparison.currentScore}
									</p>
									<p
										className={`mt-1 text-xs ${
											reviewComparison.delta >= 0
												? "text-success-foreground"
												: "text-warning-foreground"
										}`}
									>
										{reviewComparison.deltaLabel}
									</p>
								</div>
								<div className="rounded-md border border-border bg-card p-3">
									<p className="text-xs text-muted-foreground">问题变化</p>
									<p className="mt-2 text-sm leading-5">
										{reviewComparison.problemShift}
									</p>
								</div>
								<div className="rounded-md border border-border bg-card p-3">
									<p className="text-xs text-muted-foreground">下一步</p>
									<p className="mt-2 text-sm leading-5">
										{reviewComparison.nextStep}
									</p>
								</div>
							</div>
						</div>
					) : null}
					{revisionTrend || latestProjectCards.length ? (
						<div className="rounded-md border border-border bg-background p-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm font-medium">项目迭代资产</p>
								<span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
									{revisionSessions.length} 次复诊 ·{" "}
									{projectMethodologyCards.length} 张方法论卡
								</span>
							</div>
							{revisionTrend ? (
								<div className="mt-3 grid gap-3 md:grid-cols-3">
									<div className="rounded-md border border-border bg-card p-3">
										<p className="text-xs text-muted-foreground">最近诊断</p>
										<p className="mt-2 text-sm font-semibold">
											{revisionTrend.latest.quickScore}/10 ·{" "}
											{formatGateLabel(revisionTrend.latest.gateDecision)}
										</p>
									</div>
									<div className="rounded-md border border-border bg-card p-3">
										<p className="text-xs text-muted-foreground">分数变化</p>
										<p className="mt-2 text-sm font-semibold">
											{revisionTrend.scoreDelta === null
												? "暂无上一版"
												: revisionTrend.scoreDelta >= 0
													? `+${revisionTrend.scoreDelta}`
													: revisionTrend.scoreDelta}
										</p>
									</div>
									<div className="rounded-md border border-border bg-card p-3">
										<p className="text-xs text-muted-foreground">高频 Gate</p>
										<p className="mt-2 text-sm font-semibold">
											{formatGateLabel(revisionTrend.mostCommonGate)}
										</p>
									</div>
								</div>
							) : null}
							{latestProjectCards.length ? (
								<div className="mt-3 grid gap-3 md:grid-cols-2">
									{latestProjectCards.map((card) => (
										<div
											key={card.projectCardId}
											className="rounded-md border border-border bg-card p-3"
										>
											<div className="flex items-start justify-between gap-3">
												<p className="text-sm font-semibold">
													{card.title}
												</p>
												<span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
													{card.occurrenceCount} 次
												</span>
											</div>
											<p className="mt-2 text-xs leading-5 text-muted-foreground">
												{card.reusableRule}
											</p>
										</div>
									))}
								</div>
							) : null}
						</div>
					) : null}
					<details className="rounded-md border border-border bg-background p-4">
						<summary className="cursor-pointer list-none text-sm font-medium">
							需要证据链时再打开
							<span className="ml-2 text-xs font-normal text-muted-foreground">
								急诊跑通后再看
							</span>
						</summary>
						<div className="mt-4">
							<p className="text-sm font-medium">推荐发布平台</p>
							<div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
								{recommendedPlatforms.length ? (
									recommendedPlatforms.map((platform) => (
										<div
											key={`${platform.id}-${platform.label}`}
											className="rounded-md border border-border bg-card p-3"
										>
											<div className="flex items-center justify-between gap-2">
												<p className="text-sm font-semibold">
													{platform.label}
												</p>
												<span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
													{platform.fit}
												</span>
											</div>
											<p className="mt-2 text-sm leading-6 text-muted-foreground">
												{platform.reason}
											</p>
										</div>
									))
								) : (
									<div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
										模型还没给出平台建议，建议先补充更完整的章节内容后重试。
									</div>
								)}
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								<Button onClick={onOpenCritique}>打开深度质检</Button>
								<Button variant="outline" onClick={onOpenBook}>
									样本/整书进阶
								</Button>
							</div>
						</div>
					</details>
					<p className="text-xs leading-5 text-muted-foreground">
						{quickReviewResult.readyReason ||
							"如果结果不完整，建议重试一次或进入完整评分。"}
					</p>
				</div>
			) : null}
		</section>
	);
}

function buildSharpDiagnosis(result: QuickReviewResult | null) {
	if (!result) {
		return "";
	}

	const problem = result.mainProblem?.trim();
	const firstFix = Array.isArray(result.actionableFixes)
		? result.actionableFixes.find(Boolean)
		: "";

	if (!problem) {
		return "这章最大流失点：读者还没有看到足够明确的追读理由。";
	}

	return `这章最大流失点：${problem}${firstFix ? `。先改：${firstFix}` : "。"}`;
}

function buildGateView(result: QuickReviewResult | null) {
	const gate = result?.gateDecision || "revise";
	const map = {
		continue: {
			label: "可继续打磨",
			className: "border-emerald-500/40 bg-emerald-500/10 text-success-foreground",
		},
		revise: {
			label: "先修改关键问题",
			className: "border-primary/40 bg-primary/10 text-primary",
		},
		rebuild: {
			label: "建议重构这一版",
			className: "border-amber-500/40 bg-amber-500/10 text-warning-foreground",
		},
		discard: {
			label: "当前版本不建议继续投入",
			className: "border-destructive/40 bg-destructive/10 text-destructive",
		},
	} as const;

	return map[gate] ?? map.revise;
}

function formatIssueSeverity(severity: string) {
	const map: Record<string, string> = {
		critical: "阻断",
		high: "高优先级",
		medium: "中优先级",
		low: "低优先级",
	};

	return map[severity] || "待确认";
}

function formatIssueCategory(category: string) {
	const map: Record<string, string> = {
		opening: "开头",
		hook: "钩子",
		character_goal: "主角目标",
		conflict_pressure: "冲突压力",
		payoff: "爽点兑现",
		pacing: "节奏",
		setting_load: "设定负担",
		prose_ai_flavor: "AI 腔",
		prompt_constraint: "Prompt 约束",
		market_promise: "市场承诺",
		other: "其他",
	};

	return map[category] || "其他";
}

function formatGateLabel(gate: string | undefined) {
	const map: Record<string, string> = {
		continue: "继续",
		revise: "修改",
		rebuild: "重构",
		discard: "废稿",
	};

	return map[gate || ""] || "修改";
}

function buildReviewComparison(
	previous: QuickReviewResult | null | undefined,
	current: QuickReviewResult | null,
) {
	if (!previous || !current) {
		return null;
	}

	const previousScore =
		typeof previous.quickScore === "number" ? previous.quickScore : Number.NaN;
	const currentScore = typeof current.quickScore === "number" ? current.quickScore : Number.NaN;

	if (!Number.isFinite(previousScore) || !Number.isFinite(currentScore)) {
		return null;
	}

	const delta = Number((currentScore - previousScore).toFixed(1));
	const deltaLabel = delta === 0 ? "暂无明显变化" : delta > 0 ? `+${delta}` : `${delta}`;
	const problemShift =
		previous.mainProblem && current.mainProblem && previous.mainProblem !== current.mainProblem
			? `从“${previous.mainProblem}”变为“${current.mainProblem}”。`
			: current.mainProblem
				? `主要问题仍是“${current.mainProblem}”。`
				: "模型没有返回明确问题变化。";
	const nextStep =
		delta >= 1
			? "改法有效，可以进入高级质检找证据链。"
			: delta >= 0
				? "方向可能有效，但还要继续补强目标、代价或章末钩子。"
				: "这版改稿可能削弱了追读动机，建议回到最大流失点重新改。";

	return {
		previousScore,
		currentScore,
		delta,
		deltaLabel,
		problemShift,
		nextStep,
	};
}

function buildRewritePrompt(result: QuickReviewResult | null) {
	if (!result) {
		return "";
	}

	if (result.nextPrompt?.prompt) {
		return result.nextPrompt.prompt;
	}

	const fixes = Array.isArray(result.actionableFixes)
		? result.actionableFixes.filter(Boolean)
		: [];
	const sellingPoints = Array.isArray(result.sellingPoints)
		? result.sellingPoints.filter(Boolean)
		: [];

	return [
		"请帮我改写这一章，但不要另起炉灶。",
		`当前定位：${result.positioning || "请先根据正文判断定位"}`,
		`保留卖点：${sellingPoints.length ? sellingPoints.join("；") : "保留已有冲突、人物关系和主线信息"}`,
		`优先解决：${result.mainProblem || "追读动机不足"}`,
		`具体改法：${fixes.length ? fixes.join("；") : "补强目标、代价和章末钩子"}`,
		"改写边界：保留人物、场景、已发生事件和核心设定；不要只润色句子；不要新增无关设定。",
		"输出格式：1. 改写策略 2. 需要改的段落 3. 改写正文 4. 为什么这样改。",
	].join("\n");
}

const quickReviewProgressSteps = [
	{ startsAt: 0, label: "读取章节开头和结尾" },
	{ startsAt: 4, label: "判断题材与主线冲突" },
	{ startsAt: 8, label: "提取卖点和最大问题" },
	{ startsAt: 12, label: "整理改稿建议" },
	{ startsAt: 20, label: "等待模型返回" },
];

function getQuickReviewProgress(elapsedSeconds: number) {
	const activeStep =
		quickReviewProgressSteps.findLast((step) => elapsedSeconds >= step.startsAt) ??
		quickReviewProgressSteps[0];
	const percent = Math.min(92, Math.max(8, 8 + elapsedSeconds * 3));

	return {
		label: activeStep.label,
		percent,
	};
}
