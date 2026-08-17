import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ModelUsageController } from "./model-usage.controller";
import { ModelUsageService } from "./model-usage.service";

describe("ModelUsageController", () => {
  let app: INestApplication;
  let modelUsage: {
    listEvents: jest.Mock;
    summarize: jest.Mock;
  };

  beforeEach(async () => {
    modelUsage = {
      listEvents: jest.fn().mockResolvedValue([]),
      summarize: jest.fn().mockResolvedValue({
        since: null,
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        estimatedRequests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        avgRequestMs: null,
        byModel: [],
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [ModelUsageController],
      providers: [{ provide: ModelUsageService, useValue: modelUsage }],
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

  it("should list events with jobId and limit passed through", async () => {
    const response = await request(app.getHttpServer())
      .get("/analysis/model-usage/events")
      .query({ jobId: "job-1", limit: 25 })
      .expect(200);

    expect(response.body).toEqual([]);
    expect(modelUsage.listEvents).toHaveBeenCalledWith({
      jobId: "job-1",
      limit: 25,
    });
  });

  it("should summarize usage since the provided timestamp", async () => {
    const response = await request(app.getHttpServer())
      .get("/analysis/model-usage/summary")
      .query({ since: "2026-08-01T00:00:00.000Z" })
      .expect(200);

    expect(response.body.totalRequests).toBe(0);
    expect(modelUsage.summarize).toHaveBeenCalledWith(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("should reject a non-numeric limit with 400", async () => {
    await request(app.getHttpServer())
      .get("/analysis/model-usage/events")
      .query({ limit: "abc" })
      .expect(400);
  });

  it("should reject an out-of-range limit with 400", async () => {
    await request(app.getHttpServer())
      .get("/analysis/model-usage/events")
      .query({ limit: 500 })
      .expect(400);
  });

  it("should reject a malformed since timestamp with 400", async () => {
    await request(app.getHttpServer())
      .get("/analysis/model-usage/summary")
      .query({ since: "yesterday" })
      .expect(400);
  });
});
