"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, FileText, Lightbulb, Download, Plus } from "lucide-react";

export function ProjectCurrentPage() {
	const router = useRouter();

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
				label: "当前项目",
				description: "查看项目概览和资产",
				meta: "当前",
			},
			{
				id: "revisions",
				label: "改稿方案",
				description: `查看和管理 ${projectRevisionSessions.length} 条改稿记录`,
				meta: projectRevisionSessions.length > 0 ? `${projectRevisionSessions.length}` : "",
			},
			{
				id: "methodology",
				label: "方法论库",
				description: `查看和管理 ${projectMethodologyCards.length} 条方法论卡`,
				meta: projectMethodologyCards.length > 0 ? `${projectMethodologyCards.length}` : "",
			},
			{
				id: "export",
				label: "导出",
				description: "导出项目数据",
				meta: "",
			},
		],
		[projectRevisionSessions.length, projectMethodologyCards.length],
	);

	const handleNavChange = (id: string) => {
		if (id === "revisions") {
			router.push("/project/revisions");
		} else if (id === "methodology") {
			router.push("/project/methodology");
		} else if (id === "export") {
			router.push("/project/export");
		}
	};

	const handleExport = () => {
		exportProjectMarkdown();
	};

	return (
		<WorkspaceTaskFrame
			title="项目工作区"
			description="管理诊断项目、改稿方案和方法论资产"
			status={activeProject?.name || "默认项目"}
			taskNav={{
				items: taskNavItems,
				activeId: "current",
				onChange: handleNavChange,
				title: "项目导航",
				description: "选择要管理的项目内容",
			}}
			inspector={{
				title: "项目上下文",
				description: "当前项目的配置和资产信息",
				sections: [],
			}}
		>
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FolderOpen className="w-5 h-5" />
							{activeProject?.name || "默认项目"}
						</CardTitle>
						<CardDescription>查看和管理项目的诊断资产和改稿方案</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
								<FileText className="w-5 h-5 text-primary mt-0.5" />
								<div className="flex-1">
									<h4 className="font-semibold mb-1">改稿方案</h4>
									<p className="text-sm text-muted-foreground mb-3">
										管理和查看快速诊断生成的改稿记录
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() => router.push("/project/revisions")}
									>
										查看 {projectRevisionSessions.length} 条记录
									</Button>
								</div>
							</div>

							<div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
								<Lightbulb className="w-5 h-5 text-primary mt-0.5" />
								<div className="flex-1">
									<h4 className="font-semibold mb-1">方法论库</h4>
									<p className="text-sm text-muted-foreground mb-3">
										从诊断结果提炼的改稿方法论卡片
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() => router.push("/project/methodology")}
									>
										查看 {projectMethodologyCards.length} 条方法论
									</Button>
								</div>
							</div>
						</div>

						{projectRevisionSessions.length === 0 &&
						projectMethodologyCards.length === 0 ? (
							<div className="text-center py-8 border rounded-lg border-dashed">
								<p className="text-sm text-muted-foreground mb-4">
									当前项目还没有任何资产，完成快速诊断后自动生成
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => router.push("/diagnose/quick")}
								>
									<Plus className="w-4 h-4 mr-2" />
									开始快速诊断
								</Button>
							</div>
						) : null}

						<div className="flex items-center justify-between pt-4 border-t">
							<div>
								<p className="text-sm font-medium">导出项目</p>
								<p className="text-xs text-muted-foreground">
									将改稿方案和方法论导出为 Markdown 文件
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={handleExport}
								disabled={
									projectRevisionSessions.length === 0 &&
									projectMethodologyCards.length === 0
								}
							>
								<Download className="w-4 h-4 mr-2" />
								导出项目
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">项目说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 项目用于组织和管理诊断生成的资产</p>
						<p>• 改稿方案记录每次诊断的修改建议</p>
						<p>• 方法论卡从诊断结果中提炼改稿套路</p>
						<p>• 导出功能可将项目内容保存为 Markdown 文件</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
