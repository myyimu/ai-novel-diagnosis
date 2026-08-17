import { NotFoundException } from "@nestjs/common";
import { ErrorCode } from "@/core/constants/error-code";
import { BusinessException } from "@/core/exceptions/business.exception";
import type {
  RevisionSessionSnapshot,
  RevisionTextVersionSnapshot,
} from "@/dao/entities/workspace-assets.entity";
import type { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import type { AnalysisService } from "@/modules/analysis/analysis.service";
import type { QuickReviewResult } from "@ai-novel-diagnosis/ai-core";
import { hashRevisionText } from "@ai-novel-diagnosis/ai-core";
import { RevisionRetestService } from "./revision-retest.service";

const longText =
  "主角被退婚后没有立刻反击，而是当夜翻出父亲留下的旧案卷宗，" +
  "在灯下逐条比对三年前的证词，终于发现长老宣判时漏掉的一个名字。";

function buildSession(
  overrides: Partial<RevisionSessionSnapshot> = {},
): RevisionSessionSnapshot {
  return {
    id: "revision-pending",
    projectId: "project-1",
    createdAt: "2026-08-01T08:00:00.000Z",
    chapterTitle: "第一章",
    genre: "xuanhuan",
    inputKind: "human-draft",
    textHash: "hash-old",
    textLength: longText.length,
    quickScore: 5.4,
    gateDecision: "rebuild",
    mainProblem: "开局无事件",
    issueTitles: ["开局无事件"],
    issueCategories: ["opening"],
    retestStatus: "pending",
    nextPrompt: "请补强开局事件。",
    fromVersionId: "version-1",
    toVersionId: "version-2",
    methodologyCardIds: [],
    ...overrides,
  };
}

function buildResult(
  overrides: Partial<QuickReviewResult> = {},
): QuickReviewResult {
  return {
    title: "第一章",
    genre: "xuanhuan",
    inputKind: "human-draft",
    positioning: "退婚流开局",
    sellingPoints: ["公开羞辱"],
    mainProblem: "章末钩子没有代价",
    actionableFixes: ["补强不追读的损失"],
    recommendedPlatforms: [],
    readyForFullReview: true,
    readyReason: "可以继续",
    quickScore: 6.2,
    confidence: 0.8,
    gateDecision: "revise",
    issues: [
      {
        id: "issue-1",
        severity: "high",
        category: "hook",
        title: "章末钩子没有代价",
        description: "结尾有悬念但读者不知道损失什么。",
        evidence: [],
        readerImpact: "读者可能不点下一章。",
        fixAction: "把危机压到结尾。",
        promptConstraint: "章末必须出现代价。",
        blocksNextStep: true,
      },
    ],
    nextPrompt: {
      title: "下一轮 Prompt",
      prompt: "请把章末代价写实。",
      linkedIssueIds: ["issue-1"],
      whyThisWorks: ["对应解决章末钩子问题。"],
    },
    ...overrides,
  };
}

function buildVersion(
  overrides: Partial<RevisionTextVersionSnapshot> = {},
): RevisionTextVersionSnapshot {
  return {
    id: "version-2",
    projectId: "project-1",
    createdAt: "2026-08-01T08:30:00.000Z",
    chapterTitle: "第一章",
    versionLabel: "V2",
    textHash: hashRevisionText(longText),
    textLength: longText.length,
    text: longText,
    ...overrides,
  };
}

describe("RevisionRetestService", () => {
  function buildHarness(input: {
    session: RevisionSessionSnapshot;
    result?: QuickReviewResult;
    versions?: RevisionTextVersionSnapshot[];
    earlierSessions?: RevisionSessionSnapshot[];
  }) {
    const repository = {
      findRevisionSessionById: jest.fn().mockResolvedValue(input.session),
      findRevisionTextVersionById: jest.fn(
        async (versionId: string) =>
          (input.versions || []).find((version) => version.id === versionId) ||
          null,
      ),
      listProjectRevisionVersions: jest
        .fn()
        .mockResolvedValue(input.versions || []),
      listProjectSessionsBefore: jest
        .fn()
        .mockResolvedValue(input.earlierSessions || []),
      upsertRevisionTextVersion: jest.fn().mockResolvedValue(undefined),
      completeRevisionRetest: jest.fn(
        async (patch: {
          sessionId: string;
          quickScore: number | null;
          gateDecision: string;
          mainProblem: string;
          toVersionId?: string;
        }) => ({
          ...input.session,
          ...patch,
          retestStatus: "completed" as const,
        }),
      ),
    };
    const analysis = {
      quickReview: jest.fn().mockResolvedValue(input.result ?? buildResult()),
    };
    const service = new RevisionRetestService(
      repository as unknown as WorkspaceAssetsRepository,
      analysis as unknown as AnalysisService,
    );

    return { service, repository, analysis };
  }

  it("should complete a pending retest in place with comparison and attribution", async () => {
    const session = buildSession();
    const version = buildVersion();
    const { service, repository, analysis } = buildHarness({
      session,
      versions: [version],
    });

    const response = await service.runRetest("revision-pending", {});

    expect(analysis.quickReview).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterText: version.text,
        title: "第一章",
        previousPrompt: "请补强开局事件。",
      }),
    );
    expect(repository.completeRevisionRetest).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "revision-pending",
        quickScore: 6.2,
        gateDecision: "revise",
        textHash: hashRevisionText(longText),
        toVersionId: "version-2",
      }),
    );
    expect(repository.upsertRevisionTextVersion).not.toHaveBeenCalled();
    expect(response.session.retestStatus).toBe("completed");
    expect(response.previousSession).toEqual(session);
    expect(response.comparison?.scoreDelta).toBe(0.8);
    expect(response.comparison?.promptOutcome.status).toBe("effective");
    expect(response.comparison?.resolvedIssues).toContain("开局无事件");
    expect(response.createdVersion).toBeNull();
    expect(response.promptAttribution.items[0]?.scoreDelta).toBe(0.8);
  });

  it("should reject retests on sessions that are not pending", async () => {
    const session = buildSession({ retestStatus: "completed" });
    const { service, repository } = buildHarness({ session });

    const error = await service
      .runRetest("revision-pending", {})
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).getStatus()).toBe(409);
    expect((error as BusinessException).getResponse()).toMatchObject({
      code: ErrorCode.RESOURCE_CONFLICT,
    });
    expect(repository.completeRevisionRetest).not.toHaveBeenCalled();
  });

  it("should reject retests when the target version is missing", async () => {
    const session = buildSession({ toVersionId: undefined });
    const noVersion = buildHarness({ session });

    const missingId = await noVersion.service
      .runRetest("revision-pending", {})
      .catch((caught: unknown) => caught);

    expect((missingId as BusinessException).getStatus()).toBe(400);
    expect((missingId as BusinessException).getResponse()).toMatchObject({
      code: ErrorCode.INVALID_PARAMS,
    });

    const dangling = buildHarness({
      session: buildSession(),
      versions: [],
    });
    const danglingError = await dangling.service
      .runRetest("revision-pending", {})
      .catch((caught: unknown) => caught);

    expect((danglingError as BusinessException).getStatus()).toBe(400);
    expect((danglingError as BusinessException).getResponse()).toMatchObject({
      code: ErrorCode.INVALID_PARAMS,
    });
  });

  it("should propagate unknown session ids as not found", async () => {
    const repository = {
      findRevisionSessionById: jest
        .fn()
        .mockRejectedValue(
          new NotFoundException("Revision session not found: missing"),
        ),
    };
    const service = new RevisionRetestService(
      repository as unknown as WorkspaceAssetsRepository,
      {} as AnalysisService,
    );

    await expect(service.runRetest("missing", {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should create and persist a version when toVersionText misses existing hashes", async () => {
    const session = buildSession();
    const newText = `${longText}他又把卷宗合上，压在枕下。`;
    const { service, repository, analysis } = buildHarness({
      session,
      versions: [buildVersion()],
    });

    const response = await service.runRetest("revision-pending", {
      toVersionText: newText,
    });

    expect(repository.upsertRevisionTextVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        versionLabel: "V2",
        previousVersionId: "version-2",
      }),
      "project-1",
    );
    expect(repository.completeRevisionRetest).toHaveBeenCalledWith(
      expect.objectContaining({
        toVersionId: response.createdVersion?.id,
        textLength: newText.length,
      }),
    );
    expect(analysis.quickReview).toHaveBeenCalledWith(
      expect.objectContaining({ chapterText: newText }),
    );
    expect(response.createdVersion?.text).toBe(newText.trim());
  });

  it("should reuse an existing version when toVersionText hash matches", async () => {
    const session = buildSession();
    const version = buildVersion();
    const { service, repository } = buildHarness({
      session,
      versions: [version],
    });

    const response = await service.runRetest("revision-pending", {
      toVersionText: longText,
    });

    expect(repository.upsertRevisionTextVersion).not.toHaveBeenCalled();
    expect(response.createdVersion).toBeNull();
    expect(repository.completeRevisionRetest).toHaveBeenCalledWith(
      expect.objectContaining({ toVersionId: version.id }),
    );
  });

  it("should keep the session pending when the diagnosis call fails", async () => {
    const session = buildSession();
    const repository = {
      findRevisionSessionById: jest.fn().mockResolvedValue(session),
      findRevisionTextVersionById: jest.fn().mockResolvedValue(buildVersion()),
      listProjectRevisionVersions: jest.fn().mockResolvedValue([]),
      listProjectSessionsBefore: jest.fn().mockResolvedValue([]),
      upsertRevisionTextVersion: jest.fn().mockResolvedValue(undefined),
      completeRevisionRetest: jest
        .fn()
        .mockResolvedValue(buildSession({ retestStatus: "completed" })),
    };
    const analysis = {
      quickReview: jest
        .fn()
        .mockRejectedValue(
          new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR),
        ),
    };
    const service = new RevisionRetestService(
      repository as unknown as WorkspaceAssetsRepository,
      analysis as unknown as AnalysisService,
    );

    await expect(service.runRetest("revision-pending", {})).rejects.toThrow(
      BusinessException,
    );
    expect(repository.upsertRevisionTextVersion).not.toHaveBeenCalled();
    expect(repository.completeRevisionRetest).not.toHaveBeenCalled();
  });
});
