"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ListTree, Search, Settings, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type NavKey =
	| "quick"
	| "deep"
	| "evidence"
	| "revision"
	| "history"
	| "methodology"
	| "book"
	| "compare"
	| "settings";

interface RedesignWorkspaceShellProps {
	active: NavKey;
	crumb: ReactNode;
	topActions?: ReactNode;
	children: ReactNode;
	providerLabel?: string;
}

const navGroups: Array<{
	label: string;
	items: Array<{
		key: NavKey;
		label: string;
		description: string;
		badge?: string;
		href: string;
		icon: ReactNode;
	}>;
}> = [
	{
		label: "工作区",
		items: [
			{
				key: "quick",
				label: "诊断",
				description: "快速诊断与深度质检",
				badge: "推荐",
				href: "/diagnose/quick",
				icon: <Sparkles className="size-[18px]" />,
			},
			{
				key: "history",
				label: "我的书籍",
				description: "章节、改稿和复诊资产",
				href: "/project/current",
				icon: <ListTree className="size-[18px]" />,
			},
			{
				key: "book",
				label: "研究",
				description: "整书拆解与样本学习",
				href: "/research/book",
				icon: <BookOpen className="size-[18px]" />,
			},
			{
				key: "settings",
				label: "AI 设置",
				description: "模型、密钥和连接状态",
				href: "/settings/provider",
				icon: <Settings className="size-[18px]" />,
			},
		],
	},
	{
		label: "进阶入口",
		items: [
			{
				key: "deep",
				label: "深度质检",
				description: "参考样本 → 标准 → 评分",
				href: "/diagnose/deep",
				icon: <Search className="size-[18px]" />,
			},
		],
	},
];

