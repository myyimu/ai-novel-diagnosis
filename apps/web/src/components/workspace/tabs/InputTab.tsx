"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Target } from "lucide-react";
import { QuickExperiencePanel } from "@/components/workspace/quick-experience-panel";
import type { DiagnosisExampleOption } from "@/lib/diagnosis-examples";

interface WorkspaceHandlers {
	/* provider state */
	providerKind: "mock" | "openai-compatible";
	providerLabel: string;
	providerModel: string;

	/* quick review state */
	quickLoading: boolean;
	quickElapsedSeconds: number;
	quickReviewResult: import("@/stores/workspace-store").QuickReviewResult | null;
	quickReviewError?: string | null;
	previousQuickReviewResult?: import("@/stores/workspace-store").QuickReviewResult | null;
	quickReviewGenre: string;
	quickReviewInputKind: import("@/stores/workspace-store").QuickReviewInputKind;
	quickReviewPreviousPrompt: string;
	quickReviewCoreSellingPoint: string;
	quickReviewMustKeepMechanisms: string;
	quickReviewTargetReaderPleasures: string;

	/* chapter state */
	chapterText: string;
	chapterTitle: string;

	/* project state */
	revisionSessions: import("@/stores/workspace-store").RevisionSession[];
	methodologyCards: import("@/stores/workspace-store").ProjectMethodologyCard[];

	/* book state */
	bookTitle: string;
	bookGenre: string;
	bookText: string;
	bookFile: File | null;
	bookUpload: import("@/stores/workspace-store").BookUploadPreview | null;

	/* cache */
	hasQuickReviewCache: boolean;

	/* handlers */
	handleChapterTextChange: (value: string) => void;
	onQuickReviewGenreChange: (value: string) => void;
	onQuickReviewInputKindChange: (
		value: import("@/stores/workspace-store").QuickReviewInputKind,
	) => void;
	onQuickReviewPreviousPromptChange: (value: string) => void;
	onQuickReviewCoreSellingPointChange: (value: string) => void;
	onQuickReviewMustKeepMechanismsChange: (value: string) => void;
	onQuickReviewTargetReaderPleasuresChange: (value: string) => void;
	onRunQuickExperience: () => void;
	onRerunQuickExperience: () => void;

	/* examples */
	diagnosisExamples: DiagnosisExampleOption[];
	onUseExampleChapter: (exampleId: string) => void;

	/* navigation */
	onOpenModel: () => void;
	onOpenCritique: () => void;
	onOpenBook: () => void;
	onOpenEvidenceIssue?: (issueIndex: number) => void;
	onOpenRevisionSession?: (sessionIndex: number) => void;
	onOpenMethodologyCard?: (cardIndex: number) => void;
}

interface InputTabProps {
	handlers?: WorkspaceHandlers;
}

export function InputTab({ handlers }: InputTabProps) {
	const quickExperiencePanel = useMemo(() => {
		if (!handlers) {
			return (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Target className="w-4 h-4" />
							快速诊断
						</CardTitle>
						<CardDescription>对章节内容进行快速质量评估</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">请从主页加载完整功能</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<QuickExperiencePanel
				chapterText={handlers.chapterText}
				providerLabel={handlers.providerLabel}
				loading={handlers.quickLoading}
				elapsedSeconds={handlers.quickElapsedSeconds}
				quickReviewResult={handlers.quickReviewResult}
				quickReviewError={handlers.quickReviewError}
				previousQuickReviewResult={handlers.previousQuickReviewResult}
				quickReviewGenre={handlers.quickReviewGenre}
				quickReviewInputKind={handlers.quickReviewInputKind}
				quickReviewPreviousPrompt={handlers.quickReviewPreviousPrompt}
				quickReviewCoreSellingPoint={handlers.quickReviewCoreSellingPoint}
				quickReviewMustKeepMechanisms={handlers.quickReviewMustKeepMechanisms}
				quickReviewTargetReaderPleasures={handlers.quickReviewTargetReaderPleasures}
				revisionSessions={handlers.revisionSessions}
				methodologyCards={handlers.methodologyCards}
				onChapterTextChange={handlers.handleChapterTextChange}
				onQuickReviewGenreChange={handlers.onQuickReviewGenreChange}
				onQuickReviewInputKindChange={handlers.onQuickReviewInputKindChange}
				onQuickReviewPreviousPromptChange={handlers.onQuickReviewPreviousPromptChange}
				onQuickReviewCoreSellingPointChange={handlers.onQuickReviewCoreSellingPointChange}
				onQuickReviewMustKeepMechanismsChange={
					handlers.onQuickReviewMustKeepMechanismsChange
				}
				onQuickReviewTargetReaderPleasuresChange={
					handlers.onQuickReviewTargetReaderPleasuresChange
				}
				onRun={handlers.onRunQuickExperience}
				onRerun={handlers.onRerunQuickExperience}
				hasCachedResult={handlers.hasQuickReviewCache}
				diagnosisExamples={handlers.diagnosisExamples}
				onUseExample={handlers.onUseExampleChapter}
				onOpenModel={handlers.onOpenModel}
				onOpenCritique={handlers.onOpenCritique}
				onOpenBook={handlers.onOpenBook}
				onOpenEvidenceIssue={handlers.onOpenEvidenceIssue}
				onOpenRevisionSession={handlers.onOpenRevisionSession}
				onOpenMethodologyCard={handlers.onOpenMethodologyCard}
			/>
		);
	}, [handlers]);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<FileText className="w-5 h-5" />
				<h2 className="text-lg font-semibold">章节诊断</h2>
			</div>

			<div className="grid gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Target className="w-4 h-4" />
							快速诊断
						</CardTitle>
						<CardDescription>
							粘贴章节文本，获取问题诊断、正文证据和改稿建议
						</CardDescription>
					</CardHeader>
					<CardContent>{quickExperiencePanel}</CardContent>
				</Card>
			</div>
		</div>
	);
}
