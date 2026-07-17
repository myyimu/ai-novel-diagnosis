import { Test } from "@nestjs/testing";
import { StoryAuditFindingReviewRepository } from "@/dao/repositories/story-audit-review.repository";
import { StoryAuditReviewService } from "./story-audit-review.service";

describe("StoryAuditReviewService", () => {
  async function buildService(repo: {
    listByProject: jest.Mock;
    upsert: jest.Mock;
  }) {
    const module = await Test.createTestingModule({
      providers: [
        StoryAuditReviewService,
        {
          provide: StoryAuditFindingReviewRepository,
          useValue: repo as unknown as StoryAuditFindingReviewRepository,
        },
      ],
    }).compile();
    return module.get(StoryAuditReviewService);
  }

  it("delegates listing with the projectId and optional bookJobId filter", async () => {
    const repo = {
      listByProject: jest
        .fn()
        .mockResolvedValue([
          { id: "r1", projectId: "p1", reviewState: "confirmed" },
        ]),
      upsert: jest.fn(),
    };
    const service = await buildService(repo);

    const result = await service.listReviews("p1", "job-1");

    expect(repo.listByProject).toHaveBeenCalledWith({
      projectId: "p1",
      bookJobId: "job-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.reviewState).toBe("confirmed");
  });

  it("merges path params into the upsert payload", async () => {
    const repo = {
      listByProject: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: "r1", reviewState: "planned" }),
    };
    const service = await buildService(repo);

    const result = await service.upsertReview("p1", "f1", {
      bookJobId: "job-1",
      auditId: "a1",
      reviewState: "planned",
      note: "加入下一轮改稿",
    });

    expect(repo.upsert).toHaveBeenCalledWith({
      projectId: "p1",
      findingId: "f1",
      bookJobId: "job-1",
      auditId: "a1",
      reviewState: "planned",
      note: "加入下一轮改稿",
    });
    expect(result).toEqual({ id: "r1", reviewState: "planned" });
  });
});
