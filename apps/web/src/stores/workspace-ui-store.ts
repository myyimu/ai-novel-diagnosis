import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Workspace UI Store
 *
 * 这个store专门管理UI相关的状态，与业务状态分离。
 * 这样可以确保：
 * 1. UI状态不会污染业务状态
 * 2. 路由切换时UI状态可以正确清理
 * 3. 持久化策略更清晰
 */

// 导航相关状态
export interface NavigationUIState {
	navCollapsed: boolean; // 左侧导航是否折叠
	mobileNavOpen: boolean; // 移动端导航是否打开
	advancedMenuOpen: boolean; // 高级菜单是否打开
}

// 面板相关状态
export interface PanelUIState {
	leftSidebarOpen: boolean; // 左侧边栏是否打开
	leftSidebarWidth: number; // 左侧边栏宽度
	rightPanelOpen: boolean; // 右侧面板是否打开
	rightPanelWidth: number; // 右侧面板宽度
	rightPanelTab: string; // 右侧面板当前标签
	mainTab: string; // 主内容区当前标签
}

// Inspector相关状态
export interface InspectorUIState {
	inspectorOpen: boolean; // 检查器是否打开
	inspectorSection: string | null; // 当前检查器显示的部分
}

// 调整大小状态
export interface ResizeUIState {
	isResizingLeft: boolean; // 是否正在调整左侧面板
	isResizingRight: boolean; // 是否正在调整右侧面板
}

type LegacyLayoutMode = "classic" | "three-column" | string;

interface LegacyWorkspaceSettings {
	navCollapsed?: boolean;
	leftSidebarOpen?: boolean;
	leftSidebarWidth?: number;
	rightPanelOpen?: boolean;
	rightPanelWidth?: number;
	rightPanelTab?: string;
	mainTab?: string;
}

// 所有UI状态
export interface WorkspaceUIState
	extends NavigationUIState, PanelUIState, InspectorUIState, ResizeUIState {}

// UI状态操作（支持函数式更新）
export interface WorkspaceUIActions {
	// 导航操作
	setNavCollapsed: (collapsed: boolean | ((current: boolean) => boolean)) => void;
	toggleNavCollapsed: () => void;
	setMobileNavOpen: (open: boolean | ((current: boolean) => boolean)) => void;
	setAdvancedMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
	toggleAdvancedMenu: () => void;

	// 面板操作
	setLeftSidebarOpen: (open: boolean | ((current: boolean) => boolean)) => void;
	setLeftSidebarWidth: (width: number | ((current: number) => number)) => void;
	setRightPanelOpen: (open: boolean | ((current: boolean) => boolean)) => void;
	setRightPanelWidth: (width: number | ((current: number) => number)) => void;
	setRightPanelTab: (tab: string | ((current: string) => string)) => void;
	setMainTab: (tab: string | ((current: string) => string)) => void;

	// Inspector操作
	setInspectorOpen: (open: boolean | ((current: boolean) => boolean)) => void;
	setInspectorSection: (
		section: string | null | ((current: string | null) => string | null),
	) => void;
	openInspector: (section: string) => void;
	closeInspector: () => void;

	// 调整大小操作
	setIsResizingLeft: (resizing: boolean | ((current: boolean) => boolean)) => void;
	setIsResizingRight: (resizing: boolean | ((current: boolean) => boolean)) => void;
}

// 默认UI状态
const defaultUIState: WorkspaceUIState = {
	// 导航默认状态
	navCollapsed: false,
	mobileNavOpen: false,
	advancedMenuOpen: false,

	// 面板默认状态
	leftSidebarOpen: true,
	leftSidebarWidth: 280,
	rightPanelOpen: false,
	rightPanelWidth: 320,
	rightPanelTab: "",
	mainTab: "",

	// Inspector默认状态
	inspectorOpen: false,
	inspectorSection: null,

	// 调整大小默认状态
	isResizingLeft: false,
	isResizingRight: false,
};

