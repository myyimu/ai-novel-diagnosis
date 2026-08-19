import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import {
	aiSelfTests,
	defaultWorkspaceProject,
	defaultProvider,
	defaultProviderConnection,
	defaultQuickReviewDiagnosticFocus,
	type AiSelfTestId,
	type BookAnalysisJob,
	type BookAnalysisResult,
	type BookUploadPreview,
	type CachedBookAnalysis,
	type CachedQuickReview,
	type CachedRubricResult,
	type CachedScoreResult,
	type ChapterPosition,
	type PersistedResearchLibrary,
	type PremiseEngineCard,
	type ProjectMethodologyCard,
	type ProviderConfigHistoryEntry,
	type ProviderConnectionState,
	type ProviderForm,
	type QuickReviewInputKind,
	type QuickReviewResult,
	type ReferenceProfileProgressItem,
	type ResearchComparisonResult,
	type ResearchQaResult,
	type RevisionSession,
	type RevisionTextVersion,
	type RubricResult,
	type ScoreProgressItem,
	type ScoreResult,
	type WorkspaceProject,
} from "./workspace-types";
import {
	mergeWorkspaceState,
	partializeWorkspaceState,
	type PersistedWorkspaceState,
} from "./workspace-persistence";

// 兼容层：39 个消费方仍从 @/stores/workspace-store 导入领域类型与持久化函数。
// 新代码建议直接从 workspace-types / workspace-persistence 导入。
export * from "./workspace-types";
export {
	mergeWorkspaceState,
	partializeWorkspaceState,
	type PersistedWorkspaceState,
} from "./workspace-persistence";

type StoreSetter<T> = (value: T | ((current: T) => T)) => void;

