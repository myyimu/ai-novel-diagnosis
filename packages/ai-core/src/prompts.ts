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
