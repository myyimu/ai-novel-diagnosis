import {
  CHAPTER_CANDIDATE_CARD_LIMIT,
  buildChapterCandidateCard,
  mergeChapterCandidateCards,
  type ChapterCandidateCard,
} from "./chapter-candidate-cards";

const anchoredMap = {
  chapterId: "ch-5",
  order: 5,
  title: "第五章 风起",
  analysisDepth: "deep",
  summary: "主角拿到病历，与仇人第一次正面冲突。",
  sourceAnchors: [
    {
      anchorId: "ch-5-anchor-1",
      label: "关键证据",
      quote: "他攥着那张缴费单。",
      startOffset: 120,
      endOffset: 131,
    },
    {
      anchorId: "ch-5-anchor-2",
      label: "冲突起点",
      quote: "仇人的车停在楼下。",
      startOffset: 400,
      endOffset: 409,
    },
    {
      anchorId: "ch-5-anchor-3",
      label: "多余摘录",
      quote: "夜里没有风。",
      startOffset: 700,
      endOffset: 705,
    },
  ],
  sourceRiskSignals: [
    "重生记忆无代价",
    "复仇桥段与常见都市文高度重合",
    "第三条不应出现",
  ],
  foreshadowingSetups: ["妹妹的病历来源不明", "仇人的救命药承诺", "第三条伏笔不应出现"],
};

describe("buildChapterCandidateCard", () => {
  it("builds a card with anchored quotes and capped signals", () => {
    const card = buildChapterCandidateCard(anchoredMap, "2026-08-19T00:00:00.000Z");

    expect(card).toEqual({
      chapterId: "ch-5",
      order: 5,
      title: "第五章 风起",
      depth: "deep",
      completedAt: "2026-08-19T00:00:00.000Z",
      summary: "主角拿到病历，与仇人第一次正面冲突。",
      anchoredQuotes: [
        { quote: "他攥着那张缴费单。", startOffset: 120, endOffset: 131 },
        { quote: "仇人的车停在楼下。", startOffset: 400, endOffset: 409 },
      ],
      riskSignals: ["重生记忆无代价", "复仇桥段与常见都市文高度重合"],
      setupSignals: ["妹妹的病历来源不明", "仇人的救命药承诺"],
    });
  });

  it("returns null when the chapter map has no anchored quotes (red line)", () => {
    expect(
      buildChapterCandidateCard(
        { ...anchoredMap, sourceAnchors: [] },
        "2026-08-19T00:00:00.000Z",
      ),
    ).toBeNull();
    expect(
      buildChapterCandidateCard(
        {
          ...anchoredMap,
          sourceAnchors: [{ quote: "  ", startOffset: 0, endOffset: 0 }],
        },
        "2026-08-19T00:00:00.000Z",
      ),
    ).toBeNull();
    expect(buildChapterCandidateCard(null, "2026-08-19T00:00:00.000Z")).toBeNull();
  });

  it("falls back to plain labels when identity fields are missing", () => {
    const card = buildChapterCandidateCard(
      {
        analysisDepth: "outline",
        sourceAnchors: [{ quote: "他攥着那张缴费单。", startOffset: 0, endOffset: 10 }],
      },
      "2026-08-19T00:00:00.000Z",
    );

    expect(card?.chapterId).toBe("ch-0");
    expect(card?.title).toBe("第 0 章");
    expect(card?.depth).toBe("outline");
    expect(card?.summary).toBeUndefined();
  });
});

describe("mergeChapterCandidateCards", () => {
  const cardAt = (order: number): ChapterCandidateCard => ({
    chapterId: `ch-${order}`,
    order,
    title: `第 ${order} 章`,
    depth: "outline",
    completedAt: `2026-08-19T00:00:0${order % 10}.000Z`,
    anchoredQuotes: [{ quote: `摘录${order}`, startOffset: 0, endOffset: 4 }],
    riskSignals: [],
    setupSignals: [],
  });

  it("keeps existing cards untouched when incoming is null", () => {
    const existing = [cardAt(1), cardAt(2)];

    expect(mergeChapterCandidateCards(existing, null)).toBe(existing);
  });

  it("replaces the outline card when the same chapter finishes deep analysis", () => {
    const deepCard: ChapterCandidateCard = {
      ...cardAt(2),
      depth: "deep",
      completedAt: "2026-08-19T00:00:09.000Z",
    };

    const merged = mergeChapterCandidateCards([cardAt(1), cardAt(2)], deepCard);

    expect(merged).toHaveLength(2);
    expect(merged[1]).toBe(deepCard);
    expect(merged.filter((card) => card.chapterId === "ch-2")).toHaveLength(1);
  });

  it("trims to the most recently completed cards at the limit", () => {
    const cards = Array.from(
      { length: CHAPTER_CANDIDATE_CARD_LIMIT + 5 },
      (item, index) => cardAt(index + 1),
    );

    const merged = mergeChapterCandidateCards(cards.slice(0, -1), cards[cards.length - 1]!);

    expect(merged).toHaveLength(CHAPTER_CANDIDATE_CARD_LIMIT);
    expect(merged[0]?.order).toBe(6);
    expect(merged[merged.length - 1]?.order).toBe(CHAPTER_CANDIDATE_CARD_LIMIT + 5);
  });
});
