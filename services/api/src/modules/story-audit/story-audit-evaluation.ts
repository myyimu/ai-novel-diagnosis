import type { StoryAuditFinding } from "@ai-novel-diagnosis/ai-core";
import { ErrorCode } from "../../core/constants/error-code";
import { BusinessException } from "../../core/exceptions";

export const STORY_AUDIT_EVALUATION_SUITE_SCHEMA_VERSION =
  "story-audit-evaluation-suite/v1";

const STORY_AUDIT_FINDING_CATEGORIES = [
  "timeline_conflict",
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
  "structure_signal",
] as const satisfies readonly StoryAuditFinding["category"][];

const STORY_AUDIT_FINDING_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const satisfies readonly StoryAuditFinding["severity"][];

const STORY_AUDIT_EVALUATION_LABELS = [
  "true_positive",
  "false_positive",
  "unknown",
] as const satisfies readonly StoryAuditFindingEvaluationLabel[];

const STORY_AUDIT_EVALUATION_DATASET_SOURCES = [
  "independent_editor_set",
  "engineering_fixture",
  "ad_hoc_review",
] as const satisfies readonly StoryAuditEvaluationDatasetSource[];

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

export interface StoryAuditEvaluationSuiteJson {
  schemaVersion: typeof STORY_AUDIT_EVALUATION_SUITE_SCHEMA_VERSION;
  datasetId: string;
  source: StoryAuditEvaluationDatasetSource;
  cases: StoryAuditFindingEvaluationCase[];
  minimumLabeledCasesPerBucket?: number;
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

/** Parse the JSON import format for SIA-012 editor-labeled precision sets. */
export function parseStoryAuditEvaluationSuiteJson(
  input: unknown,
): StoryAuditEvaluationSuite {
  const value = assertRecord(input, "evaluation suite");
  const schemaVersion = value.schemaVersion;

  if (schemaVersion !== STORY_AUDIT_EVALUATION_SUITE_SCHEMA_VERSION) {
    throw invalidEvaluationSuite(
      `Unsupported story-audit evaluation suite schemaVersion: ${String(
        schemaVersion,
      )}`,
    );
  }

  const datasetId = assertNonEmptyString(value.datasetId, "datasetId");
  const source = assertOneOf(
    value.source,
    STORY_AUDIT_EVALUATION_DATASET_SOURCES,
    "source",
  );
  const cases = assertArray(value.cases, "cases").map((item, index) =>
    parseEvaluationCase(item, index),
  );
  const minimumLabeledCasesPerBucket =
    value.minimumLabeledCasesPerBucket === undefined
      ? undefined
      : assertPositiveInteger(
          value.minimumLabeledCasesPerBucket,
          "minimumLabeledCasesPerBucket",
        );

  return {
    datasetId,
    source,
    cases,
    minimumLabeledCasesPerBucket,
  };
}

/** Parse a JSON string into the SIA-012 editor-labeled precision set contract. */
export function parseStoryAuditEvaluationSuiteJsonText(
  jsonText: string,
): StoryAuditEvaluationSuite {
  try {
    return parseStoryAuditEvaluationSuiteJson(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof BusinessException) {
      throw error;
    }

    throw invalidEvaluationSuite("Evaluation suite JSON text is invalid.");
  }
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

function parseEvaluationCase(
  input: unknown,
  index: number,
): StoryAuditFindingEvaluationCase {
  const value = assertRecord(input, `cases[${index}]`);
  const finding = assertRecord(value.finding, `cases[${index}].finding`);

  return {
    finding: {
      id: assertNonEmptyString(finding.id, `cases[${index}].finding.id`),
      category: assertOneOf(
        finding.category,
        STORY_AUDIT_FINDING_CATEGORIES,
        `cases[${index}].finding.category`,
      ),
      severity: assertOneOf(
        finding.severity,
        STORY_AUDIT_FINDING_SEVERITIES,
        `cases[${index}].finding.severity`,
      ),
    },
    label: assertOneOf(
      value.label,
      STORY_AUDIT_EVALUATION_LABELS,
      `cases[${index}].label`,
    ),
  };
}

function assertRecord(
  input: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidEvaluationSuite(`${fieldName} must be an object.`);
  }

  return input as Record<string, unknown>;
}

function assertArray(input: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(input)) {
    throw invalidEvaluationSuite(`${fieldName} must be an array.`);
  }

  return input;
}

function assertNonEmptyString(input: unknown, fieldName: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw invalidEvaluationSuite(`${fieldName} must be a non-empty string.`);
  }

  return input;
}

function assertPositiveInteger(input: unknown, fieldName: string): number {
  if (typeof input !== "number" || !Number.isInteger(input) || input < 1) {
    throw invalidEvaluationSuite(`${fieldName} must be a positive integer.`);
  }

  return input;
}

function assertOneOf<const T extends string>(
  input: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): T {
  if (typeof input !== "string" || !allowedValues.includes(input as T)) {
    throw invalidEvaluationSuite(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return input as T;
}

function invalidEvaluationSuite(message: string): BusinessException {
  return BusinessException.badRequest(ErrorCode.INVALID_PARAMS, message);
}
