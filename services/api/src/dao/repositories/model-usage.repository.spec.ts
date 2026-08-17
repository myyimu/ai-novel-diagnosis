import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import type { ModelUsageEventInsert } from "@/service/drizzle/schema";
import { ModelUsageRepository } from "./model-usage.repository";

function buildEvent(
  overrides: Partial<ModelUsageEventInsert> = {},
): ModelUsageEventInsert {
  return {
    jobId: "job-1",
    stage: "quick-review",
    component: "analysis",
    requestKind: "diagnosis",
    provider: "openai-compatible",
    preset: "doubao",
    model: "doubao-seed-2-0-mini",
    promptTokens: 120,
    completionTokens: 80,
    totalTokens: 200,
    requestMs: 1500,
    estimated: false,
    success: true,
    metadata: {},
    ...overrides,
  };
}

describe("ModelUsageRepository", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;
  let tempPgliteDataDir: string | undefined;
  let drizzle: DrizzleService | undefined;

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-usage-"));
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

  it("should insert events and list them newest-first with jobId filter", async () => {
    const repository = new ModelUsageRepository(drizzle!);

    const inserted = await repository.insertUsageEvent(buildEvent());
    await repository.insertUsageEvent(
      buildEvent({ jobId: "job-2", model: "shared-gpu-anonymous" }),
    );
    await repository.insertUsageEvent(
      buildEvent({
        jobId: null,
        success: false,
        error: "Provider request failed: 503",
      }),
    );

    expect(inserted.id).toBeTruthy();
    expect(inserted.createdAt).toBeInstanceOf(Date);

    const jobOne = await repository.listRecentUsage({ jobId: "job-1" });
    expect(jobOne).toHaveLength(1);
    expect(jobOne[0]?.jobId).toBe("job-1");

    const all = await repository.listRecentUsage({ limit: 2 });
    expect(all).toHaveLength(2);
    expect(new Date(all[0]!.createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(all[1]!.createdAt).getTime(),
    );
  });

  it("should clamp list limits into the 1..200 range", async () => {
    const repository = new ModelUsageRepository(drizzle!);
    await repository.insertUsageEvent(buildEvent());

    const tooLarge = await repository.listRecentUsage({ limit: 99999 });
    expect(tooLarge).toHaveLength(1);

    const tooSmall = await repository.listRecentUsage({ limit: 0 });
    expect(tooSmall).toHaveLength(1);
  });

  it("should summarize totals, failures, estimates, and per-model counts", async () => {
    const repository = new ModelUsageRepository(drizzle!);

    await repository.insertUsageEvent(
      buildEvent({
        requestMs: 1000,
        createdAt: new Date("2026-08-01T08:00:00.000Z"),
      }),
    );
    await repository.insertUsageEvent(
      buildEvent({
        model: "shared-gpu-anonymous",
        promptTokens: 50,
        completionTokens: 30,
        totalTokens: 80,
        requestMs: 3000,
        estimated: true,
        createdAt: new Date("2026-08-01T09:00:00.000Z"),
      }),
    );
    await repository.insertUsageEvent(
      buildEvent({
        success: false,
        promptTokens: 10,
        completionTokens: 0,
        totalTokens: 10,
        requestMs: 500,
        error: "timeout",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      }),
    );

    const summary = await repository.summarizeUsage();

    expect(summary.totalRequests).toBe(3);
    expect(summary.successRequests).toBe(2);
    expect(summary.failedRequests).toBe(1);
    expect(summary.estimatedRequests).toBe(1);
    expect(summary.promptTokens).toBe(180);
    expect(summary.completionTokens).toBe(110);
    expect(summary.totalTokens).toBe(290);
    expect(summary.avgRequestMs).toBe(1500);
    expect(summary.byModel).toEqual([
      { model: "doubao-seed-2-0-mini", requests: 2, totalTokens: 210 },
      { model: "shared-gpu-anonymous", requests: 1, totalTokens: 80 },
    ]);

    const sinceSummary = await repository.summarizeUsage(
      "2026-08-01T09:30:00.000Z",
    );
    expect(sinceSummary.totalRequests).toBe(1);
    expect(sinceSummary.failedRequests).toBe(1);
    expect(sinceSummary.byModel).toEqual([
      { model: "doubao-seed-2-0-mini", requests: 1, totalTokens: 10 },
    ]);
  });

  it("should return an empty summary when no events exist", async () => {
    const repository = new ModelUsageRepository(drizzle!);

    const summary = await repository.summarizeUsage();

    expect(summary.totalRequests).toBe(0);
    expect(summary.avgRequestMs).toBeNull();
    expect(summary.byModel).toEqual([]);
  });
});