export function migrateLegacyWorkspaceUIState(
	legacyLayoutMode: LegacyLayoutMode | null | undefined,
	legacyWorkspaceSettings: LegacyWorkspaceSettings | null | undefined,
): Partial<WorkspaceUIState> {
	const migrated: Partial<WorkspaceUIState> = {};

	if (legacyLayoutMode === "three-column") {
		migrated.leftSidebarOpen = true;
		migrated.rightPanelOpen = true;
	}

	if (legacyWorkspaceSettings) {
		if (typeof legacyWorkspaceSettings.navCollapsed === "boolean") {
			migrated.navCollapsed = legacyWorkspaceSettings.navCollapsed;
		}
		if (typeof legacyWorkspaceSettings.leftSidebarOpen === "boolean") {
			migrated.leftSidebarOpen = legacyWorkspaceSettings.leftSidebarOpen;
		}
		if (typeof legacyWorkspaceSettings.leftSidebarWidth === "number") {
			migrated.leftSidebarWidth = legacyWorkspaceSettings.leftSidebarWidth;
		}
		if (typeof legacyWorkspaceSettings.rightPanelOpen === "boolean") {
			migrated.rightPanelOpen = legacyWorkspaceSettings.rightPanelOpen;
		}
		if (typeof legacyWorkspaceSettings.rightPanelWidth === "number") {
			migrated.rightPanelWidth = legacyWorkspaceSettings.rightPanelWidth;
		}
		if (typeof legacyWorkspaceSettings.rightPanelTab === "string") {
			migrated.rightPanelTab = legacyWorkspaceSettings.rightPanelTab;
		}
		if (typeof legacyWorkspaceSettings.mainTab === "string") {
			migrated.mainTab = legacyWorkspaceSettings.mainTab;
		}
	}

	return migrated;
}

// UI Store类型
export type WorkspaceUIStore = WorkspaceUIState & WorkspaceUIActions;

