import { DEFAULT_RUBRIC_METRICS } from "./metrics";
import type { ChapterScoreReport, RubricMetric, UserChapterInput } from "./types";
import { validateUserChapterInput } from "./validation";

export interface PreviewContext {
  metrics?: RubricMetric[];
}

export interface PreviewStrategy {
  id: string;
  createReport(input: UserChapterInput, context: Required<PreviewContext>): ChapterScoreReport;
}

export interface CreatePreviewReportOptions extends PreviewContext {
  strategy?: PreviewStrategy;
}

const defaultPreviewContext: Required<PreviewContext> = {
  metrics: DEFAULT_RUBRIC_METRICS,
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Number(value.toFixed(1))));
}

function scoreByTextSignals(text: string) {
  const trimmed = text.trim();
  const lengthScore = trimmed.length >= 1_200 ? 2.6 : trimmed.length >= 500 ? 2.1 : 1.4;
  const pressureScore = /[逼迫危机羞辱失败死亡退婚追杀倒计时]/.test(trimmed) ? 2 : 1.2;
  const goalScore = /[必须想要决定发誓寻找夺回救下]/.test(trimmed) ? 1.8 : 1.1;
  const hookScore = /[？?!！秘密真相下一刻突然]/.test(trimmed.slice(-300)) ? 1.6 : 0.9;

  return clampScore(lengthScore + pressureScore + goalScore + hookScore);
}

export const statisticalPreviewStrategy: PreviewStrategy = {
  id: "statistical",
  createReport(input, context) {
    const score = scoreByTextSignals(input.text);

    return {
      totalScore: score,
      strongestPoint: "章节已经具备可分析文本，适合进入指标化质检。",
      weakestPoint: "当前仍需要真实 LLM Provider 读取证据段落后再给出稳定判断。",
      nextRevisionMove: "先检查本章目标、冲突、情绪债和结尾钩子，再决定是否局部改写。",
      scores: context.metrics.map((metric) => ({
        metricId: metric.id,
        score,
        reason: `${metric.name} 已进入待评估状态；当前预览只使用文本长度和显性信号，不等同于语义诊断。`,
        evidence: "预览策略不截取原文证据，真实证据由 services/api 的 LLM 分析链生成。",
        fix: `按「${metric.description}」补充可执行改法。`,
      })),
    };
  },
};

export function createPreviewReport(
  input: UserChapterInput,
  options: CreatePreviewReportOptions = {},
): ChapterScoreReport {
  const validInput = validateUserChapterInput(input);
  const context = {
    ...defaultPreviewContext,
    metrics: options.metrics ?? defaultPreviewContext.metrics,
  };
  const strategy = options.strategy ?? statisticalPreviewStrategy;

  return strategy.createReport(validInput, context);
}
