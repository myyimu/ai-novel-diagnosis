import type {
  PremiseEvidenceQuote,
  PremiseLayerAssessment,
  PremiseLayerKey,
  PremiseReviewVerdict,
} from "./premise-review";
import { PREMISE_LAYER_META, PREMISE_REVIEW_LAYERS } from "./premise-review";
import type { PromptBundle } from "./prompts";

/**
 * Premise consultation (立项会诊): an independent second reviewer re-reviews the
 * same premise from the OPPOSITE editorial stance and the code compares the two
 * verdicts. The first reviewer's stance is rejection-biased ("先找理由拒绝");
 * the second reviewer must build the strongest honest case FOR writing the
 * story. The second review is BLIND — it never sees the first verdict — so the
 * agreement/disagreement is a genuine cross-check, not an echo.
 *
 * Four red lines and where they land here:
 * - 教师不代写: the second opinion never provides rewrite text either.
 * - 过程不伪造: verdict comparison is pure code, never model narration.
 * - 分歧不静默: disagreement is surfaced as a first-class comparison result,
 *   never merged into a single "final" verdict.
 * - 判定必锚定: evidence quotes must be substrings of the premise; quotes that
 *   cannot be located are dropped and their count disclosed, never kept.
 */

/** Schema version for the premise-consult contract. */
export type PremiseConsultSchemaVersion = "premise-consult.v1";

/**
 * Why a consultation was requested. Doctrine (product-doctrine.md §科学有效性边界):
 * confidence means evidence completeness, NOT probability of being right — so the
 * low-confidence trigger is worded "low-evidence" (证据完整度低), never "模型可能错了".
 */
export type PremiseConsultTrigger = "author-disagrees" | "low-evidence";

/** Labels shared by web UI and logs. */
export const PREMISE_CONSULT_TRIGGER_LABELS: Record<PremiseConsultTrigger, string> = {
  "author-disagrees": "作者不服，申请第二审稿人",
  "low-evidence": "证据完整度较低，建议第二审稿人",
};

/**
 * A layer whose confidence (evidence completeness) is at or below this value
 * suggests a consultation. Not a correctness probability.
 */
export const PREMISE_CONSULT_LOW_EVIDENCE_THRESHOLD = 0.4;

/**
 * Suggest a consultation when the thinnest audit layer's evidence completeness
 * is at or below the threshold.
 *
 * @example
 * suggestPremiseConsult([{ layer: "conflict", status: "missing", statement: "", confidence: 0.2 }]);
 * // → true
 */
export function suggestPremiseConsult(
  layers: readonly PremiseLayerAssessment[],
  options: { threshold?: number } = {},
): boolean {
  const threshold = options.threshold ?? PREMISE_CONSULT_LOW_EVIDENCE_THRESHOLD;
  return layers.some((assessment) => assessment.confidence <= threshold);
}

/* ---------------------------------------------------------------------------
 * 程序化比对（纯代码——分歧的判定权在代码手里，不在模型嘴里）
 * ------------------------------------------------------------------------- */

const VERDICT_RANK: ReadonlyMap<PremiseReviewVerdict, number> = new Map([
  ["solid", 2],
  ["fixable", 1],
  ["not-worth-writing", 0],
]);

/** Relation between two verdicts on the solid ↔ not-worth-writing axis. */
export type PremiseVerdictRelation = "agree" | "adjacent" | "opposite";

export const PREMISE_VERDICT_RELATION_LABELS: Record<PremiseVerdictRelation, string> = {
  agree: "两位审稿人结论一致",
  adjacent: "两位审稿人结论相邻（一步之差）",
  opposite: "两位审稿人结论相反",
};

/**
 * Compare two premise verdicts: "agree" when identical; "opposite" at the two
 * extremes (solid vs not-worth-writing); "adjacent" when one step apart.
 *
 * @example
 * comparePremiseVerdicts("solid", "fixable"); // → "adjacent"
 * comparePremiseVerdicts("solid", "not-worth-writing"); // → "opposite"
 */
export function comparePremiseVerdicts(
  original: PremiseReviewVerdict,
  second: PremiseReviewVerdict,
): PremiseVerdictRelation {
  const a = VERDICT_RANK.get(original) ?? 1;
  const b = VERDICT_RANK.get(second) ?? 1;
  const distance = Math.abs(a - b);
  return distance === 0 ? "agree" : distance === 1 ? "adjacent" : "opposite";
}

/** One layer compared across the two reviews — only differing layers carry weight. */
export interface PremiseLayerComparison {
  layer: PremiseLayerKey;
  originalStatus: PremiseLayerAssessment["status"];
  secondStatus: PremiseLayerAssessment["status"];
  agrees: boolean;
}

/**
 * Compare the four audit layers of two reviews, in canonical layer order.
 * Layers missing from either side are skipped (they cannot be compared).
 *
 * @example
 * comparePremiseLayers(original.layers, second.layers);
 * // → [{ layer: "engine", originalStatus: "weak", secondStatus: "established", agrees: false }, …]
 */
