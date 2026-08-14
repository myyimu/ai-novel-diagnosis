import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, sep } from "node:path";
import { AnalysisPersistenceRepository } from "./analysis-persistence.repository";
import {
  validateJobId,
  resolveSafePath,
} from "../../shared/utils/path-sanitizer";
import { BookPreprocessResult } from "./text-preprocessor.service";

export type BookAnalysisJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export interface BookAnalysisJobProgress {
  stage: "queued" | "preprocess" | "map" | "reduce" | "succeeded" | "failed";
  current: number;
  total: number;
  message: string;
}

export interface BookAnalysisPartialResult {
  partial: true;
  type: "book-map-reduce-partial";
  stage: "map" | "reduce" | "failed";
  savedAt: string;
  mapCount: number;
  totalChapters: number;
  artifactDir: string;
  notice: string;
  analysisStrategy?: string;
  outlineCount?: number;
  deepTargetOrders?: number[];
  deepCompletedCount?: number;
}

export interface BookAnalysisJobSnapshot {
  id: string;
  type: "book-map-reduce-analysis";
  status: BookAnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  inputSummary: {
    title: string;
    genre: string;
    textLength: number;
    /** Optional metadata for cross-sample distillation (L2). */
    author?: string;
    platform?: string;
    publishedYear?: number;
    purpose?: "own-draft" | "reference-study";
    profiles?: string[];
  };
  progress: BookAnalysisJobProgress;
  preprocessing?: Omit<BookPreprocessResult, "chapters"> & {
    chapters: Array<Omit<BookPreprocessResult["chapters"][number], "text">>;
  };
  partialResult?: BookAnalysisPartialResult;
  result?: unknown;
  error?: string;
  uploadId?: string;
}

interface StoredBookAnalysisJob extends BookAnalysisJobSnapshot {}

interface QueuedBookProcessor {
  jobId: string;
  processor: (jobId: string) => Promise<unknown>;
}

@Injectable()
export class BookAnalysisJobService implements OnModuleInit {
  private readonly logger = new Logger(BookAnalysisJobService.name);
  private readonly jobs = new Map<string, StoredBookAnalysisJob>();
  private readonly storageRoot: string;
  private readonly artifactRoot: string;
  private readonly maxConcurrentJobs: number;
  private readonly retentionDays: number;
  private readonly artifactMaxBytes: number;
  private readonly pendingProcessors: QueuedBookProcessor[] = [];
  private activeProcessors = 0;

  constructor(
    private readonly repository: AnalysisPersistenceRepository,
    configService: ConfigService,
  ) {
    this.storageRoot =
      configService.get<string>("analysis.storageDir") ||
      join(process.cwd(), ".local", "analysis");
    this.artifactRoot =
      configService.get<string>("analysis.artifactDir") ||
      join(process.cwd(), ".local", "artifacts");
    this.maxConcurrentJobs =
      configService.get<number>("analysis.bookJobConcurrency") || 4;
    this.retentionDays =
      configService.get<number>("analysis.retentionDays") || 30;
    this.artifactMaxBytes =
      configService.get<number>("analysis.artifactMaxBytes") ||
      512 * 1024 * 1024;
  }

  async onModuleInit(): Promise<void> {
    await this.repository.markInterruptedJobsFailed();
    await this.pruneExpiredJobs();
  }

