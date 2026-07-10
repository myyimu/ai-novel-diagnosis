"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ContextInspector, type ContextInspectorSection } from "./ContextInspector";
import { TaskNav, type TaskNavItem } from "./TaskNav";
import { useWorkspaceUIStore } from "@/stores/workspace-ui-store";

interface WorkspaceTaskFrameProps {
	title: string;
	description: string;
	status: string;
	taskNav: {
		items: TaskNavItem[];
		activeId: string;
		onChange: (id: string) => void;
		title?: string;
		description?: string;
		footer?: ReactNode;
	};
	inspector: {
		sections: ContextInspectorSection[];
		title?: string;
		description?: string;
		emptyState?: ReactNode;
	};
	children: ReactNode;
	className?: string;
}

export function WorkspaceTaskFrame({
	title,
	description,
	status,
	taskNav,
	inspector,
	children,
	className,
}: WorkspaceTaskFrameProps) {
	const navToggleRef = useRef<HTMLButtonElement>(null);
	const inspectorToggleRef = useRef<HTMLButtonElement>(null);
	const inspectorCloseRef = useRef<HTMLButtonElement>(null);
	const inspectorTitleId = useId();
	const inspectorDescriptionId = useId();

	// 从UI store获取状态
	const navCollapsed = useWorkspaceUIStore((state) => state.navCollapsed);
	const setNavCollapsed = useWorkspaceUIStore((state) => state.setNavCollapsed);
	const inspectorOpen = useWorkspaceUIStore((state) => state.inspectorOpen);
	const setInspectorOpen = useWorkspaceUIStore((state) => state.setInspectorOpen);
	const mobileNavOpen = useWorkspaceUIStore((state) => state.mobileNavOpen);
	const setMobileNavOpen = useWorkspaceUIStore((state) => state.setMobileNavOpen);
	const hasInspector = inspector.sections.some((section) => section.detail || section.footer);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const media = window.matchMedia("(max-width: 1023px)");
		const applyMode = () => {
			if (media.matches) {
				setNavCollapsed(true);
				setInspectorOpen(false);
			} else {
				setNavCollapsed(false);
				setInspectorOpen(false);
				setMobileNavOpen(false);
			}
		};

		applyMode();
		media.addEventListener("change", applyMode);
		return () => media.removeEventListener("change", applyMode);
	}, [setNavCollapsed, setInspectorOpen, setMobileNavOpen]);

	useEffect(() => {
		if (!hasInspector && inspectorOpen) {
			setInspectorOpen(false);
			return;
		}

		if (hasInspector && inspectorOpen) {
			requestAnimationFrame(() => inspectorCloseRef.current?.focus());
		}
	}, [hasInspector, inspectorOpen, setInspectorOpen]);

	// Escape键监听器 - 用于关闭inspector和mobile nav
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				if (inspectorOpen) {
					closeInspector();
				} else if (mobileNavOpen) {
					closeMobileNav();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [inspectorOpen, mobileNavOpen]);

	const closeInspector = () => {
		setInspectorOpen(false);
		requestAnimationFrame(() => inspectorToggleRef.current?.focus());
	};

	const closeMobileNav = () => {
		setMobileNavOpen(false);
		requestAnimationFrame(() => navToggleRef.current?.focus());
	};

	return (
		<div
			className={cn(
				"min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)_/_0.08),_transparent_36%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)_/_0.15))]",
				className,
			)}
		>
			<div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
				<header className="rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-1.5">
							<Badge variant="secondary" className="w-fit">
								当前任务
							</Badge>
							<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
								{title}
							</h1>
							<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
								{description}
							</p>
						</div>
						<Badge variant="outline" className="w-fit shrink-0">
							{status}
						</Badge>
					</div>
				</header>

				<div
					className={cn(
						"grid flex-1 gap-4",
						hasInspector
							? "lg:grid-cols-[minmax(240px,280px)_minmax(640px,1fr)_minmax(280px,340px)]"
							: "lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]",
					)}
				>
					<div className="lg:sticky lg:top-6 lg:self-start">
						<div className="lg:hidden">
							<div className="flex gap-2">
								<button
									ref={navToggleRef}
									type="button"
									className="inline-flex h-10 items-center justify-center rounded-md border bg-card px-3 text-sm font-medium shadow-sm"
									aria-expanded={mobileNavOpen}
									onClick={() => setMobileNavOpen((value) => !value)}
								>
									{mobileNavOpen ? "收起任务导航" : "展开任务导航"}
								</button>
								{hasInspector ? (
									<button
										ref={inspectorToggleRef}
										type="button"
										className="inline-flex h-10 items-center justify-center rounded-md border bg-card px-3 text-sm font-medium shadow-sm"
										aria-expanded={inspectorOpen}
										onClick={() => setInspectorOpen(true)}
									>
										{inspectorOpen ? "详情已展开" : "查看详情"}
									</button>
								) : null}
							</div>
						</div>
						<div className="hidden lg:block">
							<TaskNav
								{...taskNav}
								collapsed={navCollapsed}
								onToggleCollapsed={() => setNavCollapsed((value) => !value)}
							/>
						</div>
						<div className="lg:hidden">
							{mobileNavOpen ? (
								<div className="mt-3 rounded-xl border bg-card p-4 shadow-lg">
									<TaskNav
										{...taskNav}
										collapsed={false}
										onToggleCollapsed={closeMobileNav}
									/>
								</div>
							) : null}
						</div>
					</div>

					<main className="min-w-0">
						<Card className="h-full border-border/70 shadow-sm">
							<CardHeader className="border-b pb-4">
								<CardTitle className="text-base">{title}</CardTitle>
								<CardDescription>{description}</CardDescription>
							</CardHeader>
							<CardContent className="p-4 sm:p-6">
								<div className="min-h-[360px] rounded-lg bg-background/70">
									{children}
								</div>
							</CardContent>
						</Card>
					</main>

					{hasInspector ? (
						<div className="space-y-4">
							<div className="hidden lg:block">
								<ContextInspector
									title={inspector.title}
									description={inspector.description}
									sections={inspector.sections}
									emptyState={inspector.emptyState}
									className="h-full"
								/>
							</div>
						</div>
					) : null}
				</div>
			</div>
			{inspectorOpen && hasInspector ? (
				<div
					className="fixed inset-0 z-50 bg-background/70 p-3 backdrop-blur-sm lg:hidden"
					role="presentation"
					onClick={closeInspector}
				>
					<div
						className="absolute inset-x-3 top-16 bottom-3 overflow-hidden rounded-2xl border bg-card shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-labelledby={inspectorTitleId}
						aria-describedby={inspectorDescriptionId}
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex h-full flex-col">
							<div className="flex items-center justify-between border-b p-4">
								<div>
									<p
										id={inspectorTitleId}
										className="text-sm font-semibold text-foreground"
									>
										{inspector.title ?? "上下文检查器"}
									</p>
									<p
										id={inspectorDescriptionId}
										className="mt-1 text-xs leading-5 text-muted-foreground"
									>
										{inspector.description ??
											"只展示当前任务所需的上下文和可回看的信息。"}
									</p>
								</div>
								<button
									ref={inspectorCloseRef}
									type="button"
									className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium"
									aria-label="关闭上下文检查器"
									onClick={closeInspector}
								>
									关闭
								</button>
							</div>
							<div className="min-h-0 flex-1 overflow-auto p-4">
								<ContextInspector
									title={inspector.title}
									description={inspector.description}
									sections={inspector.sections}
									emptyState={inspector.emptyState}
									onClose={closeInspector}
									className="border-0"
								/>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
