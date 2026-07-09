"use client";

import { NovelCritiqueConsole } from "@/components/novel-critique-console";
import { WorkspaceHeader } from "@/components/workspace-header";
import { useLayoutMode } from "@/components/layout-toggle";

export default function HistoryPage() {
	const [layoutMode] = useLayoutMode();

	return (
		<main className="min-h-screen bg-background text-foreground">
			<WorkspaceHeader />
			<NovelCritiqueConsole view="history" layoutMode={layoutMode} />
		</main>
	);
}
