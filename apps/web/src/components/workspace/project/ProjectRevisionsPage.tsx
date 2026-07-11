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
import { FileText, Clock, ArrowLeft } from "lucide-react";

export function ProjectRevisionsPage() {
	const router = useRouter();

	const { projectRevisionSessions } = useWorkspaceHandlers("overview");

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
				description: `查看和管理 ${projectRevisionSessions.length} 条修改效果记录`,
				meta: "当前",
			},
			{
				id: "methodology",
				label: "方法论库",
				description: `查看和管理方法论卡`,
				meta: "",
			},
			{
				id: "export",
				label: "导出",
				description: "导出书籍资产",
				meta: "",
			},
		],
		[projectRevisionSessions.length],
	);

	const inspectorSections: ContextInspectorSection[] = useMemo(
		() => [
			{
				title: "修改效果统计",
				description: "当前书籍的修改效果记录统计",
				fields: [
					{
						label: "修改效果记录数",
						value: `${projectRevisionSessions.length} 条`,
						tone: projectRevisionSessions.length > 0 ? "secondary" : "outline",
					},
					{
						label: "最近更新",
						value:
							projectRevisionSessions.length > 0
								? new Date(
										projectRevisionSessions[projectRevisionSessions.length - 1]
											.createdAt,
									).toLocaleString()
								: "无",
					},
				],
			},
			{
				title: "页面信息",
				description: "修改效果页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/project/revisions",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "书籍工作区",
						hint: "仅显示修改效果，不混入诊断表单",
					},
				],
			},
		],
		[projectRevisionSessions],
	);

	const handleNavChange = (id: string) => {
		if (id === "current") {
			router.push("/project/current");
		} else if (id === "methodology") {
			router.push("/project/methodology");
		} else if (id === "export") {
			router.push("/project/export");
		}
	};

	const handleBackToDiagnosis = () => {
		router.push("/diagnose/quick");
	};

	return (
		<WorkspaceTaskFrame
			title="修改效果"
			description="查看和管理从快速诊断生成的修改效果记录"
			status={`${projectRevisionSessions.length} 条记录`}
			taskNav={{
				items: taskNavItems,
				activeId: "revisions",
				onChange: handleNavChange,
				title: "书籍导航",
				description: "选择要管理的书籍内容",
			}}
			inspector={{
				title: "修改效果上下文",
				description: "当前修改效果的统计和信息",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无修改效果记录。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				{projectRevisionSessions.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<FileText className="w-12 h-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">暂无修改效果记录</h3>
							<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
								完成快速诊断后，修改效果记录会自动保存到当前书籍
							</p>
							<Button onClick={handleBackToDiagnosis}>
								<ArrowLeft className="w-4 h-4 mr-2" />
								返回快速诊断
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{projectRevisionSessions.map((session) => (
							<Card key={session.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-base flex items-center gap-2">
												<FileText className="w-4 h-4" />
												{session.chapterTitle || "未命名章节"}
											</CardTitle>
											<CardDescription className="flex items-center gap-2 mt-1">
												<Clock className="w-3 h-3" />
												{new Date(session.createdAt).toLocaleString()}
											</CardDescription>
										</div>
										<Badge variant="secondary">{session.textLength} 字</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div>
										<h4 className="text-sm font-semibold mb-2">修改指令</h4>
										<p className="text-sm text-muted-foreground line-clamp-3">
											{session.nextPrompt || "暂无修改指令"}
										</p>
									</div>
									{session.revisionNote ? (
										<div>
											<h4 className="text-sm font-semibold mb-2">备注</h4>
											<p className="text-sm text-muted-foreground line-clamp-2">
												{session.revisionNote}
											</p>
										</div>
									) : null}
									<div className="flex items-center justify-between pt-2 border-t">
										<p className="text-xs text-muted-foreground">
											来源于快速诊断结果
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={() => router.push("/diagnose/quick")}
										>
											查看诊断
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">修改效果说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 每次快速诊断后会生成一条修改效果记录</p>
						<p>• 修改效果记录包含修改建议和修改指令</p>
						<p>• 可以查看完整的诊断结果和修改动作</p>
						<p>• 支持添加备注以便后续参考</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
