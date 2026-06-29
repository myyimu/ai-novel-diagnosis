import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OverviewView } from "./overview-view";

const baseProps = {
	nextAction: {
		title: "先校准市场定位",
		description: "先校准分类、主题、标签和读者期待。",
		actionLabel: "去 AI 识别定位",
		view: "chapter",
		secondaryLabel: "AI 设置",
		secondaryView: "provider",
	},
	providerKind: "mock" as const,
	providerLabel: "本地演示",
	providerModel: "",
	quickLoading: false,
	quickElapsedSeconds: 0,
	quickReviewResult: null,
	quickReviewGenre: "",
	quickReviewInputKind: "human-draft" as const,
	quickReviewPreviousPrompt: "",
	revisionSessions: [],
	methodologyCards: [],
	chapterText: "",
	chapterCompletion: 50,
	nextChapterAction: "生成评分标准",
	referenceTitle: "成熟样本",
	scoreResult: null,
	bookStatus: "未启动",
	bookStatusText: "未启动整书拆解",
	researchReadiness: 25,
	researchSourceCount: 1,
	graphNodeCount: 0,
	chapterProjectSteps: [
		{ label: "平台和策略画像", done: true, detail: "番茄 · 男频 · 长篇追更" },
		{ label: "评分标准", done: false, detail: "尚未生成评分标准。" },
	],
	platformLabel: "番茄小说",
	readingModeLabel: "长篇追更",
	competitionLevelLabel: "红海赛道",
	pushStageLabel: "冷启动",
	competitionNotes: "先做差异化卖点。",
	bookTitle: "示例长篇小说",
	bookCompletion: 0,
	onChapterTextChange: vi.fn(),
	onQuickReviewGenreChange: vi.fn(),
	onQuickReviewInputKindChange: vi.fn(),
	onQuickReviewPreviousPromptChange: vi.fn(),
	onRunQuickExperience: vi.fn(),
	onRerunQuickExperience: vi.fn(),
	hasQuickReviewCache: false,
	diagnosisExamples: [
		{
			id: "xuanhuan-ai-draft-opening-promise",
			label: "玄幻 AI 初稿：开局承诺不清",
			description: "把开局承诺改成具体的羞辱、代价和反击目标",
			genre: "xuanhuan",
			inputKind: "ai-draft" as const,
			chapterTitle: "第一章 被逐出山门",
			chapterText: "青岚宗外门钟声响了七下。",
			previousPrompt: "请写一个玄幻废柴被逐出宗门的开头。",
			topIssueCategory: "market_promise",
			nextAction: "把开局承诺改成具体的羞辱、代价和反击目标",
		},
	],
	onUseExampleChapter: vi.fn(),
	onOpenModel: vi.fn(),
	onOpenCritique: vi.fn(),
	onOpenBook: vi.fn(),
	onOpenView: vi.fn(),
};

describe("OverviewView", () => {
	it("renders the workspace status dashboard from supplied state", () => {
		const html = renderToStaticMarkup(<OverviewView {...baseProps} />);

		expect(html).toContain("AI网文诊断台");
		expect(html).toContain("先找出小说为什么没人追。");
		expect(html).toContain("30 秒小说诊断");
		expect(html).toContain("诊断闭环");
		expect(html).toContain("需要理解流程时再展开看。");
		expect(html).toContain("本地演示");
		expect(html).toContain("进阶能力");
		expect(html).toContain("深度质检、整书拆解、样本研究和数据快照。");
		expect(html).toContain("玄幻 AI 初稿：开局承诺不清");
	});

	it("shows latest score evidence when a report exists", () => {
		const html = renderToStaticMarkup(
			<OverviewView
				{...baseProps}
				scoreResult={{
					totalScore: 7.2,
					strongestPoint: "冲突开得快。",
					weakestPoint: "章末缺少新钩子。",
					nextRevisionMove: "补一处身份暴露风险。",
				}}
			/>,
		);

		expect(html).toContain("7.2/10");
		expect(html).toContain("冲突开得快。");
		expect(html).toContain("章末缺少新钩子。");
		expect(html).toContain("补一处身份暴露风险。");
	});
});