export function comparePremiseLayers(
  original: readonly PremiseLayerAssessment[],
  second: readonly PremiseLayerAssessment[],
): PremiseLayerComparison[] {
  return PREMISE_REVIEW_LAYERS.flatMap((layer) => {
    const a = original.find((assessment) => assessment.layer === layer);
    const b = second.find((assessment) => assessment.layer === layer);
    if (!a || !b) return [];
    return [
      {
        layer,
        originalStatus: a.status,
        secondStatus: b.status,
        agrees: a.status === b.status,
      },
    ];
  });
}

/* ---------------------------------------------------------------------------
 * 第二审稿人输出契约（盲审：只见灵感原文，不见第一份结论）
 * ------------------------------------------------------------------------- */

/** The blind second-reviewer output — same layer axes as the first review. */
export interface PremiseSecondReviewOutput {
  verdict: PremiseReviewVerdict;
  oneLineVerdict: string;
  layers: PremiseLayerAssessment[];
  /** The strongest honest argument for this verdict, anchored in quoted evidence. */
  strongestArgument: string;
  evidence: PremiseEvidenceQuote[];
}

/** Side-by-side consultation result. The original verdict is NEVER overwritten. */
export interface PremiseConsultResult {
  schemaVersion: PremiseConsultSchemaVersion;
  consultId: string;
  mode: "mock" | "model";
  trigger: PremiseConsultTrigger;
  /**
   * Set by the API layer when this result was persisted into a project's
   * medical record; absent for unpersisted (or demo-mode) consultations.
   */
  recordId?: string;
  /** The original verdict this consultation is presented against. */
  original: {
    verdict: PremiseReviewVerdict;
    oneLineVerdict: string;
    layers: PremiseLayerAssessment[];
  };
  second: PremiseSecondReviewOutput;
  comparison: {
    verdictRelation: PremiseVerdictRelation;
    layerComparisons: PremiseLayerComparison[];
    /** Evidence quotes dropped because they were not substrings of the premise. */
    droppedEvidenceCount: number;
  };
}

/**
 * Assemble the full consultation result from the two reviews. Pure code: the
 * comparison is computed, never narrated by a model.
 */
export function buildPremiseConsultResult(input: {
  consultId: string;
  mode: "mock" | "model";
  trigger: PremiseConsultTrigger;
  original: PremiseConsultResult["original"];
  second: PremiseSecondReviewOutput;
  droppedEvidenceCount: number;
}): PremiseConsultResult {
  return {
    schemaVersion: "premise-consult.v1",
    consultId: input.consultId,
    mode: input.mode,
    trigger: input.trigger,
    original: input.original,
    second: input.second,
    comparison: {
      verdictRelation: comparePremiseVerdicts(input.original.verdict, input.second.verdict),
      layerComparisons: comparePremiseLayers(input.original.layers, input.second.layers),
      droppedEvidenceCount: input.droppedEvidenceCount,
    },
  };
}

/* ---------------------------------------------------------------------------
 * 机械锚定（与 premise-review 的俗套证据同一规则：找不到就丢弃并计数）
 * ------------------------------------------------------------------------- */

/**
 * Drop evidence quotes that are not contiguous substrings of the premise text
 * and report how many were dropped. The verdict itself stands — its evidence
 * list just shrinks honestly (unlike a judge quote, one bad quote does not
 * invalidate the whole second review).
 */
export function anchorPremiseSecondReviewEvidence(
  evidence: readonly PremiseEvidenceQuote[],
  premiseText: string,
): { evidence: PremiseEvidenceQuote[]; droppedEvidenceCount: number } {
  const kept: PremiseEvidenceQuote[] = [];
  let droppedEvidenceCount = 0;
  for (const item of evidence) {
    if (item.quote && premiseText.includes(item.quote)) {
      kept.push(item);
    } else {
      droppedEvidenceCount += 1;
    }
  }
  return { evidence: kept, droppedEvidenceCount };
}

/* ---------------------------------------------------------------------------
 * 输出窄化（unknown → 契约；四层齐全、枚举合法才收，否则 null 由调用方记失败）
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

const VERDICTS: ReadonlySet<PremiseReviewVerdict> = new Set([
  "solid",
  "fixable",
  "not-worth-writing",
]);
const LAYER_KEYS: ReadonlySet<PremiseLayerKey> = new Set(PREMISE_REVIEW_LAYERS);
const LAYER_STATUSES: ReadonlySet<PremiseLayerAssessment["status"]> = new Set([
  "established",
  "weak",
  "missing",
]);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function narrowLayers(value: unknown): PremiseLayerAssessment[] | null {
  if (!Array.isArray(value)) return null;
  const layers: PremiseLayerAssessment[] = [];
  const seen = new Set<PremiseLayerKey>();
  for (const item of value) {
    if (!isRecord(item)) return null;
    const layer = oneOf(item.layer, LAYER_KEYS);
    const status = oneOf(item.status, LAYER_STATUSES);
    const statement = str(item.statement);
    const confidence =
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? clamp01(item.confidence)
        : null;
    if (!layer || !status || statement === null || confidence === null) {
      return null;
    }
    if (item.comment !== undefined && typeof item.comment !== "string") return null;
    const comment = typeof item.comment === "string" ? item.comment : "";
    if (seen.has(layer)) return null;
    seen.add(layer);
    layers.push(
      comment
        ? { layer, status, statement, confidence, comment }
        : { layer, status, statement, confidence },
    );
  }
  if (seen.size !== PREMISE_REVIEW_LAYERS.length) return null;
  return layers;
}

/**
 * Narrow a parsed JSON value to {@link PremiseSecondReviewOutput}. Requires all
 * four layers exactly once with valid enums; returns null otherwise so the
 * caller can fail honestly ("会诊失败，可重试") instead of half-trusting the model.
 */
