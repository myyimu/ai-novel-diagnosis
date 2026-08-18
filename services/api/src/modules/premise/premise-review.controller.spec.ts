import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { PremiseReviewDto } from "./dto/premise-review.dto";
import { PremiseReviewController } from "./premise-review.controller";
import { PremiseReviewService } from "./premise-review.service";

describe("PremiseReviewController", () => {
  let app: INestApplication;
  let premiseReview: { review: jest.Mock };

  beforeEach(async () => {
    premiseReview = {
      review: jest.fn().mockResolvedValue({
        schemaVersion: "premise-review.v1",
        engineVerdict: "fixable",
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [PremiseReviewController],
      providers: [{ provide: PremiseReviewService, useValue: premiseReview }],
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

  it("should return the review for a well-formed premise", async () => {
    const dto: PremiseReviewDto = {
      premiseText: "主角重生回高三，带着前世记忆避开所有遗憾。",
    };

    const response = await request(app.getHttpServer())
      .post("/analysis/premise-review")
      .send(dto)
      .expect(200);

    expect(response.body.engineVerdict).toBe("fixable");
    expect(premiseReview.review).toHaveBeenCalledWith(dto);
  });

  it("should reject a premise shorter than 20 chars", async () => {
    await request(app.getHttpServer())
      .post("/analysis/premise-review")
      .send({ premiseText: "太短的灵感。" })
      .expect(400);

    expect(premiseReview.review).not.toHaveBeenCalled();
  });

  it("should reject a premise longer than 4000 chars", async () => {
    await request(app.getHttpServer())
      .post("/analysis/premise-review")
      .send({ premiseText: "长".repeat(4001) })
      .expect(400);
  });
});
