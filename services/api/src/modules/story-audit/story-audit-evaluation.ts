import type { StoryAuditFinding } from "@ai-novel-diagnosis/ai-core";

export interface StoryAuditFindingEvaluationCase {
  finding: Pick<StoryAuditFinding, "id" | "category" | "severity">;
  label: "true_positive" | "false_positive" | "unknown";
}

export interface StoryAuditFindingEvaluationResult {
  sampleSize: number;
  labeledSize: number;
  truePositiveCount: number;
  falsePositiveCount: number;
  precision: number | null;
  recall: null;
  threshold: number;
  passesThreshold: boolean;
  note: string;
}

/** Evaluate candidate precision against a human-labeled sample.
 *
 * @example
 * const result = evaluateStoryAuditFindingPrecision(cases, { threshold: 0.7 });
 */
export function evaluateStoryAuditFindingPrecision(
  cases: StoryAuditFindingEvaluationCase[],
  options?: { threshold?: number },
): StoryAuditFindingEvaluationResult {
  const threshold = options?.threshold ?? 0.7;
  const labeledCases = cases.filter((item) => item.label !== "unknown");
  const truePositiveCount = labeledCases.filter(
    (item) => item.label === "true_positive",
  ).length;
  const falsePositiveCount = labeledCases.filter(
    (item) => item.label === "false_positive",
  ).length;
  const precision = labeledCases.length
    ? Number((truePositiveCount / labeledCases.length).toFixed(4))
    : null;

  return {
    sampleSize: cases.length,
    labeledSize: labeledCases.length,
    truePositiveCount,
    falsePositiveCount,
    precision,
    recall: null,
    threshold,
    passesThreshold: precision !== null && precision >= threshold,
    note: "Engineering fixtures only validate calculation mechanics; product validity requires a separate human-labeled audit set.",
  };
}
