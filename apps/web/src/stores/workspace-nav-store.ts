import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WorkspaceType = "diagnose" | "project" | "research" | "settings";

export interface WorkspaceNavItem {
	id: WorkspaceType;
	label: string;
	icon: string;
	description: string;
}

interface WorkspaceNavState {
	activeWorkspace: WorkspaceType;
	setActiveWorkspace: (workspace: WorkspaceType) => void;
}

export const workspaceNavItems: WorkspaceNavItem[] = [
	{
		id: "diagnose",
		label: "诊断",
		icon: "diagnose",
		description: "章节诊断与改稿建议",
	},
	{
		id: "project",
		label: "项目",
		icon: "project",
		description: "项目管理与方法论沉淀",
	},
	{
		id: "research",
		label: "研究",
		icon: "research",
		description: "样本拆解与套路研究",
	},
	{
		id: "settings",
		label: "设置",
		icon: "settings",
		description: "AI配置与数据看板",
	},
];

export const useWorkspaceNavStore = create<WorkspaceNavState>()(
	persist(
		(set) => ({
			activeWorkspace: "diagnose",
			setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
		}),
		{
			name: "workspace-nav",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
