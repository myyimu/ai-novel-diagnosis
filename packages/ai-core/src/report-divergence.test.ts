import { describe, expect, it } from "vitest";

import {
  anchorReportDivergencePoints,
  buildReportDivergencePrompt,
  parseReportDivergenceOutput,
} from "./report-divergence";

const QUICK_REPORT = `【章节初诊报告】
章节：第三章 对峙
急诊分：7/10
主要问题：对话推进有效，节奏紧凑，没有明显拖沓。`;

const AUDIT_REPORT = `【故事体检报告】
候选问题（共 1 条）：
1. 第三章节奏拖沓（类别 pacing，严重度高）
   证据：chapter-3 第 3 章：连续四段没有推进新信息`;

function point(
  overrides: Partial<Parameters<typeof anchorReportDivergencePoints>[0][number]> = {},
) {
  return {
    id: "divergence-1",
    topic: "节奏",
    quickReviewQuote: "节奏紧凑，没有明显拖沓",
    storyAuditQuote: "第三章节奏拖沓",
    explanation: "快诊认为本章节奏紧凑，体检认为本章节奏拖沓。",
    questionForAuthor: "这章连续四段没有新信息，你自己读起来拖吗？",
    ...overrides,
  };
}

describe("anchorReportDivergencePoints", () => {
  it("keeps a point whose quotes land in both reports and whose question ends with a mark", () => {
    const anchored = anchorReportDivergencePoints([point()], QUICK_REPORT, AUDIT_REPORT);

    expect(anchored.divergences).toHaveLength(1);
    expect(anchored.droppedPointCount).toBe(0);
  });

  it("drops points whose quote misses either report or whose question is not a question", () => {
    const anchored = anchorReportDivergencePoints(
      [
        point({ id: "d-miss-quick", quickReviewQuote: "这句不在快诊报告里" }),
        point({ id: "d-miss-audit", storyAuditQuote: "这句不在体检报告里" }),
        point({ id: "d-empty-quote", quickReviewQuote: "" }),
        point({ id: "d-not-question", questionForAuthor: "请你自行判断。" }),
      ],
      QUICK_REPORT,
      AUDIT_REPORT,
    );

    expect(anchored.divergences).toHaveLength(0);
    expect(anchored.droppedPointCount).toBe(4);
  });
});

describe("parseReportDivergenceOutput", () => {
  it("narrows a valid payload and fills missing ids positionally", () => {
    const parsed = parseReportDivergenceOutput({
      divergences: [
        {
          topic: "节奏",
          quickReviewQuote: "节奏紧凑",
          storyAuditQuote: "节奏拖沓",
          explanation: "互斥结论。",
          questionForAuthor: "拖吗？",
        },
      ],
      agreementNote: "",
    });

    expect(parsed).toEqual({
      divergences: [
        {
          id: "divergence-1",
          topic: "节奏",
          quickReviewQuote: "节奏紧凑",
          storyAuditQuote: "节奏拖沓",
          explanation: "互斥结论。",
          questionForAuthor: "拖吗？",
        },
      ],
      agreementNote: "",
    });
  });

  it("skips malformed points but keeps the parseable ones", () => {
    const parsed = parseReportDivergenceOutput({
      divergences: ["不是对象", { topic: "缺字段" }],
      agreementNote: "说明",
    });

    expect(parsed!.divergences).toEqual([]);
    expect(parsed!.agreementNote).toBe("说明");
  });

  it("returns null when divergences is missing or not an array", () => {
    expect(parseReportDivergenceOutput({ agreementNote: "x" })).toBeNull();
    expect(parseReportDivergenceOutput({ divergences: "no" })).toBeNull();
    expect(parseReportDivergenceOutput(null)).toBeNull();
  });

  it("treats a missing agreementNote as the empty string", () => {
    const parsed = parseReportDivergenceOutput({ divergences: [] });
    expect(parsed).toEqual({ divergences: [], agreementNote: "" });
  });
});

describe("buildReportDivergencePrompt", () => {
  it("scopes to the chapter, carries both reports, and states the contradiction-only rule", () => {
    const bundle = buildReportDivergencePrompt({
      chapterTitle: "第三章 对峙",
      quickReviewReport: QUICK_REPORT,
      storyAuditReport: AUDIT_REPORT,
    });

    expect(bundle.id).toBe("report-divergence.v1");
    expect(bundle.messages[0]!.content).toContain("找出两份报告");
    expect(bundle.messages[0]!.content).toContain("不裁决谁对");
    const user = bundle.messages[1]!.content;
    expect(user).toContain("《第三章 对峙》");
    expect(user).toContain("节奏紧凑，没有明显拖沓");
    expect(user).toContain("第三章节奏拖沓");
    expect(user).toContain("缺位不算矛盾");
    expect(user).toContain("把裁决交回作者");
  });
});