export function RedesignWorkspaceShell({
	active,
	crumb,
	topActions,
	children,
	providerLabel = "Qwen · OpenAI Compatible",
}: RedesignWorkspaceShellProps) {
	const router = useRouter();

	return (
		<div className="grid min-h-screen grid-cols-[236px_minmax(0,1fr)] bg-[#f6f7f9] text-[#1f2329] max-[820px]:grid-cols-[64px_minmax(0,1fr)]">
			<aside className="group/sidebar sticky top-0 z-20 flex h-screen flex-col overflow-x-hidden border-r border-[#e6e8eb] bg-white px-4 py-5 transition-[width,box-shadow] duration-200 max-[820px]:w-16 max-[820px]:px-2 max-[820px]:hover:w-[236px] max-[820px]:hover:shadow-[12px_0_28px_rgba(22,28,36,.1)] max-[820px]:focus-within:w-[236px] max-[820px]:focus-within:shadow-[12px_0_28px_rgba(22,28,36,.1)]">
				<button
					type="button"
					onClick={() => router.push("/project/current")}
					className="mb-[18px] flex items-center gap-[11px] border-b border-[#e6e8eb] px-2 pb-[22px] text-left max-[820px]:justify-center max-[820px]:px-0 max-[820px]:group-hover/sidebar:justify-start max-[820px]:group-hover/sidebar:px-2 max-[820px]:group-focus-within/sidebar:justify-start max-[820px]:group-focus-within/sidebar:px-2"
				>
					<div className="grid size-9 place-items-center rounded-[11px] bg-gradient-to-br from-[#ff7b3f] to-[#ff4f12] font-extrabold text-white shadow-[0_8px_20px_rgba(255,90,31,.23)]">
						诊
					</div>
					<div className="max-[820px]:hidden max-[820px]:group-hover/sidebar:block max-[820px]:group-focus-within/sidebar:block">
						<strong className="block text-[15px] leading-tight">AI 网文诊断台</strong>
						<span className="mt-0.5 block text-xs text-[#69707d]">先诊断，再改稿</span>
					</div>
				</button>

				{navGroups.map((group) => (
					<div key={group.label}>
						<div className="mb-1.5 mt-3 px-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#9aa0aa]">
							{group.label}
						</div>
						<nav className="grid gap-[5px]">
							{group.items.map((item) => (
								<button
									key={item.key}
									type="button"
									onClick={() => router.push(item.href)}
									aria-label={item.label}
									className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] px-[11px] py-[9px] text-left font-semibold transition-colors max-[820px]:justify-center max-[820px]:px-2 max-[820px]:group-hover/sidebar:justify-start max-[820px]:group-hover/sidebar:px-[11px] max-[820px]:group-focus-within/sidebar:justify-start max-[820px]:group-focus-within/sidebar:px-[11px] ${
										active === item.key
											? "bg-[#fff2ec] text-[#d94710]"
											: "text-[#454b55] hover:bg-[#f4f5f7] hover:text-[#1f2329]"
									}`}
								>
									<span className="grid size-[19px] shrink-0 place-items-center">
										{item.icon}
									</span>
									<span className="min-w-0 flex-1 max-[820px]:hidden max-[820px]:group-hover/sidebar:block max-[820px]:group-focus-within/sidebar:block">
										<span className="block text-sm leading-tight">
											{item.label}
										</span>
										<span className="mt-0.5 block text-[10px] font-medium leading-snug text-[#69707d]">
											{item.description}
										</span>
									</span>
									{item.badge ? (
										<span className="ml-auto rounded-full bg-[#ffe0d1] px-[7px] py-px text-[11px] text-[#a54b24] max-[820px]:hidden max-[820px]:group-hover/sidebar:inline-flex max-[820px]:group-focus-within/sidebar:inline-flex">
											{item.badge}
										</span>
									) : null}
								</button>
							))}
						</nav>
					</div>
				))}

				<div className="mt-auto grid gap-2.5">
					<div className="rounded-xl border border-[#e6e8eb] bg-[#fafafa] p-3 max-[820px]:px-2 max-[820px]:text-center max-[820px]:group-hover/sidebar:px-3 max-[820px]:group-hover/sidebar:text-left max-[820px]:group-focus-within/sidebar:px-3 max-[820px]:group-focus-within/sidebar:text-left">
						<div className="flex items-center justify-between text-xs text-[#69707d] max-[820px]:justify-center max-[820px]:group-hover/sidebar:justify-between max-[820px]:group-focus-within/sidebar:justify-between">
							<span>
								<i className="mr-1.5 inline-block size-2 rounded-full bg-[#22a06b] shadow-[0_0_0_3px_rgba(34,160,107,.12)]" />
								<span className="max-[820px]:hidden max-[820px]:group-hover/sidebar:inline max-[820px]:group-focus-within/sidebar:inline">
									模型已连接
								</span>
							</span>
							<span className="max-[820px]:hidden max-[820px]:group-hover/sidebar:inline max-[820px]:group-focus-within/sidebar:inline">
								本地
							</span>
						</div>
						<div className="mt-1.5 truncate text-[13px] font-bold max-[820px]:hidden max-[820px]:group-hover/sidebar:block max-[820px]:group-focus-within/sidebar:block">
							{providerLabel}
						</div>
						<button
							type="button"
							onClick={() => router.push("/settings/provider")}
							className="mt-2 min-h-8 w-full rounded-lg border border-[#d8dbe0] bg-white text-xs font-bold text-[#1f2329] max-[820px]:hidden max-[820px]:group-hover/sidebar:block max-[820px]:group-focus-within/sidebar:block"
						>
							AI 设置
						</button>
					</div>
				</div>
			</aside>

			<main className="min-w-0">
				{topActions ? (
					<div className="flex items-center justify-between gap-4 px-7 pt-5 max-[820px]:px-4 max-[620px]:items-start max-[620px]:flex-col">
						<div className="min-w-0 text-[13px] text-[#69707d]">{crumb}</div>
						<div className="flex flex-wrap items-center justify-end gap-[9px]">
							{topActions}
						</div>
					</div>
				) : null}
				{children}
			</main>
		</div>
	);
}

export function RedesignTopButton({
	children,
	onClick,
	variant = "secondary",
}: {
	children: ReactNode;
	onClick?: () => void;
	variant?: "primary" | "secondary" | "ghost";
}) {
	if (variant === "primary") {
		return (
			<Button
				onClick={onClick}
				className="min-h-[38px] rounded-[9px] border-[#ff5a1f] bg-[#ff5a1f] px-3.5 font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:bg-[#e84b13]"
			>
				{children}
			</Button>
		);
	}

	if (variant === "ghost") {
		return (
			<Button
				onClick={onClick}
				variant="ghost"
				className="min-h-[38px] rounded-[9px] px-3.5 font-semibold text-[#69707d]"
			>
				{children}
			</Button>
		);
	}

	return (
		<Button
			onClick={onClick}
			variant="outline"
			className="min-h-[38px] rounded-[9px] border-[#d8dbe0] bg-white px-3.5 font-bold text-[#1f2329] hover:border-[#bec3cb] hover:bg-[#fafafa]"
		>
			{children}
		</Button>
	);
}
