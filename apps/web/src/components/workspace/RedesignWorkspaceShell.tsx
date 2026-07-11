"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
	BookOpen,
	CircleDot,
	Files,
	History,
	LibraryBig,
	RefreshCw,
	Search,
	Settings,
	Sparkles,
} from "lucide-react";

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
		badge?: string;
		href: string;
		icon: ReactNode;
	}>;
}> = [
	{
		label: "诊断",
		items: [
			{
				key: "quick",
				label: "快速诊断",
				badge: "推荐",
				href: "/diagnose/quick",
				icon: <Sparkles className="size-[18px]" />,
			},
			{
				key: "deep",
				label: "深度质检",
				href: "/diagnose/chapter",
				icon: <Search className="size-[18px]" />,
			},
			{
				key: "evidence",
				label: "证据对照",
				href: "/diagnose/chapter",
				icon: <CircleDot className="size-[18px]" />,
			},
		],
	},
	{
		label: "项目",
		items: [
			{
				key: "revision",
				label: "改稿复诊",
				href: "/project/revisions",
				icon: <RefreshCw className="size-[18px]" />,
			},
			{
				key: "history",
				label: "历史记录",
				href: "/project/current",
				icon: <History className="size-[18px]" />,
			},
			{
				key: "methodology",
				label: "方法论卡片",
				href: "/project/methodology",
				icon: <LibraryBig className="size-[18px]" />,
			},
		],
	},
	{
		label: "研究",
		items: [
			{
				key: "book",
				label: "整书拆解",
				href: "/research/book",
				icon: <BookOpen className="size-[18px]" />,
			},
			{
				key: "compare",
				label: "样本对比",
				href: "/research/compare",
				icon: <Files className="size-[18px]" />,
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
		<div className="grid min-h-screen grid-cols-[236px_minmax(0,1fr)] bg-[#f6f7f9] text-[#1f2329] max-[780px]:block">
			<aside className="sticky top-0 z-20 flex h-screen flex-col border-r border-[#e6e8eb] bg-white px-4 py-5 max-[780px]:hidden">
				<button
					type="button"
					onClick={() => router.push("/project/current")}
					className="mb-[18px] flex items-center gap-[11px] border-b border-[#e6e8eb] px-2 pb-[22px] text-left"
				>
					<div className="grid size-9 place-items-center rounded-[11px] bg-gradient-to-br from-[#ff7b3f] to-[#ff4f12] font-extrabold text-white shadow-[0_8px_20px_rgba(255,90,31,.23)]">
						诊
					</div>
					<div>
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
									className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] px-[11px] py-[9px] text-left transition ${
										active === item.key
											? "bg-[#fff2ec] font-bold text-[#d94710]"
											: "text-[#454b55] hover:bg-[#f4f5f7] hover:text-[#1f2329]"
									}`}
								>
									<span className="grid size-[19px] place-items-center">
										{item.icon}
									</span>
									<span>{item.label}</span>
									{item.badge ? (
										<span className="ml-auto rounded-full bg-[#ffe0d1] px-[7px] py-px text-[11px] text-[#a54b24]">
											{item.badge}
										</span>
									) : null}
								</button>
							))}
						</nav>
					</div>
				))}

				<div className="mt-auto grid gap-2.5">
					<button
						type="button"
						onClick={() => router.push("/settings/provider")}
						className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] px-[11px] py-[9px] text-left transition ${
							active === "settings"
								? "bg-[#fff2ec] font-bold text-[#d94710]"
								: "text-[#454b55] hover:bg-[#f4f5f7] hover:text-[#1f2329]"
						}`}
					>
						<Settings className="size-[18px]" />
						AI 与隐私设置
					</button>
					<div className="rounded-xl border border-[#e6e8eb] bg-[#fafafa] p-3">
						<div className="flex items-center justify-between text-xs text-[#69707d]">
							<span>
								<i className="mr-1.5 inline-block size-2 rounded-full bg-[#22a06b] shadow-[0_0_0_3px_rgba(34,160,107,.12)]" />
								模型已连接
							</span>
							<span>本地</span>
						</div>
						<div className="mt-1.5 truncate text-[13px] font-bold">{providerLabel}</div>
					</div>
				</div>
			</aside>

			<main className="min-w-0">
				<header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-[#e6e8eb] bg-white/90 px-7 backdrop-blur max-[780px]:px-4">
					<div className="min-w-0 text-[13px] text-[#69707d]">{crumb}</div>
					<div className="flex items-center gap-[9px]">{topActions}</div>
				</header>
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
