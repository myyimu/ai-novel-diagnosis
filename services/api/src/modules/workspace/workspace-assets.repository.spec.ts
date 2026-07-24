import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import { WorkspaceAssetsRepository } from "./workspace-assets.repository";

describe("WorkspaceAssetsRepository", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;
  let tempPgliteDataDir: string | undefined;
  let drizzle: DrizzleService | undefined;

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-workspace-"));
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

  it("should idempotently persist story audit finding reviews outside StoryAuditResult", async () => {
    const repository = new WorkspaceAssetsRepository(drizzle!);

    await repository.upsertStoryAuditFindingReview({
      projectId: "project-1",
      auditId: "audit-1",
      findingId: "finding-1",
      reviewState: "confirmed",
      note: "确实需要处理",
      updatedAt: "2026-07-18T08:00:00.000Z",
    });
    const updated = await repository.upsertStoryAuditFindingReview({
      projectId: "project-1",
      auditId: "audit-1",
      findingId: "finding-1",
      reviewState: "author_intent",
      note: "这是有意留给后文回收",
      updatedAt: "2026-07-18T08:30:00.000Z",
    });
    const reviews = await repository.listStoryAuditFindingReviews({
      projectId: "project-1",
      auditId: "audit-1",
    });

    expect(updated).toEqual({
      projectId: "project-1",
      auditId: "audit-1",
      findingId: "finding-1",
      reviewState: "author_intent",
      note: "这是有意留给后文回收",
      updatedAt: "2026-07-18T08:30:00.000Z",
    });
    expect(reviews).toEqual([updated]);
  });

  it("should restore project story audit job fields and linked revision finding ids", async () => {
    const repository = new WorkspaceAssetsRepository(drizzle!);

    await repository.upsertRevisionAssets({
      project: {
        id: "project-1",
        name: "测试书",
        bookJobId: "book-job-1",
        analysisPurpose: "story-audit",
        createdAt: "2026-07-18T08:00:00.000Z",
        updatedAt: "2026-07-18T08:10:00.000Z",
      },
      session: {
        id: "revision-1",
        projectId: "project-1",
        createdAt: "2026-07-18T08:10:00.000Z",
        chapterTitle: "第一章",
        genre: "xuanhuan",
        inputKind: "human-draft",
        textHash: "hash-1",
        textLength: 12,
        quickScore: null,
        gateDecision: "revise",
        mainProblem: "伏笔尚未回收",
        issueTitles: ["伏笔尚未回收"],
        issueCategories: ["plot"],
        storyAuditFindingIds: ["finding-1"],
        methodologyCardIds: [],
      },
      revisionVersions: [],
      methodologyCards: [],
    });

    const assets = await repository.listAssets();
    const projectPackage = await repository.readProjectPackage("project-1");

    expect(assets.projects[0]).toMatchObject({
      id: "project-1",
      bookJobId: "book-job-1",
      analysisPurpose: "story-audit",
    });
    expect(projectPackage.revisionSessions[0]?.storyAuditFindingIds).toEqual([
      "finding-1",
    ]);
  });
});
