"use client";

import { useMemo } from "react";
import type { ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2 } from "lucide-react";

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

function StepBadge({ done, label }: { done: boolean; label: string }) {
	return (
		<Badge variant={done ? "default" : "outline"} className="shrink-0">
			{done ? <CheckCircle2 className="mr-1 size-3.5" /> : null}
			{label}
		</Badge>
	);
}

export function DeepDiagnosisStepper({
	entryView = "deep",
	loading,
	quickReviewResult,
	referenceText,
	referenceTitle,
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

	return (
		<div className="space-y-4">
			<section className="space-y-4">
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="flex items-center gap-2 text-sm">
								<FileText className="size-4" />
								深度质检步骤
							</CardTitle>
							<Badge variant="secondary">
								当前步骤：{steps[currentStep]?.label ?? "参考资料"}
							</Badge>
						</div>
						<CardDescription>
							按参考资料、评分标准、评分结果的顺序推进；没有前一步，就不能进入下一步。
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-3 md:grid-cols-3">
							{steps.map((step, index) => (
								<div
									key={step.id}
									className={`rounded-lg border p-4 ${
										index === currentStep
											? "border-primary/40 bg-background"
											: "border-border bg-background/60"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<p className="font-medium">{step.label}</p>
										<StepBadge done={step.done} label={`步骤 ${index + 1}`} />
									</div>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{step.detail}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">步骤 1 · 参考资料</CardTitle>
						<CardDescription>
							上传参考章节或粘贴成熟样本；参考资料缺失时会提示。
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!hasReference ? (
							<div className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-surface p-4">
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
							<div className="rounded-md border border-success-border bg-success-surface p-4 text-sm">
								<p className="font-medium">已导入参考资料</p>
								<p className="mt-1 text-muted-foreground">
									{referenceTitle || "未命名参考"} · {referenceText.length} 字
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
								className="min-h-32 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6"
								value={referenceText}
								onChange={(event) => onReferenceTextChange(event.target.value)}
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

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">步骤 2 · 评分标准</CardTitle>
						<CardDescription>
							先生成 rubric，再进入评分；已有结果时可以重新生成。
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							className="w-full"
							onClick={onBuildRubric}
							disabled={loading || !hasQuickResult}
						>
							{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
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
							<div className="space-y-3 rounded-md border border-border bg-background p-4 text-sm">
								<p className="font-medium">
									{rubricResult.reference.oneSentenceSummary}
								</p>
								<p className="text-muted-foreground">
									{rubricResult.principles.length} 条可迁移原则 ·{" "}
									{rubricResult.rubric.metrics.length} 个评分指标
								</p>
							</div>
						) : (
							<div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
								生成后，这里会展示评分标准摘要和指标。
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">步骤 3 · 评分结果</CardTitle>
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
							<div className="space-y-3 rounded-md border border-border bg-background p-4 text-sm">
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
											{scoreEvidenceChain.items.slice(0, 4).map((item) => (
												<div
													key={item.id}
													className="rounded-md border border-border bg-card p-3 text-xs leading-5"
												>
													<p className="font-medium">{item.metricName}</p>
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
							<div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
								评分结果出来后，这里会展示摘要和证据链。
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
