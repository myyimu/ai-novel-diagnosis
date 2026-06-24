import { describe, expect, it } from "vitest";
import { createPreviewReport, type PreviewStrategy } from "./preview";
import { DEFAULT_RUBRIC_METRICS } from "./metrics";

const chapterInput = {
  title: "第一章",
  text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。下一刻，对方突然宣布退场即死！",
  rubricId: "default",
};

describe("createPreviewReport", () => {
  it("returns a score for every default metric", () => {
    const report = createPreviewReport(chapterInput);

    expect(report.scores).toHaveLength(DEFAULT_RUBRIC_METRICS.length);
    expect(report.totalScore).toBeGreaterThan(0);
  });

  it("uses an injected preview strategy", () => {
    const strategy: PreviewStrategy = {
      id: "test-strategy",
      createReport(input, context) {
        return {
          totalScore: 9,
          strongestPoint: input.title,
          weakestPoint: context.metrics[0].id,
          nextRevisionMove: "keep going",
          scores: [],
        };
      },
    };

    expect(createPreviewReport(chapterInput, { strategy })).toMatchObject({
      totalScore: 9,
      strongestPoint: "第一章",
      weakestPoint: "chapter-goal",
    });
  });

  it("rejects empty chapter text before scoring", () => {
    expect(() =>
      createPreviewReport({
        title: "第一章",
        text: "   ",
        rubricId: "default",
      }),
    ).toThrow("text: must not be empty");
  });
});
