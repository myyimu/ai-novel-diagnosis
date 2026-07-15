import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisCompose } from "./QuickDiagnosisCompose";
import type { PlatformFitResult } from "@/lib/workspace-analysis-client";
import type { ProjectMethodologyCard, QuickReviewResult } from "@/stores/workspace-store";

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

const baseHandlers = {
	provider: { kind: "mock" as const, model: "" },
	providerLabel: "本地演示",
	isBackendFreeProvider: true,
	loading: null,
	quickReviewElapsedSeconds: 0,
	quickReviewResult: null,
	quickReviewError: null,
	previousQuickReviewResult: null,
	quickReviewPlatformFit: null,
	quickReviewGenre: "",
	quickReviewInputKind: "human-draft" as const,
	quickReviewChapterPosition: "unknown" as const,
	quickReviewDiagnosticFocus: "为什么没人追读",
	quickReviewPreviousPrompt: "",
	quickReviewCoreSellingPoint: "",
	quickReviewMustKeepMechanisms: "",
	quickReviewTargetReaderPleasures: "",
	chapterText: "",
	chapterTitle: "",
	projectRevisionSessions: [],
	projectMethodologyCards: [],
	bookTitle: "",
	setBookTitle: vi.fn(),
	bookGenre: "",
	bookText: "",
	bookFile: null,
	bookUpload: null,
	quickReviewCacheHit: false,
	handleChapterTextChange: vi.fn(),
	setQuickReviewGenre: vi.fn(),
	setQuickReviewInputKind: vi.fn(),
	setQuickReviewChapterPosition: vi.fn(),
	setQuickReviewDiagnosticFocus: vi.fn(),
	setQuickReviewPreviousPrompt: vi.fn(),
	setQuickReviewCoreSellingPoint: vi.fn(),
	setQuickReviewMustKeepMechanisms: vi.fn(),
	setQuickReviewTargetReaderPleasures: vi.fn(),
	setChapterTitle: vi.fn(),
	runQuickExperience: vi.fn(),
	analyzeQuickReviewPlatformFit: vi.fn(),
	generateQuickReviewMethodology: vi.fn(),
	useExampleChapter: vi.fn(),
	openView: vi.fn(),
	diagnosisExampleOptions: [],
};

const quickReviewResult = {
	schemaVersion: "quick-review.v3",
	title: "第一章诊断",
	genre: "都市",
	positioning: "小人物逆袭爽文",
	sellingPoints: ["强目标", "快冲突"],
	mainProblem: "缺少能立刻驱动追读的矛盾。",
	actionableFixes: ["提前冲突", "强化选择压力"],
	recommendedPlatforms: [],
	readyForFullReview: false,
	readyReason: "需要先修正首屏钩子。",
	quickScore: 62,
	gateDecision: "revise",
	gateReason: "首屏追读动机不足。",
	oneLineDiagnosis: "冲突出现太晚，先改首屏。",
	issues: [
		{
			id: "issue-1",
			severity: "high" as const,
			category: "opening" as const,
			title: "前三百字缺少核心冲突",
			description: "读者无法快速判断主角要面对什么压力。",
			evidence: [{ quote: "他走进房间。", locationHint: "开头", confidence: 0.8 }],
			readerImpact: "降低首屏继续阅读意愿。",
			fixAction: "提前抛出主角无法回避的选择。",
			promptConstraint: "不要改动主角身份。",
			blocksNextStep: true,
		},
	],
	strengths: [
		{
			title: "人物身份清晰",
			evidence: "职业设定明确。",
			keepAction: "保留身份信息。",
		},
	],
	revisionPlan: {
		priorityIssueIds: ["issue-1"],
		keep: ["保留主角职业设定"],
		change: ["提前冲突"],
		avoid: ["避免解释设定"],
		checkpoints: ["首屏出现明确压力"],
	},
	nextPrompt: {
		title: "强化首屏钩子",
		prompt: "请重写开头三百字，提前冲突并保留主角身份。",
		linkedIssueIds: ["issue-1"],
		whyThisWorks: ["直接对应首屏冲突不足的问题。"],
	},
	methodologyCards: [],
	confidence: 0.82,
} satisfies QuickReviewResult;

const platformFit: PlatformFitResult = {
	summary: "当前更适合短篇节奏强的平台测试。",
	assumptions: ["只基于当前诊断结果和用户填写的定位判断。"],
	recommendations: [
		{
			platform: "番茄小说",
			fitLevel: "medium",
			reason: "冲突明确后具备下沉市场测试空间。",
			risks: ["开场爽点不足会影响有效阅读。"],
			requiredContext: ["题材细分", "目标完本字数"],
			nextAction: "先补齐前三章连贯钩子。",
		},
	],
	disclaimer: "这是编辑假设，不是平台内部算法结论。",
	dataVersion: "v3",
};

describe("QuickDiagnosisCompose", () => {
	it("renders the quick diagnosis input state inside the new task frame", () => {
		const html = renderToStaticMarkup(<QuickDiagnosisCompose handlers={baseHandlers} />);

		expect(html).toContain("快速诊断");
		expect(html).toContain("聚焦一个问题");
		expect(html).toContain("输入稿件");
		expect(html).toContain("复制修改指令");
		expect(html).toContain("本地演示");
		expect(html).toContain("章节诊断");
		expect(html).not.toContain("书籍上传");
		expect(html).not.toContain("AI 提供商设置");
		expect(html).not.toContain("保存可复用方法论卡");
	});

	it("renders platform fit and methodology as explicit follow-up actions", () => {
		const html = renderToStaticMarkup(
			<QuickDiagnosisCompose
				handlers={{
					...baseHandlers,
					quickReviewResult,
					quickReviewPlatformFit: platformFit,
					projectMethodologyCards: [
						{
							id: "card-1",
							projectCardId: "project-card-1",
							projectId: "project-1",
							sourceIssueId: "issue-1",
							type: "opening_rule",
							title: "首屏压力前置",
							triggerProblem: "首屏没有压力。",
							reusableRule: "先给读者不可回避的问题。",
							selfCheckQuestion: "三百字内是否出现必须解决的压力？",
							promptTemplate: "把核心冲突前置。",
							createdAt: "2026-07-15T00:00:00.000Z",
							firstSeenAt: "2026-07-15T00:00:00.000Z",
							lastSeenAt: "2026-07-15T00:00:00.000Z",
							sourceChapterTitle: "第一章",
							sourceIssueTitle: "前三百字缺少核心冲突",
							occurrenceCount: 1,
						},
					] satisfies ProjectMethodologyCard[],
				}}
			/>,
		);

		expect(html).toContain("分析平台适配");
		expect(html).toContain("沉淀方法论卡");
		expect(html).toContain("平台适配假设");
		expect(html).toContain("当前更适合短篇节奏强的平台测试");
		expect(html).toContain("番茄小说");
		expect(html).not.toContain("保存可复用方法论卡");
	});
});
