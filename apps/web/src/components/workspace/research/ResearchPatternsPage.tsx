"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowLeft, Users, TrendingUp } from "lucide-react";

export function ResearchPatternsPage() {
	const router = useRouter();

	const { bookAnalysisResult, bookJob } = useWorkspaceHandlers("book");

	const taskNavItems: TaskNavItem[] = useMemo(
		() => [
			{
				id: "book",
				label: "整书拆解",
				description: "上传和分析整书内容",
				meta: "",
			},
			{
				id: "compare",
				label: "样本对比",
				description: "对比多个样本的写作风格",
				meta: "",
			},
			{
				id: "patterns",
				label: "图谱/模式",
				description: "查看人物关系和情节模式",
				meta: "当前",
			},
			{
				id: "materials",
				label: "研究资料",
				description: "管理和查看研究资料",
				meta: "",
			},
		],
		[],
	);

	const inspectorSections: ContextInspectorSection[] = useMemo(
		() => [
			{
				title: "分析状态",
				description: "当前图谱和模式分析的状态",
				fields: [
					{
						label: "任务状态",
						value: bookJob ? bookJob.status : "未创建",
						tone: bookJob ? "secondary" : "outline",
					},
					{
						label: "分析结果",
						value: bookAnalysisResult ? "可用" : "无结果",
						tone: bookAnalysisResult ? "secondary" : "outline",
					},
				],
			},
			{
				title: "页面信息",
				description: "图谱和模式页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/research/patterns",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "研究工作区",
						hint: "独立的图谱和模式查看页面",
					},
				],
			},
		],
		[bookJob, bookAnalysisResult],
	);

	const handleNavChange = (id: string) => {
		if (id === "book") {
			router.push("/research/book");
		} else if (id === "compare") {
			router.push("/research/compare");
		} else if (id === "materials") {
			router.push("/research/materials");
		}
	};

	const handleBackToBook = () => {
		router.push("/research/book");
	};

	const hasResults = Boolean(bookAnalysisResult);

	return (
		<WorkspaceTaskFrame
			title="图谱和模式"
			description="查看整书拆解后的人物关系图谱和情节模式分析"
			status={hasResults ? "有分析" : "等待分析"}
			taskNav={{
				items: taskNavItems,
				activeId: "patterns",
				onChange: handleNavChange,
				title: "研究导航",
				description: "选择要管理的研究内容",
			}}
			inspector={{
				title: "图谱上下文",
				description: "当前图谱和模式分析的统计和状态",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无分析数据。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				{!hasResults ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Network className="w-12 h-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">暂无图谱数据</h3>
							<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
								完成整书拆解后，人物关系图谱和情节模式会显示在这里
							</p>
							<Button onClick={handleBackToBook}>
								<ArrowLeft className="w-4 h-4 mr-2" />
								返回整书拆解
							</Button>
						</CardContent>
					</Card>
				) : (
					<>
						{/* 人物关系图谱 */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="w-5 h-5 text-primary" />
									人物关系图谱
								</CardTitle>
								<CardDescription>基于整书内容分析的人物关系网络</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-6 rounded-lg border bg-card flex flex-col items-center justify-center min-h-[200px]">
									<Network className="w-12 h-12 text-muted-foreground mb-4" />
									<p className="text-sm text-muted-foreground text-center">
										人物关系图谱可视化将在这里显示
									</p>
									<div className="mt-4 grid grid-cols-2 gap-4 text-center">
										<div className="p-3 rounded border bg-background">
											<p className="text-lg font-semibold">主要人物</p>
											<p className="text-xs text-muted-foreground">
												{bookAnalysisResult?.characters?.length || 0} 人
											</p>
										</div>
										<div className="p-3 rounded border bg-background">
											<p className="text-lg font-semibold">关系链接</p>
											<p className="text-xs text-muted-foreground">
												分析人物关系
											</p>
										</div>
									</div>
								</div>

								{bookAnalysisResult?.characters &&
									bookAnalysisResult.characters.length > 0 && (
										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-3">人物列表</h4>
											<div className="flex flex-wrap gap-2">
												{bookAnalysisResult.characters.map(
													(char, index) => (
														<Badge key={index} variant="secondary">
															{char.sourceName || `人物${index + 1}`}
														</Badge>
													),
												)}
											</div>
										</div>
									)}
							</CardContent>
						</Card>

						{/* 情节模式分析 */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="w-5 h-5 text-primary" />
									情节模式分析
								</CardTitle>
								<CardDescription>基于章节结构的情节发展模式</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-6 rounded-lg border bg-card">
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm">章节总数</span>
											<Badge variant="secondary">
												{bookAnalysisResult?.characters?.length || 0} 人
											</Badge>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm">情节结构</span>
											<span className="text-xs text-muted-foreground">
												线性发展 / 分支叙事
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm">节奏分析</span>
											<span className="text-xs text-muted-foreground">
												基于章节长度和内容密度
											</span>
										</div>
									</div>
								</div>

								{bookAnalysisResult?.characters &&
									bookAnalysisResult.characters.length > 0 && (
										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-3">人物概览</h4>
											<div className="space-y-2">
												{bookAnalysisResult.characters
													.slice(0, 5)
													.map((char, index) => (
														<div
															key={index}
															className="flex items-center gap-3 p-2 rounded border bg-card"
														>
															<Badge
																variant="outline"
																className="text-xs"
															>
																{index + 1}
															</Badge>
															<span className="text-sm">
																{char.sourceName ||
																	`人物 ${index + 1}`}
															</span>
														</div>
													))}
												{bookAnalysisResult.characters.length > 5 && (
													<p className="text-xs text-muted-foreground text-center pt-2">
														还有{" "}
														{bookAnalysisResult.characters.length - 5}{" "}
														个人物...
													</p>
												)}
											</div>
										</div>
									)}
							</CardContent>
						</Card>

						{/* 操作提示 */}
						<Card className="border-primary/50 bg-primary/5">
							<CardHeader>
								<CardTitle className="text-base">继续研究</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									查看更多分析结果或对比其他样本
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => router.push("/research/materials")}
									>
										查看资料
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
						<CardTitle className="text-sm">图谱和模式说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 人物关系图谱基于文本分析自动生成</p>
						<p>• 情节模式分析展示章节结构和叙事节奏</p>
						<p>• 可视化展示有助于理解人物关系网络</p>
						<p>• 支持导出分析结果用于进一步研究</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
