import { describe, expect, it } from "vitest";

import {
  anchorPremiseSecondReviewEvidence,
  buildPremiseConsultResult,
  buildPremiseSecondReviewPrompt,
  comparePremiseLayers,
  comparePremiseVerdicts,
  parsePremiseSecondReviewOutput,
  suggestPremiseConsult,
} from "./premise-consult";
import type { PremiseLayerAssessment } from "./premise-review";
import { PREMISE_REVIEW_LAYERS } from "./premise-review";

const PREMISE = "主角重生回高三开学第一天，带着前世记忆她决定这次要活成自己。";

function layerFixture(
  layer: PremiseLayerAssessment["layer"],
  status: PremiseLayerAssessment["status"],
  confidence: number,
): PremiseLayerAssessment {
  return { layer, status, statement: `${layer} 的现状`, confidence };
}

const FOUR_LAYERS: PremiseLayerAssessment[] = PREMISE_REVIEW_LAYERS.map((layer, index) =>
  layerFixture(layer, index === 0 ? "weak" : "established", 0.5 + index * 0.1),
);

describe("suggestPremiseConsult", () => {
  it("suggests a consultation when the thinnest layer is at or below the threshold", () => {
    expect(suggestPremiseConsult(FOUR_LAYERS)).toBe(false);
    expect(
      suggestPremiseConsult([
        ...FOUR_LAYERS.slice(0, 3),
        layerFixture("irreducibility", "missing", 0.4),
      ]),
    ).toBe(true);
  });

  it("honours a custom threshold", () => {
    expect(suggestPremiseConsult(FOUR_LAYERS, { threshold: 0.6 })).toBe(true);
    expect(suggestPremiseConsult([], { threshold: 0.6 })).toBe(false);
  });
});

describe("comparePremiseVerdicts", () => {
  it("classifies agree / adjacent / opposite along the solid↔not-worth-writing axis", () => {
    expect(comparePremiseVerdicts("fixable", "fixable")).toBe("agree");
    expect(comparePremiseVerdicts("solid", "fixable")).toBe("adjacent");
    expect(comparePremiseVerdicts("fixable", "not-worth-writing")).toBe("adjacent");
    expect(comparePremiseVerdicts("solid", "not-worth-writing")).toBe("opposite");
    expect(comparePremiseVerdicts("not-worth-writing", "solid")).toBe("opposite");
  });
});

describe("comparePremiseLayers", () => {
  it("compares in canonical layer order and flags the differing layer", () => {
    const original = FOUR_LAYERS;
    const second = original.map((assessment) =>
      assessment.layer === "engine" ? { ...assessment, status: "established" as const } : assessment,
    );

    const comparisons = comparePremiseLayers(original, second);

    expect(comparisons.map((item) => item.layer)).toEqual([...PREMISE_REVIEW_LAYERS]);
    expect(comparisons.filter((item) => !item.agrees)).toEqual([
      {
        layer: "engine",
        originalStatus: "weak",
        secondStatus: "established",
        agrees: false,
      },
    ]);
  });

  it("skips layers that are missing on either side instead of guessing", () => {
    const comparisons = comparePremiseLayers(
      [layerFixture("engine", "weak", 0.5)],
      [layerFixture("engine", "weak", 0.5), layerFixture("desire", "established", 0.9)],
    );

    expect(comparisons).toEqual([
      { layer: "engine", originalStatus: "weak", secondStatus: "weak", agrees: true },
    ]);
  });
});

describe("anchorPremiseSecondReviewEvidence", () => {
  it("keeps anchored quotes, drops misses and empties, and counts the drops", () => {
    const { evidence, droppedEvidenceCount } = anchorPremiseSecondReviewEvidence(
      [
        { quote: "带着前世记忆她决定", note: "欲望具体" },
        { quote: "这句话不在原文里", note: "编造" },
        { quote: "", note: "空引文" },
      ],
      PREMISE,
    );

    expect(evidence).toEqual([{ quote: "带着前世记忆她决定", note: "欲望具体" }]);
    expect(droppedEvidenceCount).toBe(2);
  });
});

