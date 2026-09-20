import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import type { ChapterExperiment } from "@ai-novel-diagnosis/ai-core";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { ChapterExperimentsRepository } from "@/dao/repositories/chapter-experiments.repository";
import { ChapterExperimentController } from "./chapter-experiment.controller";
import { ChapterExperimentService } from "./chapter-experiment.service";

describe("ChapterExperimentController", () => {
  let app: INestApplication;
  let records: Map<string, ChapterExperiment>;
  const path = "/analysis/chapter-experiments";
  const input = {
    projectId: "book",
    chapterTitle: "第一章",
    originalText: "孩子问起过去，父亲放下了筷子。".repeat(5),
    goal: "让读者好奇",
    preserve: "保留日常",
    context: "",
  };

  beforeEach(async () => {
    records = new Map();
    const module = await Test.createTestingModule({
      controllers: [ChapterExperimentController],
      providers: [
        ChapterExperimentService,
        {
          provide: ModelProviderService,
          useValue: {
            chat: jest.fn().mockResolvedValue(
              JSON.stringify({
                reply: "希望读者察觉哪一点？",
                quote: "",
                suggestedPlan: "保留日常，突出迟疑。",
              }),
            ),
          },
        },
        {
          provide: ChapterExperimentsRepository,
          useValue: {
            create: async (value: ChapterExperiment) => {
              records.set(value.id, value);
              return value;
            },
            find: async (id: string) => records.get(id) ?? null,
            list: async (id: string) =>
              [...records.values()].filter((value) => value.projectId === id),
            save: async (next: ChapterExperiment) => {
              records.set(next.id, next);
              return true;
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it("should create and restore a project-scoped record when input is valid", async () => {
    const created = await request(app.getHttpServer())
      .post(path)
      .send(input)
      .expect(200);
    const restored = await request(app.getHttpServer())
      .get(`${path}/${created.body.id}`)
      .expect(200);
    expect(restored.body.originalText).toBe(input.originalText);
    expect(
      (
        await request(app.getHttpServer())
          .get(`${path}?projectId=book`)
          .expect(200)
      ).body,
    ).toHaveLength(1);
    expect(
      (
        await request(app.getHttpServer())
          .get(`${path}?projectId=other`)
          .expect(200)
      ).body,
    ).toHaveLength(0);
  });
  it("should reject malformed input when creating or reading records", async () => {
    await request(app.getHttpServer())
      .post(path)
      .send({ ...input, originalText: "短" })
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .send({ ...input, goal: "  " })
      .expect(400);
    await request(app.getHttpServer()).get(path).expect(400);
    await request(app.getHttpServer()).get(`${path}/invalid-id`).expect(400);
  });
  it("should persist a turn and reject invalid actions when the chapter exists", async () => {
    const { body } = await request(app.getHttpServer())
      .post(path)
      .send(input)
      .expect(200);
    const url = `${path}/${body.id}/actions`;
    const response = await request(app.getHttpServer())
      .post(url)
      .send({
        revision: 0,
        action: "ask",
        message: "先澄清我的意图",
        provider: { kind: "openai-compatible" },
      })
      .expect(200);
    expect(response.body.turns).toHaveLength(1);
    await request(app.getHttpServer())
      .post(url)
      .send({ revision: 1, action: "generate", route: "wrong" })
      .expect(400);
    await request(app.getHttpServer())
      .post(url)
      .send({ revision: 1, action: "ask" })
      .expect(400);
    await request(app.getHttpServer())
      .post(url)
      .send({ revision: 1, action: "evaluate", choice: "left" })
      .expect(400);
    await request(app.getHttpServer())
      .post(url)
      .send({ revision: -1, action: "confirm-plan", plan: "保持日常" })
      .expect(400);
  });
});
