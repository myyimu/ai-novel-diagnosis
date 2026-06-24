import { describe, expect, it } from "vitest";
import {
	buildDiagnosisDashboard,
	buildProjectExportMarkdown,
	buildRevisionComparison,
	buildRevisionHistory,
	createRevisionSession,
	mergeProjectMethodologyCards,
	summarizeRevisionTrend,
	upsertRevisionSession,
} from "./workspace-iteration";
import type { QuickReviewResult, WorkspaceProject } from "@/stores/workspace-store";

const baseResult: QuickReviewResult = {
	title: "第一章 退婚",
	genre: "xuanhuan",
	inputKind: "ai-draft",
	positioning: "退婚流开局",
	sellingPoints: ["公开羞辱"],
	mainProblem: "章末钩子没有代价",
	actionableFixes: ["补强不追读的损失"],
	recommendedPlatforms: [],
	readyForFullReview: true,
	readyReason: "可以复诊",
	quickScore: 6.4,
	confidence: 0.8,
	gateDecision: "revise",
	nextPrompt: {
		title: "下一轮改稿 Prompt",
		prompt: "请补强章末代价。",
		linkedIssueIds: ["issue-1"],
		whyThisWorks: ["对应解决章末钩子没有代价。"],
	},
	issues: [
		{
			id: "issue-1",
			severity: "high",
			category: "hook",
			title: "章末钩子没有代价",
			description: "结尾有悬念，但读者不知道错过下一章会损失什么。",
			evidence: [],
			readerImpact: "读者可能不会点下一章。",
			fixAction: "把下一章的危机或收益压到结尾。",
			promptConstraint: "章末必须出现明确代价。",
			blocksNextStep: true,
		},
	],
	methodologyCards: [
		{
			id: "method-1",
			sourceIssueId: "issue-1",
			type: "hook_rule",
			title: "钩子必须绑定代价",
			triggerProblem: "章末钩子没有代价",
			reusableRule: "章末悬念要绑定读者不继续阅读的损失。",
			selfCheckQuestion: "读者知道不点下一章会错过什么吗？",
			promptTemplate: "请补强章末代价。",
		},
	],
};

