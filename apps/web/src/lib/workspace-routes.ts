export type WorkspaceView =
	| "overview"
	| "starter"
	| "library"
	| "provider"
	| "chapter"
	| "book"
	| "history"
	| "exports";

export const workspaceViewRoutes: Record<WorkspaceView, string> = {
	overview: "/workspace",
	starter: "/starter",
	library: "/library",
	provider: "/model",
	chapter: "/critique",
	book: "/book",
	history: "/history",
	exports: "/export",
};
