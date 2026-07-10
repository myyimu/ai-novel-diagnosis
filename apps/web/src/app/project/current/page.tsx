"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { ProjectCurrentPage } from "@/components/workspace/project/ProjectCurrentPage";

export default function CurrentProjectPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<ProjectCurrentPage />
		</main>
	);
}
