import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ReportDivergenceDto } from "./dto/report-divergence.dto";
import { ReportDivergenceController } from "./report-divergence.controller";
import { ReportDivergenceService } from "./report-divergence.service";

const validBody = {
  chapterTitle: "第三章 对峙",
  quickReviewReport:
    "【章节初诊报告】章节：第三章 对峙。题材：都市。定位：强冲突对峙章。急诊分：7/10。主要问题：对话推进有效，节奏紧凑，没有明显拖沓。",
  storyAuditReport:
    "【故事体检报告】覆盖章节：12/12。候选问题：第三章节奏拖沓（类别 pacing，严重度高）。证据：chapter-3 第 3 章：连续四段没有推进新信息。",
};

describe("ReportDivergenceController", () => {
  let app: INestApplication;
  let reportDivergence: { detect: jest.Mock };

  beforeEach(async () => {
    reportDivergence = {
      detect: jest.fn().mockResolvedValue({
        schemaVersion: "report-divergence.v1",
        divergences: [],
        droppedPointCount: 0,
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [ReportDivergenceController],
      providers: [
        { provide: ReportDivergenceService, useValue: reportDivergence },
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

  it("should return the divergence result for a well-formed request", async () => {
    const response = await request(app.getHttpServer())
      .post("/analysis/report-divergence")
      .send(validBody)
      .expect(200);

    expect(response.body.schemaVersion).toBe("report-divergence.v1");
    expect(reportDivergence.detect).toHaveBeenCalledTimes(1);
    const dto = reportDivergence.detect.mock.calls[0][0] as ReportDivergenceDto;
    expect(dto.chapterTitle).toBe("第三章 对峙");
  });

  it("should reject a report shorter than 50 chars", async () => {
    await request(app.getHttpServer())
      .post("/analysis/report-divergence")
      .send({ ...validBody, quickReviewReport: "太短的报告。" })
      .expect(400);

    expect(reportDivergence.detect).not.toHaveBeenCalled();
  });

  it("should reject a missing chapter title", async () => {
    await request(app.getHttpServer())
      .post("/analysis/report-divergence")
      .send({ ...validBody, chapterTitle: "" })
      .expect(400);
  });
});
