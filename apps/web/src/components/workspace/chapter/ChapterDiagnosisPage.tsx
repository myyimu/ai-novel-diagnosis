"use client";

import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ChapterDiagnosisCompose } from "./ChapterDiagnosisCompose";

export function ChapterDiagnosisPage() {
	const handlers = useWorkspaceHandlers("chapter");

	return (
		<ChapterDiagnosisCompose
			handlers={{
				...handlers,
				competitionLevelLabel: handlers.optionLabel(
					handlers.competitionLevelOptions,
					handlers.competitionLevel,
				),
				pushStageLabel: handlers.optionLabel(handlers.pushStageOptions, handlers.pushStage),
				onOpenPlatformStrategy: () => handlers.openView("chapter"),
				onOpenChapterDraft: () => handlers.openView("chapter"),
			}}
		/>
	);
}
