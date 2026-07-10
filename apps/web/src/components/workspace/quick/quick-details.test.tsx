import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MethodologyCardDetail } from "./MethodologyCardDetail";
import { QuickEvidenceDetail } from "./QuickEvidenceDetail";
import { QuickHistoryDetail } from "./QuickHistoryDetail";

describe("quick detail panels", () => {
	it("renders evidence detail content", () => {
		const html = renderToStaticMarkup(
			<QuickEvidenceDetail
				issue={{
					title: "章末钩子偏弱",
					description: "结尾没有形成明确代价。",
					severity: "high",
					category: "结构",
					readerImpact: "读者不会继续点下一章。",
					fixAction: "补一个更直接的代价。",
					evidence: [{ quote: "主角沉默离开", locationHint: "结尾", confidence: 0.92 }],
				}}
				quickScore={7.8}
				mainProblem="章末钩子没有代价。"
			/>,
		);

		expect(html).toContain("证据详情：章末钩子偏弱");
		expect(html).toContain("章末钩子没有代价。");
		expect(html).toContain("结尾：主角沉默离开");
		expect(html).toContain("置信度 92%");
	});

	it("renders history detail content", () => {
		const html = renderToStaticMarkup(
			<QuickHistoryDetail
				session={{
					id: "session-1",
					createdAt: "2026-07-10T00:00:00.000Z",
					chapterTitle: "第一章",
					genre: "xuanhuan",
					inputKind: "human-draft",
					textHash: "abc",
					textLength: 1234,
					quickScore: 8.2,
					gateDecision: "revise",
					mainProblem: "信息密度过低",
					issueTitles: ["信息密度过低"],
					methodologyCardIds: ["card-1"],
					nextPrompt: "请增加冲突。",
				}}
			/>,
		);

		expect(html).toContain("历史详情：第一章");
		expect(html).toContain("8.2/10");
		expect(html).toContain("修改");
		expect(html).toContain("请增加冲突。");
	});

	it("renders methodology card detail content", () => {
		const html = renderToStaticMarkup(
			<MethodologyCardDetail
				card={{
					projectCardId: "card-1",
					id: "method-1",
					sourceIssueId: "issue-1",
					type: "hook_rule",
					title: "章末要有代价",
					triggerProblem: "章末钩子偏弱",
					reusableRule: "结尾必须留下下一章的付费/追读理由。",
					selfCheckQuestion: "这一章的代价够明确吗？",
					sourceChapterTitle: "第一章",
					firstSeenAt: "2026-07-10T00:00:00.000Z",
					lastSeenAt: "2026-07-10T00:00:00.000Z",
					occurrenceCount: 3,
				}}
			/>,
		);

		expect(html).toContain("方法论卡：章末要有代价");
		expect(html).toContain("3 次");
		expect(html).toContain("这一章的代价够明确吗？");
	});
});
