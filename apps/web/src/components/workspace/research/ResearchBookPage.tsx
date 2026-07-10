"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Upload, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export function ResearchBookPage() {
	const router = useRouter();

	const {
		bookFile,
		bookText,
		bookJob,
		bookAnalysisResult,
		bookStatusText,
		bookProgressDetail,
		analyzeBook,
		setBookText,
		setBookFile,
	} = useWorkspaceHandlers("book");

	const taskNavItems: TaskNavItem[] = useMemo(
		() => [
			{
				id: "book",
				label: "整书拆解",
				description: "上传和分析整书内容",
				meta: "当前",
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
				meta: "",
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
				title: "任务状态",
				description: "当前整书拆解任务的状态",
				fields: [
					{
						label: "任务状态",
						value: bookJob ? bookJob.status : "未创建",
						tone: bookJob ? "secondary" : "outline",
					},
					{
						label: "状态描述",
						value: bookStatusText || "无任务",
					},
					{
						label: "完成进度",
						value: bookProgressDetail ? `${bookProgressDetail.outline.percent}%` : "0%",
						hint: bookProgressDetail
							? `${bookProgressDetail.outline.current}/${bookProgressDetail.outline.total} 章节`
							: undefined,
					},
				],
			},
			{
				title: "页面信息",
				description: "整书拆解页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/research/book",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "研究工作区",
						hint: "独立的整书拆解任务页面",
					},
				],
			},
		],
		[bookJob, bookStatusText, bookProgressDetail],
	);

	const handleNavChange = (id: string) => {
		if (id === "compare") {
			router.push("/research/compare");
		} else if (id === "patterns") {
			router.push("/research/patterns");
		} else if (id === "materials") {
			router.push("/research/materials");
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setBookFile(file);
		}
	};

	const handleAnalyze = () => {
		analyzeBook();
	};

	const isJobRunning = bookJob?.status === "queued" || bookJob?.status === "running";
	const hasJob = Boolean(bookJob?.id);
	const hasResult = Boolean(bookAnalysisResult);

	return (
		<WorkspaceTaskFrame
			title="整书拆解"
			description="上传整书文本或文件，进行异步拆解和结构分析"
			status={bookStatusText || "准备就绪"}
			taskNav={{
				items: taskNavItems,
				activeId: "book",
				onChange: handleNavChange,
				title: "研究导航",
				description: "选择要管理的研究内容",
			}}
			inspector={{
				title: "任务上下文",
				description: "当前整书拆解任务的配置和状态",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无任务信息。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				{/* 上传和输入区域 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="w-5 h-5" />
							上传整书内容
						</CardTitle>
						<CardDescription>
							上传 TXT 文件或直接粘贴整书内容，系统将进行异步拆解
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<label className="text-sm font-medium">选择文件</label>
								<input
									type="file"
									accept=".txt"
									onChange={handleFileSelect}
									className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background"
									disabled={isJobRunning}
								/>
								{bookFile && (
									<div className="text-xs text-muted-foreground">
										已选择: {bookFile.name} ({(bookFile.size / 1024).toFixed(1)}{" "}
										KB)
									</div>
								)}
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">或粘贴文本</label>
								<textarea
									value={bookText}
									onChange={(e) => setBookText(e.target.value)}
									placeholder="在这里粘贴整书内容..."
									className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background"
									disabled={isJobRunning}
								/>
								<div className="text-xs text-muted-foreground">
									当前字数: {bookText.trim().length} 字
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end pt-4 border-t">
							<Button
								onClick={handleAnalyze}
								disabled={isJobRunning || (!bookFile && !bookText.trim())}
							>
								{isJobRunning ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										处理中...
									</>
								) : bookAnalysisResult ? (
									"重新分析"
								) : (
									<>
										<BookOpen className="w-4 h-4 mr-2" />
										开始拆解
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* 任务状态 */}
				{hasJob && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">任务状态</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center gap-3">
								{isJobRunning ? (
									<>
										<Loader2 className="w-5 h-5 text-primary animate-spin" />
										<div className="flex-1">
											<p className="font-medium">正在处理中...</p>
											<p className="text-sm text-muted-foreground">
												{bookStatusText}
											</p>
										</div>
									</>
								) : bookJob?.status === "succeeded" ? (
									<>
										<CheckCircle2 className="w-5 h-5 text-success" />
										<div className="flex-1">
											<p className="font-medium">任务完成</p>
											<p className="text-sm text-muted-foreground">
												整书拆解已完成，可以查看分析结果
											</p>
										</div>
									</>
								) : (
									<>
										<AlertCircle className="w-5 h-5 text-destructive" />
										<div className="flex-1">
											<p className="font-medium">任务失败</p>
											<p className="text-sm text-muted-foreground">
												{bookStatusText}
											</p>
										</div>
									</>
								)}
							</div>

							{bookProgressDetail && (
								<div className="border-t pt-3">
									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<span>处理进度</span>
											<span>
												{bookProgressDetail.outline.current} /{" "}
												{bookProgressDetail.outline.total} 章节
											</span>
										</div>
										<div className="w-full bg-muted rounded-full h-2">
											<div
												className="bg-primary h-2 rounded-full transition-all"
												style={{
													width: `${bookProgressDetail.outline.percent}%`,
												}}
											/>
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* 结果提示 */}
				{hasResult && (
					<Card className="border-primary/50 bg-primary/5">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5 text-primary" />
								拆解完成
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								整书拆解已完成，可以查看人物关系、情节模式和研究结果
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
									onClick={() => router.push("/research/materials")}
								>
									查看资料
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">整书拆解说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 支持上传 TXT 格式的整书文件或直接粘贴文本</p>
						<p>• 系统将自动进行章节切分和结构化分析</p>
						<p>• 异步任务会在后台运行，可以切换页面后继续查看</p>
						<p>• 拆解结果包括人物关系、情节模式和统计分析</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
