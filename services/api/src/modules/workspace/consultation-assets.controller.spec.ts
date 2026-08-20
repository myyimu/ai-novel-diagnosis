import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ConsultationAssetsController } from "./consultation-assets.controller";
import { WorkspaceService } from "./workspace.service";

describe("ConsultationAssetsController", () => {
  let app: INestApplication;
  let workspaceService: {
    listPremiseConsults: jest.Mock;
    listReportDivergences: jest.Mock;
    updateReportDivergenceNote: jest.Mock;
  };

  beforeEach(async () => {
    workspaceService = {
      listPremiseConsults: jest.fn().mockResolvedValue([
        {
          id: "consult-1",
          projectId: "project-1",
          trigger: "author-disagrees",
          mode: "model",
          verdictRelation: "opposite",
          result: {
            schemaVersion: "premise-consult.v1",
            consultId: "consult-1",
          },
          createdAt: "2026-08-20T08:00:00.000Z",
          updatedAt: "2026-08-20T08:00:00.000Z",
        },
      ]),
      listReportDivergences: jest.fn().mockResolvedValue([
        {
          id: "divergence-1",
          projectId: "project-1",
          chapterTitle: "第三章 对峙",
          mode: "model",
          divergenceCount: 1,
          result: {
            schemaVersion: "report-divergence.v1",
            divergenceId: "divergence-1",
          },
          authorNote: null,
          createdAt: "2026-08-20T08:00:00.000Z",
          updatedAt: "2026-08-20T08:00:00.000Z",
        },
      ]),
      updateReportDivergenceNote: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ConsultationAssetsController],
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

  it("should list a project's persisted premise consultations", async () => {
    const response = await request(app.getHttpServer())
      .get("/analysis/workspace/premise-consults/project-1")
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].verdictRelation).toBe("opposite");
    expect(workspaceService.listPremiseConsults).toHaveBeenCalledWith(
      "project-1",
    );
  });

  it("should list a project's persisted divergence detections with their notes", async () => {
    const response = await request(app.getHttpServer())
      .get("/analysis/workspace/report-divergences/project-1")
      .expect(200);

    expect(response.body[0].chapterTitle).toBe("第三章 对峙");
    expect(workspaceService.listReportDivergences).toHaveBeenCalledWith(
      "project-1",
    );
  });

  it("should persist the author's adjudication note on one divergence record", async () => {
    workspaceService.updateReportDivergenceNote.mockResolvedValue({
      id: "divergence-1",
      authorNote: "我信体检：这章确实拖，下一版砍掉两段回忆。",
    });

    const response = await request(app.getHttpServer())
      .patch("/analysis/workspace/report-divergences/divergence-1/note")
      .send({ note: "我信体检：这章确实拖，下一版砍掉两段回忆。" })
      .expect(200);

    expect(response.body.authorNote).toBe(
      "我信体检：这章确实拖，下一版砍掉两段回忆。",
    );
    expect(workspaceService.updateReportDivergenceNote).toHaveBeenCalledWith(
      "divergence-1",
      { note: "我信体检：这章确实拖，下一版砍掉两段回忆。" },
    );
  });

  it("should return 404 when noting a divergence record that does not exist", async () => {
    workspaceService.updateReportDivergenceNote.mockRejectedValue(
      new NotFoundException("分歧记录不存在"),
    );

    await request(app.getHttpServer())
      .patch("/analysis/workspace/report-divergences/no-such-record/note")
      .send({ note: "备注" })
      .expect(404);

    expect(workspaceService.updateReportDivergenceNote).toHaveBeenCalled();
  });

  it("should reject an empty adjudication note", async () => {
    await request(app.getHttpServer())
      .patch("/analysis/workspace/report-divergences/divergence-1/note")
      .send({ note: "" })
      .expect(400);

    expect(workspaceService.updateReportDivergenceNote).not.toHaveBeenCalled();
  });
});

describe("WorkspaceService consultation records", () => {
  it("should throw NotFoundException when the divergence record does not exist", async () => {
    const consultationRecords = {
      updateReportDivergenceNote: jest.fn().mockResolvedValue(null),
      listPremiseConsultsByProject: jest.fn(),
      listReportDivergencesByProject: jest.fn(),
    };
    const service = new WorkspaceService(
      {} as never,
      consultationRecords as never,
      {} as never,
    );

    await expect(
      service.updateReportDivergenceNote("no-such-record", { note: "备注" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should return the noted record when it exists", async () => {
    const noted = {
      id: "divergence-1",
      authorNote: "我信体检：这章确实拖。",
    };
    const consultationRecords = {
      updateReportDivergenceNote: jest.fn().mockResolvedValue(noted),
      listPremiseConsultsByProject: jest.fn(),
      listReportDivergencesByProject: jest.fn(),
    };
    const service = new WorkspaceService(
      {} as never,
      consultationRecords as never,
      {} as never,
    );

    const record = await service.updateReportDivergenceNote("divergence-1", {
      note: "我信体检：这章确实拖。",
    });

    expect(record).toBe(noted);
  });
});
