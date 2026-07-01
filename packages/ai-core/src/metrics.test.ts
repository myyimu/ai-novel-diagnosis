import { describe, expect, it } from "vitest";
import { DEFAULT_RUBRIC_METRICS } from "./metrics";
import { STORY_CRAFT_HEURISTICS, STORY_CRAFT_RUBRIC_DIMENSIONS } from "./story-craft";

describe("DEFAULT_RUBRIC_METRICS", () => {
  it("contains the first hard metrics for web-novel critique", () => {
    expect(DEFAULT_RUBRIC_METRICS.map((metric) => metric.id)).toEqual([
      "chapter-goal",
      "conflict-pressure",
      "emotion-debt",
      "hook",
      "minimum-plot-loop",
      "emotion-engine",
      "dialogue-control",
      "continuity-ledger",
    ]);
  });

  it("keeps absorbed story-craft dimensions available for prompts", () => {
    expect(STORY_CRAFT_RUBRIC_DIMENSIONS.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "payoff-loop",
        "hook-recovery",
        "prose-naturalness",
        "short-form-density",
        "long-form-learning-asset",
      ]),
    );
    expect(STORY_CRAFT_HEURISTICS.map((item) => item.id)).toContain(
      "separate-learnable-from-protected",
    );
  });
});
