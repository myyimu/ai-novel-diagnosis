import { Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  modelUsageEvents,
  type ModelUsageEventInsert,
  type ModelUsageEventSelect,
} from "@/service/drizzle/schema";

export interface ModelUsageSummary {
  since: string | null;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  estimatedRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgRequestMs: number | null;
  byModel: Array<{
    model: string;
    requests: number;
    totalTokens: number;
  }>;
}

const MAX_LIST_LIMIT = 200;
const DEFAULT_LIST_LIMIT = 50;

@Injectable()
export class ModelUsageRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async insertUsageEvent(
    event: ModelUsageEventInsert,
  ): Promise<ModelUsageEventSelect> {
    const [row] = await this.drizzle.db
      .insert(modelUsageEvents)
      .values(event)
      .returning();
    return row;
  }

  async listRecentUsage(
    options: { jobId?: string; limit?: number } = {},
  ): Promise<ModelUsageEventSelect[]> {
    const limit = Math.min(
      Math.max(1, Math.floor(options.limit ?? DEFAULT_LIST_LIMIT)),
      MAX_LIST_LIMIT,
    );
    const filters = options.jobId
      ? [eq(modelUsageEvents.jobId, options.jobId)]
      : [];

    return this.drizzle.db
      .select()
      .from(modelUsageEvents)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(modelUsageEvents.createdAt), desc(modelUsageEvents.id))
      .limit(limit);
  }

  async summarizeUsage(sinceIso?: string): Promise<ModelUsageSummary> {
    const since = sinceIso ? new Date(sinceIso) : undefined;
    const where = since ? gte(modelUsageEvents.createdAt, since) : undefined;

    const [totals] = await this.drizzle.db
      .select({
        totalRequests: count(),
        successRequests:
          sql<number>`count(*) filter (where ${modelUsageEvents.success})`.mapWith(
            Number,
          ),
        estimatedRequests:
          sql<number>`count(*) filter (where ${modelUsageEvents.estimated})`.mapWith(
            Number,
          ),
        promptTokens: sum(modelUsageEvents.promptTokens),
        completionTokens: sum(modelUsageEvents.completionTokens),
        totalTokens: sum(modelUsageEvents.totalTokens),
        avgRequestMs: sql<
          number | null
        >`avg(${modelUsageEvents.requestMs})`.mapWith((value) =>
          value === null ? null : Number(value),
        ),
      })
      .from(modelUsageEvents)
      .where(where);

    const byModelRows = await this.drizzle.db
      .select({
        model: modelUsageEvents.model,
        requests: count(),
        totalTokens: sum(modelUsageEvents.totalTokens),
      })
      .from(modelUsageEvents)
      .where(where)
      .groupBy(modelUsageEvents.model)
      .orderBy(desc(sum(modelUsageEvents.totalTokens)))
      .limit(20);

    const totalRequests = Number(totals?.totalRequests ?? 0);
    const successRequests = Number(totals?.successRequests ?? 0);

    return {
      since: since?.toISOString() ?? null,
      totalRequests,
      successRequests,
      failedRequests: totalRequests - successRequests,
      estimatedRequests: Number(totals?.estimatedRequests ?? 0),
      promptTokens: Number(totals?.promptTokens ?? 0),
      completionTokens: Number(totals?.completionTokens ?? 0),
      totalTokens: Number(totals?.totalTokens ?? 0),
      avgRequestMs:
        totals?.avgRequestMs === null || totals?.avgRequestMs === undefined
          ? null
          : Math.round(totals.avgRequestMs),
      byModel: byModelRows.map((row) => ({
        model: row.model,
        requests: Number(row.requests),
        totalTokens: Number(row.totalTokens ?? 0),
      })),
    };
  }
}
