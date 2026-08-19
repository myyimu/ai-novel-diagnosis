import type { PremiseLayerAssessment, PremiseLayerKey } from "./premise-review";
import { PREMISE_LAYER_META, PREMISE_REVIEW_LAYERS } from "./premise-review";
import type { PromptBundle } from "./prompts";

/**
 * Premise dialogue (立项引导对话): the teacher-posture guided conversation that
 * walks an author through strengthening the weakest audit layers of their
 * premise review. This module owns everything that must NOT depend on a model:
 * the turn-orchestration state machine, the validated prompt pack, and the
 * server-side mechanical anchoring checks (docs/premise-dialogue-prompts.md).
 *
 * Four red lines and where they land here:
 * - 教师不代写: prompts only ever produce questions / refutable judgments.
 * - 过程不伪造: turn selection and the hard round cap are pure code.
 * - 分歧不静默: judge outputs carry a disagreementNote the UI must surface.
 * - 判定必锚定: quoteAuthor / hintQuote are verified as substrings and
 *   unanchored judgments are rejected, never silently downgraded.
 */

/** Schema version for the premise-dialogue session contract. */
export type PremiseDialogueSchemaVersion = "premise-dialogue.v1";

/**
 * Version of the prompt pack shipped in this module. Mirrors the validated
 * version in docs/premise-dialogue-prompts.md (§7: two real-model rounds,
 * zero invalidation hits — ASK single-question + no-fabrication constraints
 * and the CONTRACT single-field quoteAuthor rule are part of the pack).
 */
export const PREMISE_DIALOGUE_PROMPT_VERSION = "premise-dialogue.v1";

/** Hard cap on question rounds — enforced by code, never by the model. */
export const PREMISE_DIALOGUE_MAX_ROUNDS = 3;

/* ---------------------------------------------------------------------------
 * 轮次编排（纯代码，模型零参与）— docs/premise-dialogue-prompts.md §1
 * ------------------------------------------------------------------------- */

export interface PremiseDialogueLayerSelection {
  /** "ask" = ask the selected layer next; "collect" = enter contract collection. */
  phase: "ask" | "collect";
  /** Present when phase is "ask". */
  layer?: PremiseLayerKey;
  /** Human-readable why — for logs and UI alike. */
  reason: string;
}

const LAYER_AXIS_ORDER: ReadonlyMap<PremiseLayerKey, number> = new Map(
  PREMISE_REVIEW_LAYERS.map((layer, index) => [layer, index] as const),
);

/**
 * Select the layer the next round should interrogate.
 *
 * Rules (§1): never re-ask a layer; never ask an established layer; missing
 * before weak; weak by ascending confidence; ties broken by the canonical
 * layer axis order for determinism. The hard round cap short-circuits to
 * collection even when askable layers remain.
 *
 * @example
 * selectPremiseDialogueLayer(review.layers, ["conflict"], 1);
 * // → { phase: "ask", layer: "irreducibility", … } when it is missing
 */
export function selectPremiseDialogueLayer(
  layers: readonly PremiseLayerAssessment[],
  askedLayers: readonly PremiseLayerKey[],
  roundsCompleted: number,
  options: { maxRounds?: number } = {},
): PremiseDialogueLayerSelection {
  const maxRounds = options.maxRounds ?? PREMISE_DIALOGUE_MAX_ROUNDS;
  if (roundsCompleted >= maxRounds) {
    return { phase: "collect", reason: `已到硬上限 ${maxRounds} 轮，直接收束` };
  }

  const asked = new Set(askedLayers);
  const candidates = layers.filter(
    (assessment) => !asked.has(assessment.layer) && assessment.status !== "established",
  );
  if (!candidates.length) {
    return { phase: "collect", reason: "没有可问的层（均已问过或已 established），直接收束" };
  }

  const rank = (status: PremiseLayerAssessment["status"]): number =>
    status === "missing" ? 0 : status === "weak" ? 1 : 2;
  const sorted = [...candidates].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    if (a.confidence !== b.confidence) return a.confidence - b.confidence;
    return (LAYER_AXIS_ORDER.get(a.layer) ?? 0) - (LAYER_AXIS_ORDER.get(b.layer) ?? 0);
  });

  const chosen = sorted[0];
  return {
    phase: "ask",
    layer: chosen.layer,
    reason: `${chosen.status}（confidence ${chosen.confidence.toFixed(2)}），未问过且未 established`,
  };
}

