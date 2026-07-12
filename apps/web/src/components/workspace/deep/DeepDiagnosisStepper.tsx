"use client";

import { useMemo } from "react";
import type { ChangeEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DiagnosisExampleOption } from "@/lib/diagnosis-examples";
import { buildScoreEvidenceChain } from "@/lib/research-library";
import type { RubricResult, ScoreResult } from "@/stores/workspace-store";

type QuickReviewResult = import("@/stores/workspace-store").QuickReviewResult;
type ScoreEvidenceChain = ReturnType<typeof buildScoreEvidenceChain>;

export interface DeepDiagnosisStepperProps {
	entryView?: "deep" | "score" | "evidence";
	loading: boolean;
	quickReviewResult: QuickReviewResult | null;
	referenceText: string;
	referenceTitle: string;
	chapterTitle: string;
	chapterText: string;
	rubricResult: RubricResult | null;
	scoreResult: ScoreResult | null;
	scoreEvidenceChain: ScoreEvidenceChain;
	hasRubricCache: boolean;
	hasScoreCache: boolean;
	onReferenceTextChange: (value: string) => void;
	onImportReferenceFile: (event: ChangeEvent<HTMLInputElement>) => void;
	onBuildRubric: () => void;
	onScoreChapter: () => void;
	onRebuildRubric: () => void;
	onRescoreChapter: () => void;
	diagnosisExampleOptions: DiagnosisExampleOption[];
	onUseExampleChapter: (exampleId: string) => void;
}

