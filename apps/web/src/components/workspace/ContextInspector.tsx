"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ContextInspectorField {
	label: string;
	value: string;
	hint?: string;
	tone?: "default" | "secondary" | "outline";
}

export interface ContextInspectorSection {
	title: string;
	description?: string;
	fields: ContextInspectorField[];
	footer?: ReactNode;
	detail?: ReactNode;
}

interface ContextInspectorProps {
	title?: string;
	description?: string;
	sections: ContextInspectorSection[];
	emptyState?: ReactNode;
	className?: string;
	onClose?: () => void;
	closeLabel?: string;
}

function toneForBadge(tone: ContextInspectorField["tone"]) {
	if (tone === "secondary") return "secondary";
	if (tone === "outline") return "outline";
	return "default";
}

export function ContextInspector({
	title = "上下文检查器",
	description = "只展示当前任务所需的上下文和可回看的信息。",
	sections,
	emptyState,
	className,
	onClose,
	closeLabel = "关闭上下文检查器",
}: ContextInspectorProps) {
	if (!sections.length) {
		return (
			<aside aria-label={title} className={cn("rounded-xl border bg-card p-4", className)}>
				<p className="text-sm font-semibold text-foreground">{title}</p>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
				<div className="mt-4">
					{emptyState ?? <p className="text-sm text-muted-foreground">暂无上下文。</p>}
				</div>
			</aside>
		);
	}

	return (
		<aside aria-label={title} className={cn("rounded-xl border bg-card", className)}>
			<div className="flex items-start justify-between gap-3 border-b p-4">
				<div>
					<p className="text-sm font-semibold text-foreground">{title}</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
				</div>
				{onClose ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label={closeLabel}
						className="shrink-0"
					>
						<X className="size-4" />
					</Button>
				) : null}
			</div>
			<div className="space-y-4 p-4">
				{sections.map((section) => (
					<Card key={section.title} className="border-muted/60">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">{section.title}</CardTitle>
							{section.description ? (
								<CardDescription>{section.description}</CardDescription>
							) : null}
						</CardHeader>
						<CardContent className="space-y-3">
							{section.fields.map((field) => (
								<div key={`${section.title}-${field.label}`} className="space-y-1">
									<div className="flex items-center justify-between gap-3">
										<p className="text-xs font-medium text-foreground">
											{field.label}
										</p>
										<Badge
											variant={toneForBadge(field.tone)}
											className="max-w-full truncate"
										>
											{field.value}
										</Badge>
									</div>
									{field.hint ? (
										<p className="text-xs leading-5 text-muted-foreground">
											{field.hint}
										</p>
									) : null}
								</div>
							))}
							{section.detail ? <div className="pt-1">{section.detail}</div> : null}
							{section.footer ? <div className="pt-1">{section.footer}</div> : null}
						</CardContent>
					</Card>
				))}
			</div>
		</aside>
	);
}
