"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import type { QuickReviewResult } from "@/stores/workspace-store";

export function QuickExperiencePanel({
	chapterText,
	providerLabel,
	loading,
	elapsedSeconds,
	quickReviewResult,
	onChapterTextChange,
	onRun,
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
	onChapterTextChange: (value: string) => void;
	onRun: () => void;
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
	const quickScore =
		typeof quickReviewResult?.quickScore === "number"
			? `${quickReviewResult.quickScore}/10`
			: "待确认";
	const confidence =
		typeof quickReviewResult?.confidence === "number"
			? Math.round(quickReviewResult.confidence * 100)
			: null;
	const activeProgress = getQuickReviewProgress(elapsedSeconds);

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold">快速点评</h2>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						粘贴一段章节正文，先生成轻量点评。这里会使用当前 AI 设置；如果你配置了自己的
						API Key，请求会走你的模型服务。
					</p>
				</div>
				<div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
					当前 AI：{providerLabel}
				</div>
			</div>
			<div className="mt-5 grid gap-4 xl:grid-cols-[1fr_220px]">
				<div>
					<Label htmlFor="quick-chapter-text">章节正文</Label>
					<textarea
						id="quick-chapter-text"
						value={chapterText}
						onChange={(event) => onChapterTextChange(event.target.value)}
						className="mt-2 min-h-40 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						placeholder="粘贴你想点评的章节正文（至少 50 字）"
					/>
				</div>
				<div className="flex flex-col justify-between gap-3 rounded-md border border-border bg-background p-4">
					<div className="space-y-2 text-sm text-muted-foreground">
						<p>单次 AI 调用，10-30 秒出结果。</p>
						<p>给出定位、卖点、问题和改稿建议。</p>
						<p>需要精调时再进入单章点评。</p>
					</div>
					<div className="space-y-2">
						<Button className="w-full" onClick={onRun} disabled={loading}>
							{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							生成快速点评
						</Button>
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
						<CheckCircle2 className="size-5 text-emerald-400" />
						<h3 className="text-base font-semibold">快速点评：{quickScore}</h3>
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
					<div>
						<p className="text-sm font-medium">卖点</p>
						<ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
							{sellingPoints.length ? (
								sellingPoints.map((point, index) => <li key={index}>{point}</li>)
							) : (
								<li>模型没有返回明确卖点，请重试或进入完整点评。</li>
							)}
						</ul>
					</div>
					<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
						<p className="text-sm font-medium text-amber-200">最大问题</p>
						<p className="mt-1 text-sm leading-6">
							{quickReviewResult.mainProblem ||
								"模型没有返回明确问题，请重试或进入完整点评。"}
						</p>
					</div>
					<div>
						<p className="text-sm font-medium">改稿建议</p>
						<ol className="mt-1 list-inside list-decimal space-y-1 text-sm leading-6 text-muted-foreground">
							{actionableFixes.length ? (
								actionableFixes.map((fix, index) => <li key={index}>{fix}</li>)
							) : (
								<li>模型没有返回具体改法，请重试或进入完整点评。</li>
							)}
						</ol>
					</div>
					<p className="text-xs leading-5 text-muted-foreground">
						{quickReviewResult.readyReason ||
							"如果结果不完整，建议重试一次或进入完整评分。"}
					</p>
					<div className="flex flex-wrap gap-2 pt-2">
						<Button onClick={onOpenCritique}>生成评分标准并详细打分</Button>
						<Button variant="outline" onClick={onOpenBook}>
							拆解整本书
						</Button>
					</div>
				</div>
			) : null}
		</section>
	);
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
