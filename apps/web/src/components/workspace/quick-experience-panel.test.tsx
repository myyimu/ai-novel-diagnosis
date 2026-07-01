import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QuickExperiencePanel } from "./quick-experience-panel";

const diagnosisExamples = [
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
	{
		id: "urban-prompt-too-vague",
		label: "都市 AI 初稿：Prompt 约束太泛",
		description: "把 Prompt 改成强冲突约束",
		genre: "urban",
		inputKind: "ai-draft" as const,
		chapterTitle: "第一章 下山",
		chapterText: "林越背着旧布包走出车站。",
		previousPrompt: "请写一个都市下山高手开局。",
		topIssueCategory: "prompt_constraint",
		nextAction: "把 Prompt 改成强冲突约束",
	},
];

describe("QuickExperiencePanel", () => {
	it("renders the quick review entry without result", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={null}
				quickReviewGenre=""
				quickReviewInputKind="human-draft"
				quickReviewPreviousPrompt=""
				revisionSessions={[]}
				methodologyCards={[]}
				onChapterTextChange={vi.fn()}
				onQuickReviewGenreChange={vi.fn()}
				onQuickReviewInputKindChange={vi.fn()}
				onQuickReviewPreviousPromptChange={vi.fn()}
				onRun={vi.fn()}
				onRerun={vi.fn()}
				hasCachedResult={false}
				diagnosisExamples={diagnosisExamples}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("30 秒小说诊断");
		expect(html).toContain("当前 AI: 免费共享算力");
		expect(html).toContain("生成改稿方案");
		expect(html).toContain("玄幻 AI 初稿：开局承诺不清");
		expect(html).toContain("都市 AI 初稿：Prompt 约束太泛");
		expect(html).toContain("当前 16 字，还差 34 字");
		expect(html).toContain("可选：指定题材、卖点保护和上一条 Prompt");
		expect(html).toContain("核心卖点");
		expect(html).toContain("必须保留机制");
		expect(html).toContain("目标读者爽点");
	});

	it("renders quick review result when provided", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={{
					title: "第一章 退婚",
					genre: "xuanhuan",
					positioning: "典型玄幻废柴流开局",
					sellingPoints: ["反转感强", "目标明确"],
					mainProblem: "冲突压力不足",
					actionableFixes: ["补一句失败代价", "前置目标", "加结尾钩子"],
					recommendedPlatforms: [
						{
							id: "fanqie",
							label: "番茄小说",
							fit: "优先发布",
							reason: "强冲突和快节奏更容易测出反馈",
						},
					],
					readyForFullReview: true,
					readyReason: "文本量足够，适合做完整评分",
					quickScore: 6.5,
					confidence: 0.82,
					issues: [
						{
							id: "issue-1",
							severity: "high",
							category: "conflict_pressure",
							title: "冲突压力不足",
							description: "开局有事件，但没有把失败代价压到主角身上。",
							evidence: [
								{
									quote: "主角被公开否定，却发现旧案信物。",
									locationHint: "第1段",
									confidence: 0.86,
								},
								{
									quote: "没有人真正阻止他继续参加试炼。",
									locationHint: "中段",
									confidence: 0.78,
								},
							],
							readerImpact: "读者会觉得主角还没被逼到必须反击。",
							fixAction: "把试炼资格和家族代价绑定到这场公开否定。",
							promptConstraint: "前800字必须出现具体损失和反击目标。",
							blocksNextStep: true,
						},
					],
				}}
				previousQuickReviewResult={{
					title: "第一章 退婚",
					genre: "xuanhuan",
					positioning: "典型玄幻废柴流开局",
					sellingPoints: ["目标明确"],
					mainProblem: "失败代价不清楚",
					actionableFixes: ["补失败代价"],
					recommendedPlatforms: [],
					readyForFullReview: true,
					readyReason: "可以复诊",
					quickScore: 5.2,
					confidence: 0.75,
				}}
				quickReviewGenre=""
				quickReviewInputKind="ai-draft"
				quickReviewPreviousPrompt="写一个退婚流爽文第一章。"
				revisionSessions={[
					{
						id: "revision-1",
						createdAt: "2026-06-24T00:00:00.000Z",
						chapterTitle: "第一章 退婚",
						genre: "xuanhuan",
						inputKind: "ai-draft",
						textHash: "hash",
						textLength: 120,
						quickScore: 6.5,
						gateDecision: "revise",
						mainProblem: "冲突压力不足",
						issueTitles: ["冲突压力不足"],
						methodologyCardIds: ["method-1"],
					},
				]}
				methodologyCards={[
					{
						id: "method-1",
						projectCardId: "method-1",
						sourceIssueId: "issue-1",
						type: "hook_rule",
						title: "钩子必须绑定代价",
						triggerProblem: "冲突压力不足",
						reusableRule: "章末钩子要让读者看到不追就错过的代价。",
						selfCheckQuestion: "读者知道下一章非看不可的原因吗？",
						firstSeenAt: "2026-06-24T00:00:00.000Z",
						lastSeenAt: "2026-06-24T00:00:00.000Z",
						sourceChapterTitle: "第一章 退婚",
						occurrenceCount: 1,
					},
				]}
				onChapterTextChange={vi.fn()}
				onQuickReviewGenreChange={vi.fn()}
				onQuickReviewInputKindChange={vi.fn()}
				onQuickReviewPreviousPromptChange={vi.fn()}
				onRun={vi.fn()}
				onRerun={vi.fn()}
				hasCachedResult={true}
				diagnosisExamples={diagnosisExamples}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("6.5/10");
		expect(html).toContain("典型玄幻废柴流开局");
		expect(html).toContain("冲突压力不足");
		expect(html).toContain("这章最大流失点：冲突压力不足");
		expect(html).toContain("证据锚点");
		expect(html).toContain("2 条");
		expect(html).toContain("平均置信度");
		expect(html).toContain("82%");
		expect(html).toContain("最高优先级");
		expect(html).toContain("高优先级");
		expect(html).toContain("关键问题证据链");
		expect(html).toContain("第1段：");
		expect(html).toContain("置信度 86%");
		expect(html).toContain("读者会觉得主角还没被逼到必须反击。");
		expect(html).toContain("把试炼资格和家族代价绑定到这场公开否定。");
		expect(html).toContain("补一句失败代价");
		expect(html).toContain("可复制给写作 AI 的改稿 Prompt");
		expect(html).toContain("请帮我改写这一章");
		expect(html).toContain("改稿后复诊对比");
		expect(html).toContain("项目迭代资产");
		expect(html).toContain("钩子必须绑定代价");
		expect(html).toContain("5.2");
		expect(html).toContain("6.5");
		expect(html).toContain("从“失败代价不清楚”变为“冲突压力不足”。");
		expect(html).toContain("推荐发布平台");
		expect(html).toContain("番茄小说");
		expect(html).toContain("打开深度质检");
		expect(html).toContain("样本/整书进阶");
	});

	it("falls back when the model returns an incomplete result", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={
					{
						quickScore: 6,
						confidence: 0.6,
						recommendedPlatforms: [],
					} as never
				}
				quickReviewGenre=""
				quickReviewInputKind="human-draft"
				quickReviewPreviousPrompt=""
				revisionSessions={[]}
				methodologyCards={[]}
				onChapterTextChange={vi.fn()}
				onQuickReviewGenreChange={vi.fn()}
				onQuickReviewInputKindChange={vi.fn()}
				onQuickReviewPreviousPromptChange={vi.fn()}
				onRun={vi.fn()}
				onRerun={vi.fn()}
				hasCachedResult={false}
				diagnosisExamples={diagnosisExamples}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("6/10");
		expect(html).toContain("类型待确认");
		expect(html).toContain("模型没有返回明确卖点");
		expect(html).toContain("模型没有返回具体改法");
		expect(html).toContain("模型还没给出平台建议");
	});

	it("renders visible progress while waiting for a quick review", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={true}
				elapsedSeconds={21}
				quickReviewResult={null}
				quickReviewGenre=""
				quickReviewInputKind="human-draft"
				quickReviewPreviousPrompt=""
				revisionSessions={[]}
				methodologyCards={[]}
				onChapterTextChange={vi.fn()}
				onQuickReviewGenreChange={vi.fn()}
				onQuickReviewInputKindChange={vi.fn()}
				onQuickReviewPreviousPromptChange={vi.fn()}
				onRun={vi.fn()}
				onRerun={vi.fn()}
				hasCachedResult={false}
				diagnosisExamples={diagnosisExamples}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("等待模型返回");
		expect(html).toContain("已等待 21 秒");
	});
});
