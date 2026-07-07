"use client";

import { useMemo } from "react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { MainAreaTabType, type RightPanelTab, type MainAreaTab } from "./types";

import { DiagnosisHistoryPanel } from "./panels/DiagnosisHistoryPanel";
import { ReferenceContextPanel } from "./panels/ReferenceContextPanel";
import { ProjectScopePanel } from "./panels/ProjectScopePanel";

import { InputTab } from "./tabs/InputTab";
import { DiagnosisTab } from "./tabs/DiagnosisTab";
import { ResultsTab } from "./tabs/ResultsTab";
import { AnalysisTab } from "./tabs/AnalysisTab";

import type { WorkspaceNavItem } from "./Sidebar";

interface ThreeColumnWorkspaceProps {
	activeView: string;
	activeMeta: WorkspaceNavItem<string>;
	sidebar: React.ReactNode;
}

export function ThreeColumnWorkspace({ activeView, sidebar }: ThreeColumnWorkspaceProps) {
	const rightPanelTabs: RightPanelTab[] = useMemo(
		() => [
			{
				id: "history",
				label: "诊断历史",
				content: <DiagnosisHistoryPanel />,
			},
			{
				id: "reference",
				label: "参考资料",
				content: <ReferenceContextPanel />,
			},
			{
				id: "project",
				label: "项目范围",
				content: <ProjectScopePanel />,
			},
		],
		[],
	);

	const mainTabs: MainAreaTab[] = useMemo(
		() => [
			{
				id: "input",
				label: "输入",
				content: <InputTab />,
			},
			{
				id: "diagnosis",
				label: "诊断",
				content: <DiagnosisTab />,
			},
			{
				id: "results",
				label: "结果",
				content: <ResultsTab />,
			},
			{
				id: "analysis",
				label: "分析",
				content: <AnalysisTab />,
			},
		],
		[],
	);

	const getDefaultMainTab = (): MainAreaTabType => {
		switch (activeView) {
			case "overview":
			case "chapter-critique":
				return "input";
			case "diagnosis-dashboard":
				return "results";
			case "book-analysis":
			case "library":
			case "export":
				return "analysis";
			default:
				return "input";
		}
	};

	return (
		<WorkspaceLayout
			sidebar={sidebar}
			mainTabs={mainTabs}
			rightPanelTabs={rightPanelTabs}
			defaultMainTab={getDefaultMainTab()}
			defaultRightPanelTab="history"
			showRightPanel={true}
		/>
	);
}
