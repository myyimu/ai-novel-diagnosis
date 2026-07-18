import { WorkspaceController } from "./workspace.controller";

describe("WorkspaceController", () => {
  it("should persist story audit finding review state through the workspace repository", async () => {
    const repository = {
      upsertStoryAuditFindingReview: jest.fn(async (input) => input),
    };
    const controller = new WorkspaceController(repository as never);

    await expect(
      controller.upsertStoryAuditFindingReview({
        projectId: "project-1",
        auditId: "audit-1",
        findingId: "finding-1",
        reviewState: "false_positive",
        note: "模型误报",
        updatedAt: "2026-07-18T08:00:00.000Z",
      }),
    ).resolves.toEqual({
      projectId: "project-1",
      auditId: "audit-1",
      findingId: "finding-1",
      reviewState: "false_positive",
      note: "模型误报",
      updatedAt: "2026-07-18T08:00:00.000Z",
    });
    expect(repository.upsertStoryAuditFindingReview).toHaveBeenCalledWith({
      projectId: "project-1",
      auditId: "audit-1",
      findingId: "finding-1",
      reviewState: "false_positive",
      note: "模型误报",
      updatedAt: "2026-07-18T08:00:00.000Z",
    });
  });
});