/**
 * Session-aware convenience wrapper: derives asked layers and round count from
 * the persisted turns and delegates to {@link selectPremiseDialogueLayer}.
 */
export function selectPremiseDialogueLayerForSession(
  layers: readonly PremiseLayerAssessment[],
  session: Pick<PremiseDialogueSessionState, "turns">,
  options: { maxRounds?: number } = {},
): PremiseDialogueLayerSelection {
  return selectPremiseDialogueLayer(
    layers,
    session.turns.map((turn) => turn.layer),
    session.turns.length,
    options,
  );
}

/* ---------------------------------------------------------------------------
 * 模型输出契约（与提示词的严格 JSON 行一致）
 * ------------------------------------------------------------------------- */

export type PremiseDialogueJudgeVerdict = "strengthened" | "not-yet" | "weakened";
export type PremiseDialogueLayerStatusSuggestion = "established" | "weak" | "missing";
export type PremiseDialogueFeynmanVerdict = "clear" | "partial" | "unclear";

export interface PremiseDialogueAskOutput {
  focusedLayer: PremiseLayerKey;
  question: string;
  whyThisQuestion: string;
  hintQuote: string;
}

export interface PremiseDialogueJudgeOutput {
  verdict: PremiseDialogueJudgeVerdict;
  quoteAuthor: string;
  reason: string;
  layerStatusSuggestion: PremiseDialogueLayerStatusSuggestion;
  followUp: string;
  disagreementNote: string;
}

/** The five contract fields the CONTRACT-REVIEW prompt compares. */
export interface PremiseContractFields {
  coreConflict: string;
  protagonistDesire: string;
  opposingForce: string;
  irreducibilityTest: string;
  readerHookQuestion: string;
}

/** The six-line author contract the author hand-fills at collection time. */
export interface PremiseAuthorContract extends PremiseContractFields {
  premiseSummary: string;
}

export interface PremiseDialogueContractDivergencePoint {
  field: keyof PremiseContractFields;
  authorView: string;
  editorView: string;
  questionToAuthor: string;
}

export interface PremiseDialogueContractReviewOutput {
  divergencePoints: PremiseDialogueContractDivergencePoint[];
  feynmanVerdict: PremiseDialogueFeynmanVerdict;
  quoteAuthor: string;
  reason: string;
}

/* ---------------------------------------------------------------------------
 * 机械校验（§5，与提示词同刻生效）——锚定失败按设计拒绝，不静默降级
 * ------------------------------------------------------------------------- */

/** True when the text ends with a full-width or ASCII question mark. */
export function premiseEndsWithQuestionMark(text: string): boolean {
  return /[？?]$/.test(text.trim());
}

/** Anchoring status of a quote field: hit / honestly empty / failed to locate. */
export type PremiseQuoteAnchorStatus = "anchored" | "empty" | "miss";

export interface AnchoredPremiseAsk {
  ask: PremiseDialogueAskOutput;
  hintQuoteStatus: PremiseQuoteAnchorStatus;
  /** False when the question does not end with a question mark (§5: 丢弃). */
  questionUsable: boolean;
}

/**
 * Apply §5 to an ASK output: a hintQuote that cannot be located verbatim in
 * the premise is dropped (UI shows "提示引文未能定位"); an empty hintQuote is
 * the honest default; a question that does not end with a question mark is
 * flagged unusable so the caller can retry or surface the failure.
 */
export function anchorPremiseAskOutput(
  ask: PremiseDialogueAskOutput,
  premiseText: string,
): AnchoredPremiseAsk {
  let hintQuoteStatus: PremiseQuoteAnchorStatus = "empty";
  let hintQuote = "";
  if (ask.hintQuote) {
    if (premiseText.includes(ask.hintQuote)) {
      hintQuoteStatus = "anchored";
      hintQuote = ask.hintQuote;
    } else {
      hintQuoteStatus = "miss";
    }
  }

  return {
    ask: { ...ask, hintQuote },
    hintQuoteStatus,
    questionUsable: premiseEndsWithQuestionMark(ask.question),
  };
}

export type AnchoredPremiseJudge =
  | { status: "anchored"; judge: PremiseDialogueJudgeOutput }
  | { status: "rejected"; reason: "quote-not-found" };

/**
 * Apply §5 to a JUDGE output: quoteAuthor must be a contiguous substring of
 * the author's answer — otherwise the whole judgment is rejected (不静默降级,
 * UI shows "评判未能锚定原话，已被服务端拒绝"). A followUp that does not end
 * with a question mark is dropped (set to the empty string), keeping the rest
 * of the judgment.
 */
