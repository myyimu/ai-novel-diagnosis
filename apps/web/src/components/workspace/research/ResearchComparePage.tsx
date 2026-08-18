"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ResearchWorkspaceShell } from "./ResearchWorkspaceShell";
import { ArrowLeft, BookOpen, GitCompare, HelpCircle, Loader2, RefreshCw } from "lucide-react";

const FOCUS_MAX_LENGTH = 300;

export function ResearchComparePage() {
	const router = useRouter();

	const {
		persistedResearchLibrary,
		selectedResearchJobIds,
		toggleResearchSample,
		comparisonFocus,
		setComparisonFocus,
		runResearchComparison,
		researchComparison,
		researchQuestion,
		setResearchQuestion,
		askResearchLibrary,
		researchQaResult,
		loadResearchLibrary,
		loading,
	} = useWorkspaceHandlers("library");

	const samples = persistedResearchLibrary?.comparisonSamples ?? [];
	const hasSamples = samples.length > 0;
	const selectedCount = selectedResearchJobIds.length;
	const isComparing = loading === "compare";
	const isAsking = loading === "ask";
	const isLoadingLibrary = loading === "research";
	const canCompare = selectedCount >= 2 && !isComparing;

	const statusChip = isComparing
		? "对比中…"
		: isAsking
			? "问答中…"
			: isLoadingLibrary
				? "读取研究库…"
				: researchComparison
					? "有结果"
					: "样本对比";

	const handleCompare = () => {
		runResearchComparison();
	};

	const handleAsk = () => {
		askResearchLibrary();
	};

	return (
		<ResearchWorkspaceShell
			active="compare"
			title="样本对比"
			description="从研究库选择已完成的整书样本，做多书横向对比与资料问答"
			status={statusChip}
		>
			<div className="space-y-4 [&>div]:rounded-[14px] [&>div]:border-[#e6e8eb] [&>div]:bg-white [&>div]:shadow-[0_6px_20px_rgba(22,27,34,.055)]">
				{!hasSamples ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							{isLoadingLibrary ? (
								<>
									<Loader2 className="w-10 h-10 text-muted-foreground mb-4 animate-spin" />
									<p className="text-sm text-muted-foreground">正在读取研究库…</p>
								</>
							) : (
								<>
									<BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-semibold mb-2">
										研究库暂无可用样本
									</h3>
									<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
										横向对比需要至少 2
										本已完成整书拆解的样本。先去完成一本书的整书拆解，再回到这里对比。
									</p>
									<div className="flex gap-2">
										<Button onClick={() => router.push("/research/book")}>
											<ArrowLeft className="w-4 h-4 mr-2" />
											前往整书拆解
										</Button>
										<Button
											variant="outline"
											onClick={() => void loadResearchLibrary()}
										>
											<RefreshCw className="w-4 h-4 mr-2" />
											刷新研究库
										</Button>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				) : (
					<>
						{/* 样本选择 */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<GitCompare className="w-5 h-5" />
									选择对比样本
									<Badge variant="secondary" className="ml-1 text-xs">
										已选 {selectedCount}/8
									</Badge>
								</CardTitle>
								<CardDescription>
									从研究库勾选 2-8
									本已完成样本；系统会对比开局承诺、爽点组合、情绪策略等维度。
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-3 md:grid-cols-2">
									{samples.map((sample) => {
										const checked = selectedResearchJobIds.includes(
											sample.jobId,
										);
										const disabled = !checked && selectedCount >= 8;
										return (
											<label
												key={sample.jobId}
												className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
													checked
														? "border-primary/60 bg-primary/5"
														: "border-[#e6e8eb]"
												} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
											>
												<input
													type="checkbox"
													checked={checked}
													disabled={disabled}
													onChange={() =>
														toggleResearchSample(sample.jobId)
													}
													className="mt-1"
												/>
												<div className="min-w-0 space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="text-sm font-medium truncate">
															{sample.title}
														</span>
														<Badge
															variant="outline"
															className="text-xs"
														>
															{sample.genre}
														</Badge>
													</div>
													{sample.coreAppeal.length > 0 && (
														<div className="flex flex-wrap gap-1">
															{sample.coreAppeal
																.slice(0, 4)
																.map((appeal) => (
																	<Badge
																		key={appeal}
																		variant="secondary"
																		className="text-xs"
																	>
																		{appeal}
																	</Badge>
																))}
														</div>
													)}
													{sample.compareUse && (
														<p className="text-xs text-muted-foreground leading-5">
															{sample.compareUse}
														</p>
													)}
												</div>
											</label>
										);
									})}
								</div>

								<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
									<div className="flex flex-1 items-center gap-2 min-w-[260px]">
										<input
											value={comparisonFocus}
											maxLength={FOCUS_MAX_LENGTH}
											onChange={(event) =>
												setComparisonFocus(event.target.value)
											}
											placeholder="可选：对比侧重点，如「开局承诺与爽点组合的取舍」"
											className="w-full px-3 py-2 text-sm border rounded-md bg-background"
										/>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											onClick={() => void loadResearchLibrary()}
										>
											<RefreshCw className="w-4 h-4 mr-2" />
											刷新研究库
										</Button>
										<Button disabled={!canCompare} onClick={handleCompare}>
											{isComparing ? (
												<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											) : (
												<GitCompare className="w-4 h-4 mr-2" />
											)}
											{selectedCount < 2
												? `至少选择 2 本（当前 ${selectedCount}）`
												: "开始对比"}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* 对比结果 */}
						{researchComparison ? (
							<Card className="border-muted-foreground/50">
								<CardHeader>
									<CardTitle className="text-base">对比结果</CardTitle>
									<CardDescription>
										共 {researchComparison.sampleCount} 本样本
										{researchComparison.focus
											? ` · 侧重点：${researchComparison.focus}`
											: ""}
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-5">
									<div className="grid gap-3 md:grid-cols-2">
										{researchComparison.samples.map((sample) => (
											<div
												key={sample.jobId}
												className="rounded-lg border p-3 space-y-2"
											>
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-sm font-semibold truncate">
														{sample.title}
													</span>
													<Badge variant="outline" className="text-xs">
														{sample.genre}
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground leading-5">
													<span className="font-medium text-foreground">
														开局承诺：
													</span>
													{sample.openingPromise || "—"}
												</p>
												<p className="text-xs text-muted-foreground leading-5">
													<span className="font-medium text-foreground">
														爽点组合：
													</span>
													{sample.appealCombination || "—"}
												</p>
												<p className="text-xs text-muted-foreground leading-5">
													<span className="font-medium text-foreground">
														情绪策略：
													</span>
													{sample.emotionStrategy || "—"}
												</p>
												<p className="text-xs text-muted-foreground leading-5">
													<span className="font-medium text-foreground">
														钩子策略：
													</span>
													{sample.hookStrategy || "—"}
												</p>
												{sample.reusablePatterns.length > 0 && (
													<div className="flex flex-wrap gap-1">
														{sample.reusablePatterns.map((pattern) => (
															<Badge
																key={pattern}
																variant="secondary"
																className="text-xs"
															>
																{pattern}
															</Badge>
														))}
													</div>
												)}
												{sample.riskBoundary.length > 0 && (
													<p className="text-xs text-destructive leading-5">
														风险边界：{sample.riskBoundary.join("；")}
													</p>
												)}
											</div>
										))}
									</div>

									{researchComparison.commonPatterns.length > 0 && (
										<div>
											<h4 className="text-sm font-semibold mb-2">共性规律</h4>
											<ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
												{researchComparison.commonPatterns.map(
													(pattern) => (
														<li key={pattern}>{pattern}</li>
													),
												)}
											</ul>
										</div>
									)}

									{researchComparison.differentiationMap.length > 0 && (
										<div>
											<h4 className="text-sm font-semibold mb-2">
												差异化地图
											</h4>
											<div className="space-y-2">
												{researchComparison.differentiationMap.map(
													(item) => (
														<div
															key={item.jobId}
															className="rounded-lg border bg-muted/30 p-3 text-xs leading-5"
														>
															<span className="font-semibold">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																（{item.genre}）
															</span>
															<p className="mt-1">
																<span className="font-medium">
																	独有信号：
																</span>
																{item.uniqueSignals.join("；") ||
																	"—"}
															</p>
															<p>
																<span className="font-medium">
																	可复用长处：
																</span>
																{item.reusableStrengths.join(
																	"；",
																) || "—"}
															</p>
														</div>
													),
												)}
											</div>
										</div>
									)}

									{researchComparison.beginnerTakeaways.length > 0 && (
										<div>
											<h4 className="text-sm font-semibold mb-2">
												新手可借鉴要点
											</h4>
											<ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
												{researchComparison.beginnerTakeaways.map(
													(takeaway) => (
														<li key={takeaway}>{takeaway}</li>
													),
												)}
											</ol>
										</div>
									)}

									{researchComparison.promptSeed && (
										<div className="rounded-lg border border-dashed p-3">
											<h4 className="text-sm font-semibold mb-1">
												可直接使用的首写提示
											</h4>
											<p className="text-xs text-muted-foreground leading-5 whitespace-pre-wrap">
												{researchComparison.promptSeed}
											</p>
										</div>
									)}

									{researchComparison.limits && (
										<p className="text-xs text-muted-foreground leading-5 border-t pt-3">
											{researchComparison.limits}
										</p>
									)}
								</CardContent>
							</Card>
						) : (
							<Card className="border-muted-foreground/50">
								<CardHeader>
									<CardTitle className="text-base">对比结果</CardTitle>
									<CardDescription>写作风格和结构特征分析结果</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="text-center py-8 border border-dashed rounded-lg">
										<GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
										<p className="text-sm text-muted-foreground mb-4">
											选择至少 2 本样本并点击「开始对比」后，结果将显示在这里
										</p>
									</div>
								</CardContent>
							</Card>
						)}

						{/* 资料问答 */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<HelpCircle className="w-5 h-5" />
									资料问答
								</CardTitle>
								<CardDescription>
									基于已完成的整书拆解资料回答问题；未勾选样本时默认使用整个研究库。
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<textarea
									value={researchQuestion}
									onChange={(event) => setResearchQuestion(event.target.value)}
									placeholder="例如：这三本书的开局如何在前三段立住期待感？"
									className="w-full min-h-[90px] px-3 py-2 text-sm border rounded-md bg-background"
								/>
								<div className="flex items-center justify-between gap-3">
									<span className="text-xs text-muted-foreground">
										{selectedCount > 0
											? `将限定在已选 ${selectedCount} 本样本内检索`
											: ""}
									</span>
									<Button
										disabled={!researchQuestion.trim() || isAsking}
										onClick={handleAsk}
									>
										{isAsking ? (
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										) : (
											<HelpCircle className="w-4 h-4 mr-2" />
										)}
										提问
									</Button>
								</div>

								{researchQaResult && (
									<div className="space-y-4 border-t pt-4">
										<p className="text-sm leading-6 whitespace-pre-wrap">
											{researchQaResult.answer}
										</p>

										{researchQaResult.keyFindings.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">
													关键发现
												</h4>
												<div className="space-y-2">
													{researchQaResult.keyFindings.map((finding) => (
														<div
															key={finding.claim}
															className="rounded-lg border bg-muted/30 p-3 text-xs leading-5"
														>
															<p className="font-medium">
																{finding.claim}
															</p>
															{finding.promptUse && (
																<p className="mt-1 text-muted-foreground">
																	提示词用法：{finding.promptUse}
																</p>
															)}
														</div>
													))}
												</div>
											</div>
										)}

										{researchQaResult.citations.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">
													引用资料
												</h4>
												<ul className="space-y-1 text-xs text-muted-foreground">
													{researchQaResult.citations.map((citation) => (
														<li key={citation.sourceId}>
															<span className="font-medium text-foreground">
																[{citation.sourceId}]{" "}
																{citation.title}
															</span>
															（{citation.field}）：{citation.snippet}
														</li>
													))}
												</ul>
											</div>
										)}

										{researchQaResult.sourceGaps.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">
													资料缺口
												</h4>
												<ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
													{researchQaResult.sourceGaps.map((gap) => (
														<li key={gap}>{gap}</li>
													))}
												</ul>
											</div>
										)}

										{researchQaResult.nextQuestions.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">
													可以继续追问
												</h4>
												<div className="flex flex-wrap gap-2">
													{researchQaResult.nextQuestions.map(
														(question) => (
															<Button
																key={question}
																variant="outline"
																size="sm"
																onClick={() =>
																	setResearchQuestion(question)
																}
															>
																{question}
															</Button>
														),
													)}
												</div>
											</div>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</ResearchWorkspaceShell>
	);
}
