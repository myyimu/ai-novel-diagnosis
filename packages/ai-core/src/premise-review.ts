/** Schema version for the premise-review (立项审稿) result contract. */
export type PremiseReviewSchemaVersion = "premise-review.v1";

/**
 * Three-state editorial verdict on whether a premise is worth writing.
 * Deliberately refutable: "fixable" names the layer to fix, "not-worth-writing"
 * must come with cliché evidence — never a bare rejection.
 */
export type PremiseReviewVerdict = "solid" | "fixable" | "not-worth-writing";

/** The four audit layers of the story engine. */
export type PremiseLayerKey = "engine" | "desire" | "conflict" | "irreducibility";

/** Axis order of the four layers, used by prompts and UI alike. */
export const PREMISE_REVIEW_LAYERS: readonly PremiseLayerKey[] = [
  "engine",
  "desire",
  "conflict",
  "irreducibility",
];

/** Stable display metadata per layer so prompts and UI never drift apart. */
export const PREMISE_LAYER_META: Record<PremiseLayerKey, { label: string; question: string }> = {
  engine: { label: "故事发动机", question: "欲望与障碍持续对撞，能否自己产出情节" },
  desire: { label: "主角欲望", question: "主角想要什么，是否具体且强烈" },
  conflict: { label: "持续冲突", question: "谁在阻止，压力是否持续升级" },
  irreducibility: {
    label: "不可替代性",
    question: "换掉全部设定后故事是否仍然成立",
  },
};

/** Judgment for one audit layer. */
export interface PremiseLayerAssessment {
  layer: PremiseLayerKey;
  /** established = 成立；weak = 有条件成立需修补；missing = 缺失。 */
  status: "established" | "weak" | "missing";
  /** One-sentence restatement of what the premise currently provides at this layer. */
  statement: string;
  /** 0-1 reviewer confidence. */
  confidence: number;
  /** What is missing or broken when status is not "established". */
  comment?: string;
}

/**
 * Evidence quoted from the author's own premise text. `quote` must be a
 * contiguous substring of the submitted premise so the server can verify it
 * mechanically (quotes that cannot be found are rejected, mirroring the
 * story-audit unknown-anchor rule).
 */
export interface PremiseEvidenceQuote {
  quote: string;
  /** Why this fragment is evidence for the claim. */
  note?: string;
}

/** A cliché / overused-pattern finding against the premise. */
export interface PremiseClicheFinding {
  id: string;
  layer: PremiseLayerKey;
  severity: "high" | "medium" | "low";
  title: string;
  /** The assertion, e.g. "开篇金手指无代价，属于已泛滥的爽点". */
  claim: string;
  evidence: PremiseEvidenceQuote[];
  /** Which overused pattern this collides with. */
  patternReference?: string;
  /** How to break the pattern without adding new settings. */
  suggestion?: string;
  /** Same lifecycle as story-audit findings; author decisions land in P1. */
  status: "candidate" | "verified" | "needs_human" | "dismissed";
}

/** The three sanctioned upgrade orientations. */
export type PremiseUpgradeOrientation = "emotion" | "intrigue" | "war";

export const PREMISE_UPGRADE_ORIENTATION_LABELS: Record<PremiseUpgradeOrientation, string> = {
  emotion: "情感",
  intrigue: "权谋",
  war: "战争",
};

/**
 * One upgrade direction. Constraint: it may only change the core conflict —
 * never add new settings, powers or casts — and must state what survives from
 * the author's original draft.
 */
export interface PremiseUpgradeDirection {
  directionId: string;
  orientation: PremiseUpgradeOrientation;
  /** One-line pitch of the upgraded story. */
  pitch: string;
  /** The replacement core conflict. */
  changedConflict: string;
  /** What is preserved from the original premise. */
  preservedElements?: string[];
  /** What this direction costs (tone shift, cast pressure, …). */
  risk?: string;
}

/**
 * Premise-review result: the acquisitions-editor judgment produced before any
 * chapter is written. The engine-contract block restates the story in
 * refutable language (it becomes the engine card once the author confirms it);
 * the audit block carries the verdict, per-layer judgment, cliché evidence and
 * upgrade directions.
 */
export interface PremiseReviewResult {
  schemaVersion: PremiseReviewSchemaVersion;

  /* —— 发动机契约重建（作者确认后成为发动机卡） —— */
  /** Neutral one-paragraph restatement of what the premise actually promises. */
  premiseSummary: string;
  /** The core conflict in one sentence: desire vs opposing force. */
  coreConflict: string;
  protagonistDesire: string;
  opposingForce: string;
  /** The setting-swap test applied and its outcome. */
  irreducibilityTest: string;
  /** The question that keeps the reader turning pages. */
  readerHookQuestion: string;

  /* —— 审稿判定 —— */
  engineVerdict: PremiseReviewVerdict;
  /** One-line verdict in editor voice, honest but actionable. */
  oneLineVerdict: string;
  /** Exactly one assessment per PREMISE_REVIEW_LAYERS entry. */
  layers: PremiseLayerAssessment[];
  clicheFindings: PremiseClicheFinding[];
  upgradeDirections: PremiseUpgradeDirection[];

  /**
   * Optional second-pass verification summary, mirroring StoryAuditResult.
   * Absent when no verifier ran (e.g. mock providers).
   */
  verification?: {
    attemptedCount: number;
    skippedCount: number;
    rejectedCount: number;
    unavailableCount: number;
    verifiedCount: number;
  };
}
