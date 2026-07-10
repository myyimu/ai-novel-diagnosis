"use client";

import { ChapterCritiqueView } from "@/components/workspace/chapter-critique-view";
import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";

interface ChapterDiagnosisHandlers {
	loading: import("@/hooks/use-workspace-handlers").LoadingState;
	providerLabel: string;
	quickReviewElapsedSeconds: number;
	quickReviewResult: import("@/stores/workspace-store").QuickReviewResult | null;
	previousQuickReviewResult: import("@/stores/workspace-store").QuickReviewResult | null;
	quickReviewGenre: string;
	quickReviewInputKind: import("@/stores/workspace-store").QuickReviewInputKind;
	quickReviewPreviousPrompt: string;
	quickReviewCoreSellingPoint: string;
	quickReviewMustKeepMechanisms: string;
	quickReviewTargetReaderPleasures: string;
	projectRevisionSessions: import("@/stores/workspace-store").RevisionSession[];
	projectMethodologyCards: import("@/stores/workspace-store").ProjectMethodologyCard[];
	referenceText: string;
	referenceFileName: string;
	referenceTitle: string;
	genre: string;
	chapterTitle: string;
	chapterText: string;
	quickReviewCacheHit?: unknown;
	rubricResult: import("@/stores/workspace-store").RubricResult | null;
	scoreResult: import("@/stores/workspace-store").ScoreResult | null;
	rubricCacheHit?: unknown;
	scoreCacheHit?: unknown;
	importReferenceFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
	inferReferenceProfileFromModel: (text?: string, filename?: string) => void;
	handleReferenceTextChange: (value: string) => void;
	setQuickReviewGenre: (value: string) => void;
	setQuickReviewInputKind: (
		value: import("@/stores/workspace-store").QuickReviewInputKind,
	) => void;
	setQuickReviewPreviousPrompt: (value: string) => void;
	setQuickReviewCoreSellingPoint: (value: string) => void;
	setQuickReviewMustKeepMechanisms: (value: string) => void;
	setQuickReviewTargetReaderPleasures: (value: string) => void;
	runQuickExperience: (force?: boolean) => void;
	useExampleChapter: (exampleId: string) => void;
	useExampleReference: () => void;
	openView: (view: "provider" | "book" | "chapter") => void;
	buildRubric: (force?: boolean) => void;
	scoreChapter: (force?: boolean) => void;
	handlePlatformStrategyChange: (patch: {
		recommendationSignals?: string;
		trafficEntry?: string;
		competitionLevel?: string;
		pushStage?: string;
		competitionNotes?: string;
	}) => void;
	handleChapterDraftChange: (patch: { chapterTitle?: string; chapterText?: string }) => void;
	diagnosisExampleOptions: import("@/lib/diagnosis-examples").DiagnosisExampleOption[];
	provider: { kind: "mock" | "openai-compatible"; model: string };
	competitionLevelLabel: string;
	readingModeLabel: string;
	pushStageLabel: string;
	platformLabel: string;
	competitionNotes: string;
	chapterCompletion: number;
	nextChapterAction: string;
	onOpenPlatformStrategy: () => void;
	onOpenChapterDraft: () => void;
	isBackendFreeProvider: boolean;
}

interface ChapterDiagnosisComposeProps {
	handlers: ChapterDiagnosisHandlers;
}

export function ChapterDiagnosisCompose({ handlers }: ChapterDiagnosisComposeProps) {
	return (
		<WorkspaceTaskFrame
			title="深度质检"
			description="将报告态、评分标准和证据链统一放在新主工作区中，输入摘要保持可展开编辑。"
			status={handlers.providerLabel}
			taskNav={{
				items: [
					{
						id: "chapter-report",
						label: "报告态",
						description: "分数、问题、证据和 Prompt",
						meta: "当前",
					},
				],
				activeId: "chapter-report",
				onChange: () => {},
			}}
			inspector={{
				title: "报告详情",
				description: "点选报告中的具体问题、证据或改稿动作后展示详情。",
				sections: [],
			}}
		>
			<ChapterCritiqueView
				loading={handlers.loading}
				providerLabel={handlers.providerLabel}
				quickLoading={handlers.loading === "quick"}
				quickElapsedSeconds={handlers.quickReviewElapsedSeconds}
				quickReviewResult={handlers.quickReviewResult}
				previousQuickReviewResult={handlers.previousQuickReviewResult}
				quickReviewGenre={handlers.quickReviewGenre}
				quickReviewInputKind={handlers.quickReviewInputKind}
				quickReviewPreviousPrompt={handlers.quickReviewPreviousPrompt}
				quickReviewCoreSellingPoint={handlers.quickReviewCoreSellingPoint}
				quickReviewMustKeepMechanisms={handlers.quickReviewMustKeepMechanisms}
				quickReviewTargetReaderPleasures={handlers.quickReviewTargetReaderPleasures}
				revisionSessions={handlers.projectRevisionSessions}
				methodologyCards={handlers.projectMethodologyCards}
				importReferenceFile={handlers.importReferenceFile}
				onInferReferenceProfile={handlers.inferReferenceProfileFromModel}
				onReferenceTextChange={handlers.handleReferenceTextChange}
				onQuickReviewGenreChange={handlers.setQuickReviewGenre}
				onQuickReviewInputKindChange={handlers.setQuickReviewInputKind}
				onQuickReviewPreviousPromptChange={handlers.setQuickReviewPreviousPrompt}
				onQuickReviewCoreSellingPointChange={handlers.setQuickReviewCoreSellingPoint}
				onQuickReviewMustKeepMechanismsChange={handlers.setQuickReviewMustKeepMechanisms}
				onQuickReviewTargetReaderPleasuresChange={
					handlers.setQuickReviewTargetReaderPleasures
				}
				onRunQuickExperience={handlers.runQuickExperience}
				onRerunQuickExperience={() => handlers.runQuickExperience(true)}
				hasQuickReviewCache={Boolean(handlers.quickReviewCacheHit)}
				diagnosisExamples={handlers.diagnosisExampleOptions}
				onUseExampleChapter={handlers.useExampleChapter}
				onUseExampleReference={handlers.useExampleReference}
				onOpenModel={() => handlers.openView("provider")}
				onOpenBook={() => handlers.openView("book")}
				onBuildRubric={handlers.buildRubric}
				onRebuildRubric={() => handlers.buildRubric(true)}
				onScoreChapter={handlers.scoreChapter}
				onRescoreChapter={() => handlers.scoreChapter(true)}
				hasRubricCache={Boolean(handlers.rubricCacheHit)}
				hasScoreCache={Boolean(handlers.scoreCacheHit)}
				onPlatformStrategyChange={handlers.handlePlatformStrategyChange}
				onChapterDraftChange={handlers.handleChapterDraftChange}
			/>
		</WorkspaceTaskFrame>
	);
}
