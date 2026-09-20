import { Test } from "@nestjs/testing";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import type { ChapterExperiment } from "@ai-novel-diagnosis/ai-core";
import { ChapterExperimentsRepository } from "@/dao/repositories/chapter-experiments.repository";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { ChapterExperimentService } from "./chapter-experiment.service";
import type { ChapterExperimentActionDto } from "./dto/chapter-experiment.dto";

const original =
  "父亲把旧信放进抽屉，没有解释。窗外的雨一直没有停，桌上的饭菜已经凉了。孩子又问了一遍，父亲只是让他先把作业写完，自己转身去了厨房。";
const provider = {
  kind: "openai-compatible" as const,
  model: "writer",
  apiKey: "must-not-persist",
};

describe("ChapterExperimentService", () => {
  let service: ChapterExperimentService;
  let chat: jest.Mock;
  let records: Map<string, ChapterExperiment>;
  let save: jest.Mock;
  let trial: ChapterExperiment;

  beforeEach(async () => {
    records = new Map();
    chat = jest.fn();
    save = jest.fn(async (next: ChapterExperiment, revision: number) => {
      if (records.get(next.id)?.revision !== revision) return false;
      records.set(next.id, structuredClone(next));
      return true;
    });
    const module = await Test.createTestingModule({
      providers: [
        ChapterExperimentService,
        { provide: ModelProviderService, useValue: { chat } },
        {
          provide: ChapterExperimentsRepository,
          useValue: {
            create: async (value: ChapterExperiment) => {
              records.set(value.id, structuredClone(value));
              return value;
            },
            find: async (id: string) =>
              records.has(id) ? structuredClone(records.get(id)) : null,
            list: async () => [],
            save,
          },
        },
      ],
    }).compile();
    service = module.get(ChapterExperimentService);
    trial = await service.create({
      projectId: "book",
      chapterTitle: "第一章",
      originalText: original,
      goal: "让读者察觉隐瞒",
      preserve: "不增加反派",
      context: "父亲害怕孩子知道过去。",
      diagnosis: "旧诊断认为必须加入反派，作者对此存疑。",
    });
  });

  async function act(
    input: Omit<ChapterExperimentActionDto, "revision">,
  ): Promise<ChapterExperiment> {
    trial = await service.act(trial.id, { ...input, revision: trial.revision });
    return trial;
  }
  async function confirm(): Promise<void> {
    chat.mockResolvedValueOnce(
      JSON.stringify({
        reply: "你希望读者何时察觉隐瞒？",
        quote: "父亲把旧信放进抽屉",
        suggestedPlan: "在旧信处加一个迟疑的动作，不解释秘密。",
      }),
    );
    await act({ action: "ask", message: "希望读者早点察觉", provider });
    await act({
      action: "confirm-plan",
      plan: "只补一个停顿，保留日常和悬念。",
    });
  }

  it("should preserve original and author decisions when both routes are revised", async () => {
    await confirm();
    chat.mockResolvedValueOnce(
      JSON.stringify({ text: original + "普通版本第一轮。" }),
    );
    await act({ action: "generate", route: "baseline", provider });
    chat.mockResolvedValueOnce(
      JSON.stringify({ text: original + "引导版本第一轮。" }),
    );
    await act({ action: "generate", route: "guided", provider });
    const normalPrompt = chat.mock.calls[1][1][1].content as string;
    const guidedPrompt = chat.mock.calls[2][1][1].content as string;
    expect(chat.mock.calls[0][1][1].content).toContain(trial.diagnosis);
    expect(normalPrompt).not.toContain(trial.diagnosis);
    expect(guidedPrompt).not.toContain(trial.diagnosis);
    expect(JSON.parse(normalPrompt).text).toBe(original);
    expect(normalPrompt).not.toContain(trial.plan);
    expect(guidedPrompt).toContain(trial.plan);
    expect(guidedPrompt).not.toContain("普通版本第一轮");
    expect(trial.versions.map((item) => item.parentId)).toEqual([
      "original",
      "original",
    ]);
    expect(JSON.stringify(await service.get(trial.id))).not.toContain(
      "must-not-persist",
    );
    expect(trial.originalText).toBe(original);
    await act({
      action: "evaluate",
      leftId: "original",
      rightId: trial.versions[0]!.id,
      choice: "left",
      reason: "原稿更克制",
    });
    expect((await service.get(trial.id)).decisions[0]?.choice).toBe("left");
  });

  it("should retain lineage and stop at two rounds when a route is repeated", async () => {
    await confirm();
    chat.mockResolvedValueOnce(JSON.stringify({ text: original + "第一轮。" }));
    await act({ action: "generate", route: "guided", provider });
    const first = trial.versions[0]!;
    chat.mockResolvedValueOnce(JSON.stringify({ text: original + "第二轮。" }));
    await act({ action: "generate", route: "guided", provider });
    expect(trial.versions[1]?.parentId).toBe(first.id);
    expect(JSON.parse(chat.mock.calls[2][1][1].content).text).toBe(first.text);
    await expect(
      act({ action: "generate", route: "guided", provider }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chat).toHaveBeenCalledTimes(3);
  });

  it("should require a confirmed plan and real model when generation is requested", async () => {
    await expect(
      act({ action: "generate", route: "baseline", provider }),
    ).rejects.toThrow("确认计划");
    await expect(
      act({ action: "ask", message: "帮我想清楚", provider: { kind: "mock" } }),
    ).rejects.toThrow("演示模式");
    expect(chat).not.toHaveBeenCalled();
  });

  it("should reject fabricated quotations without modifying saved turns when a model invents evidence", async () => {
    chat.mockResolvedValue(
      JSON.stringify({
        reply: "考虑一下",
        quote: "不存在的反派",
        suggestedPlan: "补动作",
      }),
    );
    await expect(
      act({ action: "ask", message: "请检查", provider }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect((await service.get(trial.id)).turns).toHaveLength(0);
  });

  it("should preserve all earlier versions when a model fails or returns unchanged text", async () => {
    await confirm();
    chat.mockRejectedValueOnce(new BadGatewayException("provider down"));
    await expect(
      act({ action: "generate", route: "baseline", provider }),
    ).rejects.toThrow("provider down");
    chat.mockResolvedValueOnce(JSON.stringify({ text: original }));
    await expect(
      act({ action: "generate", route: "baseline", provider }),
    ).rejects.toThrow("没有修改");
    chat.mockResolvedValueOnce('{"text":"截断');
    await expect(
      act({ action: "generate", route: "baseline", provider }),
    ).rejects.toThrow("格式不完整");
    expect((await service.get(trial.id)).versions).toHaveLength(0);
  });

  it("should freeze plans and writer settings when versions already exist", async () => {
    await confirm();
    await expect(
      act({ action: "ask", message: "再来", provider }),
    ).rejects.toThrow("引导已结束");
    await expect(
      act({ action: "confirm-plan", plan: "改成别的故事" }),
    ).rejects.toThrow("已固定");
    chat.mockResolvedValueOnce(JSON.stringify({ text: original + "修改。" }));
    await act({ action: "generate", route: "baseline", provider });
    await expect(
      act({
        action: "generate",
        route: "guided",
        provider: { ...provider, model: "other" },
      }),
    ).rejects.toThrow("模型设置已改变");
  });

  it("should reject stale operations before charging a model when the revision changed", async () => {
    await confirm();
    await expect(
      service.act(trial.id, {
        revision: 0,
        action: "generate",
        route: "baseline",
        provider,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(chat).toHaveBeenCalledTimes(1);
    save.mockResolvedValueOnce(false);
    await expect(
      act({
        action: "evaluate",
        leftId: "original",
        rightId: "original",
        choice: "tie",
        reason: "same",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should refuse overwriting a concurrent result when saving loses its revision race", async () => {
    await confirm();
    save.mockResolvedValueOnce(false);
    chat.mockResolvedValueOnce(JSON.stringify({ text: original + "修改。" }));
    await expect(
      act({ action: "generate", route: "baseline", provider }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await service.get(trial.id)).versions).toHaveLength(0);
  });
});
