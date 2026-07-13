import { describe, expect, it } from "vitest";
import {
  buildChapterScorePrompt,
  buildChapterTriagePrompt,
  buildQuickReviewPrompt,
  routeQuickReviewPromptMode,
} from "./prompts";

describe("buildChapterTriagePrompt", () => {
  it("builds a stable chapter triage prompt contract", () => {
    const prompt = buildChapterTriagePrompt({
      title: "第一章",
      text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
      rubricId: "default",
    });

    expect(prompt.id).toBe("chapter-triage.v1");
    expect(prompt.messages[0]?.content).toContain("网文第一章诊断编辑");
    expect(prompt.messages[1]?.content).toContain("Rubric ID：default");
    expect(prompt.messages[1]?.content).toContain("chapter-goal / 主角目标清晰度");
    expect(prompt.messages[1]?.content).toContain("minimum-plot-loop / 最小剧情循环完整度");
    expect(prompt.messages[1]?.content).toContain("continuity-ledger / 设定与伏笔可追踪性");
    expect(prompt.messages[1]?.content).toContain("问题 -> 正文证据 -> 读者反应");
    expect(prompt.responseContract).toContain("mainProblem");
  });
});

describe("buildChapterScorePrompt", () => {
  it("builds a stable chapter scoring prompt contract", () => {
    const prompt = buildChapterScorePrompt({
      title: "第一章",
      text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
      rubricId: "default",
    });

    expect(prompt.id).toBe("chapter-score.v1");
    expect(prompt.messages[0]?.content).toContain("中文网文点评官");
    expect(prompt.messages[1]?.content).toContain("Rubric ID：default");
    expect(prompt.messages[1]?.content).toContain("emotion-engine / 情绪引擎");
    expect(prompt.messages[1]?.content).toContain("dialogue-control / 对话信息控制");
    expect(prompt.messages[1]?.content).toContain("分数 -> 正文证据 -> 扣分原因 -> 具体改法");
    expect(prompt.responseContract).toContain("totalScore");
  });
});

describe("buildQuickReviewPrompt", () => {
  it("routes middle chapters away from first-chapter rules", () => {
    const prompt = buildQuickReviewPrompt({
      title: "第十章",
      inputKind: "human-draft",
      chapterPosition: "middle",
      diagnosticFocus: "检查本章推进是否有效",
      sampledText: "主角进入新副本后，必须在一炷香内找到阵眼，否则队友会被规则抹除。",
    });

    expect(prompt.id).toBe("quick-review.v3");
    expect(routeQuickReviewPromptMode("human-draft", "middle")).toBe("chapter-progress");
    expect(prompt.messages[1]?.content).toContain("任务模式：chapter-progress");
    expect(prompt.messages[1]?.content).toContain("本次诊断重点：检查本章推进是否有效");
    expect(prompt.messages[1]?.content).not.toContain("前 300-800 字");
    expect(prompt.messages[1]?.content).toContain("禁止输出 recommendedPlatforms");
  });

  it("uses prompt-review mode for prompt drafts", () => {
    const prompt = buildQuickReviewPrompt({
      inputKind: "prompt",
      chapterPosition: "unknown",
      sampledText: "请写得更爽一点，节奏更快一点，人物更鲜明一点。",
    });

    expect(prompt.messages[1]?.content).toContain("任务模式：prompt-review");
    expect(prompt.messages[1]?.content).toContain("内容类型：prompt");
  });
});