export function parsePremiseSecondReviewOutput(value: unknown): PremiseSecondReviewOutput | null {
  if (!isRecord(value)) return null;
  const verdict = oneOf(value.verdict, VERDICTS);
  const oneLineVerdict = str(value.oneLineVerdict);
  const strongestArgument = str(value.strongestArgument);
  const layers = narrowLayers(value.layers);
  if (!verdict || oneLineVerdict === null || strongestArgument === null || !layers) {
    return null;
  }

  const evidence: PremiseEvidenceQuote[] = [];
  if (Array.isArray(value.evidence)) {
    for (const item of value.evidence) {
      if (!isRecord(item)) continue;
      const quote = str(item.quote);
      if (quote === null) continue;
      if (item.note !== undefined && typeof item.note !== "string") continue;
      const note = typeof item.note === "string" ? item.note : "";
      evidence.push(note ? { quote, note } : { quote });
    }
  }

  return { verdict, oneLineVerdict, layers, strongestArgument, evidence };
}

/* ---------------------------------------------------------------------------
 * 第二审稿人提示词（对抗立场：最强成立论证，但四层审计不放水）
 * ------------------------------------------------------------------------- */

const SECOND_REVIEW_SYSTEM = `你是中文网文立项会诊的第二审稿人，立场与第一审稿人相反：第一审稿人
负责找理由拒绝，你负责为这个灵感构建最强的成立论证——像最想签下这本书的
编辑一样。但你仍然是一名审稿人，不是啦啦队：四层审计（故事发动机、主角
欲望、持续冲突、不可替代性）缺一不可，每条判断都必须逐字引用作者原文作
为证据；如果最强的论证也撑不起四层，你必须如实给 not-worth-writing。
禁止为了安慰作者放水，禁止空泛表扬，禁止提供任何改写文本、桥段或新增
设定——你只能给出判断和理由。只返回合法 JSON，不使用 Markdown。`;

export interface PremiseSecondReviewPromptInput {
  genre: string;
  premiseText: string;
}

/**
 * Build the blind second-reviewer prompt. The input is deliberately just
 * genre + premise — no first-review content, no author objection — so the two
 * reviews are independent samples of editorial judgment.
 */
export function buildPremiseSecondReviewPrompt(
  input: PremiseSecondReviewPromptInput,
): PromptBundle {
  const layerSpec = PREMISE_REVIEW_LAYERS.map((layer) => {
    const meta = PREMISE_LAYER_META[layer];
    return `- ${layer}（${meta.label}，检验：${meta.question}）`;
  }).join("\n");
  return {
    id: "premise-second-review.v1",
    responseContract:
      "Return JSON with verdict, oneLineVerdict, layers[], strongestArgument, evidence[].",
    messages: [
      { role: "system", content: SECOND_REVIEW_SYSTEM },
      {
        role: "user",
        content: `题材提示：${input.genre}

作者的原始灵感：
${input.premiseText}

四层审计的层名（固定为这四个，每个都要评）：
${layerSpec}

要求：
1. verdict 三态：solid（四层全部成立，值得立刻写）/ fixable（值得写，但有必须
   先修的层）/ not-worth-writing（即使从最强成立论证出发也撑不起四层）。
   你的辩护立场体现在论证的力度上，绝不体现在放松三态的门槛上。
2. layers 数组恰好四项、层名各出现一次；status 用 established/weak/missing；
   statement 用一句话重述这一层作者原文现在提供了什么；confidence 是你评估
   该层证据完整度的 0-1 小数（不是判断正确的概率）；status 不是 established
   时用 comment 指出缺口。
3. strongestArgument 给出你为这个故事写的最强成立论证：一段话，说明为什么
   这个灵感值得写。它必须真的站得住——如果你自己都无法被说服，就如实降低
   verdict，不要硬撑。
4. evidence 数组逐字摘录作者原文中支撑你论证的关键片段（每条不超过 40 字，
   最多 5 条），note 说明该片段支撑哪一点；找不到就少列，不要编造。
5. 全文不得出现任何改写文本、桥段、人名建议或新增设定。

严格返回 JSON：
{"verdict":"solid|fixable|not-worth-writing","oneLineVerdict":"一句话结论","layers":[{"layer":"engine|desire|conflict|irreducibility","status":"established|weak|missing","statement":"一句话重述","confidence":0.0,"comment":"缺口或空字符串"}],"strongestArgument":"最强成立论证","evidence":[{"quote":"作者原文连续片段","note":"支撑点"}]}`,
      },
    ],
  };
}
