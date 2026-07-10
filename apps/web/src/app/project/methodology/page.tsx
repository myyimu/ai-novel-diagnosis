"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { ProjectMethodologyPage } from "@/components/workspace/project/ProjectMethodologyPage";

export default function MethodologyPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<ProjectMethodologyPage />
		</main>
	);
}
