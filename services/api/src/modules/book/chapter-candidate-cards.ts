import { asTextList } from "../../shared/utils/coercion";

/**
 * 章节初核卡（P2-T2 过程可见性·深水区）：map 每章完成时从该章 map 产物提取。
 *
 * 锚定纪律——初核卡只在章节 map 携带至少一条已过机械锚定（locateQuoteRange
 * 命中并换算成全书偏移）的原文摘录时产生；锚点全灭的章节一张卡都不出。
 * 信号（风险/伏笔）与锚点是章级关系而非逐条对应，卡内分栏存放、由展示层
 * 分别标注，不伪装一一锚定。
 */

export interface ChapterCandidateQuote {
  quote: string;
  startOffset: number;
  endOffset: number;
}

export interface ChapterCandidateCard {
  chapterId: string;
  order: number;
  title: string;
  depth: "outline" | "deep";
  completedAt: string;
  /** 模型的一句话章节摘要（未复核，仅作导航）。 */
  summary?: string;
  /** 已过机械锚定的原文摘录（最多 2 条）。 */
  anchoredQuotes: ChapterCandidateQuote[];
  /** 未复核的风险信号（最多 2 条）。 */
  riskSignals: string[];
  /** 未复核的伏笔信号（最多 2 条）。 */
  setupSignals: string[];
}

/** partialResult 持久化体积有界：只保留最近完成的这些章。 */
export const CHAPTER_CANDIDATE_CARD_LIMIT = 80;

const ANCHORED_QUOTES_PER_CARD = 2;
const SIGNALS_PER_KIND = 2;

interface NarrowedChapterMap {
  chapterId?: unknown;
  order?: unknown;
  title?: unknown;
  analysisDepth?: unknown;
  summary?: unknown;
  sourceAnchors?: unknown;
  sourceRiskSignals?: unknown;
  foreshadowingSetups?: unknown;
}

function narrowAnchoredQuotes(
  source: NarrowedChapterMap,
): ChapterCandidateQuote[] {
  const anchors = Array.isArray(source.sourceAnchors)
    ? source.sourceAnchors
    : [];

  return anchors
    .map((anchor) => {
      const item = anchor as {
        quote?: unknown;
        startOffset?: unknown;
        endOffset?: unknown;
      };
      const quote = typeof item?.quote === "string" ? item.quote.trim() : "";
      return {
        quote,
        startOffset:
          typeof item?.startOffset === "number" ? item.startOffset : 0,
        endOffset: typeof item?.endOffset === "number" ? item.endOffset : 0,
      };
    })
    .filter((anchor) => anchor.quote.length > 0)
    .slice(0, ANCHORED_QUOTES_PER_CARD);
}

/**
 * 从章节 map 产物构建初核卡；没有机械锚定原文时返回 null（红线：未过锚定零展示）。
 */
export function buildChapterCandidateCard(
  chapterMap: unknown,
  completedAt: string,
): ChapterCandidateCard | null {
  const source = (chapterMap ?? {}) as NarrowedChapterMap;
  const anchoredQuotes = narrowAnchoredQuotes(source);
  if (!anchoredQuotes.length) {
    return null;
  }

  const order = typeof source.order === "number" ? source.order : 0;
  const chapterId =
    typeof source.chapterId === "string" && source.chapterId.trim()
      ? source.chapterId.trim()
      : `ch-${order}`;

  return {
    chapterId,
    order,
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title.trim()
        : `第 ${order} 章`,
    depth: source.analysisDepth === "deep" ? "deep" : "outline",
    completedAt,
    summary:
      typeof source.summary === "string" && source.summary.trim()
        ? source.summary.trim()
        : undefined,
    anchoredQuotes,
    riskSignals: asTextList(source.sourceRiskSignals).slice(
      0,
      SIGNALS_PER_KIND,
    ),
    setupSignals: asTextList(source.foreshadowingSetups).slice(
      0,
      SIGNALS_PER_KIND,
    ),
  };
}

/**
 * 合并初核卡：同一章深拆完成后替换其轻索引卡（深拆覆盖），超出上限时保留最近完成的。
 */
export function mergeChapterCandidateCards(
  existing: ChapterCandidateCard[],
  incoming: ChapterCandidateCard | null,
  limit: number = CHAPTER_CANDIDATE_CARD_LIMIT,
): ChapterCandidateCard[] {
  if (!incoming) {
    return existing;
  }

  const withoutSameChapter = existing.filter(
    (card) => card.chapterId !== incoming.chapterId,
  );

  return [...withoutSameChapter, incoming].slice(-limit);
}
