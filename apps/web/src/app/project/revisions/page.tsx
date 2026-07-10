"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { ProjectRevisionsPage } from "@/components/workspace/project/ProjectRevisionsPage";

export default function RevisionsPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<ProjectRevisionsPage />
		</main>
	);
}
