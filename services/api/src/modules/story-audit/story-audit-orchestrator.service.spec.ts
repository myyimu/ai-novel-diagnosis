import { STORY_AUDIT_SCHEMA_VERSION } from "@ai-novel-diagnosis/ai-core";
import type { ChapterSegment } from "../book/text-preprocessor.service";
import { StoryAuditOrchestratorService } from "./story-audit-orchestrator.service";

function chapter(id: string, order: number, text: string): ChapterSegment {
  return {
    id,
    order,
    title: id,
    text,
    splitBy: "heading",
    charCount: text.length,
    wordCount: text.length,
    startOffset: 0,
    endOffset: text.length,
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
      profiles: ["statistics", "continuity"],
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
});
