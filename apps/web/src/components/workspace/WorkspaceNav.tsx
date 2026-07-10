"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Stethoscope, FolderOpen, Microscope, Settings } from "lucide-react";
import { useWorkspaceNavStore, type WorkspaceType } from "@/stores/workspace-nav-store";
import {
	getWorkspaceTopNavMetaList,
	parseWorkspaceFromPath,
	workspaceRoutes,
} from "@/lib/workspace-routes";
import { cn } from "@/lib/utils";

const workspaceIcons: Record<WorkspaceType, React.ComponentType<{ className?: string }>> = {
	diagnose: Stethoscope,
	project: FolderOpen,
	research: Microscope,
	settings: Settings,
};

export function WorkspaceNav() {
	const router = useRouter();
	const pathname = usePathname();
	const { activeWorkspace, setActiveWorkspace } = useWorkspaceNavStore();
	const currentWorkspace = parseWorkspaceFromPath(pathname);
	const activeNavWorkspace = currentWorkspace ?? activeWorkspace;
	const topNavItems = getWorkspaceTopNavMetaList();

	useEffect(() => {
		if (currentWorkspace && currentWorkspace !== activeWorkspace) {
			setActiveWorkspace(currentWorkspace);
		}
	}, [currentWorkspace, activeWorkspace, setActiveWorkspace]);

	const handleWorkspaceChange = (workspace: WorkspaceType) => {
		setActiveWorkspace(workspace);
		router.push(workspaceRoutes[workspace]);
	};

	return (
		<nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-1 overflow-x-auto">
					{topNavItems.map((item) => {
						const Icon = workspaceIcons[item.workspace];
						const isActive = activeNavWorkspace === item.workspace;
						return (
							<button
								key={item.workspace}
								type="button"
								onClick={() => handleWorkspaceChange(item.workspace)}
								aria-current={isActive ? "page" : undefined}
								aria-label={`${item.label}${isActive ? "，当前页面" : ""}`}
								className={cn(
									"flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
									isActive
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
								)}
							>
								<Icon className="w-4 h-4" />
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
