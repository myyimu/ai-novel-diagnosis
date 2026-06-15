import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AnalysisPersistenceRepository } from "./analysis-persistence.repository";
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
  chapterMaps: unknown[];
  notice: string;
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
  };
  progress: BookAnalysisJobProgress;
  preprocessing?: Omit<BookPreprocessResult, "chapters"> & {
    chapters: Array<Omit<BookPreprocessResult["chapters"][number], "text">>;
  };
  partialResult?: BookAnalysisPartialResult;
  result?: unknown;
  error?: string;
}

interface StoredBookAnalysisJob extends BookAnalysisJobSnapshot {}

@Injectable()
export class BookAnalysisJobService implements OnModuleInit {
  private readonly logger = new Logger(BookAnalysisJobService.name);
  private readonly jobs = new Map<string, StoredBookAnalysisJob>();
  private readonly storageRoot =
    process.env.ANALYSIS_STORAGE_DIR?.trim() ||
    join(process.cwd(), ".local", "analysis");

  constructor(private readonly repository: AnalysisPersistenceRepository) {}

  async onModuleInit() {
    await this.repository.markInterruptedJobsFailed();
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
        message: "任务已进入本地内存队列。",
      },
    };

    this.jobs.set(id, job);
    await this.repository.createJob(job, uploadId);
    setTimeout(() => {
      void processor(id).catch((error: unknown) => {
        void this.fail(id, error);
      });
    }, 0);

    return this.snapshot(job);
  }

  async get(jobId: string): Promise<BookAnalysisJobSnapshot> {
    const inMemory = this.jobs.get(jobId);
    if (inMemory) {
      return this.snapshot(inMemory);
    }

    const persisted = await this.repository.getJob(jobId);
    if (!persisted) {
      throw new NotFoundException(`Book analysis job not found: ${jobId}`);
    }

    return persisted;
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
    chapterMaps: unknown[];
    totalChapters: number;
  }) {
    const job = this.read(input.jobId);
    const mapCount = input.chapterMaps.length;
    const artifactDir = join(this.storageRoot, "jobs", input.jobId, "maps");
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      join(artifactDir, `${String(mapCount).padStart(4, "0")}.json`),
      JSON.stringify(input.chapterMap, null, 2),
      "utf8",
    );

    const now = new Date().toISOString();
    job.partialResult = {
      partial: true,
      type: "book-map-reduce-partial",
      stage: "map",
      savedAt: now,
      mapCount,
      totalChapters: input.totalChapters,
      artifactDir,
      chapterMaps: input.chapterMaps,
      notice:
        "这是整书拆解的中间结果。任务失败时可用于查看已完成章节，后续可扩展为断点续跑或半成品导出。",
    };
    job.updatedAt = now;
    await this.repository.updateJob(input.jobId, {
      partialResult: job.partialResult,
    });
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
      message: "整书 map-reduce 拆解完成。",
    };
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
      result,
      finishedAt: now,
    });
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
    this.logger.warn(`Book analysis job failed: ${jobId} ${job.error}`);
  }

  private read(jobId: string): StoredBookAnalysisJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Book analysis job not found: ${jobId}`);
    }

    return job;
  }

  private snapshot(job: StoredBookAnalysisJob): BookAnalysisJobSnapshot {
    return {
      ...job,
      progress: { ...job.progress },
      inputSummary: { ...job.inputSummary },
    };
  }
}
