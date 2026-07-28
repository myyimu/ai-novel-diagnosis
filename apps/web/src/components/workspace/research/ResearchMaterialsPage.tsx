"use client";

import { useRouter } from "next/navigation";

import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, BookOpen, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ResearchWorkspaceShell } from "./ResearchWorkspaceShell";

export function ResearchMaterialsPage() {
	const router = useRouter();

	const { bookAnalysisResult, exportBookResult } = useWorkspaceHandlers("book");

	const handleBackToBook = () => {
		router.push("/research/book");
	};

	const handleExport = () => {
		exportBookResult("markdown", "notes");
	};

	const hasResults = Boolean(bookAnalysisResult);

	return (
		<ResearchWorkspaceShell
			active="materials"
			title="研究资料"
			description="查看和管理整书拆解的研究结果和分析资料"
			status={hasResults ? "有资料" : "等待分析"}
		>
			<div className="space-y-4 [&>div]:rounded-[14px] [&>div]:border-[#e6e8eb] [&>div]:bg-white [&>div]:shadow-[0_6px_20px_rgba(22,27,34,.055)]">
				{!hasResults ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">暂无研究资料</h3>
							<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
								完成整书拆解后，分析结果会显示在这里
							</p>
							<Button onClick={handleBackToBook}>
								<ArrowLeft className="w-4 h-4 mr-2" />
								返回整书拆解
							</Button>
						</CardContent>
					</Card>
				) : (
					<>
						{/* 整书拆解结果概览 */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-success" />
									整书拆解结果
								</CardTitle>
								<CardDescription>已完成整书结构化分析</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 md:grid-cols-3">
									<div className="p-4 rounded-lg border bg-card">
										<div className="flex items-center gap-2 text-sm font-medium mb-2">
											<FileText className="w-4 h-4 text-primary" />
											章节结构
										</div>
										<p className="text-xs text-muted-foreground">
											{bookAnalysisResult?.characters.length || 0} 个人物
										</p>
									</div>

									<div className="p-4 rounded-lg border bg-card">
										<div className="flex items-center gap-2 text-sm font-medium mb-2">
											<BookOpen className="w-4 h-4 text-primary" />
											人物关系
										</div>
										<p className="text-xs text-muted-foreground">
											结构化人物数据
										</p>
									</div>

									<div className="p-4 rounded-lg border bg-card">
										<div className="flex items-center gap-2 text-sm font-medium mb-2">
											<FolderOpen className="w-4 h-4 text-primary" />
											情节模式
										</div>
										<p className="text-xs text-muted-foreground">
											情节发展分析
										</p>
									</div>
								</div>

								<div className="flex items-center justify-between pt-4 border-t">
									<div>
										<p className="text-sm font-medium">导出结果</p>
										<p className="text-xs text-muted-foreground">
											将分析结果导出为文件
										</p>
									</div>
									<Button variant="outline" size="sm" onClick={handleExport}>
										<Download className="w-4 h-4 mr-2" />
										导出结果
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* 人物列表 */}
						{bookAnalysisResult?.characters &&
							bookAnalysisResult.characters.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle className="text-base">人物列表</CardTitle>
										<CardDescription>整书拆解的人物角色</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{bookAnalysisResult.characters.map((char, index) => (
												<div
													key={index}
													className="flex items-center justify-between p-3 rounded-lg border bg-card"
												>
													<div className="flex items-center gap-3">
														<Badge
															variant="secondary"
															className="text-xs"
														>
															{char.role}
														</Badge>
														<div>
															<p className="text-sm font-medium">
																{char.sourceName ||
																	`人物${index + 1}`}
															</p>
															<p className="text-xs text-muted-foreground">
																{char.archetype || "无原型"}
															</p>
														</div>
													</div>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}

						{/* 操作按钮 */}
						<Card className="border-primary/50 bg-primary/5">
							<CardHeader>
								<CardTitle className="text-base">查看详细分析</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									可以查看人物关系图谱和情节模式分析
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => router.push("/research/patterns")}
									>
										查看图谱
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => router.push("/research/compare")}
									>
										样本对比
									</Button>
								</div>
							</CardContent>
						</Card>
					</>
				)}

				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">研究资料说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 整书拆解后会生成结构化的分析结果</p>
						<p>• 包含章节结构、人物关系和情节模式</p>
						<p>• 可以导出结果用于进一步分析和参考</p>
						<p>• 支持查看人物图谱和情节发展分析</p>
					</CardContent>
				</Card>
			</div>
		</ResearchWorkspaceShell>
	);
}
