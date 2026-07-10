"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import { InputTab } from "@/components/workspace/tabs/InputTab";
import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { DiagnosisExampleOption } from "@/lib/diagnosis-examples";
import { useWorkspaceUIStore } from "@/stores/workspace-ui-store";
import { MethodologyCardDetail } from "./MethodologyCardDetail";
import { QuickEvidenceDetail } from "./QuickEvidenceDetail";
import { QuickHistoryDetail } from "./QuickHistoryDetail";
import { QuickDiagnosisStatus } from "./QuickDiagnosisStatus";

type QuickIssue = NonNullable<
	import("@/stores/workspace-store").QuickReviewResult["issues"]
>[number];
type QuickDetailSelection =
	| { kind: "evidence"; index: number }
	| { kind: "history"; index: number }
	| { kind: "methodology"; index: number }
	| null;

interface QuickDiagnosisHandlers {
	provider: { kind: "mock" | "openai-compatible"; model: string };
	providerLabel: string;
	isBackendFreeProvider: boolean;
	loading: import("@/hooks/use-workspace-handlers").LoadingState;
	quickReviewElapsedSeconds: number;
	quickReviewResult: import("@/stores/workspace-store").QuickReviewResult | null;
	quickReviewError: string | null;
	previousQuickReviewResult: import("@/stores/workspace-store").QuickReviewResult | null;
	quickReviewGenre: string;
	quickReviewInputKind: import("@/stores/workspace-store").QuickReviewInputKind;
	quickReviewPreviousPrompt: string;
	quickReviewCoreSellingPoint: string;
	quickReviewMustKeepMechanisms: string;
	quickReviewTargetReaderPleasures: string;
	chapterText: string;
	chapterTitle: string;
	projectRevisionSessions: import("@/stores/workspace-store").RevisionSession[];
	projectMethodologyCards: import("@/stores/workspace-store").ProjectMethodologyCard[];
	bookTitle: string;
	bookGenre: string;
	bookText: string;
	bookFile: File | null;
	bookUpload: import("@/stores/workspace-store").BookUploadPreview | null;
	quickReviewCacheHit?: unknown;
	handleChapterTextChange: (value: string) => void;
	setQuickReviewGenre: (value: string) => void;
	setQuickReviewInputKind: (
		value: import("@/stores/workspace-store").QuickReviewInputKind,
	) => void;
	setQuickReviewPreviousPrompt: (value: string) => void;
	setQuickReviewCoreSellingPoint: (value: string) => void;
	setQuickReviewMustKeepMechanisms: (value: string) => void;
	setQuickReviewTargetReaderPleasures: (value: string) => void;
	runQuickExperience: () => void;
	useExampleChapter: (exampleId: string) => void;
	openView: (view: "provider" | "chapter" | "book") => void;
	diagnosisExampleOptions: DiagnosisExampleOption[];
}

interface QuickDiagnosisComposeProps {
	handlers: QuickDiagnosisHandlers;
}

