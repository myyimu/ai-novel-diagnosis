export type WorkspaceView =
	| "overview"
	| "dashboard"
	| "methodology"
	| "revisions"
	| "starter"
	| "library"
	| "provider"
	| "chapter"
	| "book"
	| "history"
	| "exports";

export const workspaceViewRoutes: Record<WorkspaceView, string> = {
	overview: "/workspace",
	dashboard: "/dashboard",
	methodology: "/methodology",
	revisions: "/revisions",
	starter: "/starter",
	library: "/library",
	provider: "/model",
	chapter: "/critique",
	book: "/book",
	history: "/history",
	exports: "/export",
};