export function DeepDiagnosisStepper({
	entryView = "deep",
	loading,
	quickReviewResult,
	referenceText,
	referenceTitle,
	chapterTitle,
	rubricResult,
	scoreResult,
	scoreEvidenceChain,
	hasRubricCache,
	hasScoreCache,
	onReferenceTextChange,
	onImportReferenceFile,
	onBuildRubric,
	onScoreChapter,
	onRebuildRubric,
	onRescoreChapter,
	diagnosisExampleOptions,
	onUseExampleChapter,
}: DeepDiagnosisStepperProps) {
	const hasQuickResult = Boolean(quickReviewResult);
	const hasReference = referenceText.trim().length > 0;
	const hasRubric = Boolean(rubricResult);
	const hasScore = Boolean(scoreResult);
	const steps = useMemo(
		() => [
			{
				id: "reference",
				label: "参考资料",
				done: hasReference,
				detail: hasReference
					? `${referenceTitle || "已导入参考文本"} · ${referenceText.length} 字`
					: "尚未导入参考资料。",
			},
			{
				id: "rubric",
				label: "评分标准",
				done: hasRubric,
				detail: hasRubric
					? rubricResult?.reference.oneSentenceSummary || "评分标准已生成。"
					: "先生成评分标准，再进入评分。",
			},
			{
				id: "score",
				label: "评分结果",
				done: hasScore,
				detail: hasScore
					? `${scoreResult?.totalScore ?? 0}/10 · ${scoreResult?.weakestPoint ?? "暂无结论"}`
					: "评分结果和证据链会在这里完成。",
			},
		],
		[
			hasReference,
			hasRubric,
			hasScore,
			referenceText.length,
			referenceTitle,
			rubricResult,
			scoreResult,
		],
	);

	const currentStep =
		entryView === "score"
			? hasScore
				? 2
				: hasRubric
					? 1
					: 0
			: entryView === "evidence"
				? hasScore
					? 2
					: 0
				: hasScore
					? 2
					: hasRubric
						? 1
						: 0;
	const hasScoreEvidenceChain = scoreEvidenceChain.items.length > 0;
	const workflowSteps = [
		{
			label: "参考拆书",
			detail: hasReference ? steps[0].detail : "提取标杆规律",
			done: hasReference,
		},
		{
			label: "评价标准",
			detail: hasRubric ? "已生成可调评分标准" : "生成可调权重",
			done: hasRubric,
		},
		{
			label: "章节评分",
			detail: hasScore ? `${scoreResult?.totalScore ?? 0}/10` : "逐章发现风险",
			done: hasScore,
		},
		{
			label: "报告落地",
			detail: hasScoreEvidenceChain ? "接入改稿证据链" : "加入改稿计划",
			done: hasScoreEvidenceChain,
		},
	];
	const command = hasScore
		? {
				label: "当前阶段 4/4",
				title: "接住结果并回流改稿",
				hint:
					scoreEvidenceChain.summary ||
					"评分完成后，优先把最低分指标转成下一轮修改指令。",
				action: "重新深度质检",
				onClick: onRescoreChapter,
				disabled: loading,
			}
		: hasRubric
			? {
					label: "当前阶段 3/4",
					title: "运行章节评分",
					hint: "按评分标准检查当前章节，输出弱项、正文证据和下一步改稿动作。",
					action: "开始深度质检",
					onClick: onScoreChapter,
					disabled: loading || !rubricResult,
				}
			: {
					label: "当前阶段 1/4",
					title: "选参考样本并拆出标准信号",
					hint: "先选择题材接近的参考样本，再把优秀作品的规律转成当前书可执行的评价标准。",
					action: "生成评分标准",
					onClick: onBuildRubric,
					disabled: loading || !hasQuickResult,
				};

	return (
		<div className="mx-auto w-[min(1440px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[820px]:w-[calc(100%_-_24px)] max-[820px]:py-[22px]">
			<section className="mb-[22px] flex items-end justify-between gap-6 max-[820px]:block">
				<div>
					<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
						深度质检
					</h1>
					<p className="max-w-[760px] text-sm leading-6 text-[#69707d]">
						参考样本 → 标准 → 评分 →
						报告落地，把“好作品的规律”转成当前章节可执行的改稿动作。
					</p>
				</div>
				<Badge className="max-[820px]:mt-4" variant="secondary">
					当前步骤：{steps[currentStep]?.label ?? "参考资料"}
				</Badge>
			</section>

			<section className="mb-3.5 flex items-center justify-between gap-[18px] rounded-[14px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[820px]:block">
				<div>
					<span className="mb-1.5 block text-[10px] font-extrabold text-[#d94710]">
						{command.label}
					</span>
					<h2 className="text-lg font-bold leading-snug">{command.title}</h2>
					<p className="mt-1.5 max-w-[760px] text-sm leading-6 text-[#69707d]">
						{command.hint}
					</p>
				</div>
				<div className="flex shrink-0 flex-wrap justify-end gap-2 max-[820px]:mt-3 max-[820px]:justify-start">
					<Button
						onClick={command.onClick}
						disabled={command.disabled}
						className="rounded-[9px] border-[#ff5a1f] bg-[#ff5a1f] font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:bg-[#e84b13]"
					>
						{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
						{command.action}
					</Button>
					<Button variant="outline" className="rounded-[9px] border-[#d8dbe0] font-bold">
						查看质检发现
					</Button>
				</div>
			</section>

			<div className="grid items-start gap-3.5 [grid-template-columns:250px_minmax(0,1fr)_320px] max-[1180px]:grid-cols-[220px_minmax(0,1fr)] max-[820px]:block">
				<aside className="sticky top-4 overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[1180px]:static max-[820px]:mb-3">
					<div className="border-b border-[#e6e8eb] p-3.5">
						<label className="mb-2 block text-[10px] font-bold text-[#59616c]">
							当前章节
						</label>
						<div className="rounded-[10px] border border-[#d8dbe0] bg-white px-3 py-2 text-sm font-bold">
							{chapterTitle || "未选择章节"}
						</div>
					</div>
					<nav className="grid gap-2 p-2.5" aria-label="深度质检步骤">
						{workflowSteps.map((step, index) => (
							<div
								key={step.label}
								className={`grid min-h-[66px] grid-cols-[30px_1fr] items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left ${
									index === Math.min(currentStep, 2)
										? "border-[#ffd2c0] bg-[#fff2ec] text-[#bd4214]"
										: "border-transparent text-[#555f6d]"
								}`}
							>
								<span
									className={`row-span-2 grid size-7 place-items-center rounded-[9px] text-[11px] font-extrabold ${
										step.done ? "bg-[#ff5a1f] text-white" : "bg-[#eef2f7]"
									}`}
								>
									{index + 1}
								</span>
								<b className="text-xs">{step.label}</b>
								<small className="text-[9px] text-[#69707d]">{step.detail}</small>
							</div>
						))}
					</nav>
				</aside>

				<section className="grid min-w-0 gap-3.5">
					<Card className="rounded-[14px] border-[#e6e8eb] bg-gradient-to-br from-white to-[#f8fbff] shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<CardContent className="flex items-stretch justify-between gap-5 p-5 max-[820px]:block">
							<div>
								<span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#2e5cb9]">
									Deep Quality
								</span>
								<h2 className="text-[25px] font-bold leading-tight">
									先拆优秀作品，再质检自己的小说
								</h2>
								<p className="mt-2 max-w-[720px] text-sm leading-6 text-[#69707d]">
									从参考样本里抽取开篇承诺、节奏反馈、人物成长和爽点兑现规则，再映射到当前章节的评分与改稿计划。
								</p>
							</div>
							<div className="grid min-w-[170px] place-items-center rounded-xl border border-[#d8e2f6] bg-white p-4 text-center max-[820px]:mt-3">
								<span className="text-[10px] text-[#69707d]">当前章节质量分</span>
								<strong className="text-[42px] leading-none text-[#2e5cb9]">
									{hasScore ? scoreResult?.totalScore : "--"}
								</strong>
								<small className="text-[#586575]">
									{hasScore ? scoreResult?.weakestPoint : "等待质检"}
								</small>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-3.5 xl:grid-cols-2">
						<Card className="rounded-[14px] border-[#e6e8eb] shadow-[0_4px_18px_rgba(22,27,34,.06)]">
							<CardHeader>
								<CardTitle className="text-base">选择参考作品</CardTitle>
								<CardDescription>
									上传参考章节或粘贴成熟样本，用来生成评分标准。
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{!hasReference ? (
									<div className="flex items-start gap-3 rounded-[10px] border border-warning-border bg-warning-surface p-4">
										<AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
										<div className="space-y-1">
											<p className="text-sm font-medium text-warning-foreground">
												尚未提供参考资料
											</p>
											<p className="text-sm leading-6 text-warning-foreground/90">
												可以先用现有章节直接生成评分标准，但参考资料越完整，评分标准越稳定。
											</p>
										</div>
									</div>
								) : (
									<div className="rounded-[10px] border border-success-border bg-success-surface p-4 text-sm">
										<p className="font-medium">已导入参考资料</p>
										<p className="mt-1 text-muted-foreground">
											{referenceTitle || "未命名参考"} ·{" "}
											{referenceText.length} 字
										</p>
									</div>
								)}
								<div className="space-y-2">
									<Input
										type="file"
										accept=".txt,.md,text/plain,text/markdown"
										onChange={onImportReferenceFile}
									/>
									<textarea
										className="min-h-32 w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white p-3 text-sm leading-6"
										value={referenceText}
										onChange={(event) =>
											onReferenceTextChange(event.target.value)
										}
										placeholder="粘贴成熟章节作为参考..."
									/>
								</div>
								{diagnosisExampleOptions.length ? (
									<div className="space-y-2">
										<p className="text-xs font-medium text-muted-foreground">
											快速示例
										</p>
										<div className="flex flex-wrap gap-2">
											{diagnosisExampleOptions.slice(0, 3).map((example) => (
												<Button
													key={example.id}
													type="button"
													variant="outline"
													size="sm"
													onClick={() => onUseExampleChapter(example.id)}
												>
													{example.label}
												</Button>
											))}
										</div>
									</div>
								) : null}
							</CardContent>
						</Card>

						<Card className="rounded-[14px] border-[#e6e8eb] shadow-[0_4px_18px_rgba(22,27,34,.06)]">
							<CardHeader>
								<CardTitle className="text-base">拆解结果与评分标准</CardTitle>
								<CardDescription>生成后会形成可复用的评价标准库。</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Button
									className="w-full"
									onClick={onBuildRubric}
									disabled={loading || !hasQuickResult}
								>
									{loading ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									生成评分标准
								</Button>
								{hasRubricCache ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={onRebuildRubric}
										disabled={loading}
									>
										重新生成评分标准
									</Button>
								) : null}
								{rubricResult ? (
									<div className="space-y-3 rounded-[10px] border border-border bg-background p-4 text-sm">
										<p className="font-medium">
											{rubricResult.reference.oneSentenceSummary}
										</p>
										<p className="text-muted-foreground">
											{rubricResult.principles.length} 条可迁移原则 ·{" "}
											{rubricResult.rubric.metrics.length} 个评分指标
										</p>
									</div>
								) : (
									<div className="rounded-[10px] border border-border bg-background p-4 text-sm text-muted-foreground">
										生成后，这里会展示评分标准摘要和指标。
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<Card className="rounded-[14px] border-[#e6e8eb] shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<CardHeader>
							<CardTitle className="text-base">检测自己的章节</CardTitle>
							<CardDescription>
								评分必须在 rubric 完成后进行；结果证据跟随评分结论展示。
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button
								className="w-full"
								onClick={onScoreChapter}
								disabled={loading || !rubricResult}
							>
								{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
								开始评分
							</Button>
							{hasScoreCache ? (
								<Button
									variant="outline"
									className="w-full"
									onClick={onRescoreChapter}
									disabled={loading}
								>
									重新评分
								</Button>
							) : null}
							{scoreResult ? (
								<div className="space-y-3 rounded-[10px] border border-border bg-background p-4 text-sm">
									<div className="flex items-center justify-between gap-3">
										<p className="font-medium">编辑结论</p>
										<Badge>{scoreResult.totalScore}/10</Badge>
									</div>
									<p className="leading-6 text-muted-foreground">
										优先改：{scoreResult.weakestPoint}
									</p>
									<p className="leading-6 text-muted-foreground">
										下一步：{scoreResult.nextRevisionMove}
									</p>
									<p className="leading-6 text-muted-foreground">
										保留优势：{scoreResult.strongestPoint}
									</p>
									{scoreEvidenceChain.items.length ? (
										<div className="border-t pt-3">
											<div className="flex items-center justify-between gap-3">
												<p className="font-medium">证据链</p>
												<Badge variant="secondary">
													{scoreEvidenceChain.items.length} 项
												</Badge>
											</div>
											<p className="mt-2 leading-6 text-muted-foreground">
												{scoreEvidenceChain.summary}
											</p>
											<div className="mt-3 space-y-2">
												{scoreEvidenceChain.items
													.slice(0, 4)
													.map((item) => (
														<div
															key={item.id}
															className="rounded-[10px] border border-border bg-card p-3 text-xs leading-5"
														>
															<p className="font-medium">
																{item.metricName}
															</p>
															<p className="mt-1 text-muted-foreground">
																{item.score}/10 · {item.reason}
															</p>
															<p className="mt-1 text-muted-foreground">
																证据：{item.evidence}
															</p>
															<p className="mt-1 text-muted-foreground">
																改法：{item.fix}
															</p>
														</div>
													))}
											</div>
										</div>
									) : null}
								</div>
							) : (
								<div className="rounded-[10px] border border-border bg-background p-4 text-sm text-muted-foreground">
									点击“开始深度质检”后，这里会展示摘要和证据链。
								</div>
							)}
						</CardContent>
					</Card>
				</section>

				<aside className="sticky top-4 overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[1180px]:static max-[1180px]:col-span-2 max-[820px]:mt-3">
					<div className="flex items-center justify-between border-b border-[#e6e8eb] px-4 py-3">
						<strong className="text-sm">质检发现</strong>
						<Badge variant="secondary">{scoreEvidenceChain.items.length} 条</Badge>
					</div>
					<div className="grid gap-2.5 p-3">
						{scoreEvidenceChain.items.length ? (
							scoreEvidenceChain.items.slice(0, 5).map((item) => (
								<article
									key={item.id}
									className="rounded-[10px] border border-[#e6e8eb] bg-white p-3 text-xs leading-5"
								>
									<Badge variant={item.score < 6 ? "destructive" : "outline"}>
										{item.score}/10
									</Badge>
									<b className="mt-2 block text-sm">{item.metricName}</b>
									<p className="mt-1 text-[#69707d]">{item.fix}</p>
								</article>
							))
						) : (
							<div className="p-4 text-center text-xs leading-5 text-[#69707d]">
								运行质检后会在这里列出可落地风险。
							</div>
						)}
					</div>
				</aside>
			</div>
		</div>
	);
}
