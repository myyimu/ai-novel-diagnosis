import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookAnalysisResult } from "@/stores/workspace-store";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/hooks/use-provider-connection", () => ({
	useProviderConnection: () => ({
		providerConnection: {
			status: "success",
			providerName: "本地演示",
			modelName: "demo",
			message: "",
		},
		testCurrentProvider: vi.fn(),
	}),
}));

const storyAudit = {
	schemaVersion: "story-audit.v1",
	auditId: "audit-a",
	projectId: "project-a",
	bookJobId: "book-job-a",
	generatedAt: "2026-07-18T08:00:00.000Z",
	coverage: {
		analyzedChapterIds: ["chapter-1", "chapter-2"],
		totalChapterCount: 2,
		isPartial: false,
		sceneExtractionRate: 1,
		evidenceValidationRate: 1,
	},
	scenes: [
		{
			id: "scene-1",
			chapterId: "chapter-1",
			orderInChapter: 1,
			narrativeOrder: 1,
			title: "相遇",
			locationIds: [],
			participantIds: ["hero"],
			evidence: [
				{
					anchorId: "scene-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "他发现旧案玉牌。",
					startOffset: 4,
					endOffset: 12,
					source: "text",
				},
			],
		},
		{
			id: "scene-2",
			chapterId: "chapter-2",
			orderInChapter: 1,
			narrativeOrder: 2,
			title: "追查",
			locationIds: [],
			participantIds: ["hero"],
			evidence: [
				{
					anchorId: "scene-anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "玉牌指向评审长。",
					startOffset: 20,
					endOffset: 28,
					source: "text",
				},
			],
		},
	],
	events: [
		{
			id: "event-a",
			sceneId: "scene-1",
			summary: "主角发现旧案玉牌",
			participantIds: ["hero"],
			locationIds: [],
			relativeTimeText: "子夜后",
			relations: [
				{
					targetEventId: "event-b",
					relation: "before",
					confidence: 0.8,
				},
			],
			evidence: [
				{
					anchorId: "event-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "钟声刚过子夜。",
					startOffset: 12,
					endOffset: 19,
					source: "text",
				},
			],
		},
		{
			id: "event-b",
			sceneId: "scene-2",
			summary: "主角追查评审长",
			participantIds: ["hero"],
			locationIds: [],
			relativeTimeText: "第二天",
			relations: [],
			evidence: [
				{
					anchorId: "event-anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "第二天，他开始追查评审长。",
					startOffset: 44,
					endOffset: 58,
					source: "text",
				},
			],
		},
	],
	facts: [
		{
			id: "fact-setup",
			subjectId: "hero",
			predicate: "发现",
			object: "旧案玉牌",
			kind: "possession",
			polarity: "asserted",
			sourcePriority: "explicit-text",
			confidence: 0.88,
			evidence: [
				{
					anchorId: "fact-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "他发现旧案玉牌。",
					startOffset: 4,
					endOffset: 12,
					source: "text",
				},
			],
		},
		{
			id: "fact-payoff",
			subjectId: "hero",
			predicate: "指向",
			object: "评审长",
			kind: "knowledge",
			polarity: "asserted",
			sourcePriority: "explicit-text",
			confidence: 0.82,
			evidence: [
				{
					anchorId: "fact-anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "玉牌指向评审长。",
					startOffset: 20,
					endOffset: 28,
					source: "text",
				},
			],
		},
	],
	characterStates: [
		{
			characterId: "hero",
			sceneId: "scene-1",
			goalDistance: "closer",
			agency: 0.72,
			beliefState: "相信旧案可以被追查",
			relationshipStates: [
				{
					targetCharacterId: "judge",
					trust: 0.1,
					power: 0.4,
				},
			],
			cost: "暴露自己正在追查旧案",
			irreversibleChoice: "决定保留玉牌继续查",
			evidence: [
				{
					anchorId: "arc-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "他把玉牌收入袖中。",
					startOffset: 60,
					endOffset: 70,
					source: "text",
				},
			],
		},
		{
			characterId: "hero",
			sceneId: "scene-2",
			goalDistance: "farther",
			agency: 0.48,
			beliefState: "意识到对手藏在评审体系里",
			relationshipStates: [],
			cost: "调查范围扩大",
			irreversibleChoice: "主动追查评审长",
			evidence: [
				{
					anchorId: "arc-anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "他开始追查评审长。",
					startOffset: 50,
					endOffset: 58,
					source: "text",
				},
			],
		},
		{
			characterId: "hero",
			sceneId: "scene-missing",
			goalDistance: "unknown",
			agency: 0.2,
			relationshipStates: [],
			evidence: [],
		},
	],
	findings: [
		{
			id: "finding-plot-a",
			category: "causal_gap",
			severity: "high",
			status: "needs_human",
			title: "追查动作缺少必要因果候选",
			claim: "主角突然能锁定评审长，但中间缺少线索转接。",
			evidence: [
				{
					anchorId: "plot-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "他发现旧案玉牌。",
					startOffset: 4,
					endOffset: 12,
					source: "text",
				},
				{
					anchorId: "plot-anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "玉牌指向评审长。",
					startOffset: 20,
					endOffset: 28,
					source: "text",
				},
			],
			relatedFactIds: ["fact-setup", "fact-payoff"],
			relatedEventIds: ["event-a", "event-b"],
			ruleIds: ["causal-gap-double-evidence"],
			alternativeExplanations: ["可能存在尚未抽取到的中间推理。"],
			readerImpact: "读者可能不清楚主角为何能跳到新目标。",
			fixAction: "补一处线索转接或角色推理。",
			confidence: 0.82,
		},
		{
			id: "finding-a",
			category: "timeline_conflict",
			severity: "high",
			status: "candidate",
			title: "同一夜晚出现时间冲突",
			claim: "同一事件被写成发生在午夜前后两种顺序。",
			evidence: [
				{
					anchorId: "anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "钟声刚过子夜。",
					startOffset: 12,
					endOffset: 19,
					source: "text",
				},
				{
					anchorId: "anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "他在子夜前已经离开。",
					startOffset: 32,
					endOffset: 43,
					source: "text",
				},
			],
			relatedFactIds: [],
			relatedEventIds: [],
			ruleIds: ["temporal.before-after-cycle"],
			alternativeExplanations: ["可能是角色转述错误。"],
			confidence: 0.76,
		},
		{
			id: "finding-setup-a",
			category: "unresolved_setup",
			severity: "medium",
			status: "needs_human",
			title: "旧案玉牌暂未回收候选",
			claim: "玉牌作为伏笔出现后，当前范围只看到指向新目标，还需要确认是否已有阶段性兑现。",
			evidence: [
				{
					anchorId: "setup-finding-anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "他发现旧案玉牌。",
					startOffset: 4,
					endOffset: 12,
					source: "text",
				},
			],
			relatedFactIds: ["fact-setup"],
			relatedEventIds: [],
			ruleIds: ["open-setup-needs-human-review"],
			alternativeExplanations: ["可能是作者计划后文回收的长线伏笔。"],
			confidence: 0.68,
		},
		{
			id: "finding-low-a",
			category: "dialogue_attribution",
			severity: "low",
			status: "candidate",
			title: "第四条低优对白归属候选",
			claim: "这条用于确认默认顶部不会超过三条。",
			evidence: [
				{
					anchorId: "low-anchor-a",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "他开始追查评审长。",
					startOffset: 50,
					endOffset: 58,
					source: "text",
				},
			],
			relatedFactIds: [],
			relatedEventIds: [],
			ruleIds: ["low-priority-hidden-by-default"],
			alternativeExplanations: ["可能有上下文说话人。"],
			confidence: 0.3,
		},
	],
	metrics: {
		dialogue: [
			{
				scopeId: "book",
				effectiveCharacterCount: 1000,
				dialogueCharacterCount: 270,
				dialogueCharacterRatio: 0.27,
				paragraphCount: 20,
				dialogueParagraphCount: 6,
				dialogueParagraphRatio: 0.3,
				dialogueTurnCount: 14,
				dialogueTagCount: 3,
				unattributedTurnCandidateCount: 1,
				parserWarnings: [],
			},
		],
	},
	views: {
		temporalGraph: {
			eventIds: ["event-a", "event-b"],
			relationEdges: [
				{
					sourceEventId: "event-a",
					targetEventId: "event-b",
					relation: "before",
					confidence: 0.8,
					evidenceAnchorIds: ["event-anchor-a", "event-anchor-b"],
					ruleId: "temporal.explicit-order",
				},
			],
			conflictCandidateIds: [],
		},
		plotlineMatrix: [
			{
				plotlineId: "plot-main",
				sceneIds: ["scene-1", "scene-2"],
				status: "active",
			},
		],
		setupPayoffEdges: [
			{
				setupFactId: "fact-setup",
				payoffFactId: "fact-payoff",
				status: "paid",
			},
		],
	},
} satisfies NonNullable<BookAnalysisResult["storyAudit"]>;

