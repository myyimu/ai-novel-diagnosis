import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChapterCandidateCardList, type ChapterCandidateCard } from "./ChapterCandidateCardList";

const cards: ChapterCandidateCard[] = [
	{
		chapterId: "ch-1",
		order: 1,
		title: "第一章 苏醒",
		depth: "outline",
		completedAt: "2026-08-19T00:00:01.000Z",
		summary: "主角带着前世记忆醒来。",
		anchoredQuotes: [{ quote: "他攥着那张缴费单。", startOffset: 120, endOffset: 131 }],
		riskSignals: ["重生记忆无代价"],
		setupSignals: ["妹妹的病历来源不明"],
	},
	{
		chapterId: "ch-5",
		order: 5,
		title: "第五章 风起",
		depth: "deep",
		completedAt: "2026-08-19T00:00:09.000Z",
		summary: "主角拿到病历，与仇人第一次正面冲突。",
		anchoredQuotes: [{ quote: "仇人的车停在楼下。", startOffset: 400, endOffset: 409 }],
		riskSignals: [],
		setupSignals: ["仇人的救命药承诺"],
	},
];

describe("ChapterCandidateCardList", () => {
	it("renders anchored quotes and labels signals as unreviewed", () => {
		const html = renderToStaticMarkup(<ChapterCandidateCardList cards={cards} />);

		expect(html).toContain("章节初核（已完成 2 章，最近完成在前）");
		expect(html).toContain("第五章 风起");
		expect(html).toContain("深拆");
		expect(html).toContain("轻索引");
		expect(html).toContain("初核");
		expect(html).toContain("原文锚点：他攥着那张缴费单。");
		expect(html).toContain("摘要（未复核）：主角带着前世记忆醒来。");
		expect(html).toContain("风险信号（未复核）：重生记忆无代价");
		expect(html).toContain("伏笔（是否回收需全书判定）：仇人的救命药承诺");
		expect(html).toContain("未逐条锚定、未复核");
	});

	it("shows the most recently completed chapter first", () => {
		const html = renderToStaticMarkup(<ChapterCandidateCardList cards={cards} />);

		expect(html.indexOf("第五章 风起")).toBeLessThan(html.indexOf("第一章 苏醒"));
	});

	it("discloses truncation beyond the visible limit", () => {
		const manyCards: ChapterCandidateCard[] = Array.from({ length: 15 }, (item, index) => ({
			...cards[0]!,
			chapterId: `ch-${index + 1}`,
			order: index + 1,
			title: `第${index + 1}章`,
		}));
		const html = renderToStaticMarkup(<ChapterCandidateCardList cards={manyCards} />);

		expect(html).toContain("另有 3 章的初核卡已入记录");
		expect(html).toContain("完整复核结论以故事体检报告为准");
	});

	it("renders nothing without cards", () => {
		expect(renderToStaticMarkup(<ChapterCandidateCardList cards={[]} />)).toBe("");
	});
});
