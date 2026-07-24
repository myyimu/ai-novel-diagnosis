import { describe, expect, it } from "vitest";
import {
	buildDiagnosisDashboard,
	buildProjectExportJson,
	buildProjectExportMarkdown,
	buildRevisionComparison,
	buildRevisionHistory,
	createRevisionSession,
	createRevisionTextVersion,
	findPreviousRevisionTextVersion,
	findRevisionTextVersionForDraft,
	mergeProjectMethodologyCards,
	summarizeRevisionTrend,
	upsertRevisionSession,
	upsertRevisionTextVersion,
} from "./workspace-iteration";
import type {
	QuickReviewResult,
	StoryAuditFindingReview,
	StoryAuditResult,
	WorkspaceProject,
} from "@/stores/workspace-store";

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

const baseStoryAudit: StoryAuditResult = {
	schemaVersion: "story-audit.v1",
	auditId: "audit-a",
	projectId: "project-a",
	bookJobId: "book-job-a",
	generatedAt: "2026-06-24T02:30:00.000Z",
	coverage: {
		analyzedChapterIds: ["chapter-1"],
		totalChapterCount: 2,
		isPartial: true,
		sceneExtractionRate: 0.8,
		evidenceValidationRate: 1,
	},
	scenes: [
		{
			id: "scene-1",
			chapterId: "chapter-1",
			orderInChapter: 1,
			narrativeOrder: 1,
			title: "退婚现场",
			locationIds: ["hall"],
			participantIds: ["hero"],
			evidence: [],
		},
	],
	events: [
		{
			id: "event-1",
			sceneId: "scene-1",
			summary: "主角被当众退婚",
			participantIds: ["hero"],
			locationIds: ["hall"],
			relations: [],
			evidence: [],
		},
	],
	facts: [],
	characterStates: [],
	findings: [
		{
			id: "finding-a",
			category: "timeline_conflict",
			severity: "high",
			status: "candidate",
			title: "时间线候选冲突",
			claim: "第二章回忆与第一章公开退婚的先后顺序需要复核。",
			evidence: [
				{
					anchorId: "anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "长老当众宣布取消他的试炼资格。",
					startOffset: 3,
					endOffset: 18,
					source: "text",
				},
			],
			relatedFactIds: [],
			relatedEventIds: ["event-1"],
			ruleIds: ["rule-a"],
			alternativeExplanations: ["可能是角色记忆偏差，需要作者确认。"],
			readerImpact: "读者可能误解公开退婚发生的时间。",
			fixAction: "补一句明确时间锚点。",
			confidence: 0.87,
		},
	],
	metrics: {
		dialogue: [
			{
				scopeId: "chapter-1",
				effectiveCharacterCount: 100,
				dialogueCharacterCount: 20,
				dialogueCharacterRatio: 0.2,
				paragraphCount: 5,
				dialogueParagraphCount: 1,
				dialogueParagraphRatio: 0.2,
				dialogueTurnCount: 2,
				dialogueTagCount: 1,
				unattributedTurnCandidateCount: 0,
				parserWarnings: [],
			},
		],
	},
	views: {
		temporalGraph: {
			eventIds: ["event-1"],
			relationEdges: [],
			conflictCandidateIds: ["finding-a"],
		},
		plotlineMatrix: [],
		setupPayoffEdges: [],
	},
};

const baseStoryAuditReview: StoryAuditFindingReview = {
	projectId: "project-a",
	auditId: "audit-a",
	findingId: "finding-a",
	reviewState: "confirmed",
	note: "确认为需要改的时间线问题。",
	updatedAt: "2026-06-24T02:40:00.000Z",
};