function resolveStoreValue<T>(value: T | ((current: T) => T), current: T): T {
	return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export interface WorkspaceStoreState {
	projects: WorkspaceProject[];
	activeProjectId: string;
	provider: ProviderForm;
	providerConnection: ProviderConnectionState;
	providerConfigHistory: ProviderConfigHistoryEntry[];
	referenceTitle: string;
	genre: string;
	platform: string;
	audience: string;
	readingMode: string;
	category: string;
	theme: string;
	tags: string;
	explicitKeywords: string;
	implicitExpectations: string;
	positioningPromise: string;
	recommendationSignals: string;
	competitionLevel: string;
	competitionNotes: string;
	pushStage: string;
	trafficEntry: string;
	impressions: string;
	clickThroughRate: string;
	validReadRate: string;
	read30sRate: string;
	read60sRate: string;
	bottomRate: string;
	followRate: string;
	bookshelfRate: string;
	firstChapterCompletionRate: string;
	nextChapterClickRate: string;
	threeChapterRetentionRate: string;
	avgReadProgressRate: string;
	paidUnlockRate: string;
	aiSelfTestEnabled: boolean;
	enabledAiSelfTests: AiSelfTestId[];
	referenceText: string;
	referenceFileName: string;
	chapterTitle: string;
	chapterText: string;
	quickReviewGenre: string;
	quickReviewInputKind: QuickReviewInputKind;
	quickReviewChapterPosition: ChapterPosition;
	quickReviewDiagnosticFocus: string;
	quickReviewPreviousPrompt: string;
	quickReviewCoreSellingPoint: string;
	quickReviewMustKeepMechanisms: string;
	quickReviewTargetReaderPleasures: string;
	quickReviewStoryAuditFindingIds: string[];
	saveQuickReviewMethodology: boolean;
	rubricResult: RubricResult | null;
	scoreResult: ScoreResult | null;
	quickReviewResult: QuickReviewResult | null;
	referenceProfileProgress: ReferenceProfileProgressItem[];
	scoreProgress: ScoreProgressItem[];
	bookTitle: string;
	bookGenre: string;
	bookText: string;
	bookFile: File | null;
	bookUpload: BookUploadPreview | null;
	bookHistory: BookAnalysisJob[];
	uploadHistory: BookUploadPreview[];
	bookAnalysisResult: BookAnalysisResult | null;
	bookJob: BookAnalysisJob | null;
	persistedResearchLibrary: PersistedResearchLibrary | null;
	selectedResearchJobIds: string[];
	comparisonFocus: string;
	researchComparison: ResearchComparisonResult | null;
	researchQuestion: string;
	researchQaResult: ResearchQaResult | null;
	quickReviewCache: CachedQuickReview[];
	rubricCache: CachedRubricResult[];
	scoreCache: CachedScoreResult[];
	bookAnalysisCache: CachedBookAnalysis[];
	revisionSessions: RevisionSession[];
	revisionVersions: RevisionTextVersion[];
	methodologyCards: ProjectMethodologyCard[];
	engineCards: PremiseEngineCard[];
}

interface WorkspaceStoreActions {
	setProjects: StoreSetter<WorkspaceProject[]>;
	setActiveProjectId: StoreSetter<string>;
	setProvider: StoreSetter<ProviderForm>;
	setProviderConnection: StoreSetter<ProviderConnectionState>;
	setProviderConfigHistory: StoreSetter<ProviderConfigHistoryEntry[]>;
	setReferenceTitle: StoreSetter<string>;
	setGenre: StoreSetter<string>;
	setPlatform: StoreSetter<string>;
	setAudience: StoreSetter<string>;
	setReadingMode: StoreSetter<string>;
	setCategory: StoreSetter<string>;
	setTheme: StoreSetter<string>;
	setTags: StoreSetter<string>;
	setExplicitKeywords: StoreSetter<string>;
	setImplicitExpectations: StoreSetter<string>;
	setPositioningPromise: StoreSetter<string>;
	setRecommendationSignals: StoreSetter<string>;
	setCompetitionLevel: StoreSetter<string>;
	setCompetitionNotes: StoreSetter<string>;
	setPushStage: StoreSetter<string>;
	setTrafficEntry: StoreSetter<string>;
	setImpressions: StoreSetter<string>;
	setClickThroughRate: StoreSetter<string>;
	setValidReadRate: StoreSetter<string>;
	setRead30sRate: StoreSetter<string>;
	setRead60sRate: StoreSetter<string>;
	setBottomRate: StoreSetter<string>;
	setFollowRate: StoreSetter<string>;
	setBookshelfRate: StoreSetter<string>;
	setFirstChapterCompletionRate: StoreSetter<string>;
	setNextChapterClickRate: StoreSetter<string>;
	setThreeChapterRetentionRate: StoreSetter<string>;
	setAvgReadProgressRate: StoreSetter<string>;
	setPaidUnlockRate: StoreSetter<string>;
	setAiSelfTestEnabled: StoreSetter<boolean>;
	setEnabledAiSelfTests: StoreSetter<AiSelfTestId[]>;
	setReferenceText: StoreSetter<string>;
	setReferenceFileName: StoreSetter<string>;
	setChapterTitle: StoreSetter<string>;
	setChapterText: StoreSetter<string>;
	setQuickReviewGenre: StoreSetter<string>;
	setQuickReviewInputKind: StoreSetter<QuickReviewInputKind>;
	setQuickReviewChapterPosition: StoreSetter<ChapterPosition>;
	setQuickReviewDiagnosticFocus: StoreSetter<string>;
	setQuickReviewPreviousPrompt: StoreSetter<string>;
	setQuickReviewCoreSellingPoint: StoreSetter<string>;
	setQuickReviewMustKeepMechanisms: StoreSetter<string>;
	setQuickReviewTargetReaderPleasures: StoreSetter<string>;
	setQuickReviewStoryAuditFindingIds: StoreSetter<string[]>;
	setSaveQuickReviewMethodology: StoreSetter<boolean>;
	setRubricResult: StoreSetter<RubricResult | null>;
	setScoreResult: StoreSetter<ScoreResult | null>;
	setQuickReviewResult: StoreSetter<QuickReviewResult | null>;
	setReferenceProfileProgress: StoreSetter<ReferenceProfileProgressItem[]>;
	setScoreProgress: StoreSetter<ScoreProgressItem[]>;
	setBookTitle: StoreSetter<string>;
	setBookGenre: StoreSetter<string>;
	setBookText: StoreSetter<string>;
	setBookFile: StoreSetter<File | null>;
	setBookUpload: StoreSetter<BookUploadPreview | null>;
	setBookHistory: StoreSetter<BookAnalysisJob[]>;
	setUploadHistory: StoreSetter<BookUploadPreview[]>;
	setBookAnalysisResult: StoreSetter<BookAnalysisResult | null>;
	setBookJob: StoreSetter<BookAnalysisJob | null>;
	setPersistedResearchLibrary: StoreSetter<PersistedResearchLibrary | null>;
	setSelectedResearchJobIds: StoreSetter<string[]>;
	setComparisonFocus: StoreSetter<string>;
	setResearchComparison: StoreSetter<ResearchComparisonResult | null>;
	setResearchQuestion: StoreSetter<string>;
	setResearchQaResult: StoreSetter<ResearchQaResult | null>;
	setQuickReviewCache: StoreSetter<CachedQuickReview[]>;
	setRubricCache: StoreSetter<CachedRubricResult[]>;
	setScoreCache: StoreSetter<CachedScoreResult[]>;
	setBookAnalysisCache: StoreSetter<CachedBookAnalysis[]>;
	setRevisionSessions: StoreSetter<RevisionSession[]>;
	setRevisionVersions: StoreSetter<RevisionTextVersion[]>;
	setMethodologyCards: StoreSetter<ProjectMethodologyCard[]>;
	setEngineCards: StoreSetter<PremiseEngineCard[]>;
}

export type WorkspaceStore = WorkspaceStoreState & WorkspaceStoreActions;

const initialWorkspaceState: WorkspaceStoreState = {
	projects: [defaultWorkspaceProject],
	activeProjectId: defaultWorkspaceProject.id,
	provider: defaultProvider,
	providerConnection: defaultProviderConnection,
	providerConfigHistory: [],
	referenceTitle: "",
	genre: "xuanhuan",
	platform: "fanqie",
	audience: "male-fast-paced",
	readingMode: "mobile-fragmented",
	category: "",
	theme: "",
	tags: "",
	explicitKeywords: "",
	implicitExpectations: "",
	positioningPromise: "",
	recommendationSignals: "",
	competitionLevel: "high",
	competitionNotes: "",
	pushStage: "cold-start",
	trafficEntry: "",
	impressions: "",
	clickThroughRate: "",
	validReadRate: "",
	read30sRate: "",
	read60sRate: "",
	bottomRate: "",
	followRate: "",
	bookshelfRate: "",
	firstChapterCompletionRate: "",
	nextChapterClickRate: "",
	threeChapterRetentionRate: "",
	avgReadProgressRate: "",
	paidUnlockRate: "",
	aiSelfTestEnabled: false,
	enabledAiSelfTests: aiSelfTests.map((test) => test.id),
	referenceText: "",
	referenceFileName: "",
	chapterTitle: "",
	chapterText: "",
	quickReviewGenre: "",
	quickReviewInputKind: "human-draft",
	quickReviewChapterPosition: "unknown",
	quickReviewDiagnosticFocus: defaultQuickReviewDiagnosticFocus,
	quickReviewPreviousPrompt: "",
	quickReviewCoreSellingPoint: "",
	quickReviewMustKeepMechanisms: "",
	quickReviewTargetReaderPleasures: "",
	quickReviewStoryAuditFindingIds: [],
	saveQuickReviewMethodology: false,
	rubricResult: null,
	scoreResult: null,
	quickReviewResult: null,
	referenceProfileProgress: [],
	scoreProgress: [],
	bookTitle: "",
	bookGenre: "xuanhuan",
	bookText: "",
	bookFile: null,
	bookUpload: null,
	bookHistory: [],
	uploadHistory: [],
	bookAnalysisResult: null,
	bookJob: null,
	persistedResearchLibrary: null,
	selectedResearchJobIds: [],
	comparisonFocus: "",
	researchComparison: null,
	researchQuestion: "",
	researchQaResult: null,
	quickReviewCache: [],
	rubricCache: [],
	scoreCache: [],
	bookAnalysisCache: [],
	revisionSessions: [],
	revisionVersions: [],
	methodologyCards: [],
	engineCards: [],
};

const localSettingsStorageKey = "ai-novel-diagnosis-local-settings";

// Wrap with devtools for Redux DevTools debugging
export const useWorkspaceStore = create<WorkspaceStore>()(
	devtools(
		persist<WorkspaceStore, [], [], PersistedWorkspaceState>(
			(set) => {
				function makeSetter<K extends keyof WorkspaceStoreState>(
					key: K,
				): StoreSetter<WorkspaceStoreState[K]> {
					return (value) =>
						set((current) => ({
							[key]: resolveStoreValue(value, current[key]),
						}));
				}

				return {
					...initialWorkspaceState,
					setProjects: makeSetter("projects"),
					setActiveProjectId: makeSetter("activeProjectId"),
					setProvider: makeSetter("provider"),
					setProviderConnection: makeSetter("providerConnection"),
					setProviderConfigHistory: makeSetter("providerConfigHistory"),
					setReferenceTitle: makeSetter("referenceTitle"),
					setGenre: makeSetter("genre"),
					setPlatform: makeSetter("platform"),
					setAudience: makeSetter("audience"),
					setReadingMode: makeSetter("readingMode"),
					setCategory: makeSetter("category"),
					setTheme: makeSetter("theme"),
					setTags: makeSetter("tags"),
					setExplicitKeywords: makeSetter("explicitKeywords"),
					setImplicitExpectations: makeSetter("implicitExpectations"),
					setPositioningPromise: makeSetter("positioningPromise"),
					setRecommendationSignals: makeSetter("recommendationSignals"),
					setCompetitionLevel: makeSetter("competitionLevel"),
					setCompetitionNotes: makeSetter("competitionNotes"),
					setPushStage: makeSetter("pushStage"),
					setTrafficEntry: makeSetter("trafficEntry"),
					setImpressions: makeSetter("impressions"),
					setClickThroughRate: makeSetter("clickThroughRate"),
					setValidReadRate: makeSetter("validReadRate"),
					setRead30sRate: makeSetter("read30sRate"),
					setRead60sRate: makeSetter("read60sRate"),
					setBottomRate: makeSetter("bottomRate"),
					setFollowRate: makeSetter("followRate"),
					setBookshelfRate: makeSetter("bookshelfRate"),
					setFirstChapterCompletionRate: makeSetter("firstChapterCompletionRate"),
					setNextChapterClickRate: makeSetter("nextChapterClickRate"),
					setThreeChapterRetentionRate: makeSetter("threeChapterRetentionRate"),
					setAvgReadProgressRate: makeSetter("avgReadProgressRate"),
					setPaidUnlockRate: makeSetter("paidUnlockRate"),
					setAiSelfTestEnabled: makeSetter("aiSelfTestEnabled"),
					setEnabledAiSelfTests: makeSetter("enabledAiSelfTests"),
					setReferenceText: makeSetter("referenceText"),
					setReferenceFileName: makeSetter("referenceFileName"),
					setChapterTitle: makeSetter("chapterTitle"),
					setChapterText: makeSetter("chapterText"),
					setQuickReviewGenre: makeSetter("quickReviewGenre"),
					setQuickReviewInputKind: makeSetter("quickReviewInputKind"),
					setQuickReviewChapterPosition: makeSetter("quickReviewChapterPosition"),
					setQuickReviewDiagnosticFocus: makeSetter("quickReviewDiagnosticFocus"),
					setQuickReviewPreviousPrompt: makeSetter("quickReviewPreviousPrompt"),
					setQuickReviewCoreSellingPoint: makeSetter("quickReviewCoreSellingPoint"),
					setQuickReviewMustKeepMechanisms: makeSetter("quickReviewMustKeepMechanisms"),
					setQuickReviewTargetReaderPleasures: makeSetter(
						"quickReviewTargetReaderPleasures",
					),
					setQuickReviewStoryAuditFindingIds: makeSetter(
						"quickReviewStoryAuditFindingIds",
					),
					setSaveQuickReviewMethodology: makeSetter("saveQuickReviewMethodology"),
					setRubricResult: makeSetter("rubricResult"),
					setScoreResult: makeSetter("scoreResult"),
					setQuickReviewResult: makeSetter("quickReviewResult"),
					setReferenceProfileProgress: makeSetter("referenceProfileProgress"),
					setScoreProgress: makeSetter("scoreProgress"),
					setBookTitle: makeSetter("bookTitle"),
					setBookGenre: makeSetter("bookGenre"),
					setBookText: makeSetter("bookText"),
					setBookFile: makeSetter("bookFile"),
					setBookUpload: makeSetter("bookUpload"),
					setBookHistory: makeSetter("bookHistory"),
					setUploadHistory: makeSetter("uploadHistory"),
					setBookAnalysisResult: makeSetter("bookAnalysisResult"),
					setBookJob: makeSetter("bookJob"),
					setPersistedResearchLibrary: makeSetter("persistedResearchLibrary"),
					setSelectedResearchJobIds: makeSetter("selectedResearchJobIds"),
					setComparisonFocus: makeSetter("comparisonFocus"),
					setResearchComparison: makeSetter("researchComparison"),
					setResearchQuestion: makeSetter("researchQuestion"),
					setResearchQaResult: makeSetter("researchQaResult"),
					setQuickReviewCache: makeSetter("quickReviewCache"),
					setRubricCache: makeSetter("rubricCache"),
					setScoreCache: makeSetter("scoreCache"),
					setBookAnalysisCache: makeSetter("bookAnalysisCache"),
					setRevisionSessions: makeSetter("revisionSessions"),
					setRevisionVersions: makeSetter("revisionVersions"),
					setMethodologyCards: makeSetter("methodologyCards"),
					setEngineCards: makeSetter("engineCards"),
				};
			},
			{
				name: localSettingsStorageKey,
				version: 2,
				storage: createJSONStorage(() => localStorage),
				partialize: partializeWorkspaceState,
				merge: mergeWorkspaceState,
			},
		),
		{ name: "workspace" },
	),
);
