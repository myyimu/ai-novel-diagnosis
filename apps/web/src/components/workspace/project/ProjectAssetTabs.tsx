"use client";

import { useRouter } from "next/navigation";

type ProjectAssetTabKey = "current" | "revisions" | "methodology" | "export";

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
			className="grid gap-2 rounded-[14px] border border-[#e6e8eb] bg-white p-2 shadow-[0_6px_20px_rgba(22,27,34,.055)] md:grid-cols-4"
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
						className={`min-h-[64px] rounded-[10px] px-3 py-2.5 text-left font-semibold transition-colors ${
							isActive
								? "bg-[#fff2ec] text-[#d94710]"
								: "text-[#454b55] hover:bg-[#f4f5f7] hover:text-[#1f2329]"
						}`}
					>
						<span className="flex items-center justify-between gap-2">
							<span className="text-sm leading-tight">{tab.label}</span>
							{count !== undefined ? (
								<span
									className={`rounded-full px-2 py-0.5 text-[11px] ${
										isActive
											? "bg-white text-[#b64215]"
											: "bg-[#eef0f3] text-[#69707d]"
									}`}
								>
									{count}
								</span>
							) : null}
						</span>
						<span className="mt-1 block text-[10px] font-medium leading-snug text-[#69707d]">
							{tab.description}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
