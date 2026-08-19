import { describe, expect, it } from "vitest";

import {
	QA_REPORT_MAX_LENGTH,
	buildPremiseReviewQaReport,
	buildQuickReviewQaReport,
	buildStoryAuditQaReport,
} from "./report-qa-text";
import type {
	PremiseReviewResult,
	QuickReviewResult,
	StoryAuditResult,
} from "@ai-novel-diagnosis/ai-core";

const premiseResult: PremiseReviewResult = {
	schemaVersion: "premise-review.v1",
	reviewId: "review-1",
	premiseSummary: "一个重生复仇兼流量收割的故事。",
	coreConflict: "主角想复仇，而仇人是唯一能救他妹妹的人。",
	protagonistDesire: "救妹妹，且不放弃复仇。",
	opposingForce: "仇人掌握着妹妹的救命药。",
	irreducibilityTest: "换成职场背景后两难仍然成立。",
	readerHookQuestion: "他会先救仇人还是先复仇？",
	engineVerdict: "fixable",
	oneLineVerdict: "发动机成立，但阻力需要从被动遗憾改为主动对抗。",
	layers: [
		{
			layer: "engine",
			status: "weak",
			statement: "欲望明确但障碍被动。",
			confidence: 0.7,
			comment: "遗憾不会自己升级为压力。",
		},
		{ layer: "desire", status: "established", statement: "救妹妹。", confidence: 0.8 },
		{ layer: "conflict", status: "weak", statement: "冲突一次性。", confidence: 0.4 },
		{
			layer: "irreducibility",
			status: "established",
			statement: "两难独立。",
			confidence: 0.7,
		},
	],
	clicheFindings: [
		{
			id: "cliche-1",
			layer: "engine",
			severity: "high",
			title: "无代价重生金手指",
			claim: "前世记忆没有任何代价，冲突无法自我升级。",
			evidence: [{ quote: "带着前世记忆避开所有遗憾", note: "金手指无对价" }],
			suggestion: "让每次使用记忆都消耗他最在乎的关系。",
			status: "verified",
		},
	],
	upgradeDirections: [
		{
			directionId: "direction-emotion",
			orientation: "emotion",
			pitch: "把复仇故事改成必须先救仇人的故事。",
			changedConflict: "越接近复仇目标，越需要仇人活着。",
		},
	],
};

const quickResult: QuickReviewResult = {
	title: "第一章 苏醒",
	genre: "urban",
	positioning: "都市重生复仇流",
	sellingPoints: ["重生信息差", "逐个打脸"],
	mainProblem: "章末钩子没有代价，读者没有翻页理由。",
	actionableFixes: ["让主角在章末失去一样东西"],
	recommendedPlatforms: [],
	readyForFullReview: true,
	readyReason: "可以进入深度质检。",
	quickScore: 6.2,
	confidence: 0.66,
	gateReason: "钩子不足以留住首章读者。",
	oneLineDiagnosis: "开局信息量大但压力不足。",
	issues: [
		{
			id: "issue-1",
			severity: "high",
			category: "hook",
			title: "章末钩子无代价",
			description: "钩子只有悬念没有损失。",
			evidence: [{ quote: "他笑了笑，转身离开。", locationHint: "章末", confidence: 0.8 }],
			readerImpact: "读者没有翻页动力。",
			fixAction: "让离开本身付出代价。",
			promptConstraint: "章末必须出现损失",
			blocksNextStep: true,
		},
	],
	nextPrompt: {
		title: "下章提示词",
		prompt: "写第二章，主角必须……",
		linkedIssueIds: [],
		whyThisWorks: [],
	},
};

