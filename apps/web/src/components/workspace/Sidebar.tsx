"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ScanText, ChevronDown } from "lucide-react";

export interface WorkspaceNavItem<TView extends string = string> {
	id: TView;
	label: string;
	title: string;
	description: string;
	icon: LucideIcon;
}

interface SidebarProps<TView extends string> {
	activeView: TView;
	navItems: Array<WorkspaceNavItem<TView>>;
	advancedNavItems?: Array<WorkspaceNavItem<TView>>;
	onOpenView: (view: TView) => void;
	className?: string;
}

export function Sidebar<TView extends string>({
	activeView,
	navItems,
	advancedNavItems,
	onOpenView,
	className = "",
}: SidebarProps<TView>) {
	const hasAdvanced = Boolean(advancedNavItems && advancedNavItems.length > 0);
	const activeIsAdvanced = Boolean(advancedNavItems?.some((item) => item.id === activeView));
	const [advancedOpen, setAdvancedOpen] = useState(activeIsAdvanced);

	const renderNavButton = (item: WorkspaceNavItem<TView>) => {
		const Icon = item.icon;
		const isActive = item.id === activeView;
		return (
			<button
				key={item.id}
				type="button"
				onClick={() => onOpenView(item.id)}
				aria-current={isActive ? "page" : undefined}
				className={`flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition-colors w-full ${
					isActive
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
				}`}
			>
				<Icon className="size-4 shrink-0" />
				<span>{item.label}</span>
			</button>
		);
	};

	return (
		<div className={`flex flex-col h-full ${className}`}>
			<div className="flex flex-col gap-4 px-4 py-6 h-full">
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
						<ScanText className="size-5" />
					</div>
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold">AI网文诊断台</p>
						<p className="truncate text-xs text-muted-foreground">
							本地小说诊断与 AI 拆书
						</p>
					</div>
				</div>

				<nav aria-label="主导航" className="flex flex-col gap-1 text-sm">
					{navItems.map(renderNavButton)}
				</nav>

				{hasAdvanced ? (
					<div className="border-t border-sidebar-border pt-3 mt-1">
						<button
							type="button"
							onClick={() => setAdvancedOpen((value) => !value)}
							aria-expanded={advancedOpen}
							className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
						>
							<span>高级功能</span>
							<ChevronDown
								className={`size-3.5 transition-transform ${
									advancedOpen ? "rotate-180" : ""
								}`}
							/>
						</button>
						{advancedOpen ? (
							<nav aria-label="高级功能" className="mt-1 space-y-1 text-sm">
								{advancedNavItems!.map(renderNavButton)}
							</nav>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
