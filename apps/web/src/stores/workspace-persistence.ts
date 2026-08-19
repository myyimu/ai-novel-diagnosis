// 工作区持久化（localStorage）逻辑 —— 从 workspace-store.ts 拆出。
// 职责：partialize（写盘裁剪）与 merge（读盘合并/防御性归一化）。
// 注意：本模块与 workspace-store 仅存在 type 级引用，无运行时循环。
import {
	defaultProviderConnection,
	defaultQuickReviewDiagnosticFocus,
	defaultWorkspaceProject,
	type BookAnalysisJob,
	type ProviderConfigHistoryEntry,
	type ProviderPresetId,
} from "./workspace-types";
import type { WorkspaceStore, WorkspaceStoreState } from "./workspace-store";

const PROVIDER_CONFIG_HISTORY_MAX_ENTRIES = 10;

const persistableWorkspaceKeys = [
	"projects",
	"activeProjectId",
	"provider",
	"providerConnection",
	"referenceTitle",
	"genre",
	"platform",
	"audience",
	"readingMode",
	"category",
	"theme",
	"tags",
	"explicitKeywords",
	"implicitExpectations",
	"positioningPromise",
	"recommendationSignals",
	"competitionLevel",
	"competitionNotes",
	"pushStage",
	"trafficEntry",
	"impressions",
	"clickThroughRate",
	"validReadRate",
	"read30sRate",
	"read60sRate",
	"bottomRate",
	"followRate",
	"bookshelfRate",
	"firstChapterCompletionRate",
	"nextChapterClickRate",
	"threeChapterRetentionRate",
	"avgReadProgressRate",
	"paidUnlockRate",
	"aiSelfTestEnabled",
	"enabledAiSelfTests",
	"referenceText",
	"referenceFileName",
	"chapterTitle",
	"chapterText",
	"quickReviewGenre",
	"quickReviewInputKind",
	"quickReviewChapterPosition",
	"quickReviewDiagnosticFocus",
	"quickReviewPreviousPrompt",
	"quickReviewCoreSellingPoint",
	"quickReviewMustKeepMechanisms",
	"quickReviewTargetReaderPleasures",
	"quickReviewStoryAuditFindingIds",
	"saveQuickReviewMethodology",
	"providerConfigHistory",
	"rubricResult",
	"scoreResult",
	"quickReviewResult",
	"referenceProfileProgress",
	"scoreProgress",
	"bookTitle",
	"bookGenre",
	"bookUpload",
	"uploadHistory",
	"bookJob",
	"selectedResearchJobIds",
	"comparisonFocus",
	"researchQuestion",
	"quickReviewCache",
	"rubricCache",
	"scoreCache",
	"bookAnalysisCache",
	"revisionSessions",
	"revisionVersions",
	"methodologyCards",
	"engineCards",
] as const satisfies Array<keyof WorkspaceStoreState>;

export type PersistedWorkspaceState = Pick<
	WorkspaceStoreState,
	(typeof persistableWorkspaceKeys)[number]
>;

function toPersistedBookJob(job: BookAnalysisJob | null): BookAnalysisJob | null {
	if (!job) {
		return null;
	}

	return {
		id: job.id,
		type: job.type,
		status: job.status,
		inputSummary: { ...job.inputSummary },
		progress: { ...job.progress },
		partialResult: job.partialResult ? { ...job.partialResult } : undefined,
		error: job.error,
		uploadId: job.uploadId,
	};
}

function pruneProviderConfigHistory(rawHistory: unknown): ProviderConfigHistoryEntry[] {
	if (!Array.isArray(rawHistory)) {
		return [];
	}

	return rawHistory
		.filter((entry): entry is ProviderConfigHistoryEntry => {
			if (!entry || typeof entry !== "object") {
				return false;
			}

			const typed = entry as {
				id?: unknown;
				createdAt?: unknown;
				title?: unknown;
				provider?: unknown;
			};
			if (
				typeof typed.id !== "string" ||
				typeof typed.createdAt !== "string" ||
				typeof typed.title !== "string" ||
				typeof typed.provider !== "object" ||
				typed.provider === null
			) {
				return false;
			}

			const timestamp = Date.parse(typed.createdAt);
			return Number.isFinite(timestamp);
		})
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, PROVIDER_CONFIG_HISTORY_MAX_ENTRIES);
}

