import { Test } from "@nestjs/testing";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import { StoryAuditFindingReviewRepository } from "./story-audit-review.repository";

describe("StoryAuditFindingReviewRepository", () => {
  async function buildRepo(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        StoryAuditFindingReviewRepository,
        {
          provide: DrizzleService,
          useValue: { db } as unknown as DrizzleService,
        },
      ],
    }).compile();
    return module.get(StoryAuditFindingReviewRepository);
  }

  it("upserts on the (projectId, auditId, findingId) key and maps the row", async () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    const returning = jest.fn().mockResolvedValue([
      {
        id: "r1",
        projectId: "p1",
        bookJobId: "job-1",
        auditId: "a1",
        findingId: "f1",
        reviewState: "confirmed",
        note: "ok",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const onConflict = jest.fn().mockReturnValue({ returning });
    const values = jest
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflict });
    const insert = jest.fn().mockReturnValue({ values });

    const repo = await buildRepo({ insert });

    const record = await repo.upsert({
      projectId: "p1",
      bookJobId: "job-1",
      auditId: "a1",
      findingId: "f1",
      reviewState: "confirmed",
      note: "ok",
    });

    expect(insert).toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalled();
    const conflictArg = onConflict.mock.calls[0]?.[0];
    expect(conflictArg.target).toHaveLength(3);
    expect(record).toEqual(
      expect.objectContaining({
        id: "r1",
        projectId: "p1",
        reviewState: "confirmed",
        note: "ok",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    );
  });

  it("maps a null note to undefined when listing reviews", async () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    const orderBy = jest.fn().mockResolvedValue([
      {
        id: "r1",
        projectId: "p1",
        bookJobId: "job-1",
        auditId: "a1",
        findingId: "f1",
        reviewState: "planned",
        note: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const where = jest.fn().mockReturnValue({ orderBy });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });

    const repo = await buildRepo({ select });

    const records = await repo.listByProject({ projectId: "p1" });

    expect(records).toHaveLength(1);
    expect(records[0]?.note).toBeUndefined();
    expect(records[0]?.reviewState).toBe("planned");
    expect(where).toHaveBeenCalled();
  });
});
