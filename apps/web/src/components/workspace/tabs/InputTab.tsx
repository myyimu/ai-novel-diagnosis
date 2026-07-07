"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Settings, Target } from "lucide-react";
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
			/>
		);
	}, [handlers]);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<FileText className="w-5 h-5" />
				<h2 className="text-lg font-semibold">输入</h2>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card className="md:col-span-2">
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

				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Upload className="w-4 h-4" />
							书籍上传
						</CardTitle>
						<CardDescription>上传完整书籍进行全书分析</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{handlers?.bookText || handlers?.bookFile ? (
								<span>
									{handlers.bookTitle || "未命名书籍"} -{" "}
									{handlers.bookText?.length || 0} 字
								</span>
							) : (
								"书籍上传功能将在完整实施后可用"
							)}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Settings className="w-4 h-4" />
							AI 提供商设置
						</CardTitle>
						<CardDescription>配置 AI 模型和 API</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{handlers ? (
								<span>
									当前: {handlers.providerLabel} (
									{handlers.providerKind === "mock"
										? "本地演示"
										: handlers.providerModel || "预设模型"}
									)
								</span>
							) : (
								"AI 设置功能将在完整实施后可用"
							)}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
