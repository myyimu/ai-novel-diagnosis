import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MethodologyLibraryView } from "./methodology-library-view";
import type { ProjectMethodologyCard } from "@/stores/workspace-store";

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
		promptTemplate: "请补强章末代价。",
		firstSeenAt: "2026-06-24T00:00:00.000Z",
		lastSeenAt: "2026-06-24T01:00:00.000Z",
		sourceChapterTitle: "第一章 退婚",
		sourceIssueTitle: "章末钩子没有代价",
		occurrenceCount: 2,
	},
	{
		id: "method-2",
		projectCardId: "method-2",
		sourceIssueId: "issue-2",
		type: "prompt_rule",
		title: "Prompt 必须写清保留边界",
		triggerProblem: "AI 改稿另起炉灶",
		reusableRule: "每次改稿都要声明保留人物、事件和场景。",
		selfCheckQuestion: "Prompt 有没有写清不能改掉什么？",
		firstSeenAt: "2026-06-24T02:00:00.000Z",
		lastSeenAt: "2026-06-24T02:00:00.000Z",
		sourceChapterTitle: "第二章",
		occurrenceCount: 1,
	},
];

describe("MethodologyLibraryView", () => {
	it("renders an empty state before methodology cards exist", () => {
		const html = renderToStaticMarkup(
			<MethodologyLibraryView methodologyCards={[]} onOpenDiagnosis={vi.fn()} />,
		);

		expect(html).toContain("方法论库");
		expect(html).toContain("完成快速诊断后");
		expect(html).toContain("开始诊断");
	});

	it("renders sorted methodology cards and reusable prompt templates", () => {
		const html = renderToStaticMarkup(
			<MethodologyLibraryView
				methodologyCards={methodologyCards}
				onOpenDiagnosis={vi.fn()}
				onExportProject={vi.fn()}
			/>,
		);

		expect(html).toContain("方法论卡");
		expect(html).toContain("重复出现");
		expect(html).toContain("高频类型");
		expect(html).toContain("钩子必须绑定代价");
		expect(html).toContain("Prompt 必须写清保留边界");
		expect(html).toContain("章末悬念要绑定读者不继续阅读的损失。");
		expect(html).toContain("请补强章末代价。");
		expect(html).toContain("来源：第一章 退婚");
		expect(html).toContain("导出项目");
	});
});
