import { evaluateStoryAuditFindingPrecision } from "./story-audit-evaluation";

describe("evaluateStoryAuditFindingPrecision", () => {
  it("should calculate precision only from human-labeled cases", () => {
    const result = evaluateStoryAuditFindingPrecision(
      [
        {
          finding: {
            id: "finding-1",
            category: "unresolved_setup",
            severity: "medium",
          },
          label: "true_positive",
        },
        {
          finding: {
            id: "finding-2",
            category: "causal_gap",
            severity: "medium",
          },
          label: "false_positive",
        },
        {
          finding: {
            id: "finding-3",
            category: "dropped_goal",
            severity: "low",
          },
          label: "unknown",
        },
      ],
      { threshold: 0.7 },
    );

    expect(result).toEqual({
      sampleSize: 3,
      labeledSize: 2,
      truePositiveCount: 1,
      falsePositiveCount: 1,
      precision: 0.5,
      recall: null,
      threshold: 0.7,
      passesThreshold: false,
      note: expect.stringContaining("human-labeled audit set"),
    });
  });

  it("should not claim validity when no labeled cases exist", () => {
    const result = evaluateStoryAuditFindingPrecision([
      {
        finding: {
          id: "finding-1",
          category: "unresolved_setup",
          severity: "medium",
        },
        label: "unknown",
      },
    ]);

    expect(result.precision).toBeNull();
    expect(result.passesThreshold).toBe(false);
  });
});
