"use client";

import { WorkspaceNav } from "@/components/workspace/WorkspaceNav";
import { LayoutGrid } from "lucide-react";

export function WorkspaceHeader() {
	return (
		<>
			<header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex items-center justify-between px-4 py-2">
					<div className="flex items-center gap-2">
						<LayoutGrid className="w-5 h-5 text-primary" />
						<h1 className="text-sm font-semibold">AI网文诊断台</h1>
					</div>
				</div>
			</header>
			<WorkspaceNav />
		</>
	);
}
