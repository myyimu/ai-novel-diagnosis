import { describe, expect, it } from "vitest";
import { createPreviewReport, DEFAULT_RUBRIC_METRICS } from "./index";

describe("DEFAULT_RUBRIC_METRICS", () => {
  it("contains the first hard metrics for web-novel critique", () => {
    expect(DEFAULT_RUBRIC_METRICS.map((metric) => metric.id)).toEqual([
      "chapter-goal",
      "conflict-pressure",
      "emotion-debt",
      "hook",
    ]);
  });
});

describe("createPreviewReport", () => {
  it("returns a score for every default metric", () => {
    const report = createPreviewReport({
      title: "第一章",
      text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
      rubricId: "default",
    });

    expect(report.scores).toHaveLength(DEFAULT_RUBRIC_METRICS.length);
    expect(report.totalScore).toBeGreaterThan(0);
  });
});
