/** Schema version for the first story-audit result contract. */
export type StoryAuditSchemaVersion = "story-audit.v1";

/** Story-audit profiles used by future orchestration without adding a second job system. */
export type StoryAuditProfile = "statistics" | "continuity" | "structure" | "character" | "full";

/** Stable request contract for deriving story intelligence from an existing book-analysis job. */
export interface StoryAuditRequest {
  projectId: string;
  bookJobId: string;
  purpose: "own-draft" | "reference-study";
  profiles: StoryAuditProfile[];
  scope?: {
    chapterIds?: string[];
    mainCharacterIds?: string[];
  };
  preferences?: {
    storyOrder?: "linear" | "nonlinear" | "mixed";
    dialogueQuoteStyles?: Array<"curly" | "corner" | "double-corner" | "ascii">;
    excludeDialogueKinds?: DialogueExcludeKind[];
    structureTemplate?: "none" | "three-act" | "hero-journey" | "story-circle" | "custom";
  };
}

/** Evidence anchor whose offsets are calculated by the server from verified text. */
export interface StoryEvidenceAnchor {
  anchorId: string;
  chapterId: string;
  chapterOrder: number;
  sceneId?: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  source: "text" | "author-canon";
}

/** A normalized scene candidate derived from chapter maps and verified evidence. */
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

/** Temporal relation between two story events. */
export type TemporalRelation = "before" | "after" | "overlaps" | "during" | "same_time" | "unknown";

/** An explicit or inferred story event with evidence and temporal links. */
export interface StoryEvent {
  id: string;
  sceneId: string;
  summary: string;
  participantIds: string[];
  locationIds: string[];
  absoluteTime?: string;
  relativeTimeText?: string;
  durationMinutes?: number;
  relations: Array<{
    targetEventId: string;
    relation: TemporalRelation;
    confidence: number;
  }>;
  evidence: StoryEvidenceAnchor[];
}

/** Supported normalized fact kinds for consistency checks. */
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

/** A normalized story fact; model-provided quotes must be re-anchored by the server. */
export interface StoryFact {
  id: string;
  subjectId: string;
  predicate: string;
  object: string;
  kind: StoryFactKind;
  validFromEventId?: string;
  validToEventId?: string;
  polarity: "asserted" | "negated" | "uncertain";
  sourcePriority: "author-canon" | "explicit-text" | "model-inference";
  confidence: number;
  evidence: StoryEvidenceAnchor[];
}

/** Character state at a scene boundary, separated from static character cards. */
export interface CharacterStatePoint {
  characterId: string;
  sceneId: string;
  goalDistance: "closer" | "neutral" | "farther" | "unknown";
  agency: number;
  beliefState?: string;
  relationshipStates: Array<{
    targetCharacterId: string;
    trust?: number;
    intimacy?: number;
    power?: number;
  }>;
  cost?: string;
  irreversibleChoice?: string;
  evidence: StoryEvidenceAnchor[];
}

/** Categories for candidate findings; findings remain evidence-first, not automatic verdicts. */
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

/** A machine-generated story-audit candidate with evidence and alternative explanations. */
export interface StoryAuditFinding {
  id: string;
  category: StoryAuditFindingCategory;
  severity: "critical" | "high" | "medium" | "low";
  status: "candidate" | "verified" | "needs_human" | "dismissed";
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

/** Human review state stored outside StoryAuditResult. */
export interface StoryAuditFindingReview {
  projectId: string;
  auditId: string;
  findingId: string;
  reviewState:
    | "unreviewed"
    | "confirmed"
    | "author_intent"
    | "insufficient_evidence"
    | "false_positive"
    | "planned"
    | "resolved";
  note?: string;
  updatedAt: string;
}

/** Dialogue text that should be excluded from spoken-dialogue statistics. */
export type DialogueExcludeKind = "message" | "letter" | "system" | "inner-monologue";

/** Deterministic dialogue statistics for a book, chapter, or other text scope. */
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

/** Story-audit result embedded in BookAnalysisResult.storyAudit. */
export interface StoryAuditResult {
  schemaVersion: StoryAuditSchemaVersion;
  auditId: string;
  projectId: string;
  bookJobId: string;
  generatedAt: string;
  coverage: {
    analyzedChapterIds: string[];
    totalChapterCount: number;
    isPartial: boolean;
    sceneExtractionRate: number;
    evidenceValidationRate: number;
  };
  scenes: StoryScene[];
  events: StoryEvent[];
  facts: StoryFact[];
  characterStates: CharacterStatePoint[];
  findings: StoryAuditFinding[];
  metrics: {
    dialogue: DialogueStatistics[];
  };
  views: {
    temporalGraph: {
      eventIds: string[];
      relationEdges: Array<{
        sourceEventId: string;
        targetEventId: string;
        relation: TemporalRelation;
        confidence: number;
        evidenceAnchorIds: string[];
        ruleId: string;
      }>;
      conflictCandidateIds: string[];
    };
    plotlineMatrix: Array<{
      plotlineId: string;
      sceneIds: string[];
      status: "active" | "quiet" | "resolved" | "unknown";
    }>;
    setupPayoffEdges: Array<{
      setupFactId: string;
      payoffFactId?: string;
      status: "open" | "reminded" | "paid" | "abandoned" | "unknown";
    }>;
  };
}
