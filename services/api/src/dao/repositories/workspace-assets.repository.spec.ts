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
        issueDecisions: [
          {
            issueId: "issue-1",
            title: "伏笔尚未回收",
            decision: "accepted",
            adopted: true,
          },
        ],
        retestStatus: "pending",
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
    expect(projectPackage.revisionSessions[0]).toMatchObject({
      retestStatus: "pending",
      issueDecisions: [expect.objectContaining({ adopted: true })],
    });
  });

  it("should find sessions by id and list earlier sessions for comparison", async () => {
    const repository = new WorkspaceAssetsRepository(drizzle!);

    await repository.upsertRevisionAssets({
      project: {
        id: "project-1",
        name: "测试书",
        createdAt: "2026-07-18T08:00:00.000Z",
        updatedAt: "2026-07-18T08:00:00.000Z",
      },
      session: {
        id: "revision-1",
        projectId: "project-1",
        createdAt: "2026-07-18T08:00:00.000Z",
        chapterTitle: "第一章",
        genre: "xuanhuan",
        inputKind: "human-draft",
        textHash: "hash-1",
        textLength: 12,
        quickScore: 5.4,
        gateDecision: "rebuild",
        mainProblem: "开局无事件",
        issueTitles: ["开局无事件"],
        issueCategories: ["opening"],
        retestStatus: "not_requested",
        methodologyCardIds: [],
      },
      revisionVersions: [],
      methodologyCards: [],
    });
    await repository.upsertRevisionAssets({
      project: {
        id: "project-1",
        name: "测试书",
        createdAt: "2026-07-18T08:00:00.000Z",
        updatedAt: "2026-07-18T09:00:00.000Z",
      },
      session: {
        id: "revision-2",
        projectId: "project-1",
        createdAt: "2026-07-18T09:00:00.000Z",
        chapterTitle: "第一章",
        genre: "xuanhuan",
        inputKind: "human-draft",
        textHash: "hash-2",
        textLength: 14,
        quickScore: null,
        gateDecision: "insufficient",
        mainProblem: "材料不足",
        issueTitles: [],
        issueCategories: [],
        retestStatus: "pending",
        methodologyCardIds: [],
      },
      revisionVersions: [],
      methodologyCards: [],
    });

    const session = await repository.findRevisionSessionById("revision-2");
    const earlier = await repository.listProjectSessionsBefore(
      "project-1",
      session.createdAt,
    );

    expect(session.retestStatus).toBe("pending");
    expect(earlier.map((item) => item.id)).toEqual(["revision-1"]);
    expect(earlier[0]?.quickScore).toBe(5.4);
    await expect(repository.findRevisionSessionById("missing")).rejects.toThrow(
      "Revision session not found: missing",
    );
  });

  it("should complete a pending retest in place and keep its version linkage", async () => {
    const repository = new WorkspaceAssetsRepository(drizzle!);

    await repository.upsertRevisionAssets({
      project: {
        id: "project-1",
        name: "测试书",
        createdAt: "2026-07-18T08:00:00.000Z",
        updatedAt: "2026-07-18T08:00:00.000Z",
      },
      session: {
        id: "revision-pending",
        projectId: "project-1",
        createdAt: "2026-07-18T08:00:00.000Z",
        chapterTitle: "第一章",
        genre: "xuanhuan",
        inputKind: "human-draft",
        textHash: "hash-old",
        textLength: 10,
        quickScore: 5.4,
        gateDecision: "rebuild",
        mainProblem: "开局无事件",
        issueTitles: ["开局无事件"],
        issueCategories: ["opening"],
        retestStatus: "pending",
        fromVersionId: "version-1",
        toVersionId: "version-2",
        methodologyCardIds: [],
      },
      revisionVersions: [],
      methodologyCards: [],
    });
    await repository.upsertRevisionTextVersion(
      {
        id: "version-2",
        projectId: "project-1",
        createdAt: "2026-07-18T08:30:00.000Z",
        chapterTitle: "第一章",
        versionLabel: "V2",
        textHash: "hash-new",
        textLength: 16,
        text: "版本二正文",
      },
      "project-1",
    );

    const completed = await repository.completeRevisionRetest({
      sessionId: "revision-pending",
      chapterTitle: "第一章",
      genre: "xuanhuan",
      inputKind: "human-draft",
      textHash: "hash-new",
      textLength: 16,
      quickScore: 6.4,
      gateDecision: "revise",
      mainProblem: "章末钩子没有代价",
      issueTitles: ["章末钩子没有代价"],
      issueCategories: ["hook"],
      nextPrompt: "请补强章末代价。",
      toVersionId: "version-2",
    });
    const version = await repository.findRevisionTextVersionById("version-2");
    const reread = await repository.findRevisionSessionById("revision-pending");
    const projectVersions =
      await repository.listProjectRevisionVersions("project-1");

    expect(completed.retestStatus).toBe("completed");
    expect(completed.quickScore).toBe(6.4);
    expect(completed.fromVersionId).toBe("version-1");
    expect(completed.toVersionId).toBe("version-2");
    expect(reread.mainProblem).toBe("章末钩子没有代价");
    expect(version?.text).toBe("版本二正文");
    expect(projectVersions.map((item) => item.id)).toEqual(["version-2"]);
    await expect(
      repository.findRevisionTextVersionById("missing"),
    ).resolves.toBeNull();
  });
});
