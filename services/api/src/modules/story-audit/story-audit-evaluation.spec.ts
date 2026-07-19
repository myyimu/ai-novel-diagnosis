import type {
  StoryAuditAcceptanceEvaluationReport,
  StoryAuditPrecisionBucketId,
} from "./story-audit-evaluation";
import {
  evaluateStoryAuditAcceptance,
  evaluateStoryAuditFindingPrecision,
  parseStoryAuditEvaluationSuiteJson,
  parseStoryAuditEvaluationSuiteJsonText,
} from "./story-audit-evaluation";

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

describe("evaluateStoryAuditAcceptance", () => {
  it("should evaluate SIA-012 high-priority precision buckets from an independent editor set", () => {
    const result = evaluateStoryAuditAcceptance({
      datasetId: "editor-set-2026-07",
      source: "independent_editor_set",
      cases: [
        ...repeatCases(6, {
          category: "timeline_conflict",
          severity: "high",
          label: "true_positive",
        }),
        {
          finding: {
            id: "timeline-false-positive",
            category: "timeline_conflict",
            severity: "critical",
          },
          label: "false_positive",
        },
        {
          finding: {
            id: "timeline-medium-is-not-high-priority",
            category: "timeline_conflict",
            severity: "medium",
          },
          label: "false_positive",
        },
        ...repeatCases(7, {
          category: "causal_gap",
          severity: "high",
          label: "true_positive",
        }),
        ...repeatCases(3, {
          category: "motivation_gap",
          severity: "critical",
          label: "false_positive",
        }),
        {
          finding: {
            id: "structure-is-not-character-or-plot",
            category: "structure_signal",
            severity: "high",
          },
          label: "false_positive",
        },
      ],
      minimumLabeledCasesPerBucket: 1,
    });

    const timeline = requireBucket(result, "timeline_high_priority");
    const characterOrPlot = requireBucket(
      result,
      "character_or_plot_high_priority",
    );

    expect(result.eligibleForAcceptance).toBe(true);
    expect(result.passesAcceptance).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(timeline).toMatchObject({
      eligibleFindingCount: 7,
      precision: 0.8571,
      threshold: 0.85,
      passesThreshold: true,
    });
    expect(characterOrPlot).toMatchObject({
      eligibleFindingCount: 10,
      precision: 0.7,
      threshold: 0.7,
      passesThreshold: true,
    });
  });

  it("should keep engineering fixtures out of product acceptance claims", () => {
    const result = evaluateStoryAuditAcceptance({
      datasetId: "engineering-fixture",
      source: "engineering_fixture",
      cases: [
        {
          finding: {
            id: "timeline-true-positive",
            category: "timeline_conflict",
            severity: "high",
          },
          label: "true_positive",
        },
        {
          finding: {
            id: "plot-true-positive",
            category: "causal_gap",
            severity: "high",
          },
          label: "true_positive",
        },
      ],
    });

    expect(result.eligibleForAcceptance).toBe(false);
    expect(result.passesAcceptance).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.stringContaining("not an independent editor-labeled set"),
    );
  });

  it("should not claim acceptance when a required bucket has too few labeled cases", () => {
    const result = evaluateStoryAuditAcceptance({
      datasetId: "editor-set-incomplete",
      source: "independent_editor_set",
      cases: [
        {
          finding: {
            id: "timeline-true-positive",
            category: "timeline_conflict",
            severity: "high",
          },
          label: "true_positive",
        },
        {
          finding: {
            id: "plot-unlabeled",
            category: "causal_gap",
            severity: "high",
          },
          label: "unknown",
        },
      ],
      minimumLabeledCasesPerBucket: 1,
    });

    const characterOrPlot = requireBucket(
      result,
      "character_or_plot_high_priority",
    );

    expect(characterOrPlot.labeledSize).toBe(0);
    expect(result.eligibleForAcceptance).toBe(false);
    expect(result.passesAcceptance).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.stringContaining("character_or_plot_high_priority"),
    );
  });
});