describe("workspace iteration assets", () => {
	it("creates a revision session from quick review result", () => {
		const session = createRevisionSession({
			projectId: "project-a",
			chapterTitle: "",
			chapterText: "主角被退婚后拿到旧案信物。",
			result: baseResult,
			methodologyCardIds: ["method-1"],
			storyAuditFindingIds: ["finding-1"],
			now: "2026-06-24T00:00:00.000Z",
		});

		expect(session.chapterTitle).toBe("第一章 退婚");
		expect(session.projectId).toBe("project-a");
		expect(session.inputKind).toBe("ai-draft");
		expect(session.gateDecision).toBe("revise");
		expect(session.issueTitles).toContain("章末钩子没有代价");
		expect(session.issueCategories).toContain("hook");
		expect(session.storyAuditFindingIds).toEqual(["finding-1"]);
		expect(session.methodologyCardIds).toEqual(["method-1"]);
	});

	it("keeps insufficient quick review sessions unscored instead of coercing to zero", () => {
		const session = createRevisionSession({
			chapterTitle: "材料不足版",
			chapterText: "太短",
			result: { ...baseResult, quickScore: null, gateDecision: "insufficient" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});

		expect(session.quickScore).toBeNull();
		expect(session.gateDecision).toBe("insufficient");
	});

	it("creates stable text versions and finds changed drafts by chapter hash", () => {
		const first = createRevisionTextVersion({
			projectId: "project-a",
			chapterTitle: "第一章",
			chapterText: "版本一正文",
			existingVersions: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const versions = upsertRevisionTextVersion([], first);
		const duplicate = findRevisionTextVersionForDraft({
			versions,
			projectId: "project-a",
			chapterTitle: "第一章",
			chapterText: "版本一正文",
		});
		const previous = findPreviousRevisionTextVersion({
			versions,
			projectId: "project-a",
			chapterTitle: "第一章",
			chapterText: "版本二正文",
		});
		const second = createRevisionTextVersion({
			projectId: "project-a",
			chapterTitle: "第一章",
			chapterText: "版本二正文",
			previousVersion: previous,
			existingVersions: versions,
			now: "2026-06-24T01:00:00.000Z",
		});

		expect(duplicate?.id).toBe(first.id);
		expect(previous?.id).toBe(first.id);
		expect(first.versionLabel).toBe("V1");
		expect(second.versionLabel).toBe("V2");
		expect(second.previousVersionId).toBe(first.id);
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
		expect(dashboard.coach.headline).toContain("最大重复问题");
		expect(dashboard.coach.nextActions[0]).toContain("章末钩子没有代价");
		expect(dashboard.coach.nextActions.join(" ")).toContain("钩子必须绑定代价");
	});

	it("does not compare or attribute prompt effectiveness when a revision score is unavailable", () => {
		const first = createRevisionSession({
			chapterTitle: "第一版",
			chapterText: "版本一",
			result: { ...baseResult, quickScore: 5.4, gateDecision: "rebuild" },
			methodologyCardIds: [],
			now: "2026-06-24T00:00:00.000Z",
		});
		const second = createRevisionSession({
			chapterTitle: "补材料版",
			chapterText: "版本二",
			result: { ...baseResult, quickScore: null, gateDecision: "insufficient" },
			methodologyCardIds: [],
			now: "2026-06-24T01:00:00.000Z",
		});
		const dashboard = buildDiagnosisDashboard({
			sessions: [second, first],
			methodologyCards: [],
		});
		const history = buildRevisionHistory({
			sessions: [first, second],
			selectedSessionId: second.id,
		});

		expect(dashboard.scoreDelta).toBeNull();
		expect(dashboard.promptEffectiveness.comparable).toBe(0);
		expect(dashboard.promptAttribution.total).toBe(0);
		expect(dashboard.qualityTrend.at(-1)?.score).toBeNull();
		expect(history.scoreDelta).toBeNull();
		expect(history.comparison).toBeNull();
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

		expect(comparison?.scoreDelta).toBe(1.2);
		expect(comparison?.gateChangeLabel).toBe("Gate 改善");
		expect(comparison?.promptOutcome.status).toBe("effective");
		expect(comparison?.resolvedIssues).toContain("章末钩子没有代价");
		expect(comparison?.newIssues).toContain("新章末钩子还不够具体");
		expect(comparison?.nextAction).toContain("方法论卡");
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
		const firstVersion = createRevisionTextVersion({
			projectId: project.id,
			chapterTitle: "第一章 退婚",
			chapterText: "版本一",
			sourceSessionId: first.id,
			now: "2026-06-24T00:00:00.000Z",
		});
		const secondVersion = createRevisionTextVersion({
			projectId: project.id,
			chapterTitle: "第一章 退婚",
			chapterText: "版本二",
			sourceSessionId: "revision-2",
			previousVersion: firstVersion,
			existingVersions: [firstVersion],
			now: "2026-06-24T01:00:00.000Z",
		});
		const second = {
			...createRevisionSession({
				projectId: project.id,
				chapterTitle: "第二版",
				chapterText: "版本二",
				result: { ...baseResult, quickScore: 6.4, gateDecision: "revise" },
				methodologyCardIds: ["method-1"],
				storyAuditFindingIds: ["finding-a"],
				now: "2026-06-24T01:00:00.000Z",
			}),
			revisionNote: "这一版按 Prompt 补了章末代价。",
			fromVersionId: firstVersion.id,
			toVersionId: secondVersion.id,
			textChanged: true,
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
			revisionVersions: [firstVersion, secondVersion],
			methodologyCards: mergedCards.cards,
			storyAudit: baseStoryAudit,
			storyAuditFindingReviews: [baseStoryAuditReview],
			generatedAt: "2026-06-24T03:00:00.000Z",
		});

		expect(markdown).toContain("AI网文诊断台项目导出");
		expect(markdown).toContain("项目概览");
		expect(markdown).toContain("编辑建议");
		expect(markdown).toContain("下一步动作");
		expect(markdown).toContain("优先处理：章末钩子没有代价");
		expect(markdown).toContain("复诊轨迹");
		expect(markdown).toContain("正文版本：2");
		expect(markdown).toContain("正文版本：V1 -> V2");
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
		expect(markdown).toContain("故事体检 storyAudit");
		expect(markdown).toContain("partial：是，仅导出已分析范围");
		expect(markdown).toContain("Finding 摘要");
		expect(markdown).toContain("人工复核：confirmed");
		expect(markdown).toContain("关联复诊：");
		expect(markdown).toContain(second.id);
		expect(markdown).toContain("长老当众宣布取消他的试炼资格。");
		expect(markdown).toContain("可能是角色记忆偏差，需要作者确认。");
		expect(markdown).not.toContain("版本一正文");
		expect(markdown).not.toContain("版本二正文");
	});

	it("builds a project export JSON package without revision full text", () => {
		const project: WorkspaceProject = {
			id: "project-a",
			name: "退婚流测试项目",
			createdAt: "2026-06-24T00:00:00.000Z",
			updatedAt: "2026-06-24T02:00:00.000Z",
		};
		const session = createRevisionSession({
			projectId: project.id,
			chapterTitle: "第二版",
			chapterText: "版本二正文",
			result: baseResult,
			methodologyCardIds: [],
			storyAuditFindingIds: ["finding-a"],
			now: "2026-06-24T01:00:00.000Z",
		});
		const version = createRevisionTextVersion({
			projectId: project.id,
			chapterTitle: "第一章 退婚",
			chapterText: "版本二正文",
			sourceSessionId: session.id,
			now: "2026-06-24T01:00:00.000Z",
		});
		const json = buildProjectExportJson({
			project,
			revisionSessions: [session],
			revisionVersions: [version],
			methodologyCards: [],
			storyAudit: baseStoryAudit,
			storyAuditFindingReviews: [baseStoryAuditReview],
			generatedAt: "2026-06-24T03:00:00.000Z",
		});
		const parsed = JSON.parse(json) as {
			revisionVersions: Array<{ text?: unknown }>;
			storyAudit: {
				findings: Array<{
					evidence: Array<{ quote: string }>;
					humanReviewState?: string;
					linkedRevisionSessionIds: string[];
				}>;
			};
		};

		expect(json).not.toContain("版本二正文");
		expect(parsed.revisionVersions[0]?.text).toBeUndefined();
		expect(parsed.storyAudit.findings[0]?.evidence[0]?.quote).toBe(
			"长老当众宣布取消他的试炼资格。",
		);
		expect(parsed.storyAudit.findings[0]?.humanReviewState).toBe("confirmed");
		expect(parsed.storyAudit.findings[0]?.linkedRevisionSessionIds).toEqual([session.id]);
	});
});
