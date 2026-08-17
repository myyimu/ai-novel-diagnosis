import { Injectable } from "@nestjs/common";
import {
  ModelUsageRepository,
  type ModelUsageSummary,
} from "@/dao/repositories/model-usage.repository";
import type { ModelUsageEventSelect } from "@/service/drizzle/schema";

/** Wire-format usage event: dates serialized as ISO strings. */
export interface ModelUsageEventView {
  id: string;
  jobId: string | null;
  stage: string | null;
  component: string | null;
  requestKind: string | null;
  provider: string;
  preset: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestMs: number;
  estimated: boolean;
  success: boolean;
  error: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class ModelUsageService {
  constructor(private readonly repository: ModelUsageRepository) {}

  async listEvents(
    options: { jobId?: string; limit?: number } = {},
  ): Promise<ModelUsageEventView[]> {
    const events = await this.repository.listRecentUsage(options);
    return events.map((event) => this.toView(event));
  }

  async summarize(sinceIso?: string): Promise<ModelUsageSummary> {
    return this.repository.summarizeUsage(sinceIso);
  }

  private toView(event: ModelUsageEventSelect): ModelUsageEventView {
    return {
      id: event.id,
      jobId: event.jobId,
      stage: event.stage,
      component: event.component,
      requestKind: event.requestKind,
      provider: event.provider,
      preset: event.preset,
      model: event.model,
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
      totalTokens: event.totalTokens,
      requestMs: event.requestMs,
      estimated: event.estimated,
      success: event.success,
      error: event.error,
      metadata: toRecord(event.metadata),
      createdAt: event.createdAt.toISOString(),
    };
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