describe("parseStoryAuditEvaluationSuiteJson", () => {
  it("should parse an independent editor JSON suite for the SIA-012 report", () => {
    const suite = parseStoryAuditEvaluationSuiteJsonText(
      JSON.stringify({
        schemaVersion: "story-audit-evaluation-suite/v1",
        datasetId: "editor-set-2026-07",
        source: "independent_editor_set",
        minimumLabeledCasesPerBucket: 1,
        cases: [
          {
            finding: {
              id: "timeline-1",
              category: "timeline_conflict",
              severity: "high",
            },
            label: "true_positive",
          },
          {
            finding: {
              id: "plot-1",
              category: "causal_gap",
              severity: "critical",
            },
            label: "false_positive",
          },
        ],
      }),
    );

    const report = evaluateStoryAuditAcceptance(suite);

    expect(suite).toEqual({
      datasetId: "editor-set-2026-07",
      source: "independent_editor_set",
      minimumLabeledCasesPerBucket: 1,
      cases: [
        {
          finding: {
            id: "timeline-1",
            category: "timeline_conflict",
            severity: "high",
          },
          label: "true_positive",
        },
        {
          finding: {
            id: "plot-1",
            category: "causal_gap",
            severity: "critical",
          },
          label: "false_positive",
        },
      ],
    });
    expect(report.sampleSize).toBe(2);
    expect(report.eligibleForAcceptance).toBe(true);
  });

  it("should reject suites without the v1 schema marker", () => {
    expect(() =>
      parseStoryAuditEvaluationSuiteJson({
        schemaVersion: "story-audit-evaluation-suite/v0",
        datasetId: "editor-set-2026-07",
        source: "independent_editor_set",
        cases: [],
      }),
    ).toThrow("Unsupported story-audit evaluation suite schemaVersion");
  });

  it("should reject malformed JSON text with a contract error", () => {
    expect(() => parseStoryAuditEvaluationSuiteJsonText("{")).toThrow(
      "Evaluation suite JSON text is invalid.",
    );
  });

  it("should reject unknown labels and finding dimensions at import time", () => {
    expect(() =>
      parseStoryAuditEvaluationSuiteJson({
        schemaVersion: "story-audit-evaluation-suite/v1",
        datasetId: "editor-set-2026-07",
        source: "independent_editor_set",
        cases: [
          {
            finding: {
              id: "timeline-1",
              category: "timeline_conflict",
              severity: "urgent",
            },
            label: "true_positive",
          },
        ],
      }),
    ).toThrow("cases[0].finding.severity");

    expect(() =>
      parseStoryAuditEvaluationSuiteJson({
        schemaVersion: "story-audit-evaluation-suite/v1",
        datasetId: "editor-set-2026-07",
        source: "independent_editor_set",
        cases: [
          {
            finding: {
              id: "timeline-1",
              category: "voice_style",
              severity: "high",
            },
            label: "true_positive",
          },
        ],
      }),
    ).toThrow("cases[0].finding.category");

    expect(() =>
      parseStoryAuditEvaluationSuiteJson({
        schemaVersion: "story-audit-evaluation-suite/v1",
        datasetId: "editor-set-2026-07",
        source: "independent_editor_set",
        cases: [
          {
            finding: {
              id: "timeline-1",
              category: "timeline_conflict",
              severity: "high",
            },
            label: "maybe",
          },
        ],
      }),
    ).toThrow("cases[0].label");
  });
});

function requireBucket(
  report: StoryAuditAcceptanceEvaluationReport,
  bucketId: StoryAuditPrecisionBucketId,
) {
  const bucket = report.buckets.find((item) => item.bucketId === bucketId);

  if (!bucket) {
    throw new Error(`Missing precision bucket: ${bucketId}`);
  }

  return bucket;
}

function repeatCases(
  count: number,
  input: {
    category: Parameters<
      typeof evaluateStoryAuditFindingPrecision
    >[0][number]["finding"]["category"];
    severity: Parameters<
      typeof evaluateStoryAuditFindingPrecision
    >[0][number]["finding"]["severity"];
    label: Parameters<
      typeof evaluateStoryAuditFindingPrecision
    >[0][number]["label"];
  },
) {
  return Array.from({ length: count }, (_, index) => ({
    finding: {
      id: `${input.category}-${input.severity}-${input.label}-${index}`,
      category: input.category,
      severity: input.severity,
    },
    label: input.label,
  }));
}
