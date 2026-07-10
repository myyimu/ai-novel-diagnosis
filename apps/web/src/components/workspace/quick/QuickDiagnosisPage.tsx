"use client";

import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { QuickDiagnosisCompose } from "./QuickDiagnosisCompose";

export function QuickDiagnosisPage() {
	const handlers = useWorkspaceHandlers("overview");

	return <QuickDiagnosisCompose handlers={handlers} />;
}
