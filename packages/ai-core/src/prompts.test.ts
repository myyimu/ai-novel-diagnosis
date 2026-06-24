import { describe, expect, it } from "vitest";
import { buildChapterScorePrompt, buildChapterTriagePrompt } from "./prompts";

describe("buildChapterTriagePrompt", () => {
  it("builds a stable chapter triage prompt contract", () => {
    const prompt = buildChapterTriagePrompt({
      title: "第一章",
      text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
      rubricId: "default",
    });

    expect(prompt).toMatchInlineSnapshot(`
      {
        "id": "chapter-triage.v1",
        "messages": [
          {
            "content": "你是网文第一章诊断编辑。只诊断文本是否浪费点击，不预测平台算法，不代写整章。",
            "role": "system",
          },
          {
            "content": "章节标题：第一章
      Rubric ID：default
      检查指标：
      - chapter-goal / 主角目标清晰度: 读者是否能快速知道主角这一章想得到什么或避免什么。
      - conflict-pressure / 冲突压力: 阻碍是否具体，是否会造成损失、羞辱、危机或机会流失。
      - emotion-debt / 情绪债: 章节是否让读者积累愤怒、期待、心疼、好奇等待兑现情绪。
      - hook / 追读钩子: 结尾是否留下下一章不可延迟的危机、奖励、秘密或反转。
      请按“问题 -> 正文证据 -> 读者反应 -> 修改优先级 -> 改稿 Prompt -> 复诊检查点”的链路输出。
      正文：
      主角进入考场，却发现考官正是三年前废掉他经脉的人。",
            "role": "user",
          },
        ],
        "responseContract": "Return JSON with mainProblem, evidenceAnchors, readerReaction, priorityFixes, revisionPrompt, confidence.",
      }
    `);
  });
});

describe("buildChapterScorePrompt", () => {
  it("builds a stable chapter scoring prompt contract", () => {
    const prompt = buildChapterScorePrompt({
      title: "第一章",
      text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
      rubricId: "default",
    });

    expect(prompt).toMatchInlineSnapshot(`
      {
        "id": "chapter-score.v1",
        "messages": [
          {
            "content": "你是严谨的中文网文点评官。必须基于正文证据评分，只给可执行改法，不代写整章。",
            "role": "system",
          },
          {
            "content": "章节标题：第一章
      Rubric ID：default
      评分指标：
      - chapter-goal / 主角目标清晰度: 读者是否能快速知道主角这一章想得到什么或避免什么。
      - conflict-pressure / 冲突压力: 阻碍是否具体，是否会造成损失、羞辱、危机或机会流失。
      - emotion-debt / 情绪债: 章节是否让读者积累愤怒、期待、心疼、好奇等待兑现情绪。
      - hook / 追读钩子: 结尾是否留下下一章不可延迟的危机、奖励、秘密或反转。
      请逐项输出“分数 -> 正文证据 -> 扣分原因 -> 具体改法”，并给出下一步改稿动作。
      正文：
      主角进入考场，却发现考官正是三年前废掉他经脉的人。",
            "role": "user",
          },
        ],
        "responseContract": "Return JSON with totalScore, scores, strongestPoint, weakestPoint, nextRevisionMove, rewriteBrief, revisionPrompt.",
      }
    `);
  });
});
