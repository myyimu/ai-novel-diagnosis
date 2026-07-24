import type {
  StoryAuditFinding,
  StoryAuditResult,
  StoryEvidenceAnchor,
} from "@ai-novel-diagnosis/ai-core";

export interface StoryAuditVerifierInput {
  auditId: string;
  finding: Pick<
    StoryAuditFinding,
    | "id"
    | "category"
    | "severity"
    | "claim"
    | "relatedFactIds"
    | "relatedEventIds"
    | "ruleIds"
    | "alternativeExplanations"
  >;
  evidence: StoryEvidenceAnchor[];
  relatedFacts: StoryAuditResult["facts"];
  relatedEvents: StoryAuditResult["events"];
  temporalNeighbors: StoryAuditResult["views"]["temporalGraph"]["relationEdges"];
}

export interface StoryAuditVerifierDecision {
  findingId: string;
  status: Extract<
    StoryAuditFinding["status"],
    "verified" | "needs_human" | "dismissed"
  >;
  reason: string;
  alternativeExplanations: string[];
  evidenceAnchorIds: string[];
  confidence: number;
}

export interface StoryAuditFindingVerifier {
  verify(input: StoryAuditVerifierInput): Promise<StoryAuditVerifierDecision>;
}

export interface StoryAuditVerificationSummary {
  findings: StoryAuditFinding[];
  attemptedCount: number;
  skippedCount: number;
  rejectedCount: number;
  unavailableCount: number;
}

const DEFAULT_MAX_CANDIDATES_PER_BOOK = 20;
const VERIFIED_CONFIDENCE_FLOOR = 0.85;

export async function verifyStoryAuditFindings(
  storyAudit: StoryAuditResult,
  options: {
    verifier?: StoryAuditFindingVerifier;
    maxCandidatesPerBook?: number;
  } = {},
): Promise<StoryAuditVerificationSummary> {
  const maxCandidatesPerBook =
    options.maxCandidatesPerBook ?? DEFAULT_MAX_CANDIDATES_PER_BOOK;
  const anchorById = buildAnchorIndex(storyAudit);
  const candidates = storyAudit.findings.slice(0, maxCandidatesPerBook);
  const skippedCount = Math.max(
    0,
    storyAudit.findings.length - candidates.length,
  );
  let rejectedCount = 0;
  let unavailableCount = 0;
  let attemptedCount = 0;

  const verifiedFindings: StoryAuditFinding[] = [];
  for (const finding of candidates) {
    const findingEvidenceIds = finding.evidence.map(
      (anchor) => anchor.anchorId,
    );
    if (findingEvidenceIds.some((anchorId) => !anchorById.has(anchorId))) {
      rejectedCount += 1;
      verifiedFindings.push(markVerifierRejected(finding, "unknown-anchor"));
      continue;
    }

    if (!options.verifier) {
      unavailableCount += 1;
      verifiedFindings.push(markVerifierUnavailable(finding));
      continue;
    }

    attemptedCount += 1;
    try {
      const decision = await options.verifier.verify(
        buildVerifierInput(storyAudit, finding),
      );
      const applied = applyVerifierDecision({
        finding,
        decision,
        anchorById,
      });
      if (applied.rejected) {
        rejectedCount += 1;
      }
      verifiedFindings.push(applied.finding);
    } catch {
      unavailableCount += 1;
      verifiedFindings.push(markVerifierUnavailable(finding));
    }
  }

  return {
    findings: [
      ...verifiedFindings,
      ...storyAudit.findings.slice(maxCandidatesPerBook),
    ],
    attemptedCount,
    skippedCount,
    rejectedCount,
    unavailableCount,
  };
}

function buildVerifierInput(
  storyAudit: StoryAuditResult,
  finding: StoryAuditFinding,
): StoryAuditVerifierInput {
  return {
    auditId: storyAudit.auditId,
    finding: {
      id: finding.id,
      category: finding.category,
      severity: finding.severity,
      claim: finding.claim,
      relatedFactIds: finding.relatedFactIds,
      relatedEventIds: finding.relatedEventIds,
      ruleIds: finding.ruleIds,
      alternativeExplanations: finding.alternativeExplanations,
    },
    evidence: finding.evidence,
    relatedFacts: storyAudit.facts.filter((fact) =>
      finding.relatedFactIds.includes(fact.id),
    ),
    relatedEvents: storyAudit.events.filter((event) =>
      finding.relatedEventIds.includes(event.id),
    ),
    temporalNeighbors: storyAudit.views.temporalGraph.relationEdges.filter(
      (edge) =>
        finding.relatedEventIds.includes(edge.sourceEventId) ||
        finding.relatedEventIds.includes(edge.targetEventId),
    ),
  };
}

