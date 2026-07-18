"use client";

import { useRouter } from "next/navigation";

type ProjectAssetTabKey = "current" | "health" | "revisions" | "methodology" | "export";

interface ProjectAssetTabsProps {
	active: ProjectAssetTabKey;
	revisionCount: number;
	methodologyCount: number;
}

const tabs: Array<{
	key: ProjectAssetTabKey;
	label: string;
	description: string;
	href: string;
	count?: "revision" | "methodology";
}> = [
	{
		key: "current",
		label: "当前书籍",
		description: "章节、问题和改稿计划",
		href: "/project/current",
	},
	{
		key: "health",
		label: "故事体检",
		description: "证据、统计和人工复核",
		href: "/project/health",
	},
	{
		key: "revisions",
		label: "修改效果",
		description: "复诊结果和改稿记录",
		href: "/project/revisions",
		count: "revision",
	},
	{
		key: "methodology",
		label: "方法论库",
		description: "从问题提炼的改稿套路",
		href: "/project/methodology",
		count: "methodology",
	},
	{
		key: "export",
		label: "导出资产",
		description: "整理为 Markdown 资产包",
		href: "/project/export",
	},
];

export function ProjectAssetTabs({
	active,
	revisionCount,
	methodologyCount,
}: ProjectAssetTabsProps) {
	const router = useRouter();

	return (
		<nav
			aria-label="书籍资产导航"
			className="grid gap-2 rounded-md border border-border bg-card p-2 shadow-sm md:grid-cols-5"
		>
			{tabs.map((tab) => {
				const isActive = tab.key === active;
				const count =
					tab.count === "revision"
						? revisionCount
						: tab.count === "methodology"
							? methodologyCount
							: undefined;

				return (
					<button
						key={tab.key}
						type="button"
						onClick={() => router.push(tab.href)}
						aria-current={isActive ? "page" : undefined}
						className={`min-h-[64px] rounded-md px-3 py-2.5 text-left font-semibold transition-colors ${
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						}`}
					>
						<span className="flex items-center justify-between gap-2">
							<span className="text-sm leading-tight">{tab.label}</span>
							{count !== undefined ? (
								<span
									className={`rounded-full px-2 py-0.5 text-[11px] ${
										isActive
											? "bg-primary-foreground text-primary"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{count}
								</span>
							) : null}
						</span>
						<span
							className={`mt-1 block text-[10px] font-medium leading-snug ${
								isActive ? "text-primary-foreground/80" : "text-muted-foreground"
							}`}
						>
							{tab.description}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
