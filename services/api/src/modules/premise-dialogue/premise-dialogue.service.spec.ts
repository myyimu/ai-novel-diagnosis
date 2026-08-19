import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import type {
  PremiseDialogueSessionRecord,
  CreatePremiseDialogueSessionData,
  UpdatePremiseDialogueSessionData,
} from "@/dao/repositories/premise-dialogue.repository";
import { PremiseDialogueRepository } from "@/dao/repositories/premise-dialogue.repository";
import { PremiseDialogueService } from "./premise-dialogue.service";
import type { StartPremiseDialogueDto } from "./dto/premise-dialogue.dto";

/** In-memory stand-in for the repository (DB is an external dependency here). */
class FakePremiseDialogueRepository {
  readonly records = new Map<string, PremiseDialogueSessionRecord>();

  async createSession(data: CreatePremiseDialogueSessionData) {
    const record: PremiseDialogueSessionRecord = {
      id: data.id,
      projectId: data.session.projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      layers: data.layers,
      editorContract: data.editorContract,
      session: data.session,
    };
    this.records.set(record.id, record);
    return structuredClone(record);
  }

  async findById(id: string) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async update(id: string, patch: UpdatePremiseDialogueSessionData) {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }
    const next: PremiseDialogueSessionRecord = structuredClone(record);
    next.updatedAt = new Date();
    if (patch.turns) next.session.turns = patch.turns;
    if (patch.status) next.session.status = patch.status;
    if (patch.authorContract !== undefined) {
      next.session.authorContract = patch.authorContract ?? undefined;
    }
    if (patch.contractReview !== undefined) {
      next.session.contractReview = patch.contractReview ?? undefined;
    }
    this.records.set(id, next);
    return structuredClone(next);
  }
}

const REAL_PROVIDER: ProviderConfigDto = {
  preset: "shared-gpu",
  kind: "openai-compatible",
};
const MOCK_PROVIDER: ProviderConfigDto = { kind: "mock" };

function makeReview(): Record<string, unknown> {
  return {
    reviewId: "review-1",
    layers: [
      { layer: "engine", status: "established", statement: "复仇动机成立", confidence: 0.9 },
      { layer: "desire", status: "weak", statement: "欲望模糊", confidence: 0.4 },
      { layer: "conflict", status: "missing", statement: "阻力缺位", confidence: 0.9 },
      { layer: "irreducibility", status: "missing", statement: "设定可替换", confidence: 0.2 },
    ],
    coreConflict: "重生者与命运的重逢对撞",
    protagonistDesire: "她想亲手改写高考结局",
    opposingForce: "掌握信息的神秘班主任",
    irreducibilityTest: "换成都市白领故事即不成立",
    readerHookQuestion: "重来一次真能赢吗？",
  };
}

function makeStartDto(
  overrides: Partial<Record<string, unknown>> = {},
): StartPremiseDialogueDto {
  return {
    projectId: "project-1",
    premiseText: "主角重生回高三开学第一天，带着前世记忆她决定这次要活成自己。",
    genre: "都市重生",
    review: makeReview(),
    ...overrides,
  } as StartPremiseDialogueDto;
}

async function buildService(
  repository: FakePremiseDialogueRepository,
  chat: jest.Mock,
): Promise<PremiseDialogueService> {
  const module = await Test.createTestingModule({
    providers: [
      PremiseDialogueService,
      { provide: PremiseDialogueRepository, useValue: repository },
      { provide: ModelProviderService, useValue: { chat } },
    ],
  }).compile();
  return module.get(PremiseDialogueService);
}