const bookAnalysisResult = {
	mode: "full",
	book: {
		title: "测试书",
		genre: "玄幻",
		chapterCountEstimate: 2,
		oneSentencePremise: "主角追查旧案。",
		coreAppeal: ["悬念"],
	},
	plotlines: [
		{
			name: "主线追案",
			type: "main",
			start: "玉牌暴露旧案。",
			turningPoints: ["评审长浮出水面。"],
			payoff: "旧案真相逼近。",
			reusablePattern: "物证推动主线。",
		},
	],
	relationships: {
		nodes: [
			{ id: "hero", label: "主角", type: "protagonist" },
			{ id: "judge", label: "评审长", type: "antagonist" },
		],
		edges: [],
	},
	storyAudit,
} as unknown as BookAnalysisResult;
let renderedBookAnalysisResult = bookAnalysisResult;

afterEach(() => {
	renderedBookAnalysisResult = bookAnalysisResult;
});

vi.mock("@/hooks/use-workspace-handlers", () => ({
	useWorkspaceHandlers: () => ({
		activeProject: {
			id: "project-a",
			name: "测试书",
			bookJobId: "book-job-a",
			analysisPurpose: "story-audit",
			createdAt: "2026-07-18T08:00:00.000Z",
			updatedAt: "2026-07-18T08:00:00.000Z",
		},
		activeProjectId: "project-a",
		projectRevisionSessions: [],
		projectMethodologyCards: [],
		providerLabel: "本地演示",
		bookAnalysisResult: renderedBookAnalysisResult,
		bookJob: {
			id: "book-job-a",
		},
	}),
}));

