import { StoryAuditService } from "./story-audit.service";

describe("StoryAuditService", () => {
  it("should build the minimal story audit slice with coverage and dialogue metrics", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      generatedAt: "2026-07-18T00:00:00.000Z",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          startOffset: 100,
          text: "她说：“继续查。”\n\n主角点头。",
        },
        {
          id: "ch-2",
          order: 2,
          title: "第二章",
          text: "系统：“权限不足。”他问：“为什么？”",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          title: "第一章",
          summary: "主角决定继续追查。",
          plotFunction: "旧案主线推进",
          chapterGoal: "确认旧案线索",
          conflict: "继续查会触发反扑",
          characterSignals: ["主角坚持追查旧案"],
          worldbuildingSignals: ["旧案牵连评审机构"],
          timelineEvents: ["主角决定继续查旧案"],
          foreshadowingSetups: ["旧案背后还有主谋"],
          hook: "继续追查会带来危险",
          sourceAnchors: [
            {
              quote: "继续查",
              startOffset: 3,
              endOffset: 6,
            },
          ],
        },
        {
          chapterId: "ch-2",
          order: 2,
          sourceAnchors: [
            {
              quote: "",
              startOffset: 0,
              endOffset: 0,
            },
          ],
        },
      ],
    });

    expect(result.schemaVersion).toBe("story-audit.v1");
    expect(result.auditId).toBe("book-job-1:story-audit.v1");
    expect(result.coverage).toEqual({
      analyzedChapterIds: ["ch-1", "ch-2"],
      totalChapterCount: 2,
      isPartial: false,
      sceneExtractionRate: 0.5,
      evidenceValidationRate: 0.5,
    });
    expect(result.scenes).toEqual([
      expect.objectContaining({
        id: "ch-1-scene-1",
        participantIds: ["主角坚持追查旧案"],
        goal: "确认旧案线索",
        conflict: "继续查会触发反扑",
        evidence: [
          expect.objectContaining({
            quote: "继续查",
            startOffset: 104,
            endOffset: 107,
          }),
        ],
      }),
    ]);
    expect(result.events).toEqual([
      expect.objectContaining({
        summary: "主角决定继续查旧案",
        evidence: [expect.objectContaining({ quote: "继续查" })],
      }),
    ]);
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          predicate: "character_signal",
          sourcePriority: "explicit-text",
          evidence: [expect.objectContaining({ quote: "继续查" })],
        }),
        expect.objectContaining({
          predicate: "setup",
          sourcePriority: "explicit-text",
          evidence: [expect.objectContaining({ quote: "继续查" })],
        }),
      ]),
    );
    expect(result.characterStates).toEqual([
      expect.objectContaining({
        characterId: "主角坚持追查旧案",
        sceneId: "ch-1-scene-1",
        goalDistance: "unknown",
        agency: 0.5,
        evidence: [expect.objectContaining({ quote: "继续查" })],
      }),
    ]);
    expect(result.views.plotlineMatrix).toEqual([
      expect.objectContaining({
        plotlineId: "旧案主线推进",
        sceneIds: ["ch-1-scene-1"],
        status: "unknown",
      }),
    ]);
    expect(result.views.temporalGraph).toEqual(
      expect.objectContaining({
        eventIds: ["ch-1-scene-1-event-1"],
        relationEdges: [],
        conflictCandidateIds: [],
      }),
    );
    expect(result.views.setupPayoffEdges).toEqual([
      expect.objectContaining({
        setupFactId: "ch-1-scene-1-setup-fact-1",
        status: "open",
      }),
    ]);
    expect(result.metrics.dialogue[0]).toEqual(
      expect.objectContaining({
        scopeId: "book",
        dialogueTurnCount: 3,
      }),
    );
    expect(result.findings).toEqual([
      expect.objectContaining({
        category: "unresolved_setup",
        severity: "medium",
        status: "needs_human",
        relatedFactIds: ["ch-1-scene-1-setup-fact-1"],
        evidence: [expect.objectContaining({ quote: "继续查" })],
        alternativeExplanations: expect.arrayContaining([
          expect.stringContaining("长线伏笔"),
        ]),
        confidence: 0.68,
      }),
    ]);
    expect(result.findings[0]).not.toHaveProperty("reviewState");
  });

  it("should mark partial coverage without inventing missing-chapter findings", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [{ id: "ch-1", order: 1, title: "第一章", text: "无对白。" }],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          title: "第一章",
          foreshadowingSetups: ["一句没有回收的提示"],
          sourceAnchors: [{ quote: "无对白。", startOffset: 0, endOffset: 4 }],
        },
      ],
      totalChapterCount: 3,
    });

    expect(result.coverage.isPartial).toBe(true);
    expect(result.coverage.analyzedChapterIds).toEqual(["ch-1"]);
    expect(result.findings).toEqual([]);
  });

  it("should drop explicit facts when quotes cannot be verified in chapter text", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          text: "主角离开考场，没有回头。",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          title: "第一章",
          characterSignals: ["主角知道旧案真相"],
          timelineEvents: ["主角发现旧案真相"],
          sourceAnchors: [
            {
              quote: "不存在的原文",
              startOffset: 0,
              endOffset: 6,
            },
          ],
        },
      ],
    });

    expect(result.coverage.evidenceValidationRate).toBe(0);
    expect(result.coverage.sceneExtractionRate).toBe(0);
    expect(result.scenes).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.facts).toEqual([]);
    expect(result.characterStates).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  it("should keep linear and flashback timelines as temporal graph edges without false positives", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          text: "三年前主角离开旧宅。主角抵达城门。主角进入书房。",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          title: "第一章",
          characterSignals: ["主角"],
          timelineEvents: [
            "[id:leave] 倒叙：三年前主角离开旧宅 地点:旧宅",
            "[id:arrive] 主角抵达城门 时间:第1天 地点:城门",
            "[rel:leave before arrive]",
            "[id:study] 主角进入书房 时间:第1天 地点:书房",
            "[rel:arrive before study]",
          ],
          sourceAnchors: [
            { quote: "三年前主角离开旧宅", startOffset: 0, endOffset: 10 },
            { quote: "主角抵达城门", startOffset: 11, endOffset: 17 },
            { quote: "主角进入书房", startOffset: 18, endOffset: 24 },
          ],
        },
      ],
    });

    expect(result.views.temporalGraph.relationEdges).toEqual([
      expect.objectContaining({ relation: "before" }),
      expect.objectContaining({ relation: "before" }),
    ]);
    expect(result.findings).toEqual([]);
  });

  it("should create a timeline conflict candidate when before relations form a cycle", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          text: "主角收到密信。主角进入密室。旧卷写密室在密信前。",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          title: "第一章",
          characterSignals: ["主角"],
          timelineEvents: [
            "[id:letter] 主角收到密信",
            "[id:room] 主角进入密室",
            "[rel:letter before room]",
            "[rel:room before letter]",
          ],
          sourceAnchors: [
            { quote: "主角收到密信", startOffset: 0, endOffset: 6 },
            { quote: "主角进入密室", startOffset: 7, endOffset: 13 },
            { quote: "旧卷写密室在密信前", startOffset: 14, endOffset: 23 },
          ],
        },
      ],
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        category: "timeline_conflict",
        status: "candidate",
        ruleIds: ["temporal-before-cycle"],
        relatedEventIds: expect.arrayContaining([
          "ch-1-scene-1-event-letter",
          "ch-1-scene-1-event-room",
        ]),
        alternativeExplanations: expect.arrayContaining([
          expect.stringContaining("倒叙"),
        ]),
      }),
    ]);
    expect(result.views.temporalGraph.conflictCandidateIds).toEqual([
      result.findings[0]?.id,
    ]);
  });

  it("should create a same-time different-location candidate with alternatives", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          text: "主角在书房查旧案。",
        },
        {
          id: "ch-2",
          order: 2,
          title: "第二章",
          text: "主角在城门遇刺。",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          characterSignals: ["主角"],
          timelineEvents: ["[id:study] 主角 时间:同一时间 地点:书房 查旧案"],
          sourceAnchors: [
            { quote: "主角在书房查旧案", startOffset: 0, endOffset: 8 },
          ],
        },
        {
          chapterId: "ch-2",
          order: 2,
          characterSignals: ["主角"],
          timelineEvents: ["[id:gate] 主角 时间:同一时间 地点:城门 遇刺"],
          sourceAnchors: [
            { quote: "主角在城门遇刺", startOffset: 0, endOffset: 7 },
          ],
        },
      ],
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        category: "location_conflict",
        status: "candidate",
        ruleIds: ["same-time-different-location"],
        relatedEventIds: [
          "ch-1-scene-1-event-study",
          "ch-2-scene-1-event-gate",
        ],
        alternativeExplanations: expect.arrayContaining([
          expect.stringContaining("分身"),
        ]),
      }),
    ]);
  });

  it("should preserve unknown temporal text without forcing an absolute date", () => {
    const service = new StoryAuditService();

    const result = service.buildStoryAudit({
      bookJobId: "book-job-1",
      chapters: [
        {
          id: "ch-1",
          order: 1,
          title: "第一章",
          text: "主角收到没有日期的信。",
        },
      ],
      chapterMaps: [
        {
          chapterId: "ch-1",
          order: 1,
          characterSignals: ["主角"],
          timelineEvents: [
            "[id:letter] 主角收到没有日期的信 时间:未知时间 地点:住处",
          ],
          sourceAnchors: [
            { quote: "主角收到没有日期的信", startOffset: 0, endOffset: 10 },
          ],
        },
      ],
    });

    expect(result.events[0]).toEqual(
      expect.objectContaining({
        absoluteTime: undefined,
        relativeTimeText: "未知时间",
      }),
    );
    expect(result.findings).toEqual([]);
  });
});
