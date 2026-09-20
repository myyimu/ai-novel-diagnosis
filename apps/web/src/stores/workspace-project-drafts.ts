import type { WorkspaceStoreState } from "./workspace-store";

const draftKeys = [
	"chapterTitle",
	"chapterText",
	"quickReviewResult",
	"scoreResult",
	"quickReviewGenre",
	"quickReviewInputKind",
	"quickReviewChapterPosition",
	"quickReviewDiagnosticFocus",
	"quickReviewPreviousPrompt",
	"quickReviewCoreSellingPoint",
	"quickReviewMustKeepMechanisms",
	"quickReviewTargetReaderPleasures",
	"quickReviewStoryAuditFindingIds",
	"bookGenre",
	"bookText",
	"bookFile",
	"bookUpload",
	"bookJob",
	"bookAnalysisResult",
] as const;

export type ProjectChapterDraft = Pick<WorkspaceStoreState, (typeof draftKeys)[number]>;

export function captureProjectDraft(state: WorkspaceStoreState): ProjectChapterDraft {
	return Object.fromEntries(draftKeys.map((key) => [key, state[key]])) as ProjectChapterDraft;
}

export function switchWorkspaceProject(
	state: WorkspaceStoreState,
	projectId: string,
	emptyState: WorkspaceStoreState,
): Partial<WorkspaceStoreState> {
	if (
		projectId === state.activeProjectId ||
		!state.projects.some((item) => item.id === projectId)
	)
		return {};
	const projectDrafts = {
		...state.projectDrafts,
		[state.activeProjectId]: captureProjectDraft(state),
	};
	return {
		...captureProjectDraft(emptyState),
		...projectDrafts[projectId],
		activeProjectId: projectId,
		bookTitle: state.projects.find((item) => item.id === projectId)?.name ?? "",
		projectDrafts,
	};
}
