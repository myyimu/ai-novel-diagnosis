import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import type { PremiseEngineCard } from "@ai-novel-diagnosis/ai-core";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import { PremiseAssetsController } from "./premise-assets.controller";
import type { UpsertPremiseEngineCardDto } from "./dto/premise-assets.dto";
import { WorkspaceService } from "./workspace.service";

const engineCardBody: UpsertPremiseEngineCardDto = {
  projectId: "project-1",
  status: "confirmed",
  premiseSummary: "一个少年用禁忌力量向灭门仇人复仇的故事。",
  coreConflict: "主角想复仇，而仇人是唯一能救他妹妹的人。",
  protagonistDesire: "救妹妹，且不放弃复仇。",
  opposingForce: "仇人的救命之恩与宗门的追杀令。",
  irreducibilityTest: "换成现代都市背景后两难依然成立。",
  readerHookQuestion: "他会在救人与复仇之间选哪一边？",
  engineVerdict: "fixable",
  reviewId: "premise-review-42",
  updatedAt: "2026-08-19T08:00:00.000Z",
};

describe("PremiseAssetsController", () => {
  let app: INestApplication;
  let workspaceService: {
    readEngineCard: jest.Mock;
    upsertEngineCard: jest.Mock;
    listPremiseFindingReviews: jest.Mock;
    upsertPremiseFindingReview: jest.Mock;
  };

  beforeEach(async () => {
    workspaceService = {
      readEngineCard: jest.fn(),
      upsertEngineCard: jest.fn().mockResolvedValue({
        ...engineCardBody,
        confirmedAt: "2026-08-19T08:00:00.000Z",
      }),
      listPremiseFindingReviews: jest.fn().mockResolvedValue([
        {
          projectId: "project-1",
          reviewId: "premise-review-42",
          findingId: "cliche-1",
          reviewState: "author_intent",
          updatedAt: "2026-08-19T08:00:00.000Z",
        },
      ]),
      upsertPremiseFindingReview: jest.fn(async (input) => input),
    };

    const module = await Test.createTestingModule({
      controllers: [PremiseAssetsController],
      providers: [{ provide: WorkspaceService, useValue: workspaceService }],
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

  it("should return the persisted engine card for one book", async () => {
    workspaceService.readEngineCard.mockResolvedValue({
      ...engineCardBody,
    } satisfies PremiseEngineCard);

    const response = await request(app.getHttpServer())
      .get("/analysis/workspace/premise/engine-card/project-1")
      .expect(200);

    expect(response.body.engineCard.coreConflict).toBe(
      engineCardBody.coreConflict,
    );
    expect(workspaceService.readEngineCard).toHaveBeenCalledWith("project-1");
  });

  it("should return a null engine card when the book has none", async () => {
    workspaceService.readEngineCard.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get("/analysis/workspace/premise/engine-card/project-1")
      .expect(200);

    expect(response.body).toEqual({ engineCard: null });
  });

  it("should persist a confirmed engine card", async () => {
    const response = await request(app.getHttpServer())
      .post("/analysis/workspace/premise/engine-card")
      .send(engineCardBody)
      .expect(200);

    expect(response.body.status).toBe("confirmed");
    expect(workspaceService.upsertEngineCard).toHaveBeenCalledWith(
      engineCardBody,
    );
  });

  it("should reject an engine card with an invalid status", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise/engine-card")
      .send({ ...engineCardBody, status: "signed" })
      .expect(400);

    expect(workspaceService.upsertEngineCard).not.toHaveBeenCalled();
  });

  it("should persist one author decision on a cliché finding", async () => {
    const review = {
      projectId: "project-1",
      reviewId: "premise-review-42",
      findingId: "cliche-1",
      reviewState: "author_intent",
      updatedAt: "2026-08-19T08:00:00.000Z",
    };

    const response = await request(app.getHttpServer())
      .post("/analysis/workspace/premise/reviews")
      .send(review)
      .expect(200);

    expect(response.body.reviewState).toBe("author_intent");
    expect(workspaceService.upsertPremiseFindingReview).toHaveBeenCalledWith(
      review,
    );
  });

  it("should reject a finding review with an invalid state", async () => {
    await request(app.getHttpServer())
      .post("/analysis/workspace/premise/reviews")
      .send({
        projectId: "project-1",
        reviewId: "premise-review-42",
        findingId: "cliche-1",
        reviewState: "maybe",
      })
      .expect(400);

    expect(workspaceService.upsertPremiseFindingReview).not.toHaveBeenCalled();
  });
});

describe("WorkspaceService premise assets", () => {
  it("should stamp confirmedAt when a card is confirmed without one", async () => {
    const repository = {
      upsertEngineCard: jest.fn(async (card: PremiseEngineCard) => card),
    };
    const service = new WorkspaceService(
      repository as unknown as WorkspaceAssetsRepository,
    );

    await service.upsertEngineCard({
      ...engineCardBody,
      confirmedAt: undefined,
    });

    const saved = repository.upsertEngineCard.mock
      .calls[0][0] as PremiseEngineCard;
    expect(saved.status).toBe("confirmed");
    expect(saved.confirmedAt).toEqual(expect.any(String));
    expect(new Date(saved.confirmedAt as string).getTime()).not.toBeNaN();
  });

  it("should clear confirmedAt when a card returns to draft", async () => {
    const repository = {
      upsertEngineCard: jest.fn(async (card: PremiseEngineCard) => card),
    };
    const service = new WorkspaceService(
      repository as unknown as WorkspaceAssetsRepository,
    );

    await service.upsertEngineCard({
      ...engineCardBody,
      status: "draft",
      confirmedAt: "2026-08-19T08:00:00.000Z",
    });

    const saved = repository.upsertEngineCard.mock
      .calls[0][0] as PremiseEngineCard;
    expect(saved.status).toBe("draft");
    expect(saved.confirmedAt).toBeUndefined();
  });

  it("should default updatedAt on a finding review", async () => {
    const repository = {
      upsertPremiseFindingReview: jest.fn(async (review) => review),
    };
    const service = new WorkspaceService(
      repository as unknown as WorkspaceAssetsRepository,
    );

    await service.upsertPremiseFindingReview({
      projectId: "project-1",
      reviewId: "premise-review-42",
      findingId: "cliche-1",
      reviewState: "deferred",
    });

    const saved = repository.upsertPremiseFindingReview.mock.calls[0][0];
    expect(saved.updatedAt).toEqual(expect.any(String));
  });
});
