"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { ProjectExportPage } from "@/components/workspace/project/ProjectExportPage";

export default function ExportPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<ProjectExportPage />
		</main>
	);
}
