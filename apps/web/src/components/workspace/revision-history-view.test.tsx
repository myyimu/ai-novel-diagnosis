import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RevisionHistoryView } from "./revision-history-view";
import type { RevisionSession } from "@/stores/workspace-store";

const sessions: RevisionSession[] = [
	{
		id: "revision-2",
		projectId: "project-a",
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
		nextPrompt: "请补强章末代价。",
		revisionNote: "这一版已经补了章末代价。",
		revisionNoteUpdatedAt: "2026-06-24T02:00:00.000Z",
		methodologyCardIds: ["method-1"],
	},
	{
		id: "revision-1",
		projectId: "project-a",
		createdAt: "2026-06-24T00:00:00.000Z",
		chapterTitle: "第一版",
		genre: "xuanhuan",
		inputKind: "human-draft",
		textHash: "hash-1",
		textLength: 100,
		quickScore: 5.6,
		gateDecision: "rebuild",
		mainProblem: "开头承诺不清楚",
		issueTitles: ["开头承诺不清楚"],
		issueCategories: ["opening"],
		methodologyCardIds: [],
	},
];

describe("RevisionHistoryView", () => {
	it("renders an empty state before revision sessions exist", () => {
		const html = renderToStaticMarkup(
			<RevisionHistoryView
				revisionSessions={[]}
				onOpenDiagnosis={vi.fn()}
				onSaveRevisionNote={vi.fn()}
			/>,
		);

		expect(html).toContain("复诊历史");
		expect(html).toContain("当前项目还没有复诊记录");
		expect(html).toContain("开始诊断");
	});

	it("renders latest session details and previous comparison", () => {
		const html = renderToStaticMarkup(
			<RevisionHistoryView
				revisionSessions={sessions}
				onOpenDiagnosis={vi.fn()}
				onSaveRevisionNote={vi.fn()}
				onExportProject={vi.fn()}
			/>,
		);

		expect(html).toContain("当前项目 2 次");
		expect(html).toContain("第二版");
		expect(html).toContain("6.8/10");
		expect(html).toContain("与上一版对比");
		expect(html).toContain("开头承诺不清楚");
		expect(html).toContain("章末钩子没有代价");
		expect(html).toContain("当时生成的下一轮 Prompt");
		expect(html).toContain("请补强章末代价。");
		expect(html).toContain("本版人工备注");
		expect(html).toContain("这一版已经补了章末代价。");
		expect(html).toContain("导出项目");
	});
});