describe("parsePremiseSecondReviewOutput", () => {
  const validPayload = {
    verdict: "fixable",
    oneLineVerdict: "最强的成立论证也只能撑起三层。",
    layers: FOUR_LAYERS.map((assessment) => ({ ...assessment, comment: "" })),
    strongestArgument: "欲望具体且自带代价，值得写。",
    evidence: [{ quote: "带着前世记忆她决定", note: "欲望具体" }],
  };

  it("narrows a valid payload and clamps confidence into 0-1", () => {
    const payload = {
      ...validPayload,
      layers: [
        { ...FOUR_LAYERS[0]!, confidence: 1.4 },
        ...FOUR_LAYERS.slice(1).map((assessment) => ({ ...assessment, confidence: -0.2 })),
      ],
    };

    const parsed = parsePremiseSecondReviewOutput(payload);

    expect(parsed).not.toBeNull();
    expect(parsed!.layers[0]!.confidence).toBe(1);
    expect(parsed!.layers[1]!.confidence).toBe(0);
    expect(parsed!.evidence).toEqual([{ quote: "带着前世记忆她决定", note: "欲望具体" }]);
  });

  it("returns null when a layer is missing, duplicated, or carries a bad enum", () => {
    expect(parsePremiseSecondReviewOutput({ ...validPayload, layers: FOUR_LAYERS.slice(1) })).toBeNull();
    expect(
      parsePremiseSecondReviewOutput({
        ...validPayload,
        layers: [...validPayload.layers, validPayload.layers[0]],
      }),
    ).toBeNull();
    expect(
      parsePremiseSecondReviewOutput({
        ...validPayload,
        layers: validPayload.layers.map((assessment: { layer: string }, index: number) =>
          index === 0 ? { ...assessment, status: "fine" } : assessment,
        ),
      }),
    ).toBeNull();
    expect(parsePremiseSecondReviewOutput({ ...validPayload, verdict: "masterpiece" })).toBeNull();
    expect(parsePremiseSecondReviewOutput("不是对象")).toBeNull();
  });

  it("drops malformed evidence entries instead of rejecting the whole output", () => {
    const parsed = parsePremiseSecondReviewOutput({
      ...validPayload,
      evidence: [
        { quote: "带着前世记忆她决定" },
        { quote: "带着前世记忆她决定", note: 42 },
        "不是对象",
      ],
    });

    expect(parsed!.evidence).toEqual([{ quote: "带着前世记忆她决定" }]);
  });
});

describe("buildPremiseConsultResult", () => {
  it("computes the comparison in code and never overwrites the original verdict", () => {
    const original = {
      verdict: "not-worth-writing" as const,
      oneLineVerdict: "欲望空泛，冲突缺位。",
      layers: FOUR_LAYERS.map((assessment) =>
        assessment.layer === "engine"
          ? { ...assessment, status: "missing" as const }
          : assessment,
      ),
    };
    const second = {
      verdict: "solid" as const,
      oneLineVerdict: "欲望具体且代价明确。",
      layers: FOUR_LAYERS.map((assessment) => ({ ...assessment, status: "established" as const })),
      strongestArgument: "欲望具体且自带代价。",
      evidence: [],
    };

    const result = buildPremiseConsultResult({
      consultId: "consult-1",
      mode: "model",
      trigger: "author-disagrees",
      original,
      second,
      droppedEvidenceCount: 1,
    });

    expect(result.schemaVersion).toBe("premise-consult.v1");
    expect(result.original.verdict).toBe("not-worth-writing");
    expect(result.second.verdict).toBe("solid");
    expect(result.comparison.verdictRelation).toBe("opposite");
    expect(result.comparison.layerComparisons.filter((item) => !item.agrees)).toEqual([
      { layer: "engine", originalStatus: "missing", secondStatus: "established", agrees: false },
    ]);
    expect(result.comparison.droppedEvidenceCount).toBe(1);
  });
});

describe("buildPremiseSecondReviewPrompt", () => {
  it("carries the adversarial stance, the premise, and the blind JSON contract", () => {
    const bundle = buildPremiseSecondReviewPrompt({
      genre: "都市重生",
      premiseText: PREMISE,
    });

    expect(bundle.id).toBe("premise-second-review.v1");
    expect(bundle.messages[0]!.content).toContain("立场与第一审稿人相反");
    expect(bundle.messages[0]!.content).toContain("必须如实给 not-worth-writing");
    expect(bundle.messages[1]!.content).toContain(PREMISE);
    expect(bundle.messages[1]!.content).toContain("题材提示：都市重生");
    for (const layer of PREMISE_REVIEW_LAYERS) {
      expect(bundle.messages[1]!.content).toContain(layer);
    }
    expect(bundle.messages[1]!.content).toContain("不是判断正确的概率");
  });
});
