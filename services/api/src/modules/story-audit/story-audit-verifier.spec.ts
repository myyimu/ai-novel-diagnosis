import type {
  StoryAuditFinding,
  StoryAuditResult,
  StoryEvidenceAnchor,
} from "@ai-novel-diagnosis/ai-core";
import { verifyStoryAuditFindings } from "./story-audit-verifier";

describe("verifyStoryAuditFindings", () => {
  it("should reject verifier decisions that reference an unknown anchor id", async () => {
    const storyAudit = createStoryAudit({
      findings: [createFinding({ evidence: [anchorA, anchorB] })],
    });

    const result = await verifyStoryAuditFindings(storyAudit, {
      verifier: {
        verify: jest.fn(async () => ({
          findingId: "finding-1",
          status: "verified" as const,
          reason: "看似矛盾",
          alternativeExplanations: [],
          evidenceAnchorIds: ["anchor-a", "missing-anchor"],
          confidence: 0.92,
        })),
      },
    });

    expect(result.rejectedCount).toBe(1);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        status: "candidate",
        ruleIds: expect.arrayContaining(["verifier-rejected-unknown-anchor"]),
      }),
    );
  });

  it("should downgrade verified decisions when evidence is insufficient", async () => {
    const storyAudit = createStoryAudit({
      findings: [createFinding({ evidence: [anchorA] })],
    });

    const result = await verifyStoryAuditFindings(storyAudit, {
      verifier: {
        verify: jest.fn(async () => ({
          findingId: "finding-1",
          status: "verified" as const,
          reason: "只有单侧证据",
          alternativeExplanations: [],
          evidenceAnchorIds: ["anchor-a"],
          confidence: 0.91,
        })),
      },
    });

    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        status: "needs_human",
        confidence: 0.84,
        ruleIds: expect.arrayContaining([
          "verifier-downgraded-insufficient-evidence",
        ]),
      }),
    );
  });

  it("should verify at most twenty candidates per book", async () => {
    const verify = jest.fn(async (input) => ({
      findingId: input.finding.id,
      status: "needs_human" as const,
      reason: "仍需人工判断",
      alternativeExplanations: ["可能是作者意图"],
      evidenceAnchorIds: ["anchor-a"],
      confidence: 0.7,
    }));
    const storyAudit = createStoryAudit({
      findings: Array.from({ length: 25 }, (_, index) =>
        createFinding({ id: `finding-${index + 1}`, evidence: [anchorA] }),
      ),
    });

    const result = await verifyStoryAuditFindings(storyAudit, {
      verifier: { verify },
    });

    expect(verify).toHaveBeenCalledTimes(20);
    expect(result.attemptedCount).toBe(20);
    expect(result.skippedCount).toBe(5);
    expect(result.findings).toHaveLength(25);
    expect(result.findings[20]?.status).toBe("candidate");
  });

  it("should keep candidates when the verifier model is unavailable", async () => {
    const storyAudit = createStoryAudit({
      findings: [createFinding({ evidence: [anchorA, anchorB] })],
    });

    const result = await verifyStoryAuditFindings(storyAudit, {
      verifier: {
        verify: jest.fn(async () => {
          throw new Error("model unavailable");
        }),
      },
    });

    expect(result.unavailableCount).toBe(1);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        status: "candidate",
        ruleIds: expect.arrayContaining(["verifier-model-unavailable"]),
        alternativeExplanations: expect.arrayContaining([
          expect.stringContaining("尚未独立复核"),
        ]),
      }),
    );
  });
});

const anchorA: StoryEvidenceAnchor = {
  anchorId: "anchor-a",
  chapterId: "ch-1",
  chapterOrder: 1,
  quote: "主角收到密信",
  startOffset: 0,
  endOffset: 6,
  source: "text",
};

const anchorB: StoryEvidenceAnchor = {
  anchorId: "anchor-b",
  chapterId: "ch-2",
  chapterOrder: 2,
  quote: "主角进入密室",
  startOffset: 10,
  endOffset: 16,
  source: "text",
};

function createFinding(
  overrides: Partial<StoryAuditFinding> = {},
): StoryAuditFinding {
  return {
    id: overrides.id ?? "finding-1",
    category: "timeline_conflict",
    severity: "high",
    status: "candidate",
    title: "时间矛盾候选",
    claim: "两个事件互相先于对方。",
    evidence: [anchorA, anchorB],
    relatedFactIds: [],
    relatedEventIds: ["event-a", "event-b"],
    ruleIds: ["temporal-before-cycle"],
    alternativeExplanations: ["可能是倒叙。"],
    confidence: 0.76,
    ...overrides,
  };
}

function createStoryAudit(input: {
  findings: StoryAuditFinding[];
}): StoryAuditResult {
  return {
    schemaVersion: "story-audit.v1",
    auditId: "audit-1",
    projectId: "project-1",
    bookJobId: "book-job-1",
    generatedAt: "2026-07-18T00:00:00.000Z",
    coverage: {
      analyzedChapterIds: ["ch-1", "ch-2"],
      totalChapterCount: 2,
      isPartial: false,
      sceneExtractionRate: 1,
      evidenceValidationRate: 1,
    },
    scenes: [],
    events: [
      {
        id: "event-a",
        sceneId: "scene-a",
        summary: "主角收到密信",
        participantIds: ["主角"],
        locationIds: [],
        relations: [],
        evidence: [anchorA],
      },
      {
        id: "event-b",
        sceneId: "scene-b",
        summary: "主角进入密室",
        participantIds: ["主角"],
        locationIds: [],
        relations: [],
        evidence: [anchorB],
      },
    ],
    facts: [],
    characterStates: [],
    findings: input.findings,
    metrics: {
      dialogue: [],
    },
    views: {
      temporalGraph: {
        eventIds: ["event-a", "event-b"],
        relationEdges: [
          {
            sourceEventId: "event-a",
            targetEventId: "event-b",
            relation: "before",
            confidence: 0.72,
            evidenceAnchorIds: ["anchor-a"],
            ruleId: "temporal-before-cycle",
          },
        ],
        conflictCandidateIds: input.findings.map((finding) => finding.id),
      },
      plotlineMatrix: [],
      setupPayoffEdges: [],
    },
  };
}