vi.mock("@/stores/workspace-store", () => ({
	useWorkspaceStore: <T,>(
		selector: (state: {
			bookAnalysisCache: Array<{
				job: { id: string };
				result: BookAnalysisResult | null;
			}>;
			setBookAnalysisResult: (result: BookAnalysisResult | null) => void;
			setBookJob: (job: unknown) => void;
		}) => T,
	): T =>
		selector({
			bookAnalysisCache: [{ job: { id: "book-job-a" }, result: renderedBookAnalysisResult }],
			setBookAnalysisResult: vi.fn(),
			setBookJob: vi.fn(),
		}),
}));

vi.mock("@/lib/workspace-analysis-client", () => ({
	readBookAnalysisJob: vi.fn(),
	readStoryAuditFindingReviews: vi.fn().mockResolvedValue([]),
	upsertStoryAuditFindingReview: vi.fn(),
}));

import { buildStoryAuditRevisionSeed, ProjectHealthPage } from "./ProjectHealthPage";

describe("ProjectHealthPage", () => {
	it("renders story audit evidence, deterministic statistics, and project-aware evidence links", () => {
		const html = renderToStaticMarkup(<ProjectHealthPage />);

		expect(html).toContain("故事体检");
		expect(html).toContain("非评分");
		expect(html).toContain("27%");
		expect(html).toContain("同一夜晚出现时间冲突");
		expect(html).toContain("可能是角色转述错误。");
		expect(html).toContain("章节 × 剧情线矩阵");
		expect(html).toContain("主线追案");
		expect(html).toContain("时间切换");
		expect(html).toContain("叙事顺序");
		expect(html).toContain("故事内时间");
		expect(html).toContain("伏笔—回收边");
		expect(html).toContain("旧案玉牌");
		expect(html).toContain("评审长");
		expect(html).toContain("未选择模板：仅展示事实结构，不评分。");
		expect(html).toContain("人物状态账本与弧光变化点");
		expect(html).toContain("不合成为人物成长总分");
		expect(html).toContain("合理成长、伪装、情境变化和不可靠叙述");
		expect(html).toContain("主角");
		expect(html).toContain("目标更近");
		expect(html).toContain("目标更远");
		expect(html).toContain("主动性较强");
		expect(html).toContain("决定保留玉牌继续查");
		expect(html).toContain("剧情漏洞候选");
		expect(html).toContain("默认只推顶部 3 个待确认问题");
		expect(html).toContain("只输出候选、证据和替代解释");
		expect(html).toContain("追查动作缺少必要因果候选");
		expect(html).toContain("高优证据达标");
		expect(html).toContain("至少两个不同位置的证据。");
		expect(html).toContain("旧案玉牌暂未回收候选");
		expect(html).not.toContain("第四条低优对白归属候选");
		expect(html).toContain(
			"/project/current?id=project-a&amp;chapter=chapter-1&amp;anchor=anchor-a",
		);
		expect(html).toContain(
			"/project/current?id=project-a&amp;chapter=chapter-1&amp;anchor=fact-anchor-a",
		);
		expect(html).toContain(
			"/project/current?id=project-a&amp;chapter=chapter-1&amp;anchor=arc-anchor-a",
		);
		expect(html).toContain(
			"/project/current?id=project-a&amp;chapter=chapter-1&amp;anchor=plot-anchor-a",
		);
		expect(html).toContain("人工判断不会写入 storyAudit 原始结果");
		expect(html).toContain("加入改稿计划");
		expect(push).not.toHaveBeenCalled();
	});

	it("builds a quick-diagnosis seed from a story audit finding without carrying whole-book verdicts", () => {
		const finding = storyAudit.findings[0]!;
		const seed = buildStoryAuditRevisionSeed(finding);

		expect(seed.chapterTitle).toBe("第1章 · 追查动作缺少必要因果候选");
		expect(seed.chapterPosition).toBe("first");
		expect(seed.diagnosticFocus).toContain("整书体检候选：追查动作缺少必要因果候选");
		expect(seed.diagnosticFocus.length).toBeLessThanOrEqual(100);
		expect(seed.mustKeepMechanisms).toContain("优先验证修改动作：补一处线索转接或角色推理。");
		expect(seed.mustKeepMechanisms).toContain("第1章「他发现旧案玉牌。」");
		expect(seed.mustKeepMechanisms).toContain("保留替代解释：可能存在尚未抽取到的中间推理。");
		expect(seed.targetReaderPleasures).toBe("读者可能不清楚主角为何能跳到新目标。");
	});

	it("hides whole-book missing conclusions when story audit coverage is partial", () => {
		renderedBookAnalysisResult = {
			...bookAnalysisResult,
			storyAudit: {
				...storyAudit,
				coverage: {
					...storyAudit.coverage,
					isPartial: true,
					analyzedChapterIds: ["chapter-1"],
					totalChapterCount: 3,
				},
				findings: [
					{
						id: "partial-dropped-goal",
						category: "dropped_goal",
						severity: "high",
						status: "candidate",
						title: "partial 不应展示的目标断线",
						claim: "未分析完整书时不应输出全书目标断线结论。",
						evidence: [
							{
								anchorId: "partial-anchor-a",
								chapterId: "chapter-1",
								chapterOrder: 1,
								quote: "他发现旧案玉牌。",
								startOffset: 4,
								endOffset: 12,
								source: "text",
							},
						],
						relatedFactIds: [],
						relatedEventIds: [],
						ruleIds: ["legacy-partial-dropped-goal"],
						alternativeExplanations: ["可能在未分析章节继续推进。"],
						confidence: 0.9,
					},
				],
			},
		};

		const html = renderToStaticMarkup(<ProjectHealthPage />);

		expect(html).toContain("partial：隐藏全书缺失结论");
		expect(html).toContain(
			"partial 输入不会展示 dropped_goal 或 unresolved_setup 这类全书缺失结论。",
		);
		expect(html).not.toContain("partial 不应展示的目标断线");
	});
});
