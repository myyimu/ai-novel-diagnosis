"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TaskNavItem {
	id: string;
	label: string;
	description: string;
	meta?: string;
	disabled?: boolean;
}

interface TaskNavProps {
	title?: string;
	description?: string;
	items: TaskNavItem[];
	activeId: string;
	onChange: (id: string) => void;
	footer?: ReactNode;
	className?: string;
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
}

export function TaskNav({
	title = "任务导航",
	description = "先完成主要任务，再回看上下文。",
	items,
	activeId,
	onChange,
	footer,
	className,
	collapsed = false,
	onToggleCollapsed,
}: TaskNavProps) {
	return (
		<nav
			aria-label={title}
			className={cn("flex h-full flex-col gap-4 rounded-xl border bg-card p-4", className)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="text-sm font-semibold text-foreground">{title}</p>
					<p className="text-xs leading-5 text-muted-foreground">{description}</p>
				</div>
				{onToggleCollapsed ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onToggleCollapsed}
						aria-label={collapsed ? "展开任务导航" : "折叠任务导航"}
						className="shrink-0"
					>
						{collapsed ? (
							<ChevronRight className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
					</Button>
				) : null}
			</div>

			{collapsed ? null : (
				<div className="flex flex-col gap-2">
					{items.map((item) => {
						const isActive = item.id === activeId;
						return (
							<Button
								key={item.id}
								type="button"
								variant={isActive ? "default" : "ghost"}
								disabled={item.disabled}
								aria-current={isActive ? "page" : undefined}
								onClick={() => onChange(item.id)}
								className={cn(
									"justify-between gap-3 px-3 py-6 text-left",
									isActive ? "shadow-sm" : "text-muted-foreground",
								)}
							>
								<span className="flex min-w-0 flex-col items-start gap-1">
									<span className="text-sm font-medium">{item.label}</span>
									<span className="max-w-full truncate text-xs opacity-85">
										{item.description}
									</span>
								</span>
								{item.meta ? (
									<Badge
										variant={isActive ? "secondary" : "outline"}
										className="shrink-0"
									>
										{item.meta}
									</Badge>
								) : null}
							</Button>
						);
					})}
				</div>
			)}

			{footer ? <div className="mt-auto pt-2">{footer}</div> : null}
		</nav>
	);
}
