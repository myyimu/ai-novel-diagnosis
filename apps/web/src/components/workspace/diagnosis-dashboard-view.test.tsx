import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DiagnosisDashboardView } from "./diagnosis-dashboard-view";
import type { ProjectMethodologyCard, RevisionSession } from "@/stores/workspace-store";

const sessions: RevisionSession[] = [
	{
		id: "revision-2",
		createdAt: "2026-06-24T01:00:00.000Z",
		chapterTitle: "第二版",
		genre: "xuanhuan",
		inputKind: "ai-draft",
		textHash: "hash-2",
		textLength: 120,
		quickScore: 6.8,
		gateDecision: "revise",
		mainProblem: "章末钩子没有代价",
		issueTitles: ["章末钩子没有代价"],
		issueCategories: ["hook"],
		methodologyCardIds: ["method-1"],
	},
	{
		id: "revision-1",
		createdAt: "2026-06-24T00:00:00.000Z",
		chapterTitle: "第一版",
		genre: "xuanhuan",
		inputKind: "ai-draft",
		textHash: "hash-1",
		textLength: 100,
		quickScore: 5.6,
		gateDecision: "rebuild",
		mainProblem: "章末钩子没有代价",
		issueTitles: ["章末钩子没有代价"],
		issueCategories: ["hook"],
		nextPrompt: "请补强章末代价。",
		methodologyCardIds: ["method-1"],
	},
];

const methodologyCards: ProjectMethodologyCard[] = [
	{
		id: "method-1",
		projectCardId: "method-1",
		sourceIssueId: "issue-1",
		type: "hook_rule",
		title: "钩子必须绑定代价",
		triggerProblem: "章末钩子没有代价",
		reusableRule: "章末悬念要绑定读者不继续阅读的损失。",
		selfCheckQuestion: "读者知道不点下一章会错过什么吗？",
		firstSeenAt: "2026-06-24T00:00:00.000Z",
		lastSeenAt: "2026-06-24T01:00:00.000Z",
		sourceChapterTitle: "第一章 退婚",
		occurrenceCount: 2,
	},
];

describe("DiagnosisDashboardView", () => {
	it("renders an empty state before the first diagnosis", () => {
		const html = renderToStaticMarkup(
			<DiagnosisDashboardView
				revisionSessions={[]}
				methodologyCards={[]}
				onOpenDiagnosis={vi.fn()}
			/>,
		);

		expect(html).toContain("诊断看板");
		expect(html).toContain("先完成一次快速诊断");
		expect(html).toContain("开始诊断");
	});

	it("renders dashboard metrics from sessions and methodology cards", () => {
		const html = renderToStaticMarkup(
			<DiagnosisDashboardView
				revisionSessions={sessions}
				methodologyCards={methodologyCards}
				onOpenDiagnosis={vi.fn()}
			/>,
		);

		expect(html).toContain("复诊次数");
		expect(html).toContain("最近分数变化");
		expect(html).toContain("编辑建议");
		expect(html).toContain("按建议复诊");
		expect(html).toContain("优先处理：章末钩子没有代价");
		expect(html).toContain("Prompt 有效率");
		expect(html).toContain("Prompt 有效");
		expect(html).toContain("置信");
		expect(html).toContain("诊断理由");
		expect(html).toContain("归因校准");
		expect(html).toContain("样本不足");
		expect(html).toContain("模型/编辑复核提示");
		expect(html).toContain("复制复核提示");
		expect(html).toContain("下一步");
		expect(html).toContain("质量趋势");
		expect(html).toContain("Gate 分布");
		expect(html).toContain("常见问题");
		expect(html).toContain("问题类型");
		expect(html).toContain("钩子必须绑定代价");
	});

	it("renders unavailable scores as insufficient instead of zero", () => {
		const html = renderToStaticMarkup(
			<DiagnosisDashboardView
				revisionSessions={[
					{
						...sessions[0]!,
						id: "revision-insufficient",
						quickScore: null,
						gateDecision: "insufficient",
					},
					sessions[1]!,
				]}
				methodologyCards={[]}
				onOpenDiagnosis={vi.fn()}
			/>,
		);

		expect(html).toContain("信息不足，暂不评分");
		expect(html).toContain("暂无对比");
		expect(html).not.toContain("0/10");
	});
});
