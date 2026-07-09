// 工作区类型
export type WorkspaceType = "diagnose" | "project" | "research" | "settings";

// 旧视图类型（保持兼容性）
export type WorkspaceView =
	| "overview"
	| "chapter"
	| "book"
	| "library"
	| "starter"
	| "revisions"
	| "methodology"
	| "exports"
	| "provider"
	| "dashboard"
	| "history"
	| "materials";

// 诊断工作区子页面
export type DiagnoseView = "quick" | "deep" | "score" | "evidence";

// 项目工作区子页面
export type ProjectView = "current" | "revisions" | "methodology" | "export";

// 研究工作区子页面
export type ResearchView = "book" | "compare" | "patterns" | "materials";

// 设置工作区子页面
export type SettingsView = "provider" | "dashboard" | "history";

// 工作区路由映射
export const workspaceRoutes: Record<WorkspaceType, string> = {
	diagnose: "/diagnose",
	project: "/project",
	research: "/research",
	settings: "/settings",
};

// 诊断工作区子页面路由
export const diagnoseRoutes: Record<DiagnoseView, string> = {
	quick: "/diagnose/quick",
	deep: "/diagnose/deep",
	score: "/diagnose/score",
	evidence: "/diagnose/evidence",
};

// 项目工作区子页面路由
export const projectRoutes: Record<ProjectView, string> = {
	current: "/project/current",
	revisions: "/project/revisions",
	methodology: "/project/methodology",
	export: "/project/export",
};

// 研究工作区子页面路由
export const researchRoutes: Record<ResearchView, string> = {
	book: "/research/book",
	compare: "/research/compare",
	patterns: "/research/patterns",
	materials: "/research/materials",
};

// 设置工作区子页面路由
export const settingsRoutes: Record<SettingsView, string> = {
	provider: "/settings/provider",
	dashboard: "/settings/dashboard",
	history: "/settings/history",
};

// 获取工作区首页路由
export function getWorkspaceHomeRoute(workspace: WorkspaceType): string {
	return workspaceRoutes[workspace];
}

// 根据路径解析当前工作区
export function parseWorkspaceFromPath(path: string): WorkspaceType | null {
	if (path.startsWith("/diagnose")) return "diagnose";
	if (path.startsWith("/project")) return "project";
	if (path.startsWith("/research")) return "research";
	if (path.startsWith("/settings")) return "settings";
	return null;
}

// 旧视图路由映射（保持兼容性）
export const workspaceViewRoutes: Record<WorkspaceView, string> = {
	overview: "/diagnose/quick",
	chapter: "/diagnose/deep",
	book: "/research/book",
	library: "/research/compare",
	starter: "/research/patterns",
	revisions: "/project/revisions",
	methodology: "/project/methodology",
	exports: "/project/export",
	provider: "/settings/provider",
	dashboard: "/settings/dashboard",
	history: "/settings/history",
	materials: "/research/materials",
};

// 旧视图名（overview/chapter/...）与新子页面 id（quick/deep/current/...）统一解析。
// 导航项现在使用新 id，但 openView 仍会收到旧视图名（如 h.openView("provider")），
// 因此需要同时覆盖两套命名。
const workspaceRouteResolvers: ReadonlyArray<Record<string, string>> = [
	workspaceViewRoutes,
	diagnoseRoutes,
	projectRoutes,
	researchRoutes,
	settingsRoutes,
	workspaceRoutes,
];

export function resolveWorkspaceRoute(view: string): string | undefined {
	for (const map of workspaceRouteResolvers) {
		if (view in map) {
			return map[view];
		}
	}
	return undefined;
}
