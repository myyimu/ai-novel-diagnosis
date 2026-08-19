import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { PremiseDialogueController } from "./premise-dialogue.controller";
import { PremiseDialogueTurnsController } from "./premise-dialogue-turns.controller";
import { PremiseDialogueService } from "./premise-dialogue.service";

const SESSION_FIXTURE = {
  id: "session-1",
  projectId: "project-1",
  session: {
    schemaVersion: "premise-dialogue.v1",
    projectId: "project-1",
    reviewId: "review-1",
    premiseText: "主角重生回高三开学第一天。",
    turns: [],
    status: "active",
  },
};

const CONTRACT_BODY = {
  premiseSummary: "重生高三的她这一次要亲手改写结局",
  coreConflict: "知晓未来的学生与既定命运的对撞",
  protagonistDesire: "考上重点大学并守住家人的健康",
  opposingForce: "同样重生且更早行动的对立面同学",
  irreducibilityTest: "换成都市职场故事即不成立",
  readerHookQuestion: "重来一次真的能赢吗？",
};

describe("PremiseDialogueController", () => {
  let app: INestApplication;
  let dialogue: {
    startSession: jest.Mock;
    getSession: jest.Mock;
    answerTurn: jest.Mock;
    retryJudge: jest.Mock;
    next: jest.Mock;
    finish: jest.Mock;
    submitContract: jest.Mock;
  };

  beforeEach(async () => {
    dialogue = {
      startSession: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      getSession: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      answerTurn: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      retryJudge: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      next: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      finish: jest.fn().mockResolvedValue(SESSION_FIXTURE),
      submitContract: jest.fn().mockResolvedValue({ record: SESSION_FIXTURE }),
    };

    const module = await Test.createTestingModule({
      controllers: [PremiseDialogueController, PremiseDialogueTurnsController],
      providers: [{ provide: PremiseDialogueService, useValue: dialogue }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should start a session and delegate to the service", async () => {
    const body = {
      projectId: "project-1",
      premiseText: "主角重生回高三开学第一天，带着前世记忆她决定这次要活成自己。",
      review: { reviewId: "review-1", layers: [] },
    };
    const response = await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue")
      .send(body)
      .expect(200);

    expect(response.body.id).toBe("session-1");
    expect(dialogue.startSession).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project-1" }),
    );
  });

  it("should reject a start with a premise shorter than 20 chars", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue")
      .send({ projectId: "project-1", premiseText: "太短的灵感。", review: {} })
      .expect(400);

    expect(dialogue.startSession).not.toHaveBeenCalled();
  });

  it("should fetch a session by id", async () => {
    const response = await request(app.getHttpServer())
      .get("/analysis/workspace/premise-dialogue/session-1")
      .expect(200);

    expect(response.body.id).toBe("session-1");
    expect(dialogue.getSession).toHaveBeenCalledWith("session-1");
  });

  it("should delegate an answer and pass the provider through", async () => {
    const response = await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/answer")
      .send({ answer: "她想考上重点大学，每天只睡四个小时。", provider: { kind: "mock" } })
      .expect(200);

    expect(response.body.id).toBe("session-1");
    expect(dialogue.answerTurn).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ answer: "她想考上重点大学，每天只睡四个小时。" }),
    );
  });

  it("should reject an empty answer with 400", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/answer")
      .send({ answer: "" })
      .expect(400);

    expect(dialogue.answerTurn).not.toHaveBeenCalled();
  });

  it("should reject an answer longer than 4000 chars with 400", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/answer")
      .send({ answer: "长".repeat(4001) })
      .expect(400);
  });

  it("should delegate next, judge, finish and contract routes", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/judge")
      .send({})
      .expect(200);
    expect(dialogue.retryJudge).toHaveBeenCalledWith("session-1", undefined);

    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/next")
      .send({})
      .expect(200);
    expect(dialogue.next).toHaveBeenCalledWith("session-1", undefined);

    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/finish")
      .send({})
      .expect(200);
    expect(dialogue.finish).toHaveBeenCalledWith("session-1");

    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/contract")
      .send(CONTRACT_BODY)
      .expect(200);
    expect(dialogue.submitContract).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ coreConflict: CONTRACT_BODY.coreConflict }),
    );
  });

  it("should reject a contract missing a required field with 400", async () => {
    const { coreConflict, ...incomplete } = CONTRACT_BODY;
    void coreConflict;
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise-dialogue/session-1/contract")
      .send(incomplete)
      .expect(400);

    expect(dialogue.submitContract).not.toHaveBeenCalled();
  });
});