export function partializeWorkspaceState(state: WorkspaceStoreState): PersistedWorkspaceState {
	return persistableWorkspaceKeys.reduce((result, key) => {
		if (key === "bookJob") {
			result.bookJob = toPersistedBookJob(
				state.bookJob,
			) as PersistedWorkspaceState["bookJob"];
			return result;
		}

		if (key === "providerConfigHistory") {
			result.providerConfigHistory = pruneProviderConfigHistory(
				state.providerConfigHistory,
			) as PersistedWorkspaceState["providerConfigHistory"];
			return result;
		}

		if (key === "bookAnalysisCache") {
			result.bookAnalysisCache = state.bookAnalysisCache.map((entry) => ({
				...entry,
				job: toPersistedBookJob(entry.job) ?? entry.job,
				result: null,
			})) as PersistedWorkspaceState["bookAnalysisCache"];
			return result;
		}

		result[key] = state[key] as never;
		return result;
	}, {} as PersistedWorkspaceState);
}

export function mergeWorkspaceState(
	persistedState: unknown,
	currentState: WorkspaceStore,
): WorkspaceStore {
	const persisted =
		persistedState && typeof persistedState === "object"
			? (persistedState as Partial<WorkspaceStoreState>)
			: {};
	const persistedProvider = persisted.provider;
	const allowedPresets: ProviderPresetId[] = [
		"mock",
		"custom",
		"shared-gpu",
		"deepseek",
		"doubao",
		"zhipu",
		"qwen",
		"ollama",
		"local",
		"new-api",
	];
	const safeProvider =
		persistedProvider && allowedPresets.includes(persistedProvider.preset)
			? persistedProvider
			: currentState.provider;
	const normalizedProvider =
		safeProvider.kind === "mock"
			? {
					...safeProvider,
					preset: "mock" as const,
					baseUrl: "",
					apiKey: "",
					model: "",
					jsonMode: false,
				}
			: safeProvider.preset === "new-api"
				? {
						...safeProvider,
						preset: "custom" as const,
						baseUrl: safeProvider.baseUrl || "https://new-api.rugao.me/v1",
						model: safeProvider.model || "deepseek-v4-flash",
					}
				: safeProvider;
	const providerConfigHistory = pruneProviderConfigHistory(
		(persisted as { providerConfigHistory?: unknown }).providerConfigHistory,
	);
	const providerConnection =
		persisted.providerConnection &&
		typeof persisted.providerConnection === "object" &&
		["unknown", "testing", "success", "error"].includes(persisted.providerConnection.status)
			? {
					...defaultProviderConnection,
					...persisted.providerConnection,
					status:
						persisted.providerConnection.status === "testing"
							? "unknown"
							: persisted.providerConnection.status,
				}
			: currentState.providerConnection;
	const projects =
		Array.isArray(persisted.projects) && persisted.projects.length
			? persisted.projects
			: currentState.projects;
	const activeProjectId =
		typeof persisted.activeProjectId === "string" &&
		projects.some((project) => project.id === persisted.activeProjectId)
			? persisted.activeProjectId
			: projects[0]?.id || defaultWorkspaceProject.id;

	return {
		...currentState,
		...persisted,
		projects,
		activeProjectId,
		providerConfigHistory,
		providerConnection,
		provider: normalizedProvider
			? {
					...currentState.provider,
					...normalizedProvider,
				}
			: currentState.provider,
		quickReviewCoreSellingPoint: persisted.quickReviewCoreSellingPoint || "",
		quickReviewChapterPosition: persisted.quickReviewChapterPosition || "unknown",
		quickReviewDiagnosticFocus:
			persisted.quickReviewDiagnosticFocus || defaultQuickReviewDiagnosticFocus,
		quickReviewMustKeepMechanisms: persisted.quickReviewMustKeepMechanisms || "",
		quickReviewTargetReaderPleasures: persisted.quickReviewTargetReaderPleasures || "",
		quickReviewStoryAuditFindingIds: Array.isArray(persisted.quickReviewStoryAuditFindingIds)
			? persisted.quickReviewStoryAuditFindingIds.filter(Boolean)
			: [],
		saveQuickReviewMethodology: Boolean(persisted.saveQuickReviewMethodology),
		bookFile: null,
	};
}
