import { STORY_AUDIT_SCHEMA_VERSION } from "@ai-novel-diagnosis/ai-core";
import type { ChapterSegment } from "../book/text-preprocessor.service";
import { StoryAuditOrchestratorService } from "./story-audit-orchestrator.service";

function chapter(
  id: string,
  order: number,
  text: string,
  startOffset = 0,
): ChapterSegment {
  return {
    id,
    order,
    title: id,
    text,
    splitBy: "heading",
    charCount: text.length,
    wordCount: text.length,
    startOffset,
    endOffset: startOffset + text.length,
  };
}

describe("StoryAuditOrchestratorService", () => {
  const service = new StoryAuditOrchestratorService();

  it("returns null for reference studies so the research flow is untouched", () => {
    expect(
      service.generateStoryAudit({
        chapters: [chapter("c1", 1, "他说：“你好。”")],
        purpose: "reference-study",
        profiles: [],
        bookJobId: "job-1",
      }),
    ).toBeNull();
  });

  it("returns null when no chapters are available", () => {
    expect(
      service.generateStoryAudit({
        chapters: [],
        purpose: "own-draft",
        profiles: ["statistics"],
        bookJobId: "job-1",
      }),
    ).toBeNull();
  });

  it("produces coverage and per-chapter dialogue statistics for an own draft", () => {
    const result = service.generateStoryAudit({
      chapters: [
        chapter("c1", 1, "他说：“你好。”她问：“没事吧？”"),
        chapter("c2", 2, "无对话的叙述章节。"),
      ],
      purpose: "own-draft",
      profiles: ["statistics"],
      bookJobId: "job-1",
      projectId: "proj-1",
    });

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(STORY_AUDIT_SCHEMA_VERSION);
    expect(result!.bookJobId).toBe("job-1");
    expect(result!.projectId).toBe("proj-1");
    expect(result!.coverage.totalChapterCount).toBe(2);
    expect(result!.coverage.analyzedChapterIds).toEqual(["c1", "c2"]);
    expect(result!.coverage.isPartial).toBe(false);
    expect(result!.metrics.dialogue).toHaveLength(2);
    expect(result!.metrics.dialogue[0]!.dialogueTurnCount).toBe(2);
    expect(result!.metrics.dialogue[1]!.dialogueTurnCount).toBe(0);
    expect(result!.findings).toEqual([]);
    expect(result!.scenes).toEqual([]);
    expect(result!.coverage.sceneExtractionRate).toBe(0);
    expect(result!.coverage.evidenceValidationRate).toBe(0);
  });

  it("defaults projectId to bookJobId and derives the audit id", () => {
    const result = service.generateStoryAudit({
      chapters: [chapter("c1", 1, "正文。")],
      purpose: "own-draft",
      profiles: ["statistics"],
      bookJobId: "job-1",
    });

    expect(result!.projectId).toBe("job-1");
    expect(result!.auditId).toBe("audit-job-1");
  });

  it("harvests events and facts from visible chapter maps with evidence anchors", () => {
    const text = "他今年三十二岁。他说：“我明天走。”";
    const sourceChapter = chapter("c1", 1, text, 100);
    const eventQuote = "我明天走";
    const factQuote = "他今年三十二岁";
    const result = service.generateStoryAudit({
      chapters: [sourceChapter],
      chapterMaps: [
        {
          chapterId: "c1",
          order: 1,
          title: "第一章",
          storyExtractionAttempted: true,
          storyEvents: [
            {
              id: "e1",
              summary: "主角说自己明天离开",
              participantIds: ["主角"],
              locationIds: [],
              evidence: [
                {
                  quote: eventQuote,
                  startOffset: 100 + text.indexOf(eventQuote),
                  endOffset: 100 + text.indexOf(eventQuote) + eventQuote.length,
                },
              ],
            },
          ],
          storyFacts: [
            {
              id: "f1",
              subjectId: "主角",
              predicate: "age",
              object: "三十二岁",
              kind: "age",
              polarity: "asserted",
              sourcePriority: "explicit-text",
              confidence: 0.9,
              evidence: [
                {
                  quote: factQuote,
                  startOffset: 100 + text.indexOf(factQuote),
                  endOffset: 100 + text.indexOf(factQuote) + factQuote.length,
                },
              ],
            },
          ],
        },
      ],
      purpose: "own-draft",
      profiles: ["statistics", "continuity"],
      bookJobId: "job-1",
    });

    expect(result!.scenes).toHaveLength(1);
    expect(result!.scenes[0]!.participantIds).toContain("主角");
    expect(result!.events).toHaveLength(1);
    expect(result!.events[0]!.summary).toBe("主角说自己明天离开");
    expect(result!.events[0]!.sceneId).toBe("scene-c1");
    expect(result!.events[0]!.evidence[0]!.quote).toBe(eventQuote);
    expect(result!.events[0]!.evidence[0]!.source).toBe("text");
    expect(result!.facts).toHaveLength(1);
    expect(result!.facts[0]!.kind).toBe("age");
    expect(result!.facts[0]!.sourcePriority).toBe("explicit-text");
    expect(result!.facts[0]!.evidence[0]!.chapterId).toBe("c1");
    expect(result!.coverage.evidenceValidationRate).toBeCloseTo(1, 5);
  });

  it("marks missing chapter extraction as partial and ignores maps outside the supplied chapters", () => {
    const c1 = chapter("c1", 1, "可见正文。");
    const visibleQuote = "可见";
    const result = service.generateStoryAudit({
      chapters: [c1, chapter("c2", 2, "正文二。")],
      chapterMaps: [
        {
          chapterId: "c1",
          order: 1,
          title: "第一章",
          storyExtractionAttempted: true,
          storyEvents: [
            {
              id: "e1",
              summary: "可见事件",
              participantIds: [],
              locationIds: [],
              evidence: [
                {
                  quote: visibleQuote,
                  startOffset: c1.startOffset,
                  endOffset: c1.startOffset + visibleQuote.length,
                },
              ],
            },
          ],
          storyFacts: [],
        },
        {
          chapterId: "c3",
          order: 3,
          title: "不可见章节",
          storyExtractionAttempted: true,
          storyEvents: [
            {
              id: "e3",
              summary: "不可见事件",
              participantIds: [],
              locationIds: [],
              evidence: [],
            },
          ],
          storyFacts: [],
        },
      ],
      purpose: "own-draft",
      profiles: ["continuity"],
      bookJobId: "job-1",
    });

    expect(result!.coverage.analyzedChapterIds).toEqual(["c1"]);
    expect(result!.coverage.isPartial).toBe(true);
    expect(result!.coverage.sceneExtractionRate).toBe(0.5);
    expect(result!.scenes).toHaveLength(1);
    expect(result!.events).toHaveLength(1);
    expect(result!.facts).toEqual([]);
    expect(result!.metrics.dialogue).toEqual([]);
  });

  it("rejects invalid text anchors and drops unanchored explicit-text facts", () => {
    const result = service.generateStoryAudit({
      chapters: [chapter("c1", 1, "他今年三十二岁。")],
      chapterMaps: [
        {
          chapterId: "c1",
          order: 1,
          title: "第一章",
          storyExtractionAttempted: true,
          storyEvents: [
            {
              id: "e1",
              summary: "年龄被说明",
              participantIds: ["主角"],
              locationIds: [],
              evidence: [{ quote: "不存在", startOffset: 0, endOffset: 4 }],
            },
          ],
          storyFacts: [
            {
              id: "f1",
              subjectId: "主角",
              predicate: "age",
              object: "三十二岁",
              kind: "age",
              polarity: "asserted",
              sourcePriority: "explicit-text",
              confidence: 0.9,
              evidence: [{ quote: "不存在", startOffset: 0, endOffset: 4 }],
            },
          ],
        },
      ],
      purpose: "own-draft",
      profiles: ["continuity"],
      bookJobId: "job-1",
    });

    expect(result!.events[0]!.evidence).toEqual([]);
    expect(result!.facts).toEqual([]);
    expect(result!.coverage.evidenceValidationRate).toBe(0);
  });
});