export function anchorPremiseJudgeOutput(
  judge: PremiseDialogueJudgeOutput,
  authorAnswer: string,
): AnchoredPremiseJudge {
  if (!judge.quoteAuthor || !authorAnswer.includes(judge.quoteAuthor)) {
    return { status: "rejected", reason: "quote-not-found" };
  }
  const followUp =
    judge.followUp && !premiseEndsWithQuestionMark(judge.followUp) ? "" : judge.followUp;
  return { status: "anchored", judge: { ...judge, followUp } };
}

export type AnchoredPremiseContractReview =
  | {
      status: "anchored";
      review: PremiseDialogueContractReviewOutput;
      /** Divergence points dropped because authorView missed its field or the question was not a question. */
      droppedPointCount: number;
    }
  | { status: "rejected"; reason: "quote-not-found" };

const CONTRACT_FIELD_KEYS: ReadonlySet<keyof PremiseContractFields> = new Set([
  "coreConflict",
  "protagonistDesire",
  "opposingForce",
  "irreducibilityTest",
  "readerHookQuestion",
]);

/**
 * Apply §5 to a CONTRACT-REVIEW output. quoteAuthor must be a contiguous
 * substring of a single contract field — stitching fragments from two fields
 * is a validation-documented failure mode and is rejected. Divergence points
 * whose authorView cannot be located verbatim in the field they cite, or whose
 * questionToAuthor does not end with a question mark, are dropped and counted.
 */
export function anchorPremiseContractReviewOutput(
  review: PremiseDialogueContractReviewOutput,
  authorContract: PremiseContractFields,
): AnchoredPremiseContractReview {
  const fieldHit = Object.values(authorContract).some((value) =>
    Boolean(review.quoteAuthor) && value.includes(review.quoteAuthor),
  );
  if (!fieldHit) {
    return { status: "rejected", reason: "quote-not-found" };
  }

  const kept: PremiseDialogueContractDivergencePoint[] = [];
  let droppedPointCount = 0;
  for (const point of review.divergencePoints) {
    const fieldValue = authorContract[point.field];
    const anchored =
      CONTRACT_FIELD_KEYS.has(point.field) &&
      typeof fieldValue === "string" &&
      Boolean(point.authorView) &&
      fieldValue.includes(point.authorView);
    if (!anchored || !premiseEndsWithQuestionMark(point.questionToAuthor)) {
      droppedPointCount += 1;
      continue;
    }
    kept.push(point);
  }

  return { status: "anchored", review: { ...review, divergencePoints: kept }, droppedPointCount };
}

/* ---------------------------------------------------------------------------
 * 输出窄化（unknown → 契约；枚举与字段形状不过即 null，由调用方重试/记失败）
 * ------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: ReadonlySet<T>): T | null {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : null;
}

const LAYER_KEYS: ReadonlySet<PremiseLayerKey> = new Set(PREMISE_REVIEW_LAYERS);
const JUDGE_VERDICTS: ReadonlySet<PremiseDialogueJudgeVerdict> = new Set([
  "strengthened",
  "not-yet",
  "weakened",
]);
const LAYER_SUGGESTIONS: ReadonlySet<PremiseDialogueLayerStatusSuggestion> = new Set([
  "established",
  "weak",
  "missing",
]);
const FEYNMAN_VERDICTS: ReadonlySet<PremiseDialogueFeynmanVerdict> = new Set([
  "clear",
  "partial",
  "unclear",
]);

/** Narrow a parsed JSON value to {@link PremiseDialogueAskOutput}; null when the shape or enums are wrong. */
export function parsePremiseDialogueAskOutput(value: unknown): PremiseDialogueAskOutput | null {
  if (!isRecord(value)) return null;
  const focusedLayer = oneOf(value.focusedLayer, LAYER_KEYS);
  const question = str(value.question);
  const whyThisQuestion = str(value.whyThisQuestion);
  const hintQuote = str(value.hintQuote);
  if (!focusedLayer || question === null || whyThisQuestion === null || hintQuote === null) {
    return null;
  }
  return { focusedLayer, question, whyThisQuestion, hintQuote };
}

