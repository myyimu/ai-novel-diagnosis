"use client";

import { WorkspaceHeader } from "@/components/workspace-header";
import { SettingsWorkspace } from "@/components/workspace/settings/SettingsWorkspace";

export default function ProviderSettingsPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<SettingsWorkspace />
		</main>
	);
}
