import { describe, expect, it } from "vitest";
import { DEFAULT_RUBRIC_METRICS } from "./metrics";

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
