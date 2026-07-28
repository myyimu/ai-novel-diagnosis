"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";

export type ResearchPage = "book" | "compare" | "patterns" | "materials";

const researchPages: Array<{
	id: ResearchPage;
	label: string;
	description: string;
	href: string;
}> = [
	{
		id: "book",
		label: "整书拆解",
		description: "上传正文并建立小说目录",
		href: "/research/book",
	},
	{
		id: "compare",
		label: "样本对比",
		description: "比较文本写法与结构特征",
		href: "/research/compare",
	},
	{
		id: "patterns",
		label: "图谱 / 模式",
		description: "查看人物关系和情节模式",
		href: "/research/patterns",
	},
	{
		id: "materials",
		label: "研究资料",
		description: "回看并导出整书拆解资料",
		href: "/research/materials",
	},
];

export function getResearchWorkspaceNav(active: ResearchPage) {
	return researchPages.map((page) => ({
		...page,
		isActive: page.id === active,
	}));
}

export function ResearchWorkspaceShell({
	active,
	title,
	description,
	status,
	children,
}: {
	active: ResearchPage;
	title: string;
	description: string;
	status: string;
	children: ReactNode;
}) {
	const router = useRouter();
	const { providerLabel } = useWorkspaceHandlers("book");

	return (
		<RedesignWorkspaceShell
			active="book"
			providerLabel={providerLabel}
			crumb={
				<>
					研究 / <b className="text-[#1f2329]">{title}</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						书籍列表
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/diagnose/quick")}
					>
						快速诊断一章
					</RedesignTopButton>
				</>
			}
		>
			<main className="mx-auto w-[min(1080px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[820px]:w-[calc(100%_-_24px)] max-[820px]:py-[22px]">
				<section className="mb-[22px] flex items-start justify-between gap-6 max-[720px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							{title}
						</h1>
						<p className="max-w-[720px] text-sm leading-6 text-[#69707d]">
							{description}
						</p>
					</div>
					<span className="rounded-full border border-[#ffd6c4] bg-[#fff2ec] px-3 py-1 text-xs font-bold text-[#c94413] max-[720px]:mt-4 max-[720px]:inline-flex">
						{status}
					</span>
				</section>

				<nav className="grid gap-2 rounded-[14px] border border-[#e6e8eb] bg-white p-2 shadow-[0_4px_18px_rgba(22,27,34,.06)] md:grid-cols-4">
					{getResearchWorkspaceNav(active).map((page) => {
						const { isActive } = page;
						return (
							<button
								key={page.id}
								type="button"
								onClick={() => router.push(page.href)}
								aria-current={isActive ? "page" : undefined}
								className={`min-h-[64px] rounded-[10px] px-3 py-2.5 text-left transition-colors ${
									isActive
										? "bg-[#ff5a1f] text-white shadow-[0_6px_16px_rgba(255,90,31,.18)]"
										: "text-[#69707d] hover:bg-[#fff2ec] hover:text-[#c94413]"
								}`}
							>
								<span className="block text-sm font-bold leading-tight">
									{page.label}
								</span>
								<span
									className={`mt-1 block text-[10px] leading-snug ${isActive ? "text-white/80" : "text-[#69707d]"}`}
								>
									{page.description}
								</span>
							</button>
						);
					})}
				</nav>

				<div className="mt-4">{children}</div>
			</main>
		</RedesignWorkspaceShell>
	);
}
