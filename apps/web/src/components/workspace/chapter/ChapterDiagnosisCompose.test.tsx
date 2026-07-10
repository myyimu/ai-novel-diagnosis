import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/workspace/chapter-critique-view", () => ({
	ChapterCritiqueView: (props: {
		providerLabel: string;
		quickReviewResult: {
			mainProblem: string;
			nextPrompt?: { title: string };
			quickScore: number;
		} | null;
		scoreResult: { totalScore: number; weakestPoint: string; nextRevisionMove: string } | null;
		revisionSessions: Array<unknown>;
		methodologyCards: Array<unknown>;
	}) => (
		<div>
			<div>{props.providerLabel}</div>
			<div>{props.quickReviewResult?.mainProblem ?? "no-quick"}</div>
			<div>{props.quickReviewResult?.nextPrompt?.title ?? "no-prompt"}</div>
			<div>
				{props.quickReviewResult ? `${props.quickReviewResult.quickScore}/10` : "no-score"}
			</div>
			<div>{props.scoreResult ? `${props.scoreResult.totalScore}/10` : "no-rubric"}</div>
			<div>{props.scoreResult?.weakestPoint ?? "no-weakest"}</div>
			<div>{props.scoreResult?.nextRevisionMove ?? "no-move"}</div>
			<div>{props.revisionSessions.length}</div>
			<div>{props.methodologyCards.length}</div>
		</div>
	),
}));

import { ChapterDiagnosisCompose } from "./ChapterDiagnosisCompose";

const baseHandlers = {
	loading: null,
	providerLabel: "本地演示",
	quickReviewElapsedSeconds: 0,
	quickReviewResult: {
		quickScore: 7.8,
		oneLineDiagnosis: "开局承诺不够清晰。",
		mainProblem: "章末钩子没有代价。",
		nextPrompt: { title: "下一轮改稿 Prompt", prompt: "请补强章末代价。" },
		issues: [{ title: "章末钩子没有代价", evidence: [] }],
	} as never,
	previousQuickReviewResult: null,
	quickReviewGenre: "xuanhuan",
	quickReviewInputKind: "human-draft" as const,
	quickReviewPreviousPrompt: "",
	quickReviewCoreSellingPoint: "",
	quickReviewMustKeepMechanisms: "",
	quickReviewTargetReaderPleasures: "",
	projectRevisionSessions: [],
	projectMethodologyCards: [],
	referenceText: "参考章节正文",
	referenceFileName: "",
	referenceTitle: "成熟样本",
	genre: "xuanhuan",
	chapterTitle: "第一章 被退婚",
	chapterText: "主角被退婚后转身走出大厅。",
	quickReviewCacheHit: false,
	rubricResult: {
		reference: { oneSentenceSummary: "样本摘要" },
		principles: [],
		rubric: { metrics: [] },
	} as never,
	scoreResult: {
		totalScore: 8.5,
		weakestPoint: "结尾钩子稍弱",
		nextRevisionMove: "补强代价",
		strongestPoint: "开局冲突明确",
		scores: [],
	} as never,
	rubricCacheHit: true,
	scoreCacheHit: true,
	importReferenceFile: vi.fn(),
	inferReferenceProfileFromModel: vi.fn(),
	handleReferenceTextChange: vi.fn(),
	setQuickReviewGenre: vi.fn(),
	setQuickReviewInputKind: vi.fn(),
	setQuickReviewPreviousPrompt: vi.fn(),
	setQuickReviewCoreSellingPoint: vi.fn(),
	setQuickReviewMustKeepMechanisms: vi.fn(),
	setQuickReviewTargetReaderPleasures: vi.fn(),
	runQuickExperience: vi.fn(),
	useExampleChapter: vi.fn(),
	useExampleReference: vi.fn(),
	openView: vi.fn(),
	buildRubric: vi.fn(),
	scoreChapter: vi.fn(),
	handlePlatformStrategyChange: vi.fn(),
	handleChapterDraftChange: vi.fn(),
	diagnosisExampleOptions: [],
	provider: { kind: "mock" as const, model: "" },
	competitionLevelLabel: "高竞争",
	readingModeLabel: "长篇追更",
	pushStageLabel: "冷启动",
	platformLabel: "番茄小说",
	competitionNotes: "",
	chapterCompletion: 0,
	nextChapterAction: "生成评分标准",
	onOpenPlatformStrategy: vi.fn(),
	onOpenChapterDraft: vi.fn(),
	isBackendFreeProvider: true,
};

describe("ChapterDiagnosisCompose", () => {
	it("renders the report state inside the new task frame", () => {
		const html = renderToStaticMarkup(<ChapterDiagnosisCompose handlers={baseHandlers} />);

		expect(html).toContain("深度质检");
		expect(html).toContain("报告态");
		expect(html).toContain("章末钩子没有代价");
		expect(html).toContain("7.8/10");
		expect(html).toContain("下一轮改稿 Prompt");
		expect(html).toContain("no-rubric");
		expect(html).toContain("本地演示");
		expect(html).not.toContain("默认右栏");
		expect(html).not.toContain("/diagnose/deep");
	});
});
