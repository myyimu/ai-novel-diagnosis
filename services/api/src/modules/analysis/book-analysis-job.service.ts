import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { AnalysisPersistenceRepository } from "./analysis-persistence.repository";
import { BookPreprocessResult } from "./text-preprocessor.service";

export type BookAnalysisJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface BookAnalysisJobProgress {
  stage: "queued" | "preprocess" | "map" | "reduce" | "succeeded" | "failed";
  current: number;
  total: number;
  message: string;
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
  result?: unknown;
  error?: string;
}

interface StoredBookAnalysisJob extends BookAnalysisJobSnapshot {}

@Injectable()
export class BookAnalysisJobService implements OnModuleInit {
  private readonly logger = new Logger(BookAnalysisJobService.name);
  private readonly jobs = new Map<string, StoredBookAnalysisJob>();

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
      chapters: preprocessing.chapters.map(({ text: _text, ...chapter }) => chapter),
    };
    job.updatedAt = new Date().toISOString();
    await this.repository.updateJob(jobId, { preprocessing: job.preprocessing });
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
    job.progress = {
      stage: "failed",
      current: job.progress.current,
      total: job.progress.total,
      message: job.error,
    };
    await this.repository.updateJob(jobId, {
      status: job.status,
      progress: job.progress,
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
