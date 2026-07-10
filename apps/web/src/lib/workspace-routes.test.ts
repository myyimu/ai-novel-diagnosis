import { describe, expect, it } from "vitest";
import {
	diagnoseRoutes,
	getWorkspaceHomeRoute,
	getWorkspaceRouteMetaByLegacyView,
	getWorkspaceRouteMetaByPath,
	getWorkspaceTopNavMetaList,
	parseWorkspaceFromPath,
	projectRoutes,
	researchRoutes,
	resolveWorkspaceRoute,
	settingsRoutes,
	workspaceRouteMeta,
	workspaceRoutes,
	workspaceViewRoutes,
} from "./workspace-routes";
import { workspaceNavItems } from "@/stores/workspace-nav-store";

describe("workspace routes", () => {
	it("keeps workspace navigation items aligned with the top-level workspaces", () => {
		expect(workspaceNavItems.map((item) => item.id)).toEqual([
			"diagnose",
			"project",
			"research",
			"settings",
		]);
		expect(workspaceRoutes).toEqual({
			diagnose: "/diagnose",
			project: "/project",
			research: "/research",
			settings: "/settings",
		});
		expect(getWorkspaceHomeRoute("diagnose")).toBe("/diagnose");
		expect(getWorkspaceHomeRoute("project")).toBe("/project");
		expect(getWorkspaceHomeRoute("research")).toBe("/research");
		expect(getWorkspaceHomeRoute("settings")).toBe("/settings");
		expect(getWorkspaceTopNavMetaList().map((item) => item.path)).toEqual([
			"/diagnose",
			"/project",
			"/research",
			"/settings",
		]);
	});

	it("parses the active workspace from representative URLs", () => {
		expect(parseWorkspaceFromPath("/diagnose/quick")).toBe("diagnose");
		expect(parseWorkspaceFromPath("/diagnose/deep?tab=results")).toBe("diagnose");
		expect(parseWorkspaceFromPath("/project/current/")).toBe("project");
		expect(parseWorkspaceFromPath("/research/book")).toBe("research");
		expect(parseWorkspaceFromPath("/settings/provider")).toBe("settings");
		expect(parseWorkspaceFromPath("/unknown/path")).toBeNull();
	});

	it("maps representative routes to route meta and default panels", () => {
		expect(getWorkspaceRouteMetaByLegacyView("chapter")).toEqual(
			expect.objectContaining({
				workspace: "diagnose",
				view: "deep",
				legacyView: "chapter",
			}),
		);

		expect(getWorkspaceRouteMetaByPath("/diagnose/quick")).toEqual(
			expect.objectContaining({
				workspace: "diagnose",
				view: "quick",
				legacyView: "overview",
				defaultMainTab: "input",
				defaultRightPanelTab: "history",
			}),
		);

		expect(getWorkspaceRouteMetaByPath("/diagnose/evidence?source=review")).toEqual(
			expect.objectContaining({
				workspace: "diagnose",
				view: "evidence",
				legacyView: "chapter",
				defaultMainTab: "diagnosis",
				defaultRightPanelTab: "reference",
			}),
		);

		expect(getWorkspaceRouteMetaByPath("/project/current")).toEqual(
			expect.objectContaining({
				workspace: "project",
				view: "current",
				legacyView: "overview",
				defaultMainTab: "results",
				defaultRightPanelTab: "project",
			}),
		);

		expect(getWorkspaceRouteMetaByPath("/research/book")).toEqual(
			expect.objectContaining({
				workspace: "research",
				view: "book",
				legacyView: "book",
				defaultMainTab: "analysis",
				defaultRightPanelTab: "history-tasks",
			}),
		);

		expect(getWorkspaceRouteMetaByPath("/settings/provider")).toEqual(
			expect.objectContaining({
				workspace: "settings",
				view: "provider",
				legacyView: "provider",
				defaultMainTab: "input",
				defaultRightPanelTab: "ai-settings",
			}),
		);
	});

	it("records which route families currently share the same legacy view", () => {
		const sharedLegacyViews = workspaceRouteMeta.reduce<Record<string, string[]>>(
			(accumulator, route) => {
				const existingRoutes = accumulator[route.legacyView] ?? [];
				accumulator[route.legacyView] = [...existingRoutes, route.path];
				return accumulator;
			},
			{},
		);

		expect(sharedLegacyViews.overview).toEqual(["/diagnose/quick", "/project/current"]);
		expect(sharedLegacyViews.chapter).toEqual([
			"/diagnose/deep",
			"/diagnose/score",
			"/diagnose/evidence",
		]);
		expect(sharedLegacyViews.book).toEqual(["/research/book"]);
		expect(sharedLegacyViews.provider).toEqual(["/settings/provider"]);
	});

	it("resolves both legacy view names and new route ids to paths", () => {
		expect(resolveWorkspaceRoute("overview")).toBe(workspaceViewRoutes.overview);
		expect(resolveWorkspaceRoute("chapter")).toBe(workspaceViewRoutes.chapter);
		expect(resolveWorkspaceRoute("book")).toBe(workspaceViewRoutes.book);
		expect(resolveWorkspaceRoute("library")).toBe(workspaceViewRoutes.library);
		expect(resolveWorkspaceRoute("starter")).toBe(workspaceViewRoutes.starter);
		expect(resolveWorkspaceRoute("revisions")).toBe(workspaceViewRoutes.revisions);
		expect(resolveWorkspaceRoute("methodology")).toBe(workspaceViewRoutes.methodology);
		expect(resolveWorkspaceRoute("exports")).toBe(workspaceViewRoutes.exports);
		expect(resolveWorkspaceRoute("provider")).toBe(workspaceViewRoutes.provider);
		expect(resolveWorkspaceRoute("dashboard")).toBe(workspaceViewRoutes.dashboard);
		expect(resolveWorkspaceRoute("history")).toBe(workspaceViewRoutes.history);
		expect(resolveWorkspaceRoute("materials")).toBe(workspaceViewRoutes.materials);

		expect(resolveWorkspaceRoute("quick")).toBe(diagnoseRoutes.quick);
		expect(resolveWorkspaceRoute("deep")).toBe(diagnoseRoutes.deep);
		expect(resolveWorkspaceRoute("score")).toBe(diagnoseRoutes.score);
		expect(resolveWorkspaceRoute("evidence")).toBe(diagnoseRoutes.evidence);
		expect(resolveWorkspaceRoute("current")).toBe(projectRoutes.current);
		expect(resolveWorkspaceRoute("compare")).toBe(researchRoutes.compare);
		expect(resolveWorkspaceRoute("patterns")).toBe(researchRoutes.patterns);
		expect(resolveWorkspaceRoute("materials")).toBe(researchRoutes.materials);
		expect(resolveWorkspaceRoute("provider")).toBe(settingsRoutes.provider);
	});
});
