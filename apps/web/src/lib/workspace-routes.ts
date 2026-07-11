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

// 书籍工作区子页面
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

// 书籍工作区子页面路由
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

// 设置工作区兼容路由（input 和 ai-settings 重定向到 provider）
export const settingsRoutesCompat: Record<string, string> = {
	"settings/input": "/settings/provider",
	"settings/ai-settings": "/settings/provider",
};

export type WorkspaceRouteView = DiagnoseView | ProjectView | ResearchView | SettingsView;

export interface WorkspaceRouteMeta {
	workspace: WorkspaceType;
	view: WorkspaceRouteView;
	path: string;
	legacyView: WorkspaceView;
	defaultMainTab: "input" | "diagnosis" | "results" | "analysis";
	defaultRightPanelTab:
		| "history"
		| "reference"
		| "project"
		| "ai-settings"
		| "history-tasks"
		| "help";
}

export const workspaceRouteMeta: WorkspaceRouteMeta[] = [
	{
		workspace: "diagnose",
		view: "quick",
		path: diagnoseRoutes.quick,
		legacyView: "overview",
		defaultMainTab: "input",
		defaultRightPanelTab: "history",
	},
	{
		workspace: "diagnose",
		view: "deep",
		path: diagnoseRoutes.deep,
		legacyView: "chapter",
		defaultMainTab: "diagnosis",
		defaultRightPanelTab: "reference",
	},
	{
		workspace: "diagnose",
		view: "score",
		path: diagnoseRoutes.score,
		legacyView: "chapter",
		defaultMainTab: "diagnosis",
		defaultRightPanelTab: "reference",
	},
	{
		workspace: "diagnose",
		view: "evidence",
		path: diagnoseRoutes.evidence,
		legacyView: "chapter",
		defaultMainTab: "diagnosis",
		defaultRightPanelTab: "reference",
	},
	{
		workspace: "project",
		view: "current",
		path: projectRoutes.current,
		legacyView: "overview",
		defaultMainTab: "results",
		defaultRightPanelTab: "project",
	},
	{
		workspace: "project",
		view: "revisions",
		path: projectRoutes.revisions,
		legacyView: "revisions",
		defaultMainTab: "results",
		defaultRightPanelTab: "history",
	},
	{
		workspace: "project",
		view: "methodology",
		path: projectRoutes.methodology,
		legacyView: "methodology",
		defaultMainTab: "results",
		defaultRightPanelTab: "project",
	},
	{
		workspace: "project",
		view: "export",
		path: projectRoutes.export,
		legacyView: "exports",
		defaultMainTab: "results",
		defaultRightPanelTab: "project",
	},
	{
		workspace: "research",
		view: "book",
		path: researchRoutes.book,
		legacyView: "book",
		defaultMainTab: "analysis",
		defaultRightPanelTab: "history-tasks",
	},
	{
		workspace: "research",
		view: "compare",
		path: researchRoutes.compare,
		legacyView: "library",
		defaultMainTab: "analysis",
		defaultRightPanelTab: "reference",
	},
	{
		workspace: "research",
		view: "patterns",
		path: researchRoutes.patterns,
		legacyView: "starter",
		defaultMainTab: "analysis",
		defaultRightPanelTab: "help",
	},
	{
		workspace: "research",
		view: "materials",
		path: researchRoutes.materials,
		legacyView: "materials",
		defaultMainTab: "analysis",
		defaultRightPanelTab: "reference",
	},
	{
		workspace: "settings",
		view: "provider",
		path: settingsRoutes.provider,
		legacyView: "provider",
		defaultMainTab: "input",
		defaultRightPanelTab: "ai-settings",
	},
	{
		workspace: "settings",
		view: "dashboard",
		path: settingsRoutes.dashboard,
		legacyView: "dashboard",
		defaultMainTab: "results",
		defaultRightPanelTab: "project",
	},
	{
		workspace: "settings",
		view: "history",
		path: settingsRoutes.history,
		legacyView: "history",
		defaultMainTab: "analysis",
		defaultRightPanelTab: "history-tasks",
	},
];

export interface WorkspaceTopNavMeta {
	workspace: WorkspaceType;
	label: string;
	path: string;
	title: string;
	description: string;
}

// 获取工作区首页路由
export function getWorkspaceHomeRoute(workspace: WorkspaceType): string {
	return workspaceRoutes[workspace];
}

export function getWorkspaceTopNavMeta(workspace: WorkspaceType): WorkspaceTopNavMeta {
	const meta =
		workspaceRouteMeta.find(
			(route) => route.workspace === workspace && route.path === workspaceRoutes[workspace],
		) ?? workspaceRouteMeta.find((route) => route.workspace === workspace);

	if (!meta) {
		return {
			workspace,
			label: workspace,
			path: workspaceRoutes[workspace],
			title: workspace,
			description: "",
		};
	}

	return {
		workspace,
		label:
			workspace === "diagnose"
				? "快速诊断"
				: workspace === "project"
					? "我的书籍"
					: workspace === "research"
						? "整本导入"
						: "设置",
		path: workspaceRoutes[workspace],
		title:
			workspace === "diagnose"
				? "快速诊断"
				: workspace === "project"
					? "我的书籍"
					: workspace === "research"
						? "整本导入"
						: "设置",
		description:
			workspace === "diagnose"
				? "输入一章，进入章节诊断页"
				: workspace === "project"
					? "管理小说目录、章节诊断和修改效果"
					: workspace === "research"
						? "上传 TXT，检查章节拆分"
						: "配置和数据看板",
	};
}

export function getWorkspaceTopNavMetaList(): WorkspaceTopNavMeta[] {
	return ["diagnose", "project", "research", "settings"].map((workspace) =>
		getWorkspaceTopNavMeta(workspace as WorkspaceType),
	);
}

// 根据路径解析当前工作区
export function parseWorkspaceFromPath(path: string): WorkspaceType | null {
	if (path.startsWith("/diagnose")) return "diagnose";
	if (path.startsWith("/project")) return "project";
	if (path.startsWith("/research")) return "research";
	if (path.startsWith("/settings")) return "settings";
	return null;
}

export function getWorkspaceRouteMetaByPath(path: string): WorkspaceRouteMeta | undefined {
	const normalized = path.split("?")[0]?.replace(/\/$/, "") || "/";
	return workspaceRouteMeta.find((route) => route.path === normalized);
}

export function getWorkspaceRouteMetaByLegacyView(
	view: WorkspaceView,
): WorkspaceRouteMeta | undefined {
	return workspaceRouteMeta.find((route) => route.legacyView === view);
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
	settingsRoutesCompat,
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