  async create(
    inputSummary: BookAnalysisJobSnapshot["inputSummary"],
    processor: (jobId: string) => Promise<unknown>,
    uploadId?: string,
  ): Promise<BookAnalysisJobSnapshot> {
    const now = new Date().toISOString();
    const id = `book_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const job: StoredBookAnalysisJob = {
      id,
      type: "book-map-reduce-analysis",
      status: "queued",
      createdAt: now,
      updatedAt: now,
      inputSummary,
      progress: {
        stage: "queued",
        current: 0,
        total: 1,
        message: "Job has been queued.",
      },
      uploadId,
    };

    this.jobs.set(id, job);
    await this.repository.createJob(job, uploadId);
    this.enqueueProcessor(id, processor);

    return this.snapshot(job);
  }

  async get(
    jobId: string,
    options?: { includeResult?: boolean },
  ): Promise<BookAnalysisJobSnapshot> {
    const inMemory = this.jobs.get(jobId);
    if (inMemory) {
      return this.snapshot(inMemory, options);
    }

    const persisted = await this.repository.getJob(jobId, options);
    if (!persisted) {
      throw new NotFoundException(`Book analysis job not found: ${jobId}`);
    }

    return persisted;
  }

  async delete(jobId: string) {
    this.validateJobIdOrThrow(jobId);
    const job = await this.get(jobId, { includeResult: false });
    if (job.status === "queued" || job.status === "running") {
      throw new BadRequestException(
        "Running book analysis jobs cannot be deleted.",
      );
    }

    const deleted = await this.repository.deleteJob(jobId);
    if (!deleted) {
      throw new NotFoundException(`Book analysis job not found: ${jobId}`);
    }

    this.jobs.delete(jobId);
    const safeArtifactDir = resolveSafePath(this.artifactRoot, jobId, "jobId");
    const safeStorageDir = resolveSafePath(
      join(this.storageRoot, "jobs"),
      jobId,
      "jobId",
    );
    await Promise.all([
      rm(safeArtifactDir, { recursive: true, force: true }),
      rm(safeStorageDir, { recursive: true, force: true }),
    ]);

    return {
      deleted: true as const,
      jobId,
    };
  }

  async resume(
    jobId: string,
    processor: (jobId: string) => Promise<unknown>,
  ): Promise<BookAnalysisJobSnapshot> {
    let job = this.jobs.get(jobId);
    if (!job) {
      const persisted = await this.repository.getJob(jobId, {
        includeResult: true,
      });
      if (!persisted) {
        throw new NotFoundException(`Book analysis job not found: ${jobId}`);
      }
      job = { ...persisted };
      this.jobs.set(jobId, job);
    }

    if (job.status === "running" || job.status === "queued") {
      return this.snapshot(job);
    }

    const now = new Date().toISOString();
    job.status = "queued";
    job.error = undefined;
    job.finishedAt = undefined;
    job.updatedAt = now;
    job.progress = {
      stage: "queued",
      current:
        job.partialResult?.deepCompletedCount ??
        job.partialResult?.mapCount ??
        0,
      total:
        job.partialResult?.deepTargetOrders?.length ||
        job.partialResult?.totalChapters ||
        1,
      message: job.partialResult
        ? "Found previous partial progress and queued it for resume."
        : "Job has been re-queued.",
    };
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
      error: null,
      finishedAt: null,
    });

    this.enqueueProcessor(jobId, processor);

    return this.snapshot(job);
  }

  async markRunning(jobId: string) {
    const job = this.read(jobId);
    const now = new Date().toISOString();
    job.status = "running";
    job.startedAt = now;
    job.updatedAt = now;
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
      startedAt: now,
    });
  }

  async updateProgress(jobId: string, progress: BookAnalysisJobProgress) {
    const job = this.read(jobId);
    job.progress = progress;
    job.updatedAt = new Date().toISOString();
    await this.repository.updateJob(jobId, { progress });
  }

  async setPreprocessing(jobId: string, preprocessing: BookPreprocessResult) {
    const job = this.read(jobId);
    job.preprocessing = {
      cleaning: preprocessing.cleaning,
      chapters: preprocessing.chapters.map(
        ({ text: _text, ...chapter }) => chapter,
      ),
    };
    job.updatedAt = new Date().toISOString();
    await this.repository.updateJob(jobId, {
      preprocessing: job.preprocessing,
    });
  }

  async recordChapterMap(input: {
    jobId: string;
    chapterMap: unknown;
    mapCount: number;
    totalChapters: number;
    analysisStrategy?: string;
    outlineCount?: number;
    deepTargetOrders?: number[];
    deepCompletedCount?: number;
    phase?: "outline" | "deep";
  }) {
    this.validateJobIdOrThrow(input.jobId);
    const job = this.read(input.jobId);
    const artifactDir = resolveSafePath(
      this.artifactRoot,
      input.jobId,
      "jobId",
    );
    const mapId = this.chapterMapFileId(input.chapterMap, input.mapCount);
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      join(artifactDir, `map-${mapId}.json`),
      JSON.stringify(input.chapterMap, null, 2),
      "utf8",
    );

    const now = new Date().toISOString();
    const mapCount = input.mapCount;
    job.partialResult = {
      partial: true,
      type: "book-map-reduce-partial",
      stage: "map",
      savedAt: now,
      mapCount: input.mapCount,
      totalChapters: input.totalChapters,
      artifactDir,
      notice:
        input.phase === "deep"
          ? `Deep analysis ${input.deepCompletedCount || 0}/${input.deepTargetOrders?.length || 0} completed.`
          : `Outline index ${mapCount}/${input.totalChapters} completed.`,
      analysisStrategy: input.analysisStrategy,
      outlineCount: input.outlineCount,
      deepTargetOrders: input.deepTargetOrders,
      deepCompletedCount: input.deepCompletedCount,
    };
    job.updatedAt = now;
    await this.repository.updateJob(input.jobId, {
      partialResult: job.partialResult,
    });
  }

  async updatePartialPlan(
    input: Pick<
      BookAnalysisPartialResult,
      | "analysisStrategy"
      | "outlineCount"
      | "deepTargetOrders"
      | "deepCompletedCount"
    > & { jobId: string },
  ) {
    const job = this.read(input.jobId);
    if (!job.partialResult) {
      return;
    }

    const nextPartial: BookAnalysisPartialResult = {
      ...job.partialResult,
      savedAt: new Date().toISOString(),
      analysisStrategy:
        input.analysisStrategy ?? job.partialResult.analysisStrategy,
      outlineCount: input.outlineCount ?? job.partialResult.outlineCount,
      deepTargetOrders:
        input.deepTargetOrders ?? job.partialResult.deepTargetOrders,
      deepCompletedCount:
        input.deepCompletedCount ?? job.partialResult.deepCompletedCount,
    };
    job.partialResult = nextPartial;
    job.updatedAt = nextPartial.savedAt;
    await this.repository.updateJob(input.jobId, {
      partialResult: nextPartial,
    });
  }

  async readChapterMaps<T = unknown>(jobId: string): Promise<T[]> {
    this.validateJobIdOrThrow(jobId);
    const artifactDirs = [
      resolveSafePath(this.artifactRoot, jobId, "jobId"),
      resolveSafePath(join(this.storageRoot, "jobs"), jobId, "jobId") +
        sep +
        "maps",
    ];
    for (const artifactDir of artifactDirs) {
      let files: string[];
      try {
        files = await readdir(artifactDir);
      } catch {
        continue;
      }

      const jsonFiles = files
        .filter((file) => file.toLowerCase().endsWith(".json"))
        .sort((left, right) => left.localeCompare(right));
      if (!jsonFiles.length) {
        continue;
      }

      const maps: T[] = [];
      for (const file of jsonFiles) {
        const content = await readFile(join(artifactDir, file), "utf8");
        maps.push(JSON.parse(content) as T);
      }
      return maps;
    }

    return [];
  }

  async complete(jobId: string, result: unknown) {
    const job = this.read(jobId);
    const now = new Date().toISOString();
    job.status = "succeeded";
    job.finishedAt = now;
    job.updatedAt = now;
    job.result = result;
    job.progress = {
      stage: "succeeded",
      current: job.progress.total,
      total: job.progress.total,
      message: "Book analysis completed.",
    };
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
      result,
      finishedAt: now,
    });
    this.jobs.delete(jobId);
    await this.pruneExpiredJobs();
  }

  async fail(jobId: string, error: unknown) {
    const job = this.read(jobId);
    const now = new Date().toISOString();
    job.status = "failed";
    job.finishedAt = now;
    job.updatedAt = now;
    job.error = error instanceof Error ? error.message : String(error);
    if (job.partialResult) {
      job.partialResult = {
        ...job.partialResult,
        stage: "failed",
        savedAt: now,
      };
    }
    job.progress = {
      stage: "failed",
      current: job.progress.current,
      total: job.progress.total,
      message: job.error,
    };
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
      partialResult: job.partialResult,
      error: job.error,
      finishedAt: now,
    });
    this.jobs.delete(jobId);
    await this.pruneExpiredJobs();
    this.logger.warn(`Book analysis job failed: ${jobId} ${job.error}`);
  }

  private read(jobId: string): StoredBookAnalysisJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Book analysis job not found: ${jobId}`);
    }

    return job;
  }

  /** Validates jobId format and throws BadRequestException if invalid. */
  private validateJobIdOrThrow(jobId: string): void {
    validateJobId(jobId);
  }

  private enqueueProcessor(
    jobId: string,
    processor: (jobId: string) => Promise<unknown>,
  ): void {
    this.pendingProcessors.push({ jobId, processor });
    setTimeout(() => {
      void this.startQueuedProcessors();
    }, 0);
  }

  private async pruneExpiredJobs(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    while (true) {
      const jobs = await this.repository.listExpiredJobs(cutoff, 100);
      if (!jobs.length) break;
      let removedAny = false;
      for (const job of jobs) {
        removedAny = (await this.removeStoredJob(job, "expired")) || removedAny;
      }
      if (!removedAny) break;
    }

    let artifactBytes = await this.directorySize(this.artifactRoot);
    while (artifactBytes > this.artifactMaxBytes) {
      const jobs = await this.repository.listFinishedJobs(100);
      if (!jobs.length) break;
      let removedAny = false;
      for (const job of jobs) {
        if (artifactBytes <= this.artifactMaxBytes) break;
        const bytes = await this.directorySize(join(this.artifactRoot, job.id));
        if (!(await this.removeStoredJob(job, "artifact quota"))) continue;
        artifactBytes -= bytes;
        removedAny = true;
      }
      if (!removedAny) break;
    }
  }

  private async removeStoredJob(
    job: BookAnalysisJobSnapshot,
    reason: "expired" | "artifact quota",
  ): Promise<boolean> {
    const deleted = await this.repository.deleteJob(job.id);
    if (!deleted) return false;
    this.jobs.delete(job.id);
    await Promise.all([
      rm(join(this.artifactRoot, job.id), { recursive: true, force: true }),
      rm(join(this.storageRoot, "jobs", job.id), {
        recursive: true,
        force: true,
      }),
    ]);
    this.logger.log(`Removed ${reason} book analysis job: ${job.id}`);
    return true;
  }

  private async directorySize(path: string): Promise<number> {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const sizes = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = join(path, entry.name);
          return entry.isDirectory()
            ? this.directorySize(entryPath)
            : (await stat(entryPath)).size;
        }),
      );
      return sizes.reduce((total, size) => total + size, 0);
    } catch {
      return 0;
    }
  }

  private async startQueuedProcessors(): Promise<void> {
    while (
      this.activeProcessors < this.maxConcurrentJobs &&
      this.pendingProcessors.length > 0
    ) {
      const next = this.pendingProcessors.shift();
      if (!next) return;

      this.activeProcessors += 1;
      void next
        .processor(next.jobId)
        .catch((error: unknown) => this.fail(next.jobId, error))
        .finally(() => {
          this.activeProcessors -= 1;
          void this.startQueuedProcessors();
        });
    }
  }

  private snapshot(
    job: StoredBookAnalysisJob,
    options?: { includeResult?: boolean },
  ): BookAnalysisJobSnapshot {
    return {
      ...job,
      progress: { ...job.progress },
      inputSummary: { ...job.inputSummary },
      result: options?.includeResult === false ? undefined : job.result,
      partialResult: job.partialResult
        ? {
            partial: job.partialResult.partial,
            type: job.partialResult.type,
            stage: job.partialResult.stage,
            savedAt: job.partialResult.savedAt,
            mapCount: job.partialResult.mapCount,
            totalChapters: job.partialResult.totalChapters,
            artifactDir: job.partialResult.artifactDir,
            notice: job.partialResult.notice,
            analysisStrategy: job.partialResult.analysisStrategy,
            outlineCount: job.partialResult.outlineCount,
            deepTargetOrders: job.partialResult.deepTargetOrders,
            deepCompletedCount: job.partialResult.deepCompletedCount,
          }
        : undefined,
    };
  }

  private chapterMapFileId(chapterMap: unknown, fallbackOrder: number) {
    const source = chapterMap as { chapterId?: unknown; order?: unknown };
    const rawId =
      typeof source?.chapterId === "string" && source.chapterId.trim()
        ? source.chapterId
        : typeof source?.order === "number"
          ? `ch-${String(source.order).padStart(4, "0")}`
          : `ch-${String(fallbackOrder).padStart(4, "0")}`;

    return rawId.replace(/[^a-zA-Z0-9._-]/g, "-");
  }
}