/** Narrow a parsed JSON value to {@link PremiseDialogueJudgeOutput}; null when the shape or enums are wrong. */
export function parsePremiseDialogueJudgeOutput(value: unknown): PremiseDialogueJudgeOutput | null {
  if (!isRecord(value)) return null;
  const verdict = oneOf(value.verdict, JUDGE_VERDICTS);
  const quoteAuthor = str(value.quoteAuthor);
  const reason = str(value.reason);
  const layerStatusSuggestion = oneOf(value.layerStatusSuggestion, LAYER_SUGGESTIONS);
  const followUp = str(value.followUp);
  const disagreementNote = str(value.disagreementNote);
  if (
    !verdict ||
    quoteAuthor === null ||
    reason === null ||
    !layerStatusSuggestion ||
    followUp === null ||
    disagreementNote === null
  ) {
    return null;
  }
  return { verdict, quoteAuthor, reason, layerStatusSuggestion, followUp, disagreementNote };
}

/** Narrow a parsed JSON value to {@link PremiseDialogueContractReviewOutput}; malformed divergence points are dropped. */
export function parsePremiseDialogueContractReviewOutput(
  value: unknown,
): PremiseDialogueContractReviewOutput | null {
  if (!isRecord(value)) return null;
  const feynmanVerdict = oneOf(value.feynmanVerdict, FEYNMAN_VERDICTS);
  const quoteAuthor = str(value.quoteAuthor);
  const reason = str(value.reason);
  if (!feynmanVerdict || quoteAuthor === null || reason === null) return null;

  const divergencePoints: PremiseDialogueContractDivergencePoint[] = [];
  if (Array.isArray(value.divergencePoints)) {
    for (const item of value.divergencePoints) {
      if (!isRecord(item)) continue;
      const field = oneOf(item.field, CONTRACT_FIELD_KEYS);
      const authorView = str(item.authorView);
      const editorView = str(item.editorView);
      const questionToAuthor = str(item.questionToAuthor);
      if (!field || authorView === null || editorView === null || questionToAuthor === null) {
        continue;
      }
      divergencePoints.push({ field, authorView, editorView, questionToAuthor });
    }
  }

  return { divergencePoints, feynmanVerdict, quoteAuthor, reason };
}

/* ---------------------------------------------------------------------------
 * 提示词包（docs/premise-dialogue-prompts.md v0.3.0 验证版逐字迁移）
 * ------------------------------------------------------------------------- */

const ASK_SYSTEM = `你是中文网文的写作教练，前身是立项审稿编辑。你的职责是帮作者把自己的故事
想清楚，不是替作者写。你只提出一个问题，这个问题必须让作者不得不直面
自己灵感里最薄弱的那个部分。禁止给出答案、桥段、人名、设定或任何改写文本；
禁止空泛表扬；你的问题必须具体到作者无法用"我会努力写好"来搪塞。
只返回合法 JSON，不使用 Markdown。`;

const JUDGE_SYSTEM = `你是中文网文的写作教练，正在评判作者对上一个问题的回答。你的职责是判断
这个回答是否让对应审计层变得更扎实，并说出可反驳的理由。理由必须锚定
作者回答里的原话：quoteAuthor 必须是作者回答的连续片段，逐字摘录。
你可以肯定作者，但肯定必须指出原话里做对了什么；作者答得空泛时你要诚实
说"还没有"，并给出一个以问号结尾的下一步思考方向——但依然不许给答案。
作者反驳你的判定时，不要顺从也不要固执：把矛盾点如实写进 disagreementNote，
判定只跟着证据走。只返回合法 JSON，不使用 Markdown。`;

const CONTRACT_SYSTEM = `你是中文网文的写作教练。作者刚刚用自己的话重述了自己的故事契约——这是
费曼测试：写得清楚才是真的想清楚。你的职责是指出作者版契约与编辑版契约
的分歧点和模糊处，每一点都必须引用作者写下的原话。你不提供任何改写文本、
范文或填充建议；你能给出的最大帮助是一个更锋利的问题。只返回合法 JSON，
不使用 Markdown。`;

export interface PremiseDialogueAskPromptInput {
  genre: string;
  premiseText: string;
  layer: PremiseLayerKey;
  layerStatus: PremiseLayerAssessment["status"];
  layerStatement: string;
  layerComment?: string;
  /** The editor-contract line most relevant to this layer (see {@link premiseContractLineForLayer}). */
  contractLine: string;
}

/**
 * The editor-contract line most relevant to one audit layer, used by the ASK
 * prompt's "编辑重述的契约中与本层最相关的一行" slot.
 */