describe("PremiseDialogueService", () => {
  let repository: FakePremiseDialogueRepository;
  let chat: jest.Mock;
  let service: PremiseDialogueService;

  beforeEach(async () => {
    repository = new FakePremiseDialogueRepository();
    chat = jest.fn();
    service = await buildService(repository, chat);
  });

  describe("startSession", () => {
    it("should create a session and ask the weakest unasked layer when the review is valid", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));

      expect(record.session.turns).toHaveLength(1);
      expect(record.session.turns[0].layer).toBe("irreducibility");
      expect(record.session.turns[0].ask.question).toMatch(/[？?]$/);
      expect(record.session.status).toBe("active");
      expect(chat).not.toHaveBeenCalled();
    });

    it("should throw BadRequest when the review lacks a reviewId", async () => {
      const review = makeReview();
      delete review.reviewId;
      await expect(
        service.startSession(makeStartDto({ review, provider: MOCK_PROVIDER })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.records.size).toBe(0);
    });

    it("should throw BadRequest when the review does not carry exactly four layers", async () => {
      const review = makeReview();
      review.layers = (review.layers as unknown[]).slice(0, 3);
      await expect(
        service.startSession(makeStartDto({ review, provider: MOCK_PROVIDER })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should throw BadRequest when an editor contract field is missing", async () => {
      const review = makeReview();
      delete review.opposingForce;
      await expect(
        service.startSession(makeStartDto({ review, provider: MOCK_PROVIDER })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should throw BadRequest when an ask is generated without a question mark", async () => {
      chat.mockResolvedValue(
        JSON.stringify({
          focusedLayer: "irreducibility",
          question: "这一层缺少不可替代性",
          whyThisQuestion: "需要作者自己回答",
          hintQuote: "",
        }),
      );
      const record = await service
        .startSession(makeStartDto({ provider: REAL_PROVIDER }))
        .catch(() => null);
      expect(record).toBeNull();
      expect(repository.records.size).toBe(1);
      const stored = repository.records.values().next().value;
      expect(stored?.session.turns).toHaveLength(0);
    });
  });

  describe("getSession", () => {
    it("should throw NotFoundException when the session does not exist", async () => {
      await expect(service.getSession("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("answerTurn", () => {
    it("should persist the answer and store an anchored judgment when the quote hits the answer", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));

      const answered = await service.answerTurn(record.id, {
        answer: "她想考上重点大学，每天只睡四个小时背单词，把前世的遗憾一个个补回来。",
        provider: MOCK_PROVIDER,
      });

      const turn = answered.session.turns[0];
      expect(turn.authorAnswer).toContain("每天只睡四个小时");
      expect(turn.judge?.verdict).toBe("not-yet");
      expect(turn.judgeRejected).toBeUndefined();
    });

    it("should record judgeRejected quote-not-found when the quote misses the author answer", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      chat.mockResolvedValue(
        JSON.stringify({
          verdict: "strengthened",
          quoteAuthor: "这段话完全不在作者的回答里",
          reason: "判定理由",
          layerStatusSuggestion: "established",
          followUp: "接下来她要面对什么？",
          disagreementNote: "",
        }),
      );

      const answered = await service.answerTurn(record.id, {
        answer: "她想考上重点大学，每天只睡四个小时背单词。",
        provider: REAL_PROVIDER,
      });

      const turn = answered.session.turns[0];
      expect(turn.judge).toBeUndefined();
      expect(turn.judgeRejected).toEqual({ reason: "quote-not-found" });
    });

    it("should throw BadRequest when there is no pending question", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await service.answerTurn(record.id, {
        answer: "第一次回答，包含足够的细节。",
        provider: MOCK_PROVIDER,
      });

      await expect(
        service.answerTurn(record.id, { answer: "第二次回答。", provider: MOCK_PROVIDER }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("retryJudge", () => {
    it("should recover with an anchored judgment when the model failed once", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      chat
        .mockResolvedValueOnce("这不是 JSON")
        .mockResolvedValueOnce("修复后仍然不是 JSON");
      const failed = await service.answerTurn(record.id, {
        answer: "她想考上重点大学，每天只睡四个小时背单词。",
        provider: REAL_PROVIDER,
      });
      expect(failed.session.turns[0].judgeRejected).toEqual({ reason: "model-failed" });

      chat.mockResolvedValueOnce(
        JSON.stringify({
          verdict: "not-yet",
          quoteAuthor: "每天只睡四个小时背单词",
          reason: "锚定成功",
          layerStatusSuggestion: "weak",
          followUp: "谁在阻止她？",
          disagreementNote: "",
        }),
      );
      const retried = await service.retryJudge(record.id, REAL_PROVIDER);
      expect(retried.session.turns[0].judge?.quoteAuthor).toBe("每天只睡四个小时背单词");
      expect(retried.session.turns[0].judgeRejected).toBeUndefined();
    });

    it("should throw BadRequest when the rejection is final (quote-not-found)", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      chat.mockResolvedValue(
        JSON.stringify({
          verdict: "strengthened",
          quoteAuthor: "不存在的引用",
          reason: "判定理由",
          layerStatusSuggestion: "established",
          followUp: "",
          disagreementNote: "",
        }),
      );
      await service.answerTurn(record.id, {
        answer: "她想考上重点大学，每天只睡四个小时背单词。",
        provider: REAL_PROVIDER,
      });

      await expect(service.retryJudge(record.id, REAL_PROVIDER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("next / finish (orchestration)", () => {
    it("should walk missing → missing → weak layers and collect after the hard cap of three rounds", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      expect(record.session.turns[0].layer).toBe("irreducibility");

      const answer = { answer: "这一层我自己来补：具体的人物与场景。", provider: MOCK_PROVIDER };
      await service.answerTurn(record.id, answer);
      const round2 = await service.next(record.id, MOCK_PROVIDER);
      expect(round2.session.turns[1].layer).toBe("conflict");

      await service.answerTurn(record.id, answer);
      const round3 = await service.next(record.id, MOCK_PROVIDER);
      expect(round3.session.turns[2].layer).toBe("desire");

      await service.answerTurn(record.id, answer);
      const collected = await service.next(record.id, MOCK_PROVIDER);
      expect(collected.session.status).toBe("collecting");
      expect(collected.session.turns).toHaveLength(3);
    });

    it("should throw BadRequest when advancing with an unresolved turn", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await expect(service.next(record.id, MOCK_PROVIDER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("should collect early on finish and refuse further answers", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      const finished = await service.finish(record.id);
      expect(finished.session.status).toBe("collecting");

      await expect(
        service.answerTurn(record.id, { answer: "收束后不能再答。", provider: MOCK_PROVIDER }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("submitContract", () => {
    const contractBody = {
      premiseSummary: "重生高三的她这一次要亲手改写结局",
      coreConflict: "知晓未来的学生与既定命运的对撞",
      protagonistDesire: "考上重点大学并守住家人的健康",
      opposingForce: "同样重生且更早行动的对立面同学",
      irreducibilityTest: "换成都市职场故事即不成立",
      readerHookQuestion: "重来一次真的能赢吗？",
    };

    it("should throw BadRequest when the dialogue is still active", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await expect(
        service.submitContract(record.id, { ...contractBody }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should complete the session without a model call when review is not requested", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await service.finish(record.id);

      const result = await service.submitContract(record.id, { ...contractBody });
      expect(result.record.session.status).toBe("completed");
      expect(result.record.session.authorContract?.coreConflict).toBe(
        contractBody.coreConflict,
      );
      expect(result.record.session.contractReview).toBeUndefined();
      expect(result.contractReviewNotice).toBeUndefined();
      expect(chat).not.toHaveBeenCalled();
    });

    it("should store an anchored review when the quote hits one contract field", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await service.finish(record.id);

      const result = await service.submitContract(record.id, {
        ...contractBody,
        requestReview: true,
        provider: MOCK_PROVIDER,
      });
      expect(result.record.session.contractReview?.feynmanVerdict).toBe("partial");
      expect(result.record.session.contractReview?.droppedPointCount).toBe(0);
      expect(result.contractReviewNotice).toBeUndefined();
    });

    it("should reject the review with an honest notice when quoteAuthor stitches two fields", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await service.finish(record.id);
      chat.mockResolvedValue(
        JSON.stringify({
          divergencePoints: [],
          feynmanVerdict: "clear",
          quoteAuthor: `${contractBody.coreConflict.slice(0, 4)}；${contractBody.protagonistDesire.slice(0, 4)}`,
          reason: "拼接两个字段的原话",
        }),
      );

      const result = await service.submitContract(record.id, {
        ...contractBody,
        requestReview: true,
        provider: REAL_PROVIDER,
      });
      expect(result.record.session.status).toBe("completed");
      expect(result.record.session.contractReview).toBeUndefined();
      expect(result.contractReviewNotice).toBe("评判未能锚定原话，已被服务端拒绝");
    });

    it("should return a retry notice instead of throwing when the review call fails", async () => {
      const record = await service.startSession(makeStartDto({ provider: MOCK_PROVIDER }));
      await service.finish(record.id);
      chat.mockRejectedValue(new Error("network down"));

      const result = await service.submitContract(record.id, {
        ...contractBody,
        requestReview: true,
        provider: REAL_PROVIDER,
      });
      expect(result.record.session.status).toBe("completed");
      expect(result.record.session.contractReview).toBeUndefined();
      expect(result.contractReviewNotice).toBe("契约点评生成失败，可重新提交重试");
    });
  });
});
