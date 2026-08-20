import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { ConsultationRecordsRepository } from "@/dao/repositories/consultation-records.repository";
import { PremiseConsultService } from "./premise-consult.service";
import type { PremiseConsultDto } from "./dto/premise-consult.dto";

const premiseText =
  "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流，最后站上颁奖礼揭穿当年背叛他的所有人。";

const mockProvider: ProviderConfigDto = { kind: "mock" };
const realProvider: ProviderConfigDto = { kind: "openai-compatible" };

const originalLayers = [
  {
    layer: "engine",
    status: "missing",
    statement: "欲望空泛。",
    confidence: 0.3,
  },
  {
    layer: "desire",
    status: "weak",
    statement: "避开所有遗憾。",
    confidence: 0.8,
  },
  { layer: "conflict", status: "missing", statement: "", confidence: 0.2 },
  {
    layer: "irreducibility",
    status: "established",
    statement: "两难独立于设定。",
    confidence: 0.75,
  },
];

function makeDto(
  overrides: Partial<PremiseConsultDto> = {},
): PremiseConsultDto {
  return {
    premiseText,
    genre: "都市重生",
    trigger: "author-disagrees",
    original: {
      verdict: "not-worth-writing",
      oneLineVerdict: "欲望空泛，冲突缺位。",
      layers: originalLayers,
    },
    ...overrides,
  } as PremiseConsultDto;
}

function secondReviewJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    verdict: "solid",
    oneLineVerdict: "欲望具体且自带代价，值得写。",
    layers: [
      {
        layer: "engine",
        status: "established",
        statement: "复仇与流量的对撞。",
        confidence: 0.9,
      },
      {
        layer: "desire",
        status: "established",
        statement: "避开所有遗憾。",
        confidence: 0.85,
      },
      {
        layer: "conflict",
        status: "established",
        statement: "背叛者掌握他的舆论生死。",
        confidence: 0.8,
      },
      {
        layer: "irreducibility",
        status: "established",
        statement: "两难独立于设定。",
        confidence: 0.75,
      },
    ],
    strongestArgument: "欲望具体且自带代价：前世记忆是资产也是把柄。",
    evidence: [
      { quote: "带着前世记忆避开所有遗憾", note: "欲望具体" },
      { quote: "这句引文不在原文里", note: "编造" },
    ],
    ...overrides,
  });
}

describe("PremiseConsultService", () => {
  let service: PremiseConsultService;
  let chat: jest.Mock;
  let insertPremiseConsult: jest.Mock;

  beforeEach(async () => {
    chat = jest.fn();
    insertPremiseConsult = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        PremiseConsultService,
        { provide: ModelProviderService, useValue: { chat } },
        {
          provide: ConsultationRecordsRepository,
          useValue: { insertPremiseConsult },
        },
      ],
    }).compile();
    service = module.get(PremiseConsultService);
  });

  it("should return a demo-anchored consult with a computed comparison when provider is mock", async () => {
    const result = await service.consult(makeDto({ provider: mockProvider }));

    expect(result.mode).toBe("mock");
    expect(result.original.verdict).toBe("not-worth-writing");
    expect(result.second.verdict).toBe("fixable");
    expect(result.second.evidence[0]!.quote).toBe(premiseText.slice(0, 24));
    expect(result.comparison.verdictRelation).toBe("adjacent");
    expect(result.comparison.droppedEvidenceCount).toBe(0);
    expect(chat).not.toHaveBeenCalled();
  });

  it("should parse, anchor, and compare the second review for a real provider", async () => {
    chat.mockResolvedValue(secondReviewJson());

    const result = await service.consult(makeDto({ provider: realProvider }));

    expect(result.mode).toBe("model");
    expect(result.original.verdict).toBe("not-worth-writing");
    expect(result.second.verdict).toBe("solid");
    expect(result.comparison.verdictRelation).toBe("opposite");
    expect(result.second.evidence).toEqual([
      { quote: "带着前世记忆避开所有遗憾", note: "欲望具体" },
    ]);
    expect(result.comparison.droppedEvidenceCount).toBe(1);
    expect(result.comparison.layerComparisons).toHaveLength(4);

    const [provider, messages, options] = chat.mock.calls[0] as unknown as [
      ProviderConfigDto,
      Array<{ role: string; content: string }>,
      { jsonSchema: { name: string }; usageMeta: { stage: string } },
    ];
    expect(provider).toBe(realProvider);
    expect(messages[0]!.content).toContain("立场与第一审稿人相反");
    expect(options.jsonSchema.name).toBe("premise_second_review_result");
    expect(options.usageMeta.stage).toBe("premise-consult");
  });

  it("should throw BadRequest when the second review misses an audit layer", async () => {
    chat.mockResolvedValue(
      secondReviewJson({
        layers: JSON.parse(secondReviewJson()).layers.slice(0, 3),
      }),
    );

    await expect(
      service.consult(makeDto({ provider: realProvider })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should throw BadRequest when both raw and repaired outputs stay unparseable", async () => {
    chat.mockResolvedValue("这不是 JSON");

    await expect(
      service.consult(makeDto({ provider: realProvider })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it("should default to the shared-gpu provider when none is passed", async () => {
    chat.mockResolvedValue(secondReviewJson());

    await service.consult(makeDto());

    expect(chat.mock.calls[0][0]).toEqual({
      preset: "shared-gpu",
      kind: "openai-compatible",
    });
  });

  it("should persist the exact presented result and attach recordId when projectId is given for a real provider", async () => {
    chat.mockResolvedValue(secondReviewJson());
    insertPremiseConsult.mockResolvedValue({
      id: "record-1",
      projectId: "project-1",
      verdictRelation: "opposite",
    });

    const result = await service.consult(
      makeDto({ provider: realProvider, projectId: "project-1" }),
    );

    expect(insertPremiseConsult).toHaveBeenCalledWith({
      projectId: "project-1",
      result: expect.objectContaining({ consultId: result.consultId }),
    });
    expect(result.recordId).toBe("record-1");
    // The persisted payload is the exact result the author saw — comparison included.
    const persisted = insertPremiseConsult.mock.calls[0][0].result;
    expect(persisted.comparison.verdictRelation).toBe("opposite");
    expect(persisted.second.evidence).toEqual([
      { quote: "带着前世记忆避开所有遗憾", note: "欲望具体" },
    ]);
  });

  it("should never persist demo-mode consults into the medical record", async () => {
    await service.consult(
      makeDto({ provider: mockProvider, projectId: "project-1" }),
    );

    expect(insertPremiseConsult).not.toHaveBeenCalled();
  });

  it("should still return the consult when persistence fails, without recordId", async () => {
    chat.mockResolvedValue(secondReviewJson());
    insertPremiseConsult.mockRejectedValue(new Error("pglite unavailable"));

    const result = await service.consult(
      makeDto({ provider: realProvider, projectId: "project-1" }),
    );

    expect(result.mode).toBe("model");
    expect(result.recordId).toBeUndefined();
  });
});
