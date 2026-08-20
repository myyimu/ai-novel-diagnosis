import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  PremiseConsultResult,
  ReportDivergenceResult,
} from "@ai-novel-diagnosis/ai-core";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import { ConsultationRecordsRepository } from "./consultation-records.repository";

const consultResult = {
  schemaVersion: "premise-consult.v1",
  consultId: "consult-1",
  mode: "model",
  trigger: "author-disagrees",
  original: {
    verdict: "not-worth-writing",
    oneLineVerdict: "欲望空泛，冲突缺位。",
    layers: [],
  },
  second: {
    verdict: "solid",
    oneLineVerdict: "欲望具体且自带代价。",
    layers: [],
    strongestArgument: "前世记忆是资产也是把柄。",
    evidence: [{ quote: "带着前世记忆", note: "欲望具体" }],
  },
  comparison: {
    verdictRelation: "opposite",
    layerComparisons: [],
    droppedEvidenceCount: 1,
  },
} as unknown as PremiseConsultResult;

const divergenceResult = {
  schemaVersion: "report-divergence.v1",
  divergenceId: "divergence-1",
  mode: "model",
  chapterTitle: "第三章 对峙",
  divergences: [
    {
      id: "divergence-1",
      topic: "节奏",
      quickReviewQuote: "节奏紧凑，没有明显拖沓",
      storyAuditQuote: "第三章节奏拖沓",
      explanation: "快诊认为紧凑，体检认为拖沓。",
      questionForAuthor: "你自己读起来拖吗？",
    },
  ],
  droppedPointCount: 0,
} as unknown as ReportDivergenceResult;

describe("ConsultationRecordsRepository", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;
  let tempPgliteDataDir: string | undefined;
  let drizzle: DrizzleService | undefined;

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-consultations-"));
    process.env.PGLITE_DATA_DIR = tempPgliteDataDir;
    drizzle = new DrizzleService();
    await drizzle.onModuleInit();
  });

  afterEach(async () => {
    if (drizzle) {
      await drizzle.onModuleDestroy();
      drizzle = undefined;
    }
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
    if (originalPgliteDataDir === undefined) {
      delete process.env.PGLITE_DATA_DIR;
    } else {
      process.env.PGLITE_DATA_DIR = originalPgliteDataDir;
    }
    if (tempPgliteDataDir) {
      rmSync(tempPgliteDataDir, { recursive: true, force: true });
      tempPgliteDataDir = undefined;
    }
  });

  it("should persist a premise consult and list it back with the exact stored payload", async () => {
    const repository = new ConsultationRecordsRepository(drizzle!);

    const record = await repository.insertPremiseConsult({
      projectId: "project-1",
      result: consultResult,
    });
    const listed = await repository.listPremiseConsultsByProject("project-1");

    expect(record).toMatchObject({
      id: "consult-1",
      projectId: "project-1",
      trigger: "author-disagrees",
      mode: "model",
      verdictRelation: "opposite",
    });
    expect(listed).toHaveLength(1);
    // 病历副本必须是作者看到的原样结果——两方判定与程序比对一并落库。
    expect(listed[0]!.result).toEqual(consultResult);
    expect(listed[0]!.result.second.evidence[0]!.quote).toBe("带着前世记忆");
  });

  it("should list premise consults newest first and scope them to one project", async () => {
    const repository = new ConsultationRecordsRepository(drizzle!);

    await repository.insertPremiseConsult({
      projectId: "project-1",
      result: { ...consultResult, consultId: "consult-old" },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.insertPremiseConsult({
      projectId: "project-1",
      result: { ...consultResult, consultId: "consult-new" },
    });
    await repository.insertPremiseConsult({
      projectId: "project-2",
      result: { ...consultResult, consultId: "consult-other" },
    });

    const listed = await repository.listPremiseConsultsByProject("project-1");

    expect(listed.map((record) => record.id)).toEqual([
      "consult-new",
      "consult-old",
    ]);
  });

  it("should persist a divergence detection and attach an author adjudication note later", async () => {
    const repository = new ConsultationRecordsRepository(drizzle!);

    const record = await repository.insertReportDivergence({
      projectId: "project-1",
      result: divergenceResult,
    });
    expect(record.authorNote).toBeNull();
    expect(record.divergenceCount).toBe(1);

    const noted = await repository.updateReportDivergenceNote(
      "divergence-1",
      "我信体检：这章确实拖，下一版砍掉两段回忆。",
    );

    expect(noted?.authorNote).toBe(
      "我信体检：这章确实拖，下一版砍掉两段回忆。",
    );
    const listed = await repository.listReportDivergencesByProject("project-1");
    expect(listed[0]!.authorNote).toBe(
      "我信体检：这章确实拖，下一版砍掉两段回忆。",
    );
    // 裁决只写备注——落库的检测结果本身不被改写。
    expect(listed[0]!.result).toEqual(divergenceResult);
  });

  it("should return null when noting a divergence record that does not exist", async () => {
    const repository = new ConsultationRecordsRepository(drizzle!);

    const missing = await repository.updateReportDivergenceNote(
      "no-such-record",
      "备注",
    );

    expect(missing).toBeNull();
  });
});