function applyVerifierDecision(input: {
  finding: StoryAuditFinding;
  decision: StoryAuditVerifierDecision;
  anchorById: Map<string, StoryEvidenceAnchor>;
}): { finding: StoryAuditFinding; rejected: boolean } {
  const { finding, decision, anchorById } = input;
  if (decision.findingId !== finding.id) {
    return {
      finding: markVerifierRejected(finding, "finding-mismatch"),
      rejected: true,
    };
  }

  const decisionAnchorIds = [...new Set(decision.evidenceAnchorIds)];
  if (decisionAnchorIds.some((anchorId) => !anchorById.has(anchorId))) {
    return {
      finding: markVerifierRejected(finding, "unknown-anchor"),
      rejected: true,
    };
  }

  const evidence = decisionAnchorIds.length
    ? decisionAnchorIds
        .map((anchorId) => anchorById.get(anchorId))
        .filter((anchor): anchor is StoryEvidenceAnchor => Boolean(anchor))
    : finding.evidence;
  const cannotVerify =
    decision.status === "verified" &&
    (evidence.length < 2 || decision.confidence < VERIFIED_CONFIDENCE_FLOOR);
  const status = cannotVerify ? "needs_human" : decision.status;
  const confidence = cannotVerify
    ? Math.min(normalizeConfidence(decision.confidence), 0.84)
    : normalizeConfidence(decision.confidence);

  return {
    finding: {
      ...finding,
      status,
      evidence,
      ruleIds: appendUnique(
        finding.ruleIds,
        cannotVerify
          ? "verifier-downgraded-insufficient-evidence"
          : "verifier-model-reviewed",
      ),
      alternativeExplanations: appendUnique(
        decision.alternativeExplanations.length
          ? decision.alternativeExplanations
          : finding.alternativeExplanations,
        cannotVerify ? "证据不足或置信度不足，不能把候选标记为 verified。" : "",
      ),
      confidence,
    },
    rejected: false,
  };
}

function markVerifierUnavailable(
  finding: StoryAuditFinding,
): StoryAuditFinding {
  return {
    ...finding,
    status: "candidate",
    ruleIds: appendUnique(finding.ruleIds, "verifier-model-unavailable"),
    alternativeExplanations: appendUnique(finding.alternativeExplanations, [
      "复核模型不可用，当前只保留规则候选，尚未独立复核。",
    ]),
  };
}

function markVerifierRejected(
  finding: StoryAuditFinding,
  reason: "unknown-anchor" | "finding-mismatch",
): StoryAuditFinding {
  return {
    ...finding,
    status: "candidate",
    ruleIds: appendUnique(
      finding.ruleIds,
      reason === "unknown-anchor"
        ? "verifier-rejected-unknown-anchor"
        : "verifier-rejected-finding-mismatch",
    ),
    alternativeExplanations: appendUnique(finding.alternativeExplanations, [
      "复核输出引用了未知证据或不匹配候选，服务端已拒绝该复核结论。",
    ]),
  };
}

function buildAnchorIndex(
  storyAudit: StoryAuditResult,
): Map<string, StoryEvidenceAnchor> {
  const anchors = [
    ...storyAudit.scenes.flatMap((scene) => scene.evidence),
    ...storyAudit.events.flatMap((event) => event.evidence),
    ...storyAudit.facts.flatMap((fact) => fact.evidence),
    ...storyAudit.characterStates.flatMap((state) => state.evidence),
    ...storyAudit.findings.flatMap((finding) => finding.evidence),
  ];
  return new Map(anchors.map((anchor) => [anchor.anchorId, anchor]));
}

function appendUnique(base: string[], values: string | string[]): string[] {
  const additions = Array.isArray(values) ? values : [values];
  return [
    ...new Set([
      ...base,
      ...additions.map((item) => item.trim()).filter(Boolean),
    ]),
  ];
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}
