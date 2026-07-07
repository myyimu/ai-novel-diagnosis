"use client";

import { BookOpen, Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WorkspaceView } from "@/lib/workspace-routes";

interface BeginnerLearningDigest {
	summary: string;
	rules: Array<{
		title: string;
		explanation: string;
		source: string;
		apply: string;
	}>;
}

interface HelpPanelProps<TView extends string = string> {
	digest?: BeginnerLearningDigest;
	onOpenView?: (view: TView) => void;
}

export function HelpPanel<TView extends string = string>({
	digest,
	onOpenView,
}: HelpPanelProps<TView>) {
	const hasRules = digest?.rules && digest.rules.length > 0;

	return (
		<div className="space-y-4">
			{/* 核心理念 */}
			<Card className="border-primary/20 bg-primary/5">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-primary" />
						核心理念
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p className="leading-5">
						<span className="font-medium">AI 时代写作瓶颈：</span>
						不再是"不会写"，而是"不知道写什么"。
					</p>
					<p className="leading-5">
						<span className="font-medium">诊断台方法：</span>
						先学会拆出爆款为什么成立，再让 AI 执行明确方向。
					</p>
				</CardContent>
			</Card>

			{/* 学习路线 */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center gap-2">
						<TrendingUp className="w-4 h-4" />
						学习路线
					</CardTitle>
					<CardDescription className="text-xs">
						建议按顺序学习，目标是从成熟作品中提取规律
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{[
						{
							step: "1",
							title: "悬念/世界观型",
							desc: "学习制造未知和身份跃迁",
							view: "book" as WorkspaceView,
						},
						{
							step: "2",
							title: "人设反差型",
							desc: "学习人物记忆点和关系钩子",
							view: "library" as WorkspaceView,
						},
						{
							step: "3",
							title: "情绪压迫型",
							desc: "学习不安全感和认知冲击",
							view: "chapter" as WorkspaceView,
						},
					].map((item) => (
						<button
							key={item.step}
							onClick={() => onOpenView?.(item.view as TView)}
							className="w-full flex items-start gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50"
						>
							<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
								{item.step}
							</span>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">{item.title}</p>
								<p className="text-xs text-muted-foreground">{item.desc}</p>
							</div>
							<ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
						</button>
					))}
				</CardContent>
			</Card>

			{/* 当前样本规律 */}
			{hasRules && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm flex items-center gap-2">
							<BookOpen className="w-4 h-4" />
							当前样本规律
						</CardTitle>
						<CardDescription className="text-xs">{digest.summary}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{digest.rules.slice(0, 3).map((rule, index) => (
							<div
								key={index}
								className="rounded-md border border-border bg-background p-3"
							>
								<p className="text-sm font-medium">{rule.title}</p>
								<p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
									{rule.explanation}
								</p>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* 快速入口 */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm">快速操作</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenView?.("book" as TView)}
						className="w-full justify-between"
					>
						上传样本拆解
						<ChevronRight className="w-4 h-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenView?.("library" as TView)}
						className="w-full justify-between"
					>
						浏览研究库
						<ChevronRight className="w-4 h-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenView?.("chapter" as TView)}
						className="w-full justify-between"
					>
						章节诊断验证
						<ChevronRight className="w-4 h-4" />
					</Button>
				</CardContent>
			</Card>

			{/* 输出原则 */}
			<Card className="border-muted/50 bg-muted/20">
				<CardContent className="p-3 text-xs text-muted-foreground leading-5">
					<p className="font-medium text-foreground mb-1">输出原则</p>
					<ul className="space-y-0.5 ml-3 list-disc">
						<li>先问"为什么火"，再问"怎么写"</li>
						<li>每本书只保留 3 条关键规律</li>
						<li>规律必须能变成提示词约束</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
