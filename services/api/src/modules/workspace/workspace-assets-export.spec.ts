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

  it("exports the story engine section from a confirmed engine card", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      engineCard: {
        projectId: "project-a",
        status: "confirmed",
        premiseSummary: "一个少年用禁忌力量向灭门仇人复仇的故事。",
        coreConflict: "主角想复仇，而仇人是唯一能救他妹妹的人。",
        protagonistDesire: "救妹妹，且不放弃复仇。",
        opposingForce: "仇人的救命之恩与宗门的追杀令。",
        irreducibilityTest: "换成现代都市背景后两难依然成立。",
        readerHookQuestion: "他会在救人与复仇之间选哪一边？",
        engineVerdict: "fixable",
        genre: "xuanhuan",
        reviewId: "premise-review-42",
        confirmedAt: "2026-08-19T08:00:00.000Z",
        updatedAt: "2026-08-19T08:00:00.000Z",
      },
      generatedAt: "2026-08-19T09:00:00.000Z",
    });

    expect(markdown).toContain("故事发动机：已确认");
    expect(markdown).toContain("## 故事发动机");
    // The engine section sits between 项目概览 and the diagnosis records.
    expect(markdown.indexOf("## 故事发动机")).toBeGreaterThan(
      markdown.indexOf("## 项目概览"),
    );
    expect(markdown).toContain("状态：已确认");
    expect(markdown).toContain("审稿判定：值得写，但先修这几处");
    expect(markdown).toContain(
      "核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。",
    );
    expect(markdown).toContain("读者钩子问题：他会在救人与复仇之间选哪一边？");
  });

  it("reports the story engine section as absent without an engine card", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-08-19T09:00:00.000Z",
    });

    expect(markdown).toContain("故事发动机：暂无");
    expect(markdown).toContain("暂无发动机卡（这本书尚未走立项审稿确认）。");
  });

  it("exports premise consults with both verdicts side by side and the dropped count", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-08-20T09:00:00.000Z",
      premiseConsults: [
        {
          id: "consult-1",
          projectId: "project-a",
          trigger: "author-disagrees",
          mode: "model",
          verdictRelation: "opposite",
          createdAt: new Date("2026-08-20T08:00:00.000Z"),
          updatedAt: new Date("2026-08-20T08:00:00.000Z"),
          result: {
            schemaVersion: "premise-consult.v1",
            consultId: "consult-1",
            mode: "model",
            trigger: "author-disagrees",
            original: {
              verdict: "not-worth-writing",
              oneLineVerdict: "欲望空泛，冲突缺位。",
              layers: [],
            },
            second: {
              verdict: "solid",
              oneLineVerdict: "欲望具体且自带代价。",
              layers: [],
              strongestArgument: "前世记忆是资产也是把柄。",
              evidence: [],
            },
            comparison: {
              verdictRelation: "opposite",
              layerComparisons: [
                {
                  layer: "engine",
                  originalStatus: "missing",
                  secondStatus: "established",
                  agrees: false,
                },
                {
                  layer: "desire",
                  originalStatus: "weak",
                  secondStatus: "weak",
                  agrees: true,
                },
              ],
              droppedEvidenceCount: 2,
            },
          },
        },
      ],
    });

    expect(markdown).toContain("立项会诊：1 次");
    expect(markdown).toContain("## 立项会诊记录");
    expect(markdown).toContain("作者不服，申请第二审稿人");
    expect(markdown).toContain("两位审稿人结论相反（由程序比对，非模型叙述）");
    expect(markdown).toContain("暂不值得写 — 欲望空泛，冲突缺位。");
    expect(markdown).toContain("值得写 — 欲望具体且自带代价。");
    expect(markdown).toContain("分歧审计层：1/2");
    expect(markdown).toContain("丢弃引文：2 条（未能在原文锚定，不算数）");
    expect(markdown).toContain("最强成立论证：前世记忆是资产也是把柄。");
  });

  it("exports premise dialogue sessions with rejected-judgment counts", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-08-20T09:00:00.000Z",
      premiseDialogueSessions: [
        {
          id: "dialogue-1",
          projectId: "project-a",
          createdAt: new Date("2026-08-20T07:00:00.000Z"),
          updatedAt: new Date("2026-08-20T08:00:00.000Z"),
          layers: [],
          editorContract: {} as never,
          session: {
            schemaVersion: "premise-dialogue.v1",
            projectId: "project-a",
            reviewId: "review-1",
            premiseText: "主角重生回高三。",
            turns: [
              {
                round: 1,
                layer: "engine",
                ask: {} as never,
                authorAnswer: "复仇与流量的对撞。",
                judgeRejected: { reason: "quote-not-found" },
              },
              { round: 2, layer: "desire", ask: {} as never },
            ],
            status: "completed",
            authorContract: {
              premiseSummary: "重生少女用流量反杀背叛者。",
            } as never,
          },
        } as never,
      ],
    });

    expect(markdown).toContain("立项对话：1 个会话");
    expect(markdown).toContain("## 立项对话");
    expect(markdown).toContain("已完成");
    expect(markdown).toContain("对话轮次：2");
    expect(markdown).toContain("已回答轮次：1");
    expect(markdown).toContain(
      "被拒判定：1（引文未锚定或模型失败，判定已丢弃）",
    );
    expect(markdown).toContain("作者契约：已确认");
    expect(markdown).toContain("契约摘要：重生少女用流量反杀背叛者。");
  });

  it("exports report divergences with anchored quotes and the author's adjudication", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-08-20T09:00:00.000Z",
      reportDivergences: [
        {
          id: "divergence-1",
          projectId: "project-a",
          chapterTitle: "第三章 对峙",
          mode: "model",
          divergenceCount: 1,
          authorNote: "我信体检：这章确实拖，下一版砍掉两段回忆。",
          createdAt: new Date("2026-08-20T08:00:00.000Z"),
          updatedAt: new Date("2026-08-20T08:00:00.000Z"),
          result: {
            schemaVersion: "report-divergence.v1",
            divergenceId: "divergence-1",
            mode: "model",
            chapterTitle: "第三章 对峙",
            divergences: [
              {
                id: "divergence-1",
                topic: "节奏",
                quickReviewQuote: "节奏紧凑，没有明显拖沓",
                storyAuditQuote: "第三章节奏拖沓",
                explanation: "快诊认为紧凑，体检认为拖沓。",
                questionForAuthor: "你自己读起来拖吗？",
              },
            ],
            droppedPointCount: 1,
          },
        },
      ],
    });

    expect(markdown).toContain("报告会诊：1 次");
    expect(markdown).toContain("## 报告会诊记录");
    expect(markdown).toContain("直接矛盾：1 条；未锚定丢弃：1 条（不算数）");
    expect(markdown).toContain("矛盾 · 节奏");
    expect(markdown).toContain("快诊报告说：「节奏紧凑，没有明显拖沓」");
    expect(markdown).toContain("体检报告说：「第三章节奏拖沓」");
    expect(markdown).toContain("交给作者的问题：你自己读起来拖吗？");
    expect(markdown).toContain(
      "作者裁决：我信体检：这章确实拖，下一版砍掉两段回忆。",
    );
  });

  it("reports the consultation sections honestly as empty when a project has none", () => {
    const markdown = buildWorkspaceProjectMarkdown({
      project: {
        id: "project-a",
        name: "退婚流测试项目",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T02:00:00.000Z",
      },
      revisionSessions: [],
      revisionVersions: [],
      methodologyCards: [],
      generatedAt: "2026-08-20T09:00:00.000Z",
    });

    expect(markdown).toContain("立项会诊：0 次");
    expect(markdown).toContain(
      "暂无立项会诊记录（只有真实模型的会诊会落库，演示模式不进病历）。",
    );
    expect(markdown).toContain("暂无立项对话记录。");
    expect(markdown).toContain(
      "暂无报告会诊记录（只有真实模型的检测会落库，演示模式不进病历）。",
    );
  });
});
