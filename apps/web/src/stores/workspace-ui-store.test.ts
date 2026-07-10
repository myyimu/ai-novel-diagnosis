import { describe, expect, it, beforeEach } from "vitest";

import {
	clearRouteScopedUIState,
	migrateLegacyWorkspaceUIState,
	resetWorkspaceUIState,
	useWorkspaceUIStore,
} from "./workspace-ui-store";

describe("workspace-ui-store", () => {
	beforeEach(() => {
		resetWorkspaceUIState();
		useWorkspaceUIStore.setState({
			navCollapsed: true,
			leftSidebarOpen: false,
			leftSidebarWidth: 312,
			rightPanelOpen: true,
			rightPanelWidth: 384,
			rightPanelTab: "history",
			mainTab: "results",
			inspectorOpen: true,
			inspectorSection: "score",
			mobileNavOpen: true,
			advancedMenuOpen: true,
			isResizingLeft: true,
			isResizingRight: true,
		});
	});

	it("migrates legacy workspace layout and UI settings", () => {
		const migrated = migrateLegacyWorkspaceUIState("three-column", {
			navCollapsed: true,
			leftSidebarOpen: false,
			leftSidebarWidth: 288,
			rightPanelOpen: true,
			rightPanelWidth: 360,
			rightPanelTab: "reference",
			mainTab: "diagnosis",
		});

		expect(migrated).toEqual(
			expect.objectContaining({
				navCollapsed: true,
				leftSidebarOpen: false,
				leftSidebarWidth: 288,
				rightPanelOpen: true,
				rightPanelWidth: 360,
				rightPanelTab: "reference",
				mainTab: "diagnosis",
			}),
		);
	});

	it("clears route-scoped ui state without losing user preferences", () => {
		clearRouteScopedUIState();

		const state = useWorkspaceUIStore.getState();

		expect(state.navCollapsed).toBe(true);
		expect(state.leftSidebarWidth).toBe(312);
		expect(state.rightPanelWidth).toBe(384);
		expect(state.mobileNavOpen).toBe(false);
		expect(state.inspectorOpen).toBe(false);
		expect(state.inspectorSection).toBeNull();
		expect(state.isResizingLeft).toBe(false);
		expect(state.isResizingRight).toBe(false);
		expect(state.advancedMenuOpen).toBe(true);
	});
});
