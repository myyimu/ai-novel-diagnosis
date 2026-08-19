import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { PremiseLlmVerifier } from "./premise-llm-verifier";
import { PremiseReviewService } from "./premise-review.service";
import { PremiseReviewDto } from "./dto/premise-review.dto";

const premiseText =
  "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流，最后站上颁奖礼揭穿当年背叛他的所有人。";

const mockProvider: ProviderConfigDto = { kind: "mock" };
const realProvider: ProviderConfigDto = { kind: "openai-compatible" };

function modelReviewJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    premiseSummary: "一个重生复仇兼流量收割的故事。",
    coreConflict: "主角想揭穿所有背叛者，而背叛者如今掌握他的舆论生死。",
    protagonistDesire: "避开前世的每一个遗憾。",
    opposingForce: "掌握流量与资源的背叛者们。",
    irreducibilityTest:
      "换成职场背景后复仇两难仍然成立，发动机不依赖重生设定。",
    readerHookQuestion: "这一次他会先原谅还是先揭穿？",
    engineVerdict: "fixable",
    oneLineVerdict: "发动机成立，但阻力需要从被动遗憾改为主动对抗。",
    layers: [
      {
        layer: "engine",
        status: "weak",
        statement: "欲望明确但障碍被动。",
        confidence: 0.7,
        comment: "遗憾不会自己升级为压力。",
      },
      {
        layer: "desire",
        status: "established",
        statement: "避开所有遗憾。",
        confidence: 0.8,
      },
      {
        layer: "conflict",
        status: "missing",
        statement: "",
        confidence: 0.2,
        comment: "没有持续施压的对立面。",
      },
      {
        layer: "irreducibility",
        status: "established",
        statement: "两难独立于设定。",
        confidence: 0.75,
      },
    ],
    clicheFindings: [
      {
        id: "cliche-1",
        layer: "engine",
        severity: "high",
        title: "无代价重生金手指",
        claim: "前世记忆没有任何代价，冲突无法自我升级。",
        evidence: [{ quote: "带着前世记忆避开所有遗憾", note: "金手指无对价" }],
        patternReference: "开局无敌重生流",
        suggestion: "让每次使用前世记忆都消耗他现在最在乎的关系。",
      },
    ],
    upgradeDirections: [
      {
        directionId: "direction-emotion",
        orientation: "emotion",
        pitch: "把复仇故事改成必须先救仇人的故事。",
        changedConflict: "越接近揭穿目标，越需要那个背叛者活着并信任他。",
        preservedElements: ["重生设定", "校园到顶流的时间跨度"],
        risk: "情感线会让爽点节奏变慢。",
      },
    ],
    ...overrides,
  });
}

describe("PremiseReviewService", () => {
  let service: PremiseReviewService;
  let chat: jest.Mock;
  let forProvider: jest.Mock;

  beforeEach(async () => {
    chat = jest.fn();
    forProvider = jest.fn().mockReturnValue({
      verify: jest.fn().mockResolvedValue({
        findingId: "cliche-1",
        status: "verified",
        reason: "该模式确实泛滥且引文相符。",
        confidence: 0.9,
      }),
    });

    const module = await Test.createTestingModule({
      providers: [
        PremiseReviewService,
        { provide: ModelProviderService, useValue: { chat } },
        { provide: PremiseLlmVerifier, useValue: { forProvider } },
      ],
    }).compile();

    service = module.get(PremiseReviewService);
  });

  function dto(overrides: Partial<PremiseReviewDto> = {}): PremiseReviewDto {
    return { premiseText, provider: mockProvider, ...overrides };
  }

  it("should return a deterministic demo review for mock providers", async () => {
    const result = await service.review(dto());

    expect(result.schemaVersion).toBe("premise-review.v1");
    expect(result.engineVerdict).toBe("fixable");
    expect(result.oneLineVerdict).toContain("演示");
    expect(result.layers).toHaveLength(4);
    expect(result.verification).toBeUndefined();
    // Every review run carries a server-stamped id for later decision persistence.
    expect(result.reviewId).toEqual(expect.any(String));
    // Demo evidence quotes the author's own text so the UI path stays honest.
    for (const finding of result.clicheFindings) {
      for (const quote of finding.evidence) {
        expect(premiseText).toContain(quote.quote);
      }
    }
    expect(chat).not.toHaveBeenCalled();
  });

  it("should normalize and verify a model review for real providers", async () => {
    chat.mockResolvedValue(modelReviewJson());

    const result = await service.review(dto({ provider: realProvider }));

    expect(chat).toHaveBeenCalledTimes(1);
    expect(result.engineVerdict).toBe("fixable");
    expect(result.reviewId).toEqual(expect.any(String));
    expect(result.coreConflict).toContain("背叛者");
    expect(result.layers.map((layer) => layer.layer)).toEqual([
      "engine",
      "desire",
      "conflict",
      "irreducibility",
    ]);
    expect(result.clicheFindings[0]?.status).toBe("verified");
    expect(result.verification).toMatchObject({
      attemptedCount: 1,
      verifiedCount: 1,
      rejectedCount: 0,
    });
  });

  it("should reject model output with an illegal engineVerdict", async () => {
    chat.mockResolvedValue(modelReviewJson({ engineVerdict: "masterpiece" }));

    await expect(
      service.review(dto({ provider: realProvider })),
    ).rejects.toThrow(BadRequestException);
  });

  it("should reject cliché findings whose quotes are fabricated", async () => {
    chat.mockResolvedValue(
      modelReviewJson({
        clicheFindings: [
          {
            id: "cliche-1",
            layer: "engine",
            severity: "low",
            title: "编造的俗套",
            claim: "引文不在原文中。",
            evidence: [{ quote: "这句话不存在于作者输入" }],
          },
        ],
      }),
    );

    const result = await service.review(dto({ provider: realProvider }));

    expect(result.clicheFindings[0]?.evidence).toEqual([]);
    expect(result.verification?.rejectedCount).toBe(1);
    expect(result.verification?.verifiedCount).toBe(0);
  });

  it("should fill absent audit layers with a missing assessment", async () => {
    chat.mockResolvedValue(
      modelReviewJson({
        layers: [
          {
            layer: "engine",
            status: "weak",
            statement: "只返回了一层。",
            confidence: 0.5,
          },
        ],
      }),
    );

    const result = await service.review(dto({ provider: realProvider }));

    expect(result.layers).toHaveLength(4);
    const conflict = result.layers.find((layer) => layer.layer === "conflict");
    expect(conflict?.status).toBe("missing");
    expect(conflict?.statement).toBe("");
  });

  it("should default to the shared provider when none is supplied", async () => {
    chat.mockResolvedValue(modelReviewJson());

    await service.review({ premiseText });

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "openai-compatible",
        preset: "shared-gpu",
      }),
      expect.anything(),
      expect.anything(),
    );
  });
});