// 创建UI Store
export const useWorkspaceUIStore = create<WorkspaceUIStore>()(
	persist<WorkspaceUIStore, [], [], Partial<WorkspaceUIState>>(
		(set) => ({
			...defaultUIState,

			// 导航操作
			setNavCollapsed: (collapsed) =>
				set((state) => ({
					navCollapsed:
						typeof collapsed === "function" ? collapsed(state.navCollapsed) : collapsed,
				})),
			toggleNavCollapsed: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
			setMobileNavOpen: (open) =>
				set((state) => ({
					mobileNavOpen: typeof open === "function" ? open(state.mobileNavOpen) : open,
				})),
			setAdvancedMenuOpen: (open) =>
				set((state) => ({
					advancedMenuOpen:
						typeof open === "function" ? open(state.advancedMenuOpen) : open,
				})),
			toggleAdvancedMenu: () =>
				set((state) => ({ advancedMenuOpen: !state.advancedMenuOpen })),

			// 面板操作
			setLeftSidebarOpen: (open) =>
				set((state) => ({
					leftSidebarOpen:
						typeof open === "function" ? open(state.leftSidebarOpen) : open,
				})),
			setLeftSidebarWidth: (width) =>
				set((state) => ({
					leftSidebarWidth:
						typeof width === "function" ? width(state.leftSidebarWidth) : width,
				})),
			setRightPanelOpen: (open) =>
				set((state) => ({
					rightPanelOpen: typeof open === "function" ? open(state.rightPanelOpen) : open,
				})),
			setRightPanelWidth: (width) =>
				set((state) => ({
					rightPanelWidth:
						typeof width === "function" ? width(state.rightPanelWidth) : width,
				})),
			setRightPanelTab: (tab) =>
				set((state) => ({
					rightPanelTab: typeof tab === "function" ? tab(state.rightPanelTab) : tab,
				})),
			setMainTab: (tab) =>
				set((state) => ({
					mainTab: typeof tab === "function" ? tab(state.mainTab) : tab,
				})),

			// Inspector操作
			setInspectorOpen: (open) =>
				set((state) => ({
					inspectorOpen: typeof open === "function" ? open(state.inspectorOpen) : open,
				})),
			setInspectorSection: (section) =>
				set((state) => {
					const newSection =
						typeof section === "function" ? section(state.inspectorSection) : section;
					return {
						inspectorSection: newSection,
						inspectorOpen: newSection !== null,
					};
				}),
			openInspector: (section) => set({ inspectorOpen: true, inspectorSection: section }),
			closeInspector: () => set({ inspectorOpen: false, inspectorSection: null }),

			// 调整大小操作
			setIsResizingLeft: (resizing) =>
				set((state) => ({
					isResizingLeft:
						typeof resizing === "function" ? resizing(state.isResizingLeft) : resizing,
				})),
			setIsResizingRight: (resizing) =>
				set((state) => ({
					isResizingRight:
						typeof resizing === "function" ? resizing(state.isResizingRight) : resizing,
				})),
		}),
		{
			name: "workspace-ui-state",
			version: 1,
			storage: createJSONStorage(() => localStorage),
			// 只持久化部分状态，调整大小状态不持久化
			partialize: (state) => ({
				navCollapsed: state.navCollapsed,
				leftSidebarOpen: state.leftSidebarOpen,
				leftSidebarWidth: state.leftSidebarWidth,
				rightPanelOpen: state.rightPanelOpen,
				rightPanelWidth: state.rightPanelWidth,
				// 不持久化临时状态
				mobileNavOpen: false,
				advancedMenuOpen: false,
				isResizingLeft: false,
				isResizingRight: false,
				inspectorOpen: false,
				inspectorSection: null,
				rightPanelTab: "",
				mainTab: "",
			}),
			// 兼容旧的localStorage key读取
			onRehydrateStorage: () => (state) => {
				if (!state) return;

				try {
					const oldLayoutState = localStorage.getItem("workspace-layout-mode");
					const oldWorkspaceState = localStorage.getItem(
						"ai-novel-diagnosis-local-settings",
					);
					const legacyLayoutMode = oldLayoutState
						? (JSON.parse(oldLayoutState) as { state?: { mode?: LegacyLayoutMode } })
								.state?.mode
						: undefined;
					const legacyWorkspaceSettings = oldWorkspaceState
						? (
								JSON.parse(oldWorkspaceState) as {
									state?: LegacyWorkspaceSettings;
								}
							).state
						: undefined;
					const migrated = migrateLegacyWorkspaceUIState(
						legacyLayoutMode,
						legacyWorkspaceSettings,
					);
					if (Object.keys(migrated).length > 0) {
						useWorkspaceUIStore.setState((current) => ({
							...current,
							...migrated,
						}));
					}
				} catch (error) {
					console.warn("Failed to migrate old UI state:", error);
				}
			},
		},
	),
);

// 辅助函数：重置UI状态（用于测试或调试）
export function resetWorkspaceUIState() {
	const defaultState: Partial<WorkspaceUIState> = {
		...defaultUIState,
		// 保留一些用户偏好设置
		navCollapsed: false,
		leftSidebarWidth: 280,
		rightPanelWidth: 320,
	};

	useWorkspaceUIStore.setState(defaultState);
}

// 辅助函数：清理路由相关的UI状态（用于路由切换时）
export function clearRouteScopedUIState() {
	useWorkspaceUIStore.setState({
		// 清理临时UI状态
		mobileNavOpen: false,
		inspectorOpen: false,
		inspectorSection: null,
		isResizingLeft: false,
		isResizingRight: false,
		// 保留用户偏好设置
		navCollapsed: useWorkspaceUIStore.getState().navCollapsed,
		leftSidebarWidth: useWorkspaceUIStore.getState().leftSidebarWidth,
		rightPanelWidth: useWorkspaceUIStore.getState().rightPanelWidth,
	});
}
