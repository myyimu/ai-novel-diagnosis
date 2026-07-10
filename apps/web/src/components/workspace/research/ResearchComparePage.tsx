"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Plus } from "lucide-react";

export function ResearchComparePage() {
	const router = useRouter();

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
				meta: "当前",
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
				title: "对比状态",
				description: "当前样本对比的状态",
				fields: [
					{
						label: "样本数量",
						value: "2 个样本",
						tone: "secondary",
					},
					{
						label: "对比状态",
						value: "准备就绪",
						tone: "outline",
					},
				],
			},
			{
				title: "页面信息",
				description: "样本对比页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/research/compare",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "研究工作区",
						hint: "独立的样本对比页面",
					},
				],
			},
		],
		[],
	);

	const handleNavChange = (id: string) => {
		if (id === "book") {
			router.push("/research/book");
		} else if (id === "patterns") {
			router.push("/research/patterns");
		} else if (id === "materials") {
			router.push("/research/materials");
		}
	};

	return (
		<WorkspaceTaskFrame
			title="样本对比"
			description="对比多个文本样本的写作风格和结构特征"
			status="对比分析"
			taskNav={{
				items: taskNavItems,
				activeId: "compare",
				onChange: handleNavChange,
				title: "研究导航",
				description: "选择要管理的研究内容",
			}}
			inspector={{
				title: "对比上下文",
				description: "当前样本对比的配置和状态",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无对比信息。</p>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				{/* 样本对比区域 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<GitCompare className="w-5 h-5" />
							样本对比分析
						</CardTitle>
						<CardDescription>
							输入多个文本样本，系统将分析它们的写作风格差异
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							{/* 样本 1 */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium">样本 1</label>
									<Badge variant="secondary" className="text-xs">
										A组
									</Badge>
								</div>
								<textarea
									placeholder="输入第一个文本样本..."
									className="w-full min-h-[150px] px-3 py-2 text-sm border rounded-md bg-background"
								/>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>字数: 0</span>
									<span>可选: 添加作者信息</span>
								</div>
							</div>

							{/* 样本 2 */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium">样本 2</label>
									<Badge variant="secondary" className="text-xs">
										B组
									</Badge>
								</div>
								<textarea
									placeholder="输入第二个文本样本..."
									className="w-full min-h-[150px] px-3 py-2 text-sm border rounded-md bg-background"
								/>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>字数: 0</span>
									<span>可选: 添加作者信息</span>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between pt-4 border-t">
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm">
									<Plus className="w-4 h-4 mr-2" />
									添加样本
								</Button>
								<span className="text-xs text-muted-foreground">
									最多支持 4 个样本同时对比
								</span>
							</div>
							<Button>开始对比</Button>
						</div>
					</CardContent>
				</Card>

				{/* 对比结果展示 */}
				<Card className="border-muted-foreground/50">
					<CardHeader>
						<CardTitle className="text-base">对比结果</CardTitle>
						<CardDescription>写作风格和结构特征分析结果</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-center py-8 border border-dashed rounded-lg">
							<GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-sm text-muted-foreground mb-4">
								输入文本样本后，对比结果将显示在这里
							</p>
						</div>
					</CardContent>
				</Card>

				{/* 使用说明 */}
				<Card className="border-muted/50 bg-muted/30">
					<CardHeader>
						<CardTitle className="text-sm">样本对比说明</CardTitle>
					</CardHeader>
					<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
						<p>• 支持同时对比 2-4 个文本样本</p>
						<p>• 分析维度包括词汇选择、句式结构、叙事节奏等</p>
						<p>• 可选添加作者信息用于对比不同作者风格</p>
						<p>• 结果可视化展示风格差异和相似度</p>
					</CardContent>
				</Card>
			</div>
		</WorkspaceTaskFrame>
	);
}
