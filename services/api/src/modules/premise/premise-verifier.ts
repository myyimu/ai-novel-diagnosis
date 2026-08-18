import type {
  PremiseClicheFinding,
  PremiseReviewResult,
} from "@ai-novel-diagnosis/ai-core";

export interface PremiseClicheVerifierInput {
  reviewId: string;
  premiseText: string;
  finding: Pick<
    PremiseClicheFinding,
    "id" | "layer" | "severity" | "title" | "claim" | "patternReference"
  >;
  /** Quotes that survived the server-side substring check. */
  verifiedQuotes: string[];
}

export interface PremiseClicheVerifierDecision {
  findingId: string;
  status: Extract<
    PremiseClicheFinding["status"],
    "verified" | "needs_human" | "dismissed"
  >;
  reason: string;
  confidence: number;
}

export interface PremiseClicheFindingVerifier {
  verify(
    input: PremiseClicheVerifierInput,
  ): Promise<PremiseClicheVerifierDecision>;
}

export interface PremiseVerificationSummary {
  clicheFindings: PremiseClicheFinding[];
  attemptedCount: number;
  skippedCount: number;
  rejectedCount: number;
  unavailableCount: number;
  /** Candidates that ended the pass with status "verified". */
  verifiedCount: number;
}

const DEFAULT_MAX_CANDIDATES = 6;
const VERIFIED_CONFIDENCE_FLOOR = 0.85;

/**
 * Second pass over premise cliché findings.
 *
 * Layer 1 is mechanical and always runs: every evidence quote must be a
 * contiguous substring of the author's submitted premise, otherwise the quote
 * is dropped — a finding whose quotes all vanish is rejected outright. This is
 * the premise-review equivalent of story-audit's unknown-anchor rule: the
 * model structurally cannot fabricate evidence the author never wrote.
 * Layer 2 is the optional LLM verifier; any thrown error degrades that single
 * finding to "candidate" — a flaky verifier never blocks the review.
 */
export async function verifyPremiseClicheFindings(
  review: PremiseReviewResult,
  premiseText: string,
  options: {
    verifier?: PremiseClicheFindingVerifier;
    maxCandidates?: number;
    reviewId?: string;
  } = {},
): Promise<PremiseVerificationSummary> {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const candidates = review.clicheFindings.slice(0, maxCandidates);
  const skippedCount = Math.max(
    0,
    review.clicheFindings.length - candidates.length,
  );
  let attemptedCount = 0;
  let rejectedCount = 0;
  let unavailableCount = 0;

  const verifiedFindings: PremiseClicheFinding[] = [];
  for (const finding of candidates) {
    const evidence = finding.evidence.filter((quote) =>
      premiseText.includes(quote.quote),
    );

    if (evidence.length === 0) {
      rejectedCount += 1;
      verifiedFindings.push({
        ...finding,
        status: "candidate",
        evidence: [],
        verificationNote:
          "证据引文无法在原始灵感中定位，服务端已拒绝该俗套判定。",
      });
      continue;
    }

    if (!options.verifier) {
      unavailableCount += 1;
      verifiedFindings.push({
        ...finding,
        status: "candidate",
        evidence,
        verificationNote: "复核模型不可用，当前只保留引文校验，尚未独立复核。",
      });
      continue;
    }

    attemptedCount += 1;
    try {
      const decision = await options.verifier.verify({
        reviewId: options.reviewId ?? "",
        premiseText,
        finding: {
          id: finding.id,
          layer: finding.layer,
          severity: finding.severity,
          title: finding.title,
          claim: finding.claim,
          patternReference: finding.patternReference,
        },
        verifiedQuotes: evidence.map((quote) => quote.quote),
      });
      const applied = applyVerifierDecision({ finding, decision, evidence });
      if (applied.rejected) {
        rejectedCount += 1;
      }
      verifiedFindings.push(applied.finding);
    } catch {
      unavailableCount += 1;
      verifiedFindings.push({
        ...finding,
        status: "candidate",
        evidence,
        verificationNote: "复核模型调用失败，当前只保留引文校验。",
      });
    }
  }

  const clicheFindings = [
    ...verifiedFindings,
    ...review.clicheFindings.slice(maxCandidates),
  ];

  return {
    clicheFindings,
    attemptedCount,
    skippedCount,
    rejectedCount,
    unavailableCount,
    verifiedCount: clicheFindings.filter(
      (finding) => finding.status === "verified",
    ).length,
  };
}

function applyVerifierDecision(input: {
  finding: PremiseClicheFinding;
  decision: PremiseClicheVerifierDecision;
  evidence: PremiseClicheFinding["evidence"];
}): { finding: PremiseClicheFinding; rejected: boolean } {
  const { finding, decision, evidence } = input;
  if (decision.findingId !== finding.id) {
    return {
      finding: {
        ...finding,
        status: "candidate",
        evidence,
        verificationNote: "复核输出与候选不匹配，服务端已拒绝该复核结论。",
      },
      rejected: true,
    };
  }

  const confidence = normalizeConfidence(decision.confidence);
  const cannotVerify =
    decision.status === "verified" && confidence < VERIFIED_CONFIDENCE_FLOOR;
  const status = cannotVerify ? "needs_human" : decision.status;

  return {
    finding: {
      ...finding,
      status,
      evidence,
      verificationNote: cannotVerify
        ? "复核置信度不足，降级为需人工判断。"
        : decision.reason || "复核模型已独立确认。",
    },
    rejected: false,
  };
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}
