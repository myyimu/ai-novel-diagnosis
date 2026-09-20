import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type {
  ChapterExperiment,
  ChapterExperimentSummary,
} from "@ai-novel-diagnosis/ai-core";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import { chapterExperiments } from "@/service/drizzle/schema";

@Injectable()
export class ChapterExperimentsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(experiment: ChapterExperiment): Promise<ChapterExperiment> {
    await this.drizzle.db.insert(chapterExperiments).values({
      id: experiment.id,
      projectId: experiment.projectId,
      payload: experiment,
      revision: experiment.revision,
      createdAt: new Date(experiment.createdAt),
    });
    return experiment;
  }

  async find(id: string): Promise<ChapterExperiment | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(chapterExperiments)
      .where(eq(chapterExperiments.id, id));
    return row?.payload ?? null;
  }

  async list(projectId: string): Promise<ChapterExperimentSummary[]> {
    const rows = await this.drizzle.db
      .select()
      .from(chapterExperiments)
      .where(eq(chapterExperiments.projectId, projectId))
      .orderBy(desc(chapterExperiments.createdAt));
    return rows.map(({ payload }) => ({
      id: payload.id,
      chapterTitle: payload.chapterTitle,
      goal: payload.goal,
      createdAt: payload.createdAt,
    }));
  }

  async save(
    experiment: ChapterExperiment,
    expectedRevision: number,
  ): Promise<boolean> {
    const rows = await this.drizzle.db
      .update(chapterExperiments)
      .set({ payload: experiment, revision: experiment.revision })
      .where(
        and(
          eq(chapterExperiments.id, experiment.id),
          eq(chapterExperiments.revision, expectedRevision),
        ),
      )
      .returning({ id: chapterExperiments.id });
    return rows.length === 1;
  }
}
