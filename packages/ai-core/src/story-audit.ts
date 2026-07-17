/**
 * Public contracts for the story audit (故事体检) feature.
 *
 * These types describe an immutable, evidence-backed layer derived from the
 * existing whole-book Map-Reduce pipeline. They deliberately separate three
 * kinds of signal:
 *
 * 1. Deterministic statistics (e.g. dialogue ratio) — computed by pure code.
 * 2. Conflict candidates (e.g. timeline loops) — discovered by rules.
 * 3. Editorial judgement — produced by the verifier and confirmed by the author.
 *
 * The author's human review state is NEVER written back into `StoryAuditResult`.
 * It lives in the standalone {@link StoryAuditFindingReview} so that re-running
 * an analysis cannot overwrite an author's decision.
 *
 * @example
 * const finding: StoryAuditFinding = {
 *   id: "f1",
 *   category: "timeline_conflict",
 *   severity: "high",
 *   status: "candidate",
 *   title: "同一事件前后矛盾",
 *   claim: "事件 A 既早于又晚于事件 B",
 *   evidence: [],
 *   relatedFactIds: [],
 *   relatedEventIds: [],
 *   ruleIds: ["timeline.cycle"],
 *   alternativeExplanations: [],
 *   confidence: 0.62,
 * };
 */

/** Schema version stamp shared by ai-core, the API and the web client. */
export type StoryAuditSchemaVersion = "story-audit.v1";

/** Current schema version constant; bump when the contract changes in a breaking way. */
export const STORY_AUDIT_SCHEMA_VERSION: StoryAuditSchemaVersion = "story-audit.v1";

/** Why a whole-book analysis was run. Drives result routing and default profiles. */
export type BookAnalysisPurpose = "own-draft" | "reference-study";

/**
 * A backward-compatible default: requests without an explicit purpose are
 * treated as reference studies so existing research users keep their behavior.
 */
export const DEFAULT_BOOK_ANALYSIS_PURPOSE: BookAnalysisPurpose = "reference-study";

/**
 * Analysis profiles selectable for an own-draft book. `full` is a convenience
 * alias meaning "run every profile".
 */
export type StoryAuditProfile = "statistics" | "continuity" | "structure" | "character" | "full";

/**
 * Default profiles applied when an own-draft book is imported, matching the
 * execution plan's `own_draft_default_profiles` decision.
 */
export const OWN_DRAFT_DEFAULT_PROFILES: ReadonlyArray<Exclude<StoryAuditProfile, "full">> = [
  "statistics",
  "continuity",
  "structure",
  "character",
];

/** A time relation between two story events. `unknown` must not be coerced into a date. */
export type TemporalRelation = "before" | "after" | "overlaps" | "during" | "same_time" | "unknown";

/** Where a piece of evidence originates. */
export type StoryEvidenceSource = "text" | "author-canon";

/** The category of a deterministic or inferred story fact. */
export type StoryFactKind =
  | "identity"
  | "appearance"
  | "age"
  | "ability"
  | "knowledge"
  | "goal"
  | "belief"
  | "relationship"
  | "location"
  | "possession"
  | "injury"
  | "world_rule";

/** Polarity of a fact assertion. */
export type StoryFactPolarity = "asserted" | "negated" | "uncertain";

/** How trustworthy a fact's source is; author canon always wins over inference. */
export type StoryFactSourcePriority = "author-canon" | "explicit-text" | "model-inference";

/** Finding categories. Plot gaps are listed because they are part of the contract,
 *  even though the plot-gap detector ships last (highest false-positive cost). */
export type StoryAuditFindingCategory =
  | "timeline_conflict"
  | "location_conflict"
  | "fact_contradiction"
  | "knowledge_violation"
  | "ability_violation"
  | "motivation_gap"
  | "relationship_jump"
  | "world_rule_violation"
  | "causal_gap"
  | "dropped_goal"
  | "unresolved_setup"
  | "dialogue_attribution"
  | "structure_signal";

/** Model/rule status of a finding. This is NOT the author's review state. */
export type StoryAuditFindingStatus = "candidate" | "verified" | "needs_human" | "dismissed";

/** Severity used only for ordering and presentation, never as a quality score. */
export type StoryAuditFindingSeverity = "critical" | "high" | "medium" | "low";

/**
 * A server-located pointer into the normalized chapter text.
 *
 * `quote` MUST be findable verbatim in the chapter's normalized text, and the
 * offsets MUST be recomputed by the server — model-supplied offsets are never
 * trusted.
 *
 * @example
 * const anchor: StoryEvidenceAnchor = {
 *   anchorId: "a1",
 *   chapterId: "ch-3",
 *   chapterOrder: 3,
 *   quote: "他今年三十二岁。",
 *   startOffset: 120,
 *   endOffset: 129,
 *   source: "text",
 * };
 */
export interface StoryEvidenceAnchor {
  anchorId: string;
  chapterId: string;
  chapterOrder: number;
  sceneId?: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  source: StoryEvidenceSource;
}

/** A scene is the canonical unit scenes/events/facts are attached to. */
export interface StoryScene {
  id: string;
  chapterId: string;
  orderInChapter: number;
  narrativeOrder: number;
  title: string;
  povCharacterId?: string;
  locationIds: string[];
  participantIds: string[];
  goal?: string;
  conflict?: string;
  outcome?: string;
  entryHook?: string;
  exitHook?: string;
  evidence: StoryEvidenceAnchor[];
}

