import { DEFAULT_RUBRIC_METRICS } from "./metrics";
import { selectStoryCraftCriteria } from "./story-craft";
import type {
  ChapterPosition,
  QuickReviewInputKind,
  QuickReviewPromptMode,
  RubricMetric,
  UserChapterInput,
} from "./types";
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

export const QUICK_REVIEW_PROMPT_VERSION = "quick-review.v3";
export const QUICK_REVIEW_SAMPLING_VERSION = "head-tail.v1";

export interface QuickReviewPromptInput {
  title?: string;
  genre?: string;
  inputKind?: QuickReviewInputKind;
  chapterPosition?: ChapterPosition;
  diagnosticFocus?: string;
  previousPrompt?: string;
  coreSellingPoint?: string;
  mustKeepMechanisms?: string;
  targetReaderPleasures?: string;
  sampledText: string;
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

/** Routes quick review inputs to the smallest fitting diagnosis prompt mode.
 *
 * @example
 * routeQuickReviewPromptMode("human-draft", "middle");
 */
export function routeQuickReviewPromptMode(
  inputKind: QuickReviewInputKind = "human-draft",
  chapterPosition: ChapterPosition = "unknown",
): QuickReviewPromptMode {
  if (inputKind === "outline") return "outline-review";
  if (inputKind === "idea") return "idea-review";
  if (inputKind === "prompt") return "prompt-review";
  if (chapterPosition === "first") return "first-chapter";
  if (chapterPosition === "early") return "early-chapter";
  if (chapterPosition === "middle" || chapterPosition === "final") return "chapter-progress";
  return "generic-draft";
}

/** Builds the V3 quick-review prompt without asking the model for score, gate, or platforms.
 *
 * @example
 * buildQuickReviewPrompt({ sampledText: "正文", chapterPosition: "unknown" });
 */
export function buildQuickReviewPrompt(input: QuickReviewPromptInput): PromptBundle {
  const inputKind = input.inputKind || "human-draft";
  const chapterPosition = input.chapterPosition || "unknown";
  const promptMode = routeQuickReviewPromptMode(inputKind, chapterPosition);
  const criteria = selectStoryCraftCriteria(promptMode)
    .map((item, index) => `${index + 1}. ${item.label}：${item.rule}`)
    .join("\n");

  return {
    id: QUICK_REVIEW_PROMPT_VERSION,
    responseContract:
      "Return JSON with inferredTitle, inferredGenre, readerPromise, mainProblem, issues, strengths, revisionPlan, promptDiagnosis, nextPrompt.",
    messages: [
      {
        role: "system",
        content:
          "你是中文网文诊断编辑。你的任务是找出当前输入最可能造成读者失去期待的关键问题，并给出有原文或输入片段证据的修改动作。\n\n只评价提供的内容，不预测平台算法、流量、签约、收入或商业成功。\n优先指出 1-3 个决定性问题，不做全维度凑数。\n遇到系统面板、倒计时、论坛体、重复句式、热梗、日常弱冲突或主角拒绝行动等机制，先判断它是否服务核心卖点和目标读者期待；机制成立时保护机制，只修呈现。\n不得删除用户声明必须保留的机制。\n证据必须来自本次提供的输入；无法确认时明确写成假设。\n只返回符合 JSON Schema 的合法 JSON，不使用 Markdown，不解释推理过程。",
      },
      {
        role: "user",
        content: [
          `任务模式：${promptMode}`,
          `内容类型：${inputKind}`,
          `章节位置：${chapterPosition}`,
          `章节标题：${input.title?.trim() || "未提供"}`,
          `题材：${input.genre?.trim() || "未指定，可从输入推断"}`,
          `本次诊断重点：${input.diagnosticFocus?.trim() || "综合判断读者流失风险"}`,
          `核心卖点：${input.coreSellingPoint?.trim() || "未提供"}`,
          `必须保留机制：${input.mustKeepMechanisms?.trim() || "未提供"}`,
          `目标读者期待：${input.targetReaderPleasures?.trim() || "未提供"}`,
          `上一条 Prompt：${input.previousPrompt?.trim() || "未提供"}`,
          "",
          "本模式检查标准：",
          criteria,
          "",
          "执行顺序：",
          "1. 先概括当前输入承诺给读者什么体验。",
          "2. 判断用户声明的卖点和机制是否有效，列出应保留内容。",
          "3. 只选择 1-3 个最影响阅读期待的问题。",
          "4. 每个问题提供短证据、读者影响、具体修改动作和复诊约束。",
          "5. 如果提供了上一条 Prompt，区分 Prompt 缺陷与正文执行缺陷。",
          "6. 生成一条用于修改当前版本的 Prompt，不得另起炉灶，不得误删保留项。",
          "",
          "严格返回这个 JSON 结构：",
          "{",
          '  "inferredTitle": "标题或未命名章节",',
          '  "inferredGenre": "xuanhuan | urban | romance | suspense | infinite-flow | other",',
          '  "readerPromise": { "summary": "当前输入承诺的读者体验", "evidence": "可选输入片段" },',
          '  "mainProblem": "最大流失风险，不超过60字",',
          '  "issues": [{ "id": "issue-1", "severity": "critical | high | medium | low", "category": "opening | hook | character_goal | conflict_pressure | payoff | pacing | setting_load | prose_ai_flavor | prompt_constraint | market_promise | other", "title": "问题标题", "description": "问题说明", "evidence": [{ "quote": "输入中的短证据", "locationHint": "开头/中段/结尾/第N段" }], "readerImpact": "读者影响", "fixAction": "具体修改动作", "promptConstraint": "下一轮Prompt约束", "blocksNextStep": true }],',
          '  "strengths": [{ "title": "应保留优点", "evidence": "可选输入片段", "keepAction": "下一版如何保留" }],',
          '  "revisionPlan": { "keep": ["保留项"], "change": ["修改项"], "avoid": ["禁止项"], "checkpoints": ["复诊检查点"] },',
          '  "promptDiagnosis": { "missingConstraints": [], "vagueInstructions": [], "improvedPromptPrinciples": [] },',
          '  "nextPrompt": { "title": "下一轮改稿 Prompt", "prompt": "可直接复制的改稿 Prompt", "linkedIssueIds": ["issue-1"] }',
          "}",
          "",
          "禁止输出 recommendedPlatforms、quickScore、confidence、gateDecision、methodologyCards。",
          "如果没有上一条 Prompt，promptDiagnosis 必须为空数组，不得编造 Prompt 缺陷。",
          "",
          "输入内容：",
          input.sampledText,
        ].join("\n"),
      },
    ],
  };
}
