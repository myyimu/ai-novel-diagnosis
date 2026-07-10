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
import { Lightbulb, Clock, ArrowLeft } from "lucide-react";

export function ProjectMethodologyPage() {
	const router = useRouter();

	const { projectMethodologyCards } = useWorkspaceHandlers("overview");

	const taskNavItems: TaskNavItem[] = useMemo(
		() => [
			{
				id: "current",
				label: "当前项目",
				description: "查看项目概览和资产",
				meta: "",
			},
			{
				id: "revisions",
				label: "改稿方案",
				description: "查看和管理改稿记录",
				meta: "",
			},
			{
				id: "methodology",
				label: "方法论库",
				description: `查看和管理 ${projectMethodologyCards.length} 条方法论卡`,
				meta: "当前",
			},
			{
				id: "export",
				label: "导出",
				description: "导出项目数据",
				meta: "",
			},
		],
		[projectMethodologyCards.length],
	);

	const inspectorSections: ContextInspectorSection[] = useMemo(
		() => [
			{
				title: "方法论统计",
				description: "当前项目的方法论卡统计",
				fields: [
					{
						label: "方法论卡数",
						value: `${projectMethodologyCards.length} 条`,
						tone: projectMethodologyCards.length > 0 ? "secondary" : "outline",
					},
					{
						label: "最近添加",
						value:
							projectMethodologyCards.length > 0
								? new Date(
										projectMethodologyCards[projectMethodologyCards.length - 1]
											.lastSeenAt,
									).toLocaleString()
								: "无",
					},
				],
			},
			{
				title: "页面信息",
				description: "方法论库页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/project/methodology",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "项目工作区",
						hint: "仅显示方法论库，不混入诊断表单",
					},
				],
			},
		],
		[projectMethodologyCards],
	);

	const handleNavChange = (id: string) => {
		if (id === "current") {
			router.push("/project/current");
		} else if (id === "revisions") {
			router.push("/project/revisions");
		} else if (id === "export") {
			router.push("/project/export");
		}
	};

	const handleBackToDiagnosis = () => {
		router.push("/diagnose/quick");
	};

	return (
		<WorkspaceTaskFrame
			title="方法论库"
			description="从诊断结果提炼的改稿方法论卡片"
			status={`${projectMethodologyCards.length} 条方法论`}
			taskNav={{
				items: taskNavItems,
				activeId: "methodology",
				onChange: handleNavChange,
				title: "项目导航",
				description: "选择要管理的项目内容",
			}}
			inspector={{
				title: "方法论上下文",
				description: "当前方法论库的统计和信息",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无方法论卡。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				{projectMethodologyCards.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">暂无方法论卡</h3>
							<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
								完成快速诊断后，系统会自动提炼方法论卡保存到当前项目
							</p>
							<Button onClick={handleBackToDiagnosis}>
								<ArrowLeft className="w-4 h-4 mr-2" />
								返回快速诊断
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{projectMethodologyCards.map((card) => (
							<Card key={card.projectCardId}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-base flex items-center gap-2">
												<Lightbulb className="w-4 h-4" />
												{card.title || "未命名方法论"}
											</CardTitle>
											<CardDescription className="flex items-center gap-2 mt-1">
												<Clock className="w-3 h-3" />
												{new Date(card.lastSeenAt).toLocaleString()}
											</CardDescription>
										</div>
										{card.type && (
											<Badge variant="secondary" className="text-xs">
												{card.type}
											</Badge>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									{card.triggerProblem ? (
										<div>
											<h4 className="text-sm font-semibold mb-2">触发问题</h4>
											<p className="text-sm text-muted-foreground">
												{card.triggerProblem}
											</p>
										</div>
									) : null}
									{card.reusableRule ? (
										<div>
											<h4 className="text-sm font-semibold mb-2">改稿规则</h4>
											<p className="text-sm text-muted-foreground whitespace-pre-wrap">
												{card.reusableRule}
											</p>
										</div>
									) : null}
									{card.selfCheckQuestion ? (
										<div>
											<h4 className="text-sm font-semibold mb-2">自查问题</h4>
											<p className="text-sm text-muted-foreground">
												{card.selfCheckQuestion}
											</p>
										</div>
									) : null}
									<div className="flex items-center justify-between pt-2 border-t">
										<p className="text-xs text-muted-foreground">
											来源于诊断结果提炼
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
						<CardTitle className="text-sm">方法论库说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 方法论卡从诊断结果中自动提炼改稿套路</p>
						<p>• 每张卡片包含具体的修改方法和支持证据</p>
						<p>• 可以按类型分类浏览不同的方法论</p>
						<p>• 帮助积累改稿经验，提升写作技巧</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