export function premiseContractLineForLayer(
  layer: PremiseLayerKey,
  contract: PremiseContractFields,
): string {
  switch (layer) {
    case "engine":
      return contract.coreConflict;
    case "desire":
      return contract.protagonistDesire;
    case "conflict":
      return contract.opposingForce;
    case "irreducibility":
      return contract.irreducibilityTest;
  }
}

/** Build the ASK (per-round question) prompt — validated pack v0.3.0. */
export function buildPremiseDialogueAskPrompt(input: PremiseDialogueAskPromptInput): PromptBundle {
  const meta = PREMISE_LAYER_META[input.layer];
  const commentLine = input.layerComment ? `\n${input.layerComment}` : "";
  return {
    id: "premise-dialogue-ask.v1",
    responseContract:
      'Return JSON with focusedLayer, question, whyThisQuestion, hintQuote.',
    messages: [
      { role: "system", content: ASK_SYSTEM },
      {
        role: "user",
        content: `题材提示：${input.genre}

作者的原始灵感：
${input.premiseText}

编辑在立项审稿中对「${meta.label}」这一层的判定：${input.layerStatus}——${input.layerStatement}${commentLine}

编辑重述的契约中与本层最相关的一行：
${input.contractLine}

要求：
1. 只提出一个问题，整段问题只出现一个问号、且以问号结尾；问题必须逼迫作者
   用自己故事里的具体人物、事件或选择来回答，而不是谈写作态度。
2. 问题不得虚构灵感原文里不存在的具体事件、数据或人名；只能指向原文已有
   的内容，或原文明确缺席的缺口。
3. whyThisQuestion 用一两句话说明为什么此刻问这个（教学理由），让作者
   理解这一层在保护什么，不许复述判定原文超过一句。
4. hintQuote 从上面的作者原始灵感里逐字摘录一段与本层最相关的片段
   （不超过 40 字）；找不到相关片段就留空字符串，不要编造。
5. focusedLayer 只能是 "${input.layer}"。

严格返回 JSON：
{"focusedLayer":"${input.layer}","question":"只含一个问号的单一问题","whyThisQuestion":"教学理由","hintQuote":"作者原文连续片段或空字符串"}`,
      },
    ],
  };
}

export interface PremiseDialogueJudgePromptInput {
  layer: PremiseLayerKey;
  layerStatus: PremiseLayerAssessment["status"];
  layerStatement: string;
  question: string;
  authorAnswer: string;
}

/** Build the JUDGE (per-round judgment) prompt — validated pack v0.3.0. */
export function buildPremiseDialogueJudgePrompt(input: PremiseDialogueJudgePromptInput): PromptBundle {
  const meta = PREMISE_LAYER_META[input.layer];
  return {
    id: "premise-dialogue-judge.v1",
    responseContract:
      "Return JSON with verdict, quoteAuthor, reason, layerStatusSuggestion, followUp, disagreementNote.",
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      {
        role: "user",
        content: `本轮针对的审计层：${meta.label}（${meta.question}）
编辑此前对该层的判定：${input.layerStatus}——${input.layerStatement}

教练的问题：
${input.question}

作者的回答：
${input.authorAnswer}

要求：
1. verdict 三态：strengthened（回答用具体人物/事件/选择强化了本层）/
   not-yet（回答空泛、跑题或只是态度承诺）/ weakened（回答暴露了新问题
   或与故事其他部分矛盾）。
2. quoteAuthor 逐字摘录作者回答中最能支撑你判定的连续片段（不超过 60 字）。
3. reason 说清判定理由，必须能对照 quoteAuthor 反驳；不许引用作者没说过的话。
4. layerStatusSuggestion 给出你建议的该层新状态
   （established/weak/missing），它只是建议，最终由代码与作者决定。
5. followUp 是给作者的下一步思考方向，必须以问号结尾，不许包含答案、
   桥段、人名或改写文本；本轮已足够扎实时可以留空字符串。
6. 作者的回答与编辑此前判定存在矛盾时，disagreementNote 如实记录矛盾点
   （各引一句原话），没有矛盾留空字符串。

严格返回 JSON：
{"verdict":"strengthened|not-yet|weakened","quoteAuthor":"作者回答的连续片段","reason":"判定理由","layerStatusSuggestion":"established|weak|missing","followUp":"以问号结尾的思考方向或空字符串","disagreementNote":"矛盾记录或空字符串"}`,
      },
    ],
  };
}

