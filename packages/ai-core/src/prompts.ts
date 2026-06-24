import { DEFAULT_RUBRIC_METRICS } from "./metrics";
import type { RubricMetric, UserChapterInput } from "./types";
import { validateUserChapterInput } from "./validation";

export interface PromptMessage {
  role: "system" | "user";
  content: string;
}

export interface PromptBundle {
  id: string;
  messages: PromptMessage[];
  responseContract: string;
}

function metricLine(metric: RubricMetric) {
  return `- ${metric.id} / ${metric.name}: ${metric.description}`;
}

export function buildChapterTriagePrompt(
  input: UserChapterInput,
  metrics: RubricMetric[] = DEFAULT_RUBRIC_METRICS,
): PromptBundle {
  const validInput = validateUserChapterInput(input);

  return {
    id: "chapter-triage.v1",
    responseContract:
      "Return JSON with mainProblem, evidenceAnchors, readerReaction, priorityFixes, revisionPrompt, confidence.",
    messages: [
      {
        role: "system",
        content: "你是网文第一章诊断编辑。只诊断文本是否浪费点击，不预测平台算法，不代写整章。",
      },
      {
        role: "user",
        content: [
          `章节标题：${validInput.title}`,
          `Rubric ID：${validInput.rubricId}`,
          "检查指标：",
          ...metrics.map(metricLine),
          "请按“问题 -> 正文证据 -> 读者反应 -> 修改优先级 -> 改稿 Prompt -> 复诊检查点”的链路输出。",
          "正文：",
          validInput.text,
        ].join("\n"),
      },
    ],
  };
}

export function buildChapterScorePrompt(
  input: UserChapterInput,
  metrics: RubricMetric[] = DEFAULT_RUBRIC_METRICS,
): PromptBundle {
  const validInput = validateUserChapterInput(input);

  return {
    id: "chapter-score.v1",
    responseContract:
      "Return JSON with totalScore, scores, strongestPoint, weakestPoint, nextRevisionMove, rewriteBrief, revisionPrompt.",
    messages: [
      {
        role: "system",
        content: "你是严谨的中文网文点评官。必须基于正文证据评分，只给可执行改法，不代写整章。",
      },
      {
        role: "user",
        content: [
          `章节标题：${validInput.title}`,
          `Rubric ID：${validInput.rubricId}`,
          "评分指标：",
          ...metrics.map(metricLine),
          "请逐项输出“分数 -> 正文证据 -> 扣分原因 -> 具体改法”，并给出下一步改稿动作。",
          "正文：",
          validInput.text,
        ].join("\n"),
      },
    ],
  };
}