/** A directed temporal relation from one event to another. */
export interface StoryEventRelation {
  targetEventId: string;
  relation: TemporalRelation;
  confidence: number;
}

/** A story event anchored in a scene, with optional temporal metadata. */
export interface StoryEvent {
  id: string;
  sceneId: string;
  summary: string;
  participantIds: string[];
  locationIds: string[];
  absoluteTime?: string;
  relativeTimeText?: string;
  durationMinutes?: number;
  relations: StoryEventRelation[];
  evidence: StoryEvidenceAnchor[];
}

/**
 * A discrete fact with a validity window. Conflicting versions are kept rather
 * than silently overwritten; low-confidence ambiguity stays as `uncertain`.
 */
export interface StoryFact {
  id: string;
  subjectId: string;
  predicate: string;
  object: string;
  kind: StoryFactKind;
  validFromEventId?: string;
  validToEventId?: string;
  polarity: StoryFactPolarity;
  sourcePriority: StoryFactSourcePriority;
  confidence: number;
  evidence: StoryEvidenceAnchor[];
}

/** A relationship delta recorded at a single scene for the arc ledger. */
export interface CharacterRelationshipState {
  targetCharacterId: string;
  trust?: number;
  intimacy?: number;
  power?: number;
}

/** A point-in-time snapshot of a character's state, used to build arcs. */
export interface CharacterStatePoint {
  characterId: string;
  sceneId: string;
  goalDistance: "closer" | "neutral" | "farther" | "unknown";
  agency: number;
  beliefState?: string;
  relationshipStates: CharacterRelationshipState[];
  cost?: string;
  irreversibleChoice?: string;
  evidence: StoryEvidenceAnchor[];
}

/**
 * An immutable model/rule finding. It never carries the author's review state.
 *
 * High-priority findings require at least two distinct anchors, or one text
 * anchor plus a confirmed author canon. The same sentence quoted twice is not
 * double evidence.
 */
export interface StoryAuditFinding {
  id: string;
  category: StoryAuditFindingCategory;
  severity: StoryAuditFindingSeverity;
  status: StoryAuditFindingStatus;
  title: string;
  claim: string;
  evidence: StoryEvidenceAnchor[];
  relatedFactIds: string[];
  relatedEventIds: string[];
  ruleIds: string[];
  alternativeExplanations: string[];
  readerImpact?: string;
  fixAction?: string;
  confidence: number;
}

/**
 * The author's human review of a finding. Persisted SEPARATELY from the
 * immutable `StoryAuditResult` so re-analysis cannot overwrite it.
 */
export type StoryAuditReviewState =
  | "confirmed"
  | "author_intent"
  | "insufficient_evidence"
  | "false_positive"
  | "planned"
  | "resolved";

/** A persisted author review row, uniquely keyed by (projectId, auditId, findingId). */
export interface StoryAuditFindingReview {
  id: string;
  projectId: string;
  bookJobId: string;
  auditId: string;
  findingId: string;
  reviewState: StoryAuditReviewState;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deterministic dialogue statistics for a scope (chapter or rolling window).
 *
 * Every value here is recomputable from the same normalized text without any
 * model call. Ratios are clamped to `[0, 1]`.
 */
export interface DialogueStatistics {
  scopeId: string;
  effectiveCharacterCount: number;
  dialogueCharacterCount: number;
  dialogueCharacterRatio: number;
  paragraphCount: number;
  dialogueParagraphCount: number;
  dialogueParagraphRatio: number;
  dialogueTurnCount: number;
  dialogueTagCount: number;
  unattributedTurnCandidateCount: number;
  parserWarnings: string[];
}

/** Coverage metadata describing which chapters were analyzed and how reliably. */
export interface StoryAuditCoverage {
  analyzedChapterIds: string[];
  totalChapterCount: number;
  isPartial: boolean;
  sceneExtractionRate: number;
  evidenceValidationRate: number;
}

/** Plotline row in the structure matrix view. */
export interface PlotlineMatrixRow {
  plotlineId: string;
  sceneIds: string[];
  status: "active" | "quiet" | "resolved" | "unknown";
}

/** A setup→payoff edge in the foreshadowing graph. */
export interface SetupPayoffEdge {
  setupFactId: string;
  payoffFactId?: string;
  status: "open" | "reminded" | "paid" | "abandoned" | "unknown";
}

/** Derived, evidence-backed views consumed by the structure and character tabs. */
export interface StoryAuditViews {
  plotlineMatrix: PlotlineMatrixRow[];
  setupPayoffEdges: SetupPayoffEdge[];
}

/**
 * The immutable result of a story audit. Embedded into the existing
 * `BookAnalysisResult.storyAudit` field — there is no parallel cache or job.
 *
 * Partial coverage must NOT produce whole-book conclusions such as "never
 * resolved"; it only records what was analyzed.
 */
export interface StoryAuditResult {
  schemaVersion: StoryAuditSchemaVersion;
  auditId: string;
  projectId: string;
  bookJobId: string;
  generatedAt: string;
  coverage: StoryAuditCoverage;
  scenes: StoryScene[];
  events: StoryEvent[];
  facts: StoryFact[];
  characterStates: CharacterStatePoint[];
  findings: StoryAuditFinding[];
  metrics: {
    dialogue: DialogueStatistics[];
  };
  views: StoryAuditViews;
}
