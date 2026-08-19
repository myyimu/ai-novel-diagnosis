import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BookAnalysisJobService } from "./book-analysis-job.service";

const mockConfigService = {
  get: jest.fn(() => undefined),
};

describe("BookAnalysisJobService", () => {
  function createRepositoryMock(overrides?: Record<string, jest.Mock>) {
    return {
      deleteJob: jest.fn(async () => true),
      updateJob: jest.fn(async () => undefined),
      createJob: jest.fn(async () => undefined),
      getJob: jest.fn(async () => ({
        id: "job-1",
        type: "book-map-reduce-analysis",
        status: "succeeded",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        inputSummary: {
          title: "测试书",
          genre: "other",
          textLength: 1200,
        },
        progress: {
          stage: "succeeded",
          current: 1,
          total: 1,
          message: "done",
        },
      })),
      listJobs: jest.fn(async () => []),
      listExpiredJobs: jest.fn(async () => []),
      listFinishedJobs: jest.fn(async () => []),
      markInterruptedJobsFailed: jest.fn(),
      ...overrides,
    };
  }

  it("uses four concurrent whole-book jobs by default", () => {
    const service = new BookAnalysisJobService(
      createRepositoryMock() as never,
      mockConfigService as never,
    );

    expect(
      (service as unknown as { maxConcurrentJobs: number }).maxConcurrentJobs,
    ).toBe(4);
  });

  it("records the last completed chapter from real map events and reuses it in snapshots", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "book-job-storage-"));
    const artifactDir = await mkdtemp(join(tmpdir(), "book-job-artifact-"));
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "analysis.storageDir") return storageDir;
        if (key === "analysis.artifactDir") return artifactDir;
        return undefined;
      }),
    };
    const service = new BookAnalysisJobService(
      createRepositoryMock() as never,
      configService as never,
    );
    const internal = service as unknown as {
      jobs: Map<string, Record<string, unknown>>;
    };
    internal.jobs.set(VALID_JOB_ID, {
      id: VALID_JOB_ID,
      type: "book-map-reduce-analysis",
      status: "running",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      inputSummary: { title: "测试书", genre: "other", textLength: 1200 },
      progress: { stage: "map", current: 2, total: 10, message: "processing" },
    });

    try {
      await service.recordChapterMap({
        jobId: VALID_JOB_ID,
        chapterMap: { chapterId: "ch-2", order: 2, analysisDepth: "outline" },
        mapCount: 2,
        totalChapters: 10,
        phase: "outline",
      });
      let snapshot = await service.get(VALID_JOB_ID, { includeResult: false });
      expect(snapshot.partialResult?.lastCompletedChapter).toEqual({
        order: 2,
        title: "第 2 章",
        phase: "outline",
        completedAt: expect.any(String),
      });
      // 红线：这一章没有任何机械锚定的原文摘录，不得产生初核卡。
      expect(snapshot.partialResult?.candidateChapterCards).toEqual([]);

      await service.recordChapterMap({
        jobId: VALID_JOB_ID,
        chapterMap: {
          chapterId: "ch-5",
          order: 5,
          title: "第五章 风起",
          analysisDepth: "deep",
          summary: "主角拿到病历，与仇人第一次正面冲突。",
          sourceAnchors: [
            {
              anchorId: "ch-5-anchor-1",
              label: "关键证据",
              quote: "他攥着那张缴费单。",
              startOffset: 120,
              endOffset: 131,
            },
          ],
          sourceRiskSignals: ["重生记忆无代价"],
          foreshadowingSetups: ["妹妹的病历来源不明"],
        },
        mapCount: 11,
        totalChapters: 10,
        phase: "deep",
        deepTargetOrders: [1, 5],
        deepCompletedCount: 2,
      });
      snapshot = await service.get(VALID_JOB_ID, { includeResult: false });
      expect(snapshot.partialResult?.lastCompletedChapter).toEqual({
        order: 5,
        title: "第五章 风起",
        phase: "deep",
        completedAt: expect.any(String),
      });
      expect(snapshot.partialResult?.candidateChapterCards).toEqual([
        {
          chapterId: "ch-5",
          order: 5,
          title: "第五章 风起",
          depth: "deep",
          completedAt: expect.any(String),
          summary: "主角拿到病历，与仇人第一次正面冲突。",
          anchoredQuotes: [
            { quote: "他攥着那张缴费单。", startOffset: 120, endOffset: 131 },
          ],
          riskSignals: ["重生记忆无代价"],
          setupSignals: ["妹妹的病历来源不明"],
        },
      ]);
    } finally {
      await Promise.all([
        rm(storageDir, { recursive: true, force: true }),
        rm(artifactDir, { recursive: true, force: true }),
      ]);
    }
  });

  it("omits heavy chapter map payloads from job snapshots", () => {
    const service = new BookAnalysisJobService(
      {
        markInterruptedJobsFailed: jest.fn(),
      } as never,
      mockConfigService as never,
    );

    const snapshot = (
      service as unknown as {
        snapshot: (job: unknown) => {
          partialResult?: Record<string, unknown>;
        };
      }
    ).snapshot({
      id: "job-1",
      type: "book-map-reduce-analysis",
      status: "running",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      inputSummary: {
        title: "测试书",
        genre: "other",
        textLength: 1200,
      },
      progress: {
        stage: "map",
        current: 3,
        total: 10,
        message: "processing",
      },
      partialResult: {
        partial: true,
        type: "book-map-reduce-partial",
        stage: "map",
        savedAt: "2026-06-20T00:00:00.000Z",
        mapCount: 3,
        totalChapters: 10,
        artifactDir: "tmp/job-1",
        chapterMaps: [{ chapterId: "ch-1" }],
        notice: "partial",
      },
    });

    expect(snapshot.partialResult).toEqual(
      expect.objectContaining({
        mapCount: 3,
        totalChapters: 10,
      }),
    );
    expect(snapshot.partialResult).not.toHaveProperty("chapterMaps");
  });

  // Format-compliant jobId matching validateJobId(): /^book_[a-z0-9]{4,20}_[a-z0-9]{2,12}$/i
  const VALID_JOB_ID = "book_testid1234_ab";

  it("deletes completed persisted jobs", async () => {
    const repository = createRepositoryMock({
      getJob: jest.fn(async () => ({
        id: VALID_JOB_ID,
        type: "book-map-reduce-analysis",
        status: "succeeded",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        inputSummary: { title: "测试书", genre: "other", textLength: 1200 },
        progress: { stage: "succeeded", current: 1, total: 1, message: "done" },
      })),
    });
    const service = new BookAnalysisJobService(
      repository as never,
      mockConfigService as never,
    );

    await expect(service.delete(VALID_JOB_ID)).resolves.toEqual({
      deleted: true,
      jobId: VALID_JOB_ID,
    });
    expect(repository.deleteJob).toHaveBeenCalledWith(VALID_JOB_ID);
  });

  it("rejects deletion while a job is still running", async () => {
    const repository = createRepositoryMock({
      getJob: jest.fn(async () => ({
        id: VALID_JOB_ID,
        type: "book-map-reduce-analysis",
        status: "running",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        inputSummary: {
          title: "测试书",
          genre: "other",
          textLength: 1200,
        },
        progress: {
          stage: "map",
          current: 1,
          total: 10,
          message: "processing",
        },
      })),
    });
    const service = new BookAnalysisJobService(
      repository as never,
      mockConfigService as never,
    );

    await expect(service.delete(VALID_JOB_ID)).rejects.toThrow(
      "Running book analysis jobs cannot be deleted.",
    );
    expect(repository.deleteJob).not.toHaveBeenCalled();
  });

  it("runs whole-book processors with the configured global concurrency", async () => {
    const repository = createRepositoryMock();
    const configService = {
      get: jest.fn((key: string) =>
        key === "analysis.bookJobConcurrency" ? 1 : undefined,
      ),
    };
    const service = new BookAnalysisJobService(
      repository as never,
      configService as never,
    );
    let releaseFirst: (() => void) | undefined;
    const firstProcessor = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        }),
    );
    const secondProcessor = jest.fn(async () => undefined);

    await service.create(
      { title: "第一本", genre: "other", textLength: 1 },
      firstProcessor,
    );
    await service.create(
      { title: "第二本", genre: "other", textLength: 1 },
      secondProcessor,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstProcessor).toHaveBeenCalledTimes(1);
    expect(secondProcessor).not.toHaveBeenCalled();

    releaseFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(secondProcessor).toHaveBeenCalledTimes(1);
  });

  it("runs storage maintenance after a job completes", async () => {
    const repository = createRepositoryMock();
    const service = new BookAnalysisJobService(
      repository as never,
      mockConfigService as never,
    );
    const internal = service as unknown as {
      jobs: Map<string, Record<string, unknown>>;
      pruneExpiredJobs: () => Promise<void>;
    };
    internal.jobs.set("job-1", {
      id: "job-1",
      type: "book-map-reduce-analysis",
      status: "running",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      inputSummary: { title: "测试书", genre: "other", textLength: 1 },
      progress: { stage: "reduce", current: 1, total: 1, message: "done" },
    });
    const prune = jest
      .spyOn(internal, "pruneExpiredJobs")
      .mockResolvedValue(undefined);

    await service.complete("job-1", { result: "done" });

    expect(prune).toHaveBeenCalledTimes(1);
  });

  it("removes expired completed job records during local startup cleanup", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "book-job-storage-"));
    const artifactDir = await mkdtemp(join(tmpdir(), "book-job-artifact-"));
    const repository = createRepositoryMock({
      listExpiredJobs: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: "expired-job",
            type: "book-map-reduce-analysis",
            status: "succeeded",
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-01-01T00:00:00.000Z",
            inputSummary: { title: "旧稿", genre: "other", textLength: 1 },
            progress: {
              stage: "succeeded",
              current: 1,
              total: 1,
              message: "done",
            },
          },
        ])
        .mockResolvedValue([]),
    });
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "analysis.storageDir") return storageDir;
        if (key === "analysis.artifactDir") return artifactDir;
        if (key === "analysis.retentionDays") return 1;
        return undefined;
      }),
    };

    try {
      const service = new BookAnalysisJobService(
        repository as never,
        configService as never,
      );

      await service.onModuleInit();

      expect(repository.markInterruptedJobsFailed).toHaveBeenCalledTimes(1);
      expect(repository.deleteJob).toHaveBeenCalledWith("expired-job");
      expect(repository.listExpiredJobs).toHaveBeenCalledTimes(2);
    } finally {
      await Promise.all([
        rm(storageDir, { recursive: true, force: true }),
        rm(artifactDir, { recursive: true, force: true }),
      ]);
    }
  });

  it("removes the oldest finished artifacts when the local quota is exceeded", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "book-job-storage-"));
    const artifactDir = await mkdtemp(join(tmpdir(), "book-job-artifact-"));
    const jobId = "quota-job";
    const jobArtifactDir = join(artifactDir, jobId);
    const repository = createRepositoryMock({
      listFinishedJobs: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: jobId,
            type: "book-map-reduce-analysis",
            status: "succeeded",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            inputSummary: { title: "旧稿", genre: "other", textLength: 1 },
            progress: {
              stage: "succeeded",
              current: 1,
              total: 1,
              message: "done",
            },
          },
        ])
        .mockResolvedValue([]),
    });
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "analysis.storageDir") return storageDir;
        if (key === "analysis.artifactDir") return artifactDir;
        if (key === "analysis.artifactMaxBytes") return 1;
        return undefined;
      }),
    };

    try {
      await mkdir(jobArtifactDir, { recursive: true });
      await writeFile(join(jobArtifactDir, "map-ch-1.json"), "large map");
      const service = new BookAnalysisJobService(
        repository as never,
        configService as never,
      );

      await service.onModuleInit();

      expect(repository.deleteJob).toHaveBeenCalledWith(jobId);
      await expect(
        readFile(join(jobArtifactDir, "map-ch-1.json")),
      ).rejects.toThrow();
    } finally {
      await Promise.all([
        rm(storageDir, { recursive: true, force: true }),
        rm(artifactDir, { recursive: true, force: true }),
      ]);
    }
  });
});
