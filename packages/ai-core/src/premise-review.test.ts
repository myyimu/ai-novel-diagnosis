import { describe, expect, it } from "vitest";
import {
  PREMISE_LAYER_META,
  PREMISE_REVIEW_LAYERS,
  PREMISE_UPGRADE_ORIENTATION_LABELS,
  type PremiseClicheFinding,
  type PremiseLayerAssessment,
  type PremiseReviewResult,
  type PremiseUpgradeDirection,
} from "./premise-review";

function layer(
  key: PremiseLayerAssessment["layer"],
  status: PremiseLayerAssessment["status"] = "established",
): PremiseLayerAssessment {
  return {
    layer: key,
    status,
    statement: `${PREMISE_LAYER_META[key].label}现状一句话`,
    confidence: 0.7,
  };
}

function clicheFinding(): PremiseClicheFinding {
  return {
    id: "cliche-1",
    layer: "engine",
    severity: "high",
    title: "无代价金手指",
    claim: "主角获得力量没有任何代价，冲突无法自我升级。",
    evidence: [{ quote: "他醒来发现自己无所不能", note: "金手指无对价" }],
    patternReference: "开局无敌流",
    suggestion: "让力量每次使用都消耗他最在乎的关系。",
    status: "candidate",
  };
}

function upgradeDirection(): PremiseUpgradeDirection {
  return {
    directionId: "direction-emotion",
    orientation: "emotion",
    pitch: "把仇恨故事改成必须爱仇人的故事。",
    changedConflict: "主角越接近复仇目标，越离不开那个必须毁掉的人。",
    preservedElements: ["主角的出身设定", "原有的反派阵营"],
    risk: "情感线比重上升，爽点节奏会变慢。",
  };
}

function result(overrides: Partial<PremiseReviewResult> = {}): PremiseReviewResult {
  return {
    schemaVersion: "premise-review.v1",
    premiseSummary: "一个少年用禁忌力量向灭门仇人复仇的故事。",
    coreConflict: "主角想复仇，而仇人是唯一能救他妹妹的人。",
    protagonistDesire: "救妹妹，且不放弃复仇。",
    opposingForce: "仇人的救命之恩与宗门的追杀令。",
    irreducibilityTest: "换成现代都市背景后复仇与救人两难依然成立，发动机不依赖设定。",
    readerHookQuestion: "他会在救人与复仇之间选哪一边？",
    engineVerdict: "fixable",
    oneLineVerdict: "发动机成立但俗套点密集，修补后值得写。",
    layers: PREMISE_REVIEW_LAYERS.map((key) => layer(key)),
    clicheFindings: [clicheFinding()],
    upgradeDirections: [upgradeDirection()],
    ...overrides,
  };
}

describe("premise review contract", () => {
  it("should keep the four audit layers on a fixed axis with metadata", () => {
    expect(PREMISE_REVIEW_LAYERS).toEqual(["engine", "desire", "conflict", "irreducibility"]);
    for (const key of PREMISE_REVIEW_LAYERS) {
      expect(PREMISE_LAYER_META[key].label).toBeTruthy();
      expect(PREMISE_LAYER_META[key].question).toBeTruthy();
    }
  });

  it("should label all three upgrade orientations", () => {
    expect(PREMISE_UPGRADE_ORIENTATION_LABELS).toEqual({
      emotion: "情感",
      intrigue: "权谋",
      war: "战争",
    });
  });

  it("should quote the author's own premise as cliché evidence", () => {
    const finding = clicheFinding();

    expect(finding.evidence[0]?.quote).toBe("他醒来发现自己无所不能");
    expect(finding.status).toBe("candidate");
  });

  it("should build a complete result with the verification summary optional", () => {
    const withoutVerification = result();

    expect(withoutVerification.verification).toBeUndefined();
    expect(withoutVerification.engineVerdict).toBe("fixable");
    expect(withoutVerification.layers).toHaveLength(4);

    const withVerification = result({
      engineVerdict: "not-worth-writing",
      verification: {
        attemptedCount: 1,
        skippedCount: 0,
        rejectedCount: 0,
        unavailableCount: 0,
        verifiedCount: 1,
      },
    });

    expect(withVerification.engineVerdict).toBe("not-worth-writing");
    expect(withVerification.verification?.verifiedCount).toBe(1);
  });

  it("should keep upgrade directions constrained to replacing the core conflict", () => {
    const direction = upgradeDirection();

    expect(Object.keys(PREMISE_UPGRADE_ORIENTATION_LABELS)).toContain(direction.orientation);
    expect(direction.changedConflict.length).toBeGreaterThan(0);
    expect(direction.preservedElements?.length).toBeGreaterThan(0);
  });
});
