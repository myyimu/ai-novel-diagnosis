import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOK_ANALYSIS_PURPOSE,
  OWN_DRAFT_DEFAULT_PROFILES,
  STORY_AUDIT_SCHEMA_VERSION,
} from "./story-audit";
import type {
  StoryAuditFinding,
  StoryAuditFindingReview,
  StoryAuditReviewState,
  StoryAuditResult,
} from "./story-audit";

const baseFinding: StoryAuditFinding = {
  id: "f1",
  category: "timeline_conflict",
  severity: "high",
  status: "candidate",
  title: "同一事件前后矛盾",
  claim: "事件 A 既早于又晚于事件 B",
  evidence: [],
  relatedFactIds: [],
  relatedEventIds: [],
  ruleIds: ["timeline.cycle"],
  alternativeExplanations: [],
  confidence: 0.62,
};

describe("story-audit constants", () => {
  it("pins the shared schema version", () => {
    expect(STORY_AUDIT_SCHEMA_VERSION).toBe("story-audit.v1");
  });

  it("defaults to reference-study for backward compatibility", () => {
    expect(DEFAULT_BOOK_ANALYSIS_PURPOSE).toBe("reference-study");
  });

  it("ships the four own-draft profiles without the full alias", () => {
    expect(OWN_DRAFT_DEFAULT_PROFILES).toEqual([
      "statistics",
      "continuity",
      "structure",
      "character",
    ]);
    expect(OWN_DRAFT_DEFAULT_PROFILES).not.toContain("full");
  });
});

describe("finding vs review separation", () => {
  it("keeps the author review state off the immutable finding object", () => {
    expect(Object.keys(baseFinding)).not.toContain("reviewState");
  });

  it("forbids reviewState on a finding at the type level", () => {
    // @ts-expect-error — reviewState must NOT exist on the immutable finding contract
    const invalid: StoryAuditFinding = { ...baseFinding, reviewState: "confirmed" };
    void invalid;
    expect(true).toBe(true);
  });

  it("persists the author review state only on StoryAuditFindingReview", () => {
    const review: StoryAuditFindingReview = {
      id: "r1",
      projectId: "p1",
      bookJobId: "j1",
      auditId: "a1",
      findingId: "f1",
      reviewState: "confirmed",
      note: "确认时间冲突",
      createdAt: "2026-07-17T00:00:00.000Z",
      updatedAt: "2026-07-17T00:00:00.000Z",
    };
    expect(review.reviewState).toBe("confirmed");
    expect(review.findingId).toBe(baseFinding.id);
  });

  it("enumerates every documented author review state", () => {
    const states: StoryAuditReviewState[] = [
      "confirmed",
      "author_intent",
      "insufficient_evidence",
      "false_positive",
      "planned",
      "resolved",
    ];
    expect(states).toHaveLength(6);
  });
});

describe("StoryAuditResult", () => {
  it("can be constructed with the documented shape", () => {
    const result: StoryAuditResult = {
      schemaVersion: STORY_AUDIT_SCHEMA_VERSION,
      auditId: "a1",
      projectId: "p1",
      bookJobId: "j1",
      generatedAt: "2026-07-17T00:00:00.000Z",
      coverage: {
        analyzedChapterIds: ["ch1"],
        totalChapterCount: 1,
        isPartial: false,
        sceneExtractionRate: 0,
        evidenceValidationRate: 1,
      },
      scenes: [],
      events: [],
      facts: [],
      characterStates: [],
      findings: [baseFinding],
      metrics: {
        dialogue: [
          {
            scopeId: "ch1",
            effectiveCharacterCount: 10,
            dialogueCharacterCount: 4,
            dialogueCharacterRatio: 0.4,
            paragraphCount: 1,
            dialogueParagraphCount: 1,
            dialogueParagraphRatio: 1,
            dialogueTurnCount: 1,
            dialogueTagCount: 1,
            unattributedTurnCandidateCount: 0,
            parserWarnings: [],
          },
        ],
      },
      views: { plotlineMatrix: [], setupPayoffEdges: [] },
    };

    expect(result.schemaVersion).toBe("story-audit.v1");
    expect(result.coverage.isPartial).toBe(false);
    expect(result.findings[0]).not.toHaveProperty("reviewState");
    expect(result.metrics.dialogue[0].dialogueCharacterRatio).toBeCloseTo(0.4, 5);
  });
});
