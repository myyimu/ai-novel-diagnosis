import type { PremiseReviewResult } from "@ai-novel-diagnosis/ai-core";
import {
  verifyPremiseClicheFindings,
  type PremiseClicheFindingVerifier,
} from "./premise-verifier";

const premiseText =
  "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流。";

function review(
  findings: PremiseReviewResult["clicheFindings"],
): PremiseReviewResult {
  return {
    schemaVersion: "premise-review.v1",
    premiseSummary: "重生复仇流灵感。",
    coreConflict: "主角想复仇，阻力缺失。",
    protagonistDesire: "避开所有遗憾。",
    opposingForce: "无明显阻力。",
    irreducibilityTest: "换成现代背景后依然成立。",
    readerHookQuestion: "他这次会怎么选？",
    engineVerdict: "fixable",
    oneLineVerdict: "发动机在但阻力缺失。",
    layers: [],
    clicheFindings: findings,
    upgradeDirections: [],
  };
}

function finding(
  overrides: Partial<PremiseReviewResult["clicheFindings"][number]> = {},
) {
  return {
    id: "cliche-1",
    layer: "engine" as const,
    severity: "high" as const,
    title: "无代价重生",
    claim: "重生没有任何代价，冲突无法自我升级。",
    evidence: [{ quote: "带着前世记忆避开所有遗憾" }],
    status: "candidate" as const,
    ...overrides,
  };
}

function verifier(
  decisions: Array<
    | {
        findingId: string;
        status: "verified" | "needs_human" | "dismissed";
        reason?: string;
        confidence?: number;
      }
    | Error
  >,
): PremiseClicheFindingVerifier {
  let call = 0;
  return {
    verify: async () => {
      const decision = decisions[call];
      call += 1;
      if (decision instanceof Error) {
        throw decision;
      }
      return {
        findingId: decision.findingId,
        status: decision.status,
        reason: decision.reason ?? "复核确认。",
        confidence: decision.confidence ?? 0.9,
      };
    },
  };
}

describe("verifyPremiseClicheFindings", () => {
  it("should reject a finding whose quotes cannot be located in the premise", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([
        finding({
          evidence: [{ quote: "这段话不在原文里，是模型编造的" }],
        }),
      ]),
      premiseText,
    );

    expect(summary.rejectedCount).toBe(1);
    expect(summary.clicheFindings[0]?.status).toBe("candidate");
    expect(summary.clicheFindings[0]?.evidence).toEqual([]);
    expect(summary.clicheFindings[0]?.verificationNote).toContain(
      "无法在原始灵感中定位",
    );
  });

  it("should drop fabricated quotes but keep a finding with at least one real quote", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([
        finding({
          evidence: [
            { quote: "带着前世记忆避开所有遗憾" },
            { quote: "编造的第二条引文" },
          ],
        }),
      ]),
      premiseText,
    );

    expect(summary.clicheFindings[0]?.evidence).toHaveLength(1);
    expect(summary.clicheFindings[0]?.evidence[0]?.quote).toBe(
      "带着前世记忆避开所有遗憾",
    );
  });

  it("should mark findings unavailable when no verifier is configured", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([finding()]),
      premiseText,
    );

    expect(summary.attemptedCount).toBe(0);
    expect(summary.unavailableCount).toBe(1);
    expect(summary.clicheFindings[0]?.status).toBe("candidate");
    expect(summary.clicheFindings[0]?.verificationNote).toContain(
      "复核模型不可用",
    );
  });

  it("should reject a verifier decision that echoes the wrong findingId", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([finding()]),
      premiseText,
      {
        verifier: verifier([{ findingId: "cliche-other", status: "verified" }]),
      },
    );

    expect(summary.rejectedCount).toBe(1);
    expect(summary.clicheFindings[0]?.status).toBe("candidate");
    expect(summary.clicheFindings[0]?.verificationNote).toContain("不匹配");
  });

  it("should downgrade a verified decision below the confidence floor", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([finding()]),
      premiseText,
      {
        verifier: verifier([
          { findingId: "cliche-1", status: "verified", confidence: 0.6 },
        ]),
      },
    );

    expect(summary.clicheFindings[0]?.status).toBe("needs_human");
    expect(summary.verifiedCount).toBe(0);
  });

  it("should verify a confident decision and count it", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([finding()]),
      premiseText,
      {
        verifier: verifier([
          { findingId: "cliche-1", status: "verified", confidence: 0.9 },
        ]),
      },
    );

    expect(summary.attemptedCount).toBe(1);
    expect(summary.verifiedCount).toBe(1);
    expect(summary.clicheFindings[0]?.status).toBe("verified");
  });

  it("should degrade a finding to candidate when the verifier throws", async () => {
    const summary = await verifyPremiseClicheFindings(
      review([finding()]),
      premiseText,
      {
        verifier: verifier([new Error("network down")]),
      },
    );

    expect(summary.unavailableCount).toBe(1);
    expect(summary.clicheFindings[0]?.status).toBe("candidate");
    expect(summary.clicheFindings[0]?.verificationNote).toContain(
      "复核模型调用失败",
    );
  });

  it("should skip candidates beyond maxCandidates and count them", async () => {
    const findings = [
      finding({ id: "cliche-1" }),
      finding({ id: "cliche-2" }),
      finding({ id: "cliche-3" }),
    ];
    const summary = await verifyPremiseClicheFindings(
      review(findings),
      premiseText,
      {
        maxCandidates: 1,
      },
    );

    expect(summary.skippedCount).toBe(2);
    expect(summary.attemptedCount).toBe(0);
    expect(summary.clicheFindings).toHaveLength(3);
  });
});