const storyAudit: StoryAuditResult = {
	schemaVersion: "story-audit.v1",
	auditId: "audit-1",
	projectId: "default-project",
	bookJobId: "job-1",
	generatedAt: "2026-08-19T00:00:00.000Z",
	coverage: {
		analyzedChapterIds: ["ch-1", "ch-2", "ch-3"],
		totalChapterCount: 3,
		isPartial: false,
		sceneExtractionRate: 0.9,
		evidenceValidationRate: 0.8,
	},
	scenes: [],
	events: [],
	facts: [],
	characterStates: [],
	findings: [
		{
			id: "finding-1",
			category: "unresolved_setup",
			severity: "high",
			status: "candidate",
			title: "妹妹的病历凭空消失",
			claim: "第一章病历是关键证据，第三章后再未出现。",
			evidence: [
				{
					anchorId: "anchor-1",
					chapterId: "ch-1",
					chapterOrder: 1,
					quote: "他攥着那张缴费单。",
					startOffset: 0,
					endOffset: 10,
					source: "text",
				},
			],
			relatedFactIds: [],
			relatedEventIds: [],
			ruleIds: [],
			alternativeExplanations: ["可能作者刻意留白"],
			readerImpact: "伏笔不回收会消耗信任。",
			fixAction: "第三章补一次病历呼应。",
			confidence: 0.72,
		},
	],
	metrics: { dialogue: [] },
	views: {
		temporalGraph: { eventIds: [], relationEdges: [], conflictCandidateIds: [] },
		plotlineMatrix: [],
		setupPayoffEdges: [],
	},
};

describe("buildPremiseReviewQaReport", () => {
	it("renders verdict, contract lines, audit layers and findings as text", () => {
		const report = buildPremiseReviewQaReport(premiseResult);

		expect(report).toContain("【立项审稿报告】");
		expect(report).toContain("审稿结论：值得写，但先修这几处");
		expect(report).toContain("核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。");
		expect(report).toContain("故事发动机（待修补）：欲望明确但障碍被动。");
		expect(report).toContain("无代价重生金手指（严重度高，已复核）");
		expect(report).toContain("带着前世记忆避开所有遗憾");
		expect(report).toContain("把复仇故事改成必须先救仇人的故事。（情感）");
	});
});

describe("buildQuickReviewQaReport", () => {
	it("renders diagnosis, issues with evidence and the next prompt", () => {
		const report = buildQuickReviewQaReport(quickResult);

		expect(report).toContain("【章节初诊报告】");
		expect(report).toContain("急诊分：6.2/10");
		expect(report).toContain("主要问题：章末钩子没有代价，读者没有翻页理由。");
		expect(report).toContain("章末钩子无代价（严重度高）");
		expect(report).toContain("他笑了笑，转身离开。");
		expect(report).toContain("下一轮 Prompt：写第二章，主角必须……");
	});
});

describe("buildStoryAuditQaReport", () => {
	it("renders coverage summary and anchored findings", () => {
		const report = buildStoryAuditQaReport(storyAudit);

		expect(report).toContain("【故事体检报告】");
		expect(report).toContain("覆盖章节：3/3");
		expect(report).toContain("证据校验率：80%");
		expect(report).toContain("妹妹的病历凭空消失");
		expect(report).toContain("ch-1 第 1 章：他攥着那张缴费单。");
		expect(report).toContain("可能作者刻意留白");
	});

	it("states clearly when there are no findings", () => {
		const report = buildStoryAuditQaReport({ ...storyAudit, findings: [] });

		expect(report).toContain("候选问题：暂无。");
	});
});

describe("QA_REPORT_MAX_LENGTH", () => {
	it("caps oversized reports with an honest truncation marker", () => {
		const longAudit: StoryAuditResult = {
			...storyAudit,
			findings: Array.from({ length: 60 }, (item, index) => ({
				...storyAudit.findings[0]!,
				id: `finding-${index}`,
				title: `${index}号超长标题`.repeat(40),
				claim: "一段很长的判断。".repeat(600),
			})),
		};
		const report = buildStoryAuditQaReport(longAudit);

		expect(report.length).toBeLessThanOrEqual(QA_REPORT_MAX_LENGTH);
		expect(report).toContain("已截断");
	});
});
