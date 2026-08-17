import { describe, expect, it } from "vitest";
import type { StoryAuditFinding, StoryAuditFindingReview, StoryAuditResult } from "./story-audit";

describe("story audit contract", () => {
  it("should keep machine findings separate from human review state", () => {
    const finding: StoryAuditFinding = {
      id: "finding-1",
      category: "causal_gap",
      severity: "medium",
      status: "needs_human",
      title: "动机跳变候选",
      claim: "角色突然改变目标，但当前证据不足以自动宣判。",
      evidence: [],
      relatedFactIds: [],
      relatedEventIds: [],
      ruleIds: ["motivation-gap"],
      alternativeExplanations: ["可能存在未分析章节解释。"],
      confidence: 0.62,
    };
    const review: StoryAuditFindingReview = {
      projectId: "project-1",
      auditId: "audit-1",
      findingId: finding.id,
      reviewState: "author_intent",
      updatedAt: "2026-07-18T00:00:00.000Z",
    };

    expect(finding).not.toHaveProperty("reviewState");
    expect(review.reviewState).toBe("author_intent");
  });

  it("should treat the verification summary as optional counters on StoryAuditResult", () => {
    const base = {
      schemaVersion: "story-audit.v1" as const,
      auditId: "audit-1",
      projectId: "project-1",
      bookJobId: "job-1",
      generatedAt: "2026-08-17T00:00:00.000Z",
      coverage: {
        analyzedChapterIds: ["chapter-1"],
        totalChapterCount: 1,
        isPartial: false,
        sceneExtractionRate: 1,
        evidenceValidationRate: 1,
      },
      scenes: [],
      events: [],
      facts: [],
      characterStates: [],
      findings: [],
      metrics: { dialogue: [] },
      views: {
        temporalGraph: {
          eventIds: [],
          relationEdges: [],
          conflictCandidateIds: [],
        },
        plotlineMatrix: [],
        setupPayoffEdges: [],
      },
    };

    const withoutVerification: StoryAuditResult = base;
    const withVerification: StoryAuditResult = {
      ...base,
      verification: {
        attemptedCount: 3,
        skippedCount: 1,
        rejectedCount: 1,
        unavailableCount: 0,
        verifiedCount: 2,
      },
    };

    expect(withoutVerification.verification).toBeUndefined();
    expect(withVerification.verification?.verifiedCount).toBe(2);
  });
});
