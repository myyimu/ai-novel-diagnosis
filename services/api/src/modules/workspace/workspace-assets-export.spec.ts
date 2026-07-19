import { buildWorkspaceProjectMarkdown } from "./workspace-assets-export";
import type { StoryAuditResult } from "@ai-novel-diagnosis/ai-core";

const baseStoryAudit: StoryAuditResult = {
  schemaVersion: "story-audit.v1",
  auditId: "audit-a",
  projectId: "project-a",
  bookJobId: "book-job-a",
  generatedAt: "2026-06-24T02:30:00.000Z",
  coverage: {
    analyzedChapterIds: ["chapter-1"],
    totalChapterCount: 2,
    isPartial: true,
    sceneExtractionRate: 0.8,
    evidenceValidationRate: 1,
  },
  scenes: [
    {
      id: "scene-1",
      chapterId: "chapter-1",
      orderInChapter: 1,
      narrativeOrder: 1,
      title: "退婚现场",
      locationIds: ["hall"],
      participantIds: ["hero"],
      evidence: [],
    },
  ],
  events: [
    {
      id: "event-1",
      sceneId: "scene-1",
      summary: "主角被当众退婚",
      participantIds: ["hero"],
      locationIds: ["hall"],
      relations: [],
      evidence: [],
    },
  ],
  facts: [],
  characterStates: [],
  findings: [
    {
      id: "finding-a",
      category: "timeline_conflict",
      severity: "high",
      status: "candidate",
      title: "时间线候选冲突",
      claim: "第二章回忆与第一章公开退婚的先后顺序需要复核。",
      evidence: [
        {
          anchorId: "anchor-a",
          chapterId: "chapter-1",
          chapterOrder: 1,
          quote: "长老当众宣布取消他的试炼资格。",
          startOffset: 3,
          endOffset: 18,
          source: "text",
        },
      ],
      relatedFactIds: [],
      relatedEventIds: ["event-1"],
      ruleIds: ["rule-a"],
      alternativeExplanations: ["可能是角色记忆偏差，需要作者确认。"],
      readerImpact: "读者可能误解公开退婚发生的时间。",
      fixAction: "补一句明确时间锚点。",
      confidence: 0.87,
    },
  ],
  metrics: {
    dialogue: [
      {
        scopeId: "chapter-1",
        effectiveCharacterCount: 100,
        dialogueCharacterCount: 20,
        dialogueCharacterRatio: 0.2,
        paragraphCount: 5,
        dialogueParagraphCount: 1,
        dialogueParagraphRatio: 0.2,
        dialogueTurnCount: 2,
        dialogueTagCount: 1,
        unattributedTurnCandidateCount: 0,
        parserWarnings: [],
      },
    ],
  },
  views: {
    temporalGraph: {
      eventIds: ["event-1"],
      relationEdges: [],
      conflictCandidateIds: ["finding-a"],
    },
    plotlineMatrix: [],
    setupPayoffEdges: [],
  },
};