export function QuickDiagnosisCompose({ handlers }: QuickDiagnosisComposeProps) {
	const [selectedDetail, setSelectedDetail] = useState<QuickDetailSelection>(null);
	const setInspectorOpen = useWorkspaceUIStore((state) => state.setInspectorOpen);

	const openDetail = (detail: Exclude<QuickDetailSelection, null>) => {
		setSelectedDetail(detail);
		setInspectorOpen(true);
	};

	const issues = useMemo(
		() =>
			Array.isArray(handlers.quickReviewResult?.issues)
				? handlers.quickReviewResult.issues.filter((issue): issue is QuickIssue =>
						Boolean(issue && issue.title),
					)
				: [],
		[handlers.quickReviewResult],
	);

	const selectedIssue =
		selectedDetail?.kind === "evidence" ? (issues[selectedDetail.index] ?? null) : null;
	const selectedSession =
		selectedDetail?.kind === "history"
			? (handlers.projectRevisionSessions[selectedDetail.index] ?? null)
			: null;
	const selectedMethodologyCard =
		selectedDetail?.kind === "methodology"
			? (handlers.projectMethodologyCards[selectedDetail.index] ?? null)
			: null;

	const inspectorSections: ContextInspectorSection[] = useMemo(() => {
		if (selectedIssue) {
			return [
				{
					title: "证据详情",
					description: "点选问题后展示当前证据链。",
					fields: [
						{ label: "类型", value: "证据", tone: "secondary" },
						{ label: "当前 provider", value: handlers.providerLabel },
					],
					detail: (
						<QuickEvidenceDetail
							issue={selectedIssue}
							quickScore={handlers.quickReviewResult?.quickScore ?? null}
							mainProblem={handlers.quickReviewResult?.mainProblem ?? null}
						/>
					),
				},
			];
		}

		if (selectedSession) {
			return [
				{
					title: "历史详情",
					description: "点选历史条目后展示这一轮复诊记录。",
					fields: [
						{ label: "类型", value: "历史", tone: "secondary" },
						{ label: "当前 provider", value: handlers.providerLabel },
					],
					detail: <QuickHistoryDetail session={selectedSession} />,
				},
			];
		}

		if (selectedMethodologyCard) {
			return [
				{
					title: "方法论详情",
					description: "点选方法论卡后展示可复用规则。",
					fields: [
						{ label: "类型", value: "方法论卡", tone: "secondary" },
						{ label: "当前 provider", value: handlers.providerLabel },
					],
					detail: <MethodologyCardDetail card={selectedMethodologyCard} />,
				},
			];
		}

		return [];
	}, [
		handlers.providerLabel,
		handlers.quickReviewResult,
		selectedIssue,
		selectedMethodologyCard,
		selectedSession,
	]);

	return (
		<WorkspaceTaskFrame
			title="快速诊断"
			description="将章节输入、题材选择和示例入口迁移到新主工作区，保持现有 handler 和提示含义。"
			status={handlers.providerLabel}
			taskNav={{
				items: [
					{
						id: "quick-input",
						label: "快速诊断",
						description: "粘贴章节、选择题材、运行改稿方案",
						meta: "当前",
					},
				],
				activeId: "quick-input",
				onChange: () => {},
			}}
			inspector={{
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无上下文。</p>
						<Badge variant="outline">输入态</Badge>
					</div>
				),
			}}
		>
			<div className="space-y-4">
				<QuickDiagnosisStatus
					loading={handlers.loading === "quick"}
					error={handlers.quickReviewError}
					onRetry={handlers.runQuickExperience}
					onOpenModel={() => handlers.openView("provider")}
				/>
				<InputTab
					handlers={{
						providerKind: handlers.provider.kind,
						providerLabel: handlers.providerLabel,
						providerModel: handlers.provider.model,
						quickLoading: handlers.loading === "quick",
						quickElapsedSeconds: handlers.quickReviewElapsedSeconds,
						quickReviewResult: handlers.quickReviewResult,
						quickReviewError: handlers.quickReviewError,
						previousQuickReviewResult: handlers.previousQuickReviewResult,
						quickReviewGenre: handlers.quickReviewGenre,
						quickReviewInputKind: handlers.quickReviewInputKind,
						quickReviewPreviousPrompt: handlers.quickReviewPreviousPrompt,
						quickReviewCoreSellingPoint: handlers.quickReviewCoreSellingPoint,
						quickReviewMustKeepMechanisms: handlers.quickReviewMustKeepMechanisms,
						quickReviewTargetReaderPleasures: handlers.quickReviewTargetReaderPleasures,
						chapterText: handlers.chapterText,
						chapterTitle: handlers.chapterTitle,
						revisionSessions: handlers.projectRevisionSessions,
						methodologyCards: handlers.projectMethodologyCards,
						bookTitle: handlers.bookTitle,
						bookGenre: handlers.bookGenre,
						bookText: handlers.bookText,
						bookFile: handlers.bookFile,
						bookUpload: handlers.bookUpload,
						hasQuickReviewCache: Boolean(handlers.quickReviewCacheHit),
						handleChapterTextChange: handlers.handleChapterTextChange,
						onQuickReviewGenreChange: handlers.setQuickReviewGenre,
						onQuickReviewInputKindChange: handlers.setQuickReviewInputKind,
						onQuickReviewPreviousPromptChange: handlers.setQuickReviewPreviousPrompt,
						onQuickReviewCoreSellingPointChange:
							handlers.setQuickReviewCoreSellingPoint,
						onQuickReviewMustKeepMechanismsChange:
							handlers.setQuickReviewMustKeepMechanisms,
						onQuickReviewTargetReaderPleasuresChange:
							handlers.setQuickReviewTargetReaderPleasures,
						onRunQuickExperience: handlers.runQuickExperience,
						onRerunQuickExperience: handlers.runQuickExperience,
						diagnosisExamples: handlers.diagnosisExampleOptions,
						onUseExampleChapter: handlers.useExampleChapter,
						onOpenModel: () => handlers.openView("provider"),
						onOpenCritique: () => handlers.openView("chapter"),
						onOpenBook: () => handlers.openView("book"),
						onOpenEvidenceIssue: (index) => openDetail({ kind: "evidence", index }),
						onOpenRevisionSession: (index) => openDetail({ kind: "history", index }),
						onOpenMethodologyCard: (index) =>
							openDetail({ kind: "methodology", index }),
					}}
				/>
			</div>
		</WorkspaceTaskFrame>
	);
}