export interface PremiseDialogueContractPromptInput {
  premiseText: string;
  editorContract: PremiseContractFields;
  authorContract: PremiseContractFields;
}

/** Build the CONTRACT-REVIEW (Feynman-test) prompt — validated pack v0.3.0 with the single-field quoteAuthor rule. */
export function buildPremiseDialogueContractReviewPrompt(
  input: PremiseDialogueContractPromptInput,
): PromptBundle {
  const field = (label: string, value: string) => `${label}：${value}`;
  return {
    id: "premise-dialogue-contract.v1",
    responseContract:
      "Return JSON with divergencePoints[], feynmanVerdict, quoteAuthor, reason.",
    messages: [
      { role: "system", content: CONTRACT_SYSTEM },
      {
        role: "user",
        content: `作者原始灵感：
${input.premiseText}

编辑版契约：
${field("核心冲突", input.editorContract.coreConflict)}
${field("主角欲望", input.editorContract.protagonistDesire)}
${field("对立阻力", input.editorContract.opposingForce)}
${field("不可替代性测试", input.editorContract.irreducibilityTest)}
${field("读者钩子问题", input.editorContract.readerHookQuestion)}

作者版契约（作者亲笔）：
${field("核心冲突", input.authorContract.coreConflict)}
${field("主角欲望", input.authorContract.protagonistDesire)}
${field("对立阻力", input.authorContract.opposingForce)}
${field("不可替代性测试", input.authorContract.irreducibilityTest)}
${field("读者钩子问题", input.authorContract.readerHookQuestion)}

要求：
1. divergencePoints 列出最重要的分歧或模糊点（最多 3 条），每条注明字段名，
   各引一句作者原话（authorView），编辑观点（editorView）简述，
   questionToAuthor 是逼作者再想一步的问句。
2. feynmanVerdict 三态：clear（作者版立得住）/ partial（部分字段空泛或互斥）/
   unclear（作者版与灵感或自身矛盾）。判定理由锚定作者原话。
3. quoteAuthor 必须逐字摘自作者版契约同一个字段内部的连续片段（不超过 60 字），
   不得把两个不同字段的原话拼接在一起。
4. 全部字段写清楚时 divergencePoints 可以为空数组，但 feynmanVerdict 仍须给出。

严格返回 JSON：
{"divergencePoints":[{"field":"coreConflict|protagonistDesire|opposingForce|irreducibilityTest|readerHookQuestion","authorView":"作者原话","editorView":"编辑观点","questionToAuthor":"问句"}],"feynmanVerdict":"clear|partial|unclear","quoteAuthor":"作者版契约单字段的连续片段","reason":"判定理由"}`,
      },
    ],
  };
}

/* ---------------------------------------------------------------------------
 * 会话状态契约（api 持久化、web 渲染共用的便携形状）
 * ------------------------------------------------------------------------- */

export interface PremiseDialogueAskRecord {
  question: string;
  whyThisQuestion: string;
  hintQuote: string;
  hintQuoteStatus: PremiseQuoteAnchorStatus;
}

export interface PremiseDialogueJudgeRecord {
  verdict: PremiseDialogueJudgeVerdict;
  quoteAuthor: string;
  reason: string;
  layerStatusSuggestion: PremiseDialogueLayerStatusSuggestion;
  followUp: string;
  disagreementNote: string;
}

export interface PremiseDialogueTurnRecord {
  /** 1-based round number. */
  round: number;
  layer: PremiseLayerKey;
  ask: PremiseDialogueAskRecord;
  authorAnswer?: string;
  judge?: PremiseDialogueJudgeRecord;
  /**
   * Set when the server rejected the judgment: "quote-not-found" = the
   * anchoring check failed (§5, final — the judgment is discarded);
   * "model-failed" = the model call or output coercion failed (retryable
   * via a dedicated re-judge call).
   */
  judgeRejected?: { reason: "quote-not-found" | "model-failed" };
}

export type PremiseDialogueSessionStatus = "active" | "collecting" | "completed";

export interface PremiseDialogueSessionState {
  schemaVersion: PremiseDialogueSchemaVersion;
  projectId: string;
  /** The premise-review run this dialogue anchors to. */
  reviewId: string;
  genre?: string;
  premiseText: string;
  turns: PremiseDialogueTurnRecord[];
  status: PremiseDialogueSessionStatus;
  authorContract?: PremiseAuthorContract;
  contractReview?: PremiseDialogueContractReviewOutput & { droppedPointCount?: number };
}
