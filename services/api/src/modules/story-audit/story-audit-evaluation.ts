import type { StoryAuditFinding } from "@ai-novel-diagnosis/ai-core";

export type StoryAuditFindingEvaluationLabel =
  | "true_positive"
  | "false_positive"
  | "unknown";

export type StoryAuditEvaluationDatasetSource =
  | "independent_editor_set"
  | "engineering_fixture"
  | "ad_hoc_review";

export type StoryAuditPrecisionBucketId =
  | "timeline_high_priority"
  | "character_or_plot_high_priority";

export interface StoryAuditFindingEvaluationCase {
  finding: Pick<StoryAuditFinding, "id" | "category" | "severity">;
  label: StoryAuditFindingEvaluationLabel;
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

export interface StoryAuditPrecisionBucketDefinition {
  id: StoryAuditPrecisionBucketId;
  title: string;
  categories: readonly StoryAuditFinding["category"][];
  severities: readonly StoryAuditFinding["severity"][];
  threshold: number;
}

export interface StoryAuditEvaluationSuite {
  datasetId: string;
  source: StoryAuditEvaluationDatasetSource;
  cases: StoryAuditFindingEvaluationCase[];
  minimumLabeledCasesPerBucket?: number;
}

export interface StoryAuditPrecisionBucketResult extends StoryAuditFindingEvaluationResult {
  bucketId: StoryAuditPrecisionBucketId;
  title: string;
  eligibleFindingCount: number;
}

export interface StoryAuditAcceptanceEvaluationReport {
  datasetId: string;
  source: StoryAuditEvaluationDatasetSource;
  sampleSize: number;
  minimumLabeledCasesPerBucket: number;
  eligibleForAcceptance: boolean;
  passesAcceptance: boolean;
  buckets: StoryAuditPrecisionBucketResult[];
  warnings: string[];
  note: string;
}

export const STORY_AUDIT_PRECISION_BUCKETS: readonly StoryAuditPrecisionBucketDefinition[] =
  [
    {
      id: "timeline_high_priority",
      title: "High-priority timeline conflicts",
      categories: ["timeline_conflict"],
      severities: ["critical", "high"],
      threshold: 0.85,
    },
    {
      id: "character_or_plot_high_priority",
      title: "High-priority character and plot-hole candidates",
      categories: [
        "location_conflict",
        "fact_contradiction",
        "knowledge_violation",
        "ability_violation",
        "motivation_gap",
        "relationship_jump",
        "world_rule_violation",
        "causal_gap",
        "dropped_goal",
        "unresolved_setup",
        "dialogue_attribution",
      ],
      severities: ["critical", "high"],
      threshold: 0.7,
    },
  ];

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

/** Build the SIA-012 precision gate report from an independently labeled set. */
export function evaluateStoryAuditAcceptance(
  suite: StoryAuditEvaluationSuite,
  options?: {
    buckets?: readonly StoryAuditPrecisionBucketDefinition[];
    minimumLabeledCasesPerBucket?: number;
  },
): StoryAuditAcceptanceEvaluationReport {
  const buckets = options?.buckets ?? STORY_AUDIT_PRECISION_BUCKETS;
  const minimumLabeledCasesPerBucket =
    options?.minimumLabeledCasesPerBucket ??
    suite.minimumLabeledCasesPerBucket ??
    1;
  const bucketResults = buckets.map((bucket) =>
    evaluateStoryAuditPrecisionBucket(suite.cases, bucket),
  );
  const insufficientBuckets = bucketResults.filter(
    (bucket) => bucket.labeledSize < minimumLabeledCasesPerBucket,
  );
  const usesIndependentEditorSet = suite.source === "independent_editor_set";
  const eligibleForAcceptance =
    usesIndependentEditorSet && insufficientBuckets.length === 0;
  const warnings = buildAcceptanceWarnings(
    suite.source,
    insufficientBuckets,
    minimumLabeledCasesPerBucket,
  );

  return {
    datasetId: suite.datasetId,
    source: suite.source,
    sampleSize: suite.cases.length,
    minimumLabeledCasesPerBucket,
    eligibleForAcceptance,
    passesAcceptance:
      eligibleForAcceptance &&
      bucketResults.every((bucket) => bucket.passesThreshold),
    buckets: bucketResults,
    warnings,
    note: "SIA-012 acceptance can only be claimed from an independent editor-labeled set; engineering fixtures keep this report mechanically testable without proving product validity.",
  };
}

function evaluateStoryAuditPrecisionBucket(
  cases: StoryAuditFindingEvaluationCase[],
  bucket: StoryAuditPrecisionBucketDefinition,
): StoryAuditPrecisionBucketResult {
  const eligibleCases = cases.filter((item) =>
    isFindingInPrecisionBucket(item.finding, bucket),
  );
  const result = evaluateStoryAuditFindingPrecision(eligibleCases, {
    threshold: bucket.threshold,
  });

  return {
    ...result,
    bucketId: bucket.id,
    title: bucket.title,
    eligibleFindingCount: eligibleCases.length,
  };
}

function isFindingInPrecisionBucket(
  finding: StoryAuditFindingEvaluationCase["finding"],
  bucket: StoryAuditPrecisionBucketDefinition,
): boolean {
  return (
    bucket.categories.includes(finding.category) &&
    bucket.severities.includes(finding.severity)
  );
}

function buildAcceptanceWarnings(
  source: StoryAuditEvaluationDatasetSource,
  insufficientBuckets: StoryAuditPrecisionBucketResult[],
  minimumLabeledCasesPerBucket: number,
): string[] {
  const warnings: string[] = [];

  if (source !== "independent_editor_set") {
    warnings.push(
      "Dataset is not an independent editor-labeled set, so precision gates cannot be claimed for product acceptance.",
    );
  }

  if (insufficientBuckets.length > 0) {
    warnings.push(
      `Precision report has buckets below the minimum labeled-case count (${minimumLabeledCasesPerBucket}): ${insufficientBuckets
        .map((bucket) => bucket.bucketId)
        .join(", ")}.`,
    );
  }

  return warnings;
}
