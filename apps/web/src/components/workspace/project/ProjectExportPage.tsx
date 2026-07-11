"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Lightbulb, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ProjectExportPage() {
	const router = useRouter();
	const [isExporting, setIsExporting] = useState(false);

	const {
		activeProject,
		projectRevisionSessions,
		projectMethodologyCards,
		exportProjectMarkdown,
	} = useWorkspaceHandlers("overview");

	const taskNavItems: TaskNavItem[] = useMemo(
		() => [
			{
				id: "current",
				label: "当前书籍",
				description: "查看小说概览和资产",
				meta: "",
			},
			{
				id: "revisions",
				label: "修改效果",
				description: "查看和管理修改效果记录",
				meta: "",
			},
			{
				id: "methodology",
				label: "方法论库",
				description: "查看和管理方法论卡",
				meta: "",
			},
			{
				id: "export",
				label: "导出",
				description: "导出书籍资产",
				meta: "当前",
			},
		],
		[],
	);

	const inspectorSections: ContextInspectorSection[] = useMemo(
		() => [
			{
				title: "导出内容",
				description: "将要导出的书籍资产",
				fields: [
					{
						label: "修改效果",
						value: `${projectRevisionSessions.length} 条`,
						tone: projectRevisionSessions.length > 0 ? "secondary" : "outline",
					},
					{
						label: "方法论卡",
						value: `${projectMethodologyCards.length} 条`,
						tone: projectMethodologyCards.length > 0 ? "secondary" : "outline",
					},
				],
			},
			{
				title: "导出格式",
				description: "导出文件的格式和内容",
				fields: [
					{
						label: "文件格式",
						value: "Markdown (.md)",
						tone: "secondary",
					},
					{
						label: "包含内容",
						value: "书籍信息 + 修改效果 + 方法论卡",
						hint: "按时间顺序组织所有内容",
					},
				],
			},
			{
				title: "页面信息",
				description: "导出页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/project/export",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "书籍工作区",
						hint: "独立的导出页面",
					},
				],
			},
		],
		[projectRevisionSessions.length, projectMethodologyCards.length],
	);

	const handleNavChange = (id: string) => {
		if (id === "current") {
			router.push("/project/current");
		} else if (id === "revisions") {
			router.push("/project/revisions");
		} else if (id === "methodology") {
			router.push("/project/methodology");
		}
	};

	const handleExport = async () => {
		if (projectRevisionSessions.length === 0 && projectMethodologyCards.length === 0) {
			toast.error("当前书籍没有可导出的内容");
			return;
		}

		setIsExporting(true);
		try {
			exportProjectMarkdown();
			toast.success("导出成功", {
				description: "书籍资产已导出为 Markdown 文件",
			});
		} catch (error) {
			toast.error("导出失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		} finally {
			setIsExporting(false);
		}
	};

	const canExport = projectRevisionSessions.length > 0 || projectMethodologyCards.length > 0;

	return (
		<WorkspaceTaskFrame
			title="书籍资产导出"
			description="导出书籍资产的修改效果和方法论为 Markdown 文件"
			status={canExport ? "可导出" : "无内容"}
			taskNav={{
				items: taskNavItems,
				activeId: "export",
				onChange: handleNavChange,
				title: "书籍导航",
				description: "选择要管理的书籍内容",
			}}
			inspector={{
				title: "导出上下文",
				description: "当前导出配置和内容预览",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无导出内容。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Download className="w-5 h-5" />
							导出书籍资产
						</CardTitle>
						<CardDescription>
							将书籍的修改效果和方法论卡导出为 Markdown 文件
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!canExport ? (
							<div className="text-center py-8 border rounded-lg border-dashed">
								<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">暂无可导出内容</h3>
								<p className="text-sm text-muted-foreground mb-4">
									当前书籍还没有修改效果或方法论卡，请先完成快速诊断
								</p>
								<Button
									variant="outline"
									onClick={() => router.push("/diagnose/quick")}
								>
									开始快速诊断
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
										<FileText className="w-5 h-5 text-primary mt-0.5" />
										<div className="flex-1">
											<h4 className="font-semibold mb-1">修改效果</h4>
											<p className="text-sm text-muted-foreground">
												{projectRevisionSessions.length} 条修改效果记录
											</p>
										</div>
										<Badge variant="secondary">
											{projectRevisionSessions.length}
										</Badge>
									</div>

									<div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
										<Lightbulb className="w-5 h-5 text-primary mt-0.5" />
										<div className="flex-1">
											<h4 className="font-semibold mb-1">方法论卡</h4>
											<p className="text-sm text-muted-foreground">
												{projectMethodologyCards.length} 条方法论
											</p>
										</div>
										<Badge variant="secondary">
											{projectMethodologyCards.length}
										</Badge>
									</div>
								</div>

								<div className="border-t pt-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm">
											<CheckCircle2 className="w-4 h-4 text-success" />
											<span>Markdown 格式，便于查看和编辑</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<CheckCircle2 className="w-4 h-4 text-success" />
											<span>包含完整的书籍信息、修改效果和方法论</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<CheckCircle2 className="w-4 h-4 text-success" />
											<span>按时间顺序组织，方便追溯</span>
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between pt-4 border-t">
									<div>
										<p className="text-sm font-medium">
											{activeProject?.name || "默认书籍"}
										</p>
										<p className="text-xs text-muted-foreground">
											导出为 .md 文件
										</p>
									</div>
									<Button onClick={handleExport} disabled={isExporting}>
										{isExporting ? (
											"导出中..."
										) : (
											<>
												<Download className="w-4 h-4 mr-2" />
												导出书籍资产
											</>
										)}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">导出说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 导出的 Markdown 文件包含完整的书籍信息</p>
						<p>• 修改效果按时间顺序排列，包含所有修改建议</p>
						<p>• 方法论卡包含提炼的修改套路和支持证据</p>
						<p>• 导出的文件可用于备份、分享或进一步编辑</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