describe("workspace iteration assets", () => {
	it("creates a revision session from quick review result", () => {
		const session = createRevisionSession({
			projectId: "project-a",
			chapterTitle: "",
			chapterText: "主角被退婚后拿到旧案信物。",
			result: baseResult,
			methodologyCardIds: ["method-1"],
			now: "2026-06-24T00:00:00.000Z",
		});

		expect(session.chapterTitle).toBe("第一章 退婚");
		expect(session.projectId).toBe("project-a");
		expect(session.inputKind).toBe("ai-draft");
		expect(session.gateDecision).toBe("revise");
		expect(session.issueTitles).toContain("章末钩子没有代价");
		expect(session.issueCategories).toContain("hook");
		expect(session.methodologyCardIds).toEqual(["method-1"]);
	});

	it("deduplicates methodology cards and increases occurrence count", () => {
		const firstMerge = mergeProjectMethodologyCards({
			projectId: "project-a",
			currentCards: [],
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "第一章 退婚",
			now: "2026-06-24T00:00:00.000Z",
		});
		const secondMerge = mergeProjectMethodologyCards({
			projectId: "project-a",
			currentCards: firstMerge.cards,
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "第二版",
			now: "2026-06-24T01:00:00.000Z",
		});

		expect(secondMerge.cards).toHaveLength(1);
		expect(secondMerge.cards[0]?.occurrenceCount).toBe(2);
		expect(secondMerge.cardIds).toEqual(firstMerge.cardIds);
	});

	it("keeps methodology card dedupe isolated by project", () => {
		const projectA = mergeProjectMethodologyCards({
			projectId: "project-a",
			currentCards: [],
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "项目 A",
			now: "2026-06-24T00:00:00.000Z",
		});
		const projectB = mergeProjectMethodologyCards({
			projectId: "project-b",
			currentCards: projectA.cards,
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "项目 B",
			now: "2026-06-24T01:00:00.000Z",
		});

		expect(projectB.cards).toHaveLength(2);
		expect(new Set(projectB.cardIds).size).toBe(1);
		expect(projectB.cards.map((card) => card.projectId).sort()).toEqual([
			"project-a",
			"project-b",
		]);
	});

	it("summarizes latest revision trend", () => {
		const first = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = createRevisionSession({
			chapterTitle: "第二版",
			chapterText: "版本二",
			result: { ...baseResult, quickScore: 6.4, gateDecision: "revise" },
			methodologyCardIds: [],
			now: "2026-06-24T01:00:00.000Z",
		});
		const sessions = upsertRevisionSession([first], second);
		const trend = summarizeRevisionTrend(sessions);

		expect(trend?.latest.chapterTitle).toBe("第二版");
		expect(trend?.scoreDelta).toBe(1);
		expect(trend?.total).toBe(2);
	});

	it("builds dashboard metrics from revision sessions and methodology cards", () => {
		const first = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: ["method-1"],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = createRevisionSession({
			chapterTitle: "第二版",
			chapterText: "版本二",
			result: { ...baseResult, quickScore: 6.4, gateDecision: "revise" },
			methodologyCardIds: ["method-1"],
			now: "2026-06-24T01:00:00.000Z",
		});
		const mergedCards = mergeProjectMethodologyCards({
			currentCards: [],
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "第一章 退婚",
			now: "2026-06-24T00:00:00.000Z",
		});
		const dashboard = buildDiagnosisDashboard({
			sessions: [second, first],
			methodologyCards: mergedCards.cards,
		});

		expect(dashboard.totalSessions).toBe(2);
		expect(dashboard.scoreDelta).toBe(1);
		expect(dashboard.promptEffectiveness.improved).toBe(1);
		expect(dashboard.promptAttribution.rate).toBe(100);
		expect(dashboard.promptAttribution.items[0]?.category).toBe("prompt_effective");
		expect(dashboard.promptAttribution.items[0]?.diagnosisReason).toContain("上一轮 Prompt");
		expect(dashboard.promptAttribution.items[0]?.confidence).toBeGreaterThan(0.5);
		expect(dashboard.gateDistribution.map((row) => row.label)).toContain("修改");
		expect(dashboard.categoryDistribution.map((row) => row.label)).toContain("钩子");
		expect(dashboard.commonIssues[0]?.label).toBe("章末钩子没有代价");
	});

	it("attributes weak prompt outcomes to execution gaps when issues repeat", () => {
		const first = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 6.2, gateDecision: "revise" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = {
			...createRevisionSession({
				chapterTitle: "第二版",
				chapterText: "版本二",
				result: { ...baseResult, quickScore: 6.3, gateDecision: "revise" },
				methodologyCardIds: [],
				now: "2026-06-24T01:00:00.000Z",
			}),
			revisionNote: "这一版还没按 Prompt 补章末代价。",
		};
		const dashboard = buildDiagnosisDashboard({
			sessions: [second, first],
			methodologyCards: [],
		});

		expect(dashboard.promptAttribution.items[0]?.category).toBe("execution_gap");
		expect(dashboard.promptAttribution.items[0]?.evidence).toContain("人工备注显示执行不足");
	});

	it("builds revision history with selected session and previous comparison", () => {
		const first = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = createRevisionSession({
			chapterTitle: "第二版",
			chapterText: "版本二",
			result: { ...baseResult, quickScore: 6.4, gateDecision: "revise" },
			methodologyCardIds: [],
			now: "2026-06-24T01:00:00.000Z",
		});
		const history = buildRevisionHistory({
			sessions: [first, second],
			selectedSessionId: second.id,
		});

		expect(history.sessions[0]?.id).toBe(second.id);
		expect(history.selected?.id).toBe(second.id);
		expect(history.previous?.id).toBe(first.id);
		expect(history.scoreDelta).toBe(1);
		expect(history.comparison?.promptOutcome.status).toBe("partial");
		expect(history.comparison?.repeatedIssues).toContain("章末钩子没有代价");
	});

	it("builds a structured adjacent revision comparison", () => {
		const previous = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const current = createRevisionSession({
			chapterTitle: "第二版",
			chapterText: "版本二",
			result: {
				...baseResult,
				quickScore: 6.6,
				gateDecision: "revise",
				mainProblem: "新章末钩子还不够具体",
				issues: [
					{
						...baseResult.issues![0]!,
						id: "issue-2",
						title: "新章末钩子还不够具体",
					},
				],
			},
			methodologyCardIds: [],
			now: "2026-06-24T01:00:00.000Z",
		});

		const comparison = buildRevisionComparison({ current, previous });

		expect(comparison.scoreDelta).toBe(1.2);
		expect(comparison.gateChangeLabel).toBe("Gate 改善");
		expect(comparison.promptOutcome.status).toBe("effective");
		expect(comparison.resolvedIssues).toContain("章末钩子没有代价");
		expect(comparison.newIssues).toContain("新章末钩子还不够具体");
		expect(comparison.nextAction).toContain("方法论卡");
	});

	it("builds a project export markdown package", () => {
		const project: WorkspaceProject = {
			id: "project-a",
			name: "退婚流测试项目",
			createdAt: "2026-06-24T00:00:00.000Z",
			updatedAt: "2026-06-24T02:00:00.000Z",
		};
		const first = createRevisionSession({
			projectId: project.id,
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: ["method-1"],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = {
			...createRevisionSession({
				projectId: project.id,
				chapterTitle: "第二版",
				chapterText: "版本二",
				result: { ...baseResult, quickScore: 6.4, gateDecision: "revise" },
				methodologyCardIds: ["method-1"],
				now: "2026-06-24T01:00:00.000Z",
			}),
			revisionNote: "这一版按 Prompt 补了章末代价。",
		};
		const mergedCards = mergeProjectMethodologyCards({
			projectId: project.id,
			currentCards: [],
			resultCards: baseResult.methodologyCards,
			result: baseResult,
			chapterTitle: "第一章 退婚",
			now: "2026-06-24T00:00:00.000Z",
		});

		const markdown = buildProjectExportMarkdown({
			project,
			revisionSessions: [first, second],
			methodologyCards: mergedCards.cards,
			generatedAt: "2026-06-24T03:00:00.000Z",
		});

		expect(markdown).toContain("AI网文诊断台项目导出");
		expect(markdown).toContain("项目概览");
		expect(markdown).toContain("复诊轨迹");
		expect(markdown).toContain("人工备注");
		expect(markdown).toContain("这一版按 Prompt 补了章末代价。");
		expect(markdown).toContain("方法论卡");
		expect(markdown).toContain("Prompt 模板合集");
		expect(markdown).toContain("Prompt 归因");
		expect(markdown).toContain("Prompt 有效");
		expect(markdown).toContain("项目级归因校准");
		expect(markdown).toContain("模型/编辑复核提示");
		expect(markdown).toContain("诊断理由");
		expect(markdown).toContain("置信度");
		expect(markdown).toContain("请补强章末代价。");
	});
});