describe("buildWorkspaceProjectMarkdown", () => {
  it("exports revision notes and prompt templates for a persisted project", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [
        {
          id: "revision-2",
          projectId: "project-a",
          createdAt: "2026-06-24T01:00:00.000Z",
          chapterTitle: "第二版",
          genre: "xuanhuan",
          inputKind: "ai-draft",
          textHash: "hash",
          textLength: 120,
          quickScore: 6.8,
          gateDecision: "revise",
          mainProblem: "章末钩子没有代价",
          issueTitles: ["章末钩子没有代价"],
          issueCategories: ["hook"],
          nextPrompt: "请补强章末代价。",
          revisionNote: "这一版已经补了章末代价。",
          fromVersionId: "version-1",
          toVersionId: "version-2",
          textChanged: true,
          storyAuditFindingIds: ["finding-a"],
          methodologyCardIds: ["method-1"],
        },
        {
          id: "revision-1",
          projectId: "project-a",
          createdAt: "2026-06-24T00:00:00.000Z",
          chapterTitle: "第一版",
          genre: "xuanhuan",
          inputKind: "ai-draft",
          textHash: "hash-1",
          textLength: 100,
          quickScore: 5.6,
          gateDecision: "rebuild",
          mainProblem: "章末钩子没有代价",
          issueTitles: ["章末钩子没有代价"],
          issueCategories: ["hook"],
          nextPrompt: "请补强章末代价。",
          methodologyCardIds: ["method-1"],
        },
      ],
      revisionVersions: [
        {
          id: "version-1",
          projectId: "project-a",
          createdAt: "2026-06-24T00:00:00.000Z",
          chapterTitle: "第一章 退婚",
          versionLabel: "V1",
          textHash: "hash-1",
          textLength: 100,
          text: "版本一正文",
        },
        {
          id: "version-2",
          projectId: "project-a",
          createdAt: "2026-06-24T01:00:00.000Z",
          chapterTitle: "第一章 退婚",
          versionLabel: "V2",
          textHash: "hash-2",
          textLength: 120,
          text: "版本二正文",
          previousVersionId: "version-1",
          sourceSessionId: "revision-2",
        },
      ],
      methodologyCards: [
        {
          id: "method-1",
          projectCardId: "method-1",
          projectId: "project-a",
          sourceIssueId: "issue-1",
          type: "hook_rule",
          title: "钩子必须绑定代价",
          triggerProblem: "章末钩子没有代价",
          reusableRule: "章末悬念要绑定读者不继续阅读的损失。",
          selfCheckQuestion: "读者知道不点下一章会错过什么吗？",
          promptTemplate: "请补强章末代价。",
          firstSeenAt: "2026-06-24T00:00:00.000Z",
          lastSeenAt: "2026-06-24T01:00:00.000Z",
          sourceChapterTitle: "第一章 退婚",
          sourceIssueTitle: "章末钩子没有代价",
          occurrenceCount: 2,
        },
      ],
      storyAudit: baseStoryAudit,
      storyAuditFindingReviews: [
        {
          projectId: "project-a",
          auditId: "audit-a",
          findingId: "finding-a",
          reviewState: "confirmed",
          note: "确认为需要改的时间线问题。",
          updatedAt: "2026-06-24T02:40:00.000Z",
        },
      ],
      generatedAt: "2026-06-24T03:00:00.000Z",
    });

    expect(markdown).toContain("AI网文诊断台项目导出");
    expect(markdown).toContain("项目概览");
    expect(markdown).toContain("正文版本：2");
    expect(markdown).toContain("复诊轨迹");
    expect(markdown).toContain("正文版本：V1 -> V2");
    expect(markdown).toContain("人工备注");
    expect(markdown).toContain("这一版已经补了章末代价。");
    expect(markdown).toContain("方法论卡");
    expect(markdown).toContain("Prompt 模板合集");
    expect(markdown).toContain("Prompt 归因");
    expect(markdown).toContain("Prompt 有效");
    expect(markdown).toContain("项目级归因校准");
    expect(markdown).toContain("模型/编辑复核提示");
    expect(markdown).toContain("诊断理由");
    expect(markdown).toContain("置信度");
    expect(markdown).toContain("信号");
    expect(markdown).toContain("请补强章末代价。");
    expect(markdown).toContain("故事体检 storyAudit");
    expect(markdown).toContain("partial：是，仅导出已分析范围");
    expect(markdown).toContain("Finding 摘要");
    expect(markdown).toContain("人工复核：confirmed");
    expect(markdown).toContain("关联复诊：revision-2");
    expect(markdown).toContain("长老当众宣布取消他的试炼资格。");
    expect(markdown).toContain("可能是角色记忆偏差，需要作者确认。");
    expect(markdown).not.toContain("版本一正文");
    expect(markdown).not.toContain("版本二正文");
  });

  it("exports insufficient revision scores without coercing them to zero", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [
        {
          id: "revision-insufficient",
          projectId: "project-a",
          createdAt: "2026-06-24T01:00:00.000Z",
          chapterTitle: "材料不足版",
          genre: "xuanhuan",
          inputKind: "human-draft",
          textHash: "hash",
          textLength: 2,
          quickScore: null,
          gateDecision: "insufficient",
          mainProblem: "输入信息不足",
          issueTitles: ["输入信息不足"],
          issueCategories: [],
          textChanged: true,
          methodologyCardIds: [],
        },
      ],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-06-24T03:00:00.000Z",
    });

    expect(markdown).toContain("信息不足，暂不评分");
    expect(markdown).not.toContain("0/10");
  });
});
