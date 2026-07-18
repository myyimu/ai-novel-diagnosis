export type PromptAttributionCategory =
  | "prompt_effective"
  | "execution_gap"
  | "wrong_direction"
  | "idea_or_structure_blocker"
  | "insufficient_data";

export interface PromptAttributionSession {
  id: string;
  chapterTitle: string;
  quickScore: number | null;
  gateDecision?: string;
  issueTitles: string[];
  nextPrompt?: string;
  revisionNote?: string;
}

export interface PromptAttributionCountRow {
  id: string;
  label: string;
  count: number;
  percent: number;
}

export interface PromptAttributionSignal {
  label: string;
  value: string;
  direction: "positive" | "negative" | "neutral";
  weight: number;
}

export interface PromptAttributionItem {
  id: string;
  category: PromptAttributionCategory;
  label: string;
  currentSessionId: string;
  previousSessionId: string;
  currentTitle: string;
  previousTitle: string;
  scoreDelta: number;
  gateDelta: number;
  repeatedIssues: string[];
  resolvedIssues: string[];
  prompt?: string;
  revisionNote?: string;
  evidence: string[];
  nextAction: string;
  diagnosisReason: string;
  confidence: number;
  signalStrengths: PromptAttributionSignal[];
  missingData: string[];
  calibrationNotes: string[];
}

export type PromptAttributionReadiness =
  | "insufficient_data"
  | "needs_more_notes"
  | "ready_for_review"
  | "stable_signal";

export interface PromptAttributionCalibration {
  sampleSize: number;
  averageConfidence: number | null;
  readiness: PromptAttributionReadiness;
  readinessLabel: string;
  dominantCategory?: {
    category: PromptAttributionCategory;
    label: string;
    count: number;
    percent: number;
  };
  headline: string;
  nextBestAction: string;
  evidenceGaps: string[];
  modelAssistedReviewPrompt: string;
}

export interface PromptAttributionSummary {
  total: number;
  effective: number;
  rate: number | null;
  counts: PromptAttributionCountRow[];
  items: PromptAttributionItem[];
  calibration: PromptAttributionCalibration;
}

export function buildPromptAttribution(
  sessions: PromptAttributionSession[],
): PromptAttributionSummary {
  const items: PromptAttributionItem[] = [];

  for (let index = 0; index < sessions.length - 1; index += 1) {
    const current = sessions[index];
    const previous = sessions[index + 1];
    if (!previous.nextPrompt) {
      continue;
    }
    if (!hasComparableScore(current.quickScore) || !hasComparableScore(previous.quickScore)) {
      continue;
    }

    const scoreDelta = Number((current.quickScore - previous.quickScore).toFixed(1));
    const repeatedIssues = previous.issueTitles.filter((issue) =>
      current.issueTitles.includes(issue),
    );
    const resolvedIssues = previous.issueTitles.filter(
      (issue) => !current.issueTitles.includes(issue),
    );
    const gateDelta = gateRank(current.gateDecision) - gateRank(previous.gateDecision);
    const note = current.revisionNote || "";
    const hasExecutionGapNote = /未|没|沒有|没有|还没|尚未|来不及|没按|只改|执行不到位/.test(note);
    const previousBlocked =
      previous.gateDecision === "discard" || previous.gateDecision === "rebuild";
    const promptConcreteScore = scorePromptConcreteness(previous.nextPrompt);
    const category = classifyPromptAttribution({
      scoreDelta,
      gateDelta,
      repeatedIssueCount: repeatedIssues.length,
      resolvedIssueCount: resolvedIssues.length,
      previousIssueCount: previous.issueTitles.length,
      previousBlocked,
      hasExecutionGapNote,
      hasNote: Boolean(note.trim()),
    });
    const signalStrengths = buildPromptAttributionSignals({
      scoreDelta,
      gateDelta,
      repeatedIssueCount: repeatedIssues.length,
      resolvedIssueCount: resolvedIssues.length,
      promptConcreteScore,
      hasExecutionGapNote,
      hasNote: Boolean(note.trim()),
    });
    const missingData = buildMissingData({
      current,
      previous,
      promptConcreteScore,
    });

    items.push({
      id: `${previous.id}->${current.id}`,
      category,
      label: formatPromptAttributionCategory(category),
      currentSessionId: current.id,
      previousSessionId: previous.id,
      currentTitle: current.chapterTitle,
      previousTitle: previous.chapterTitle,
      scoreDelta,
      gateDelta,
      repeatedIssues,
      resolvedIssues,
      prompt: previous.nextPrompt,
      revisionNote: current.revisionNote,
      evidence: buildPromptAttributionEvidence({
        category,
        scoreDelta,
        gateDelta,
        repeatedIssues,
        resolvedIssues,
        hasExecutionGapNote,
      }),
      nextAction: buildPromptAttributionNextAction(category),
      diagnosisReason: buildPromptAttributionReason({
        category,
        scoreDelta,
        gateDelta,
        repeatedIssues,
        resolvedIssues,
      }),
      confidence: buildAttributionConfidence({
        category,
        scoreDelta,
        gateDelta,
        repeatedIssueCount: repeatedIssues.length,
        resolvedIssueCount: resolvedIssues.length,
        hasNote: Boolean(note.trim()),
        promptConcreteScore,
        missingDataCount: missingData.length,
      }),
      signalStrengths,
      missingData,
      calibrationNotes: buildCalibrationNotes(category),
    });
  }

  const counts = buildCountRows(
    items.map((item) => item.category),
    formatPromptAttributionCategory,
  );
  const effective = items.filter((item) => item.category === "prompt_effective").length;

  return {
    total: items.length,
    effective,
    rate: items.length ? Math.round((effective / items.length) * 100) : null,
    counts,
    items,
    calibration: buildPromptAttributionCalibration({ items, counts }),
  };
}

function hasComparableScore(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function buildPromptAttributionCalibration({
  items,
  counts,
}: {
  items: PromptAttributionItem[];
  counts: PromptAttributionCountRow[];
}): PromptAttributionCalibration {
  const averageConfidence = items.length
    ? Number((items.reduce((sum, item) => sum + item.confidence, 0) / items.length).toFixed(2))
    : null;
  const topCount = counts[0];
  const dominantCategory = topCount
    ? {
        category: topCount.id as PromptAttributionCategory,
        label: topCount.label,
        count: topCount.count,
        percent: topCount.percent,
      }
    : undefined;
  const evidenceGaps = buildCalibrationEvidenceGaps(items);
  const readiness = resolveCalibrationReadiness({
    sampleSize: items.length,
    averageConfidence,
    evidenceGapCount: evidenceGaps.length,
    dominantPercent: dominantCategory?.percent ?? 0,
  });
  const headline = buildCalibrationHeadline({ readiness, dominantCategory, averageConfidence });
  const nextBestAction = buildCalibrationNextAction({ readiness, dominantCategory });

  return {
    sampleSize: items.length,
    averageConfidence,
    readiness,
    readinessLabel: formatReadiness(readiness),
    dominantCategory,
    headline,
    nextBestAction,
    evidenceGaps,
    modelAssistedReviewPrompt: buildModelAssistedReviewPrompt({
      headline,
      nextBestAction,
      dominantCategory,
      evidenceGaps,
      items,
    }),
  };
}

function classifyPromptAttribution({
  scoreDelta,
  gateDelta,
  repeatedIssueCount,
  resolvedIssueCount,
  previousIssueCount,
  previousBlocked,
  hasExecutionGapNote,
  hasNote,
}: {
  scoreDelta: number;
  gateDelta: number;
  repeatedIssueCount: number;
  resolvedIssueCount: number;
  previousIssueCount: number;
  previousBlocked: boolean;
  hasExecutionGapNote: boolean;
  hasNote: boolean;
}): PromptAttributionCategory {
  if (scoreDelta >= 0.5 && (gateDelta > 0 || resolvedIssueCount > 0 || repeatedIssueCount === 0)) {
    return "prompt_effective";
  }

  if (hasExecutionGapNote && repeatedIssueCount > 0) {
    return "execution_gap";
  }

  if (scoreDelta <= -0.5 || gateDelta < 0) {
    return "wrong_direction";
  }

  if (
    previousBlocked &&
    scoreDelta < 0.5 &&
    previousIssueCount > 0 &&
    repeatedIssueCount >= Math.max(1, Math.ceil(previousIssueCount / 2))
  ) {
    return "idea_or_structure_blocker";
  }

  if (repeatedIssueCount > 0 && scoreDelta < 0.5) {
    return "execution_gap";
  }

  if (!hasNote && Math.abs(scoreDelta) < 0.5) {
    return "insufficient_data";
  }

  return "insufficient_data";
}

function buildPromptAttributionEvidence({
  category,
  scoreDelta,
  gateDelta,
  repeatedIssues,
  resolvedIssues,
  hasExecutionGapNote,
}: {
  category: PromptAttributionCategory;
  scoreDelta: number;
  gateDelta: number;
  repeatedIssues: string[];
  resolvedIssues: string[];
  hasExecutionGapNote: boolean;
}) {
  const evidence = [`分数变化 ${scoreDelta > 0 ? "+" : ""}${scoreDelta}`];
  if (gateDelta !== 0) {
    evidence.push(gateDelta > 0 ? "Gate 变好" : "Gate 变差");
  }
  if (resolvedIssues.length) {
    evidence.push(`已解决：${resolvedIssues.slice(0, 2).join("、")}`);
  }
  if (repeatedIssues.length) {
    evidence.push(`仍复发：${repeatedIssues.slice(0, 2).join("、")}`);
  }
  if (hasExecutionGapNote) {
    evidence.push("人工备注显示执行不足");
  }
  if (category === "insufficient_data" && evidence.length === 1) {
    evidence.push("缺少人工备注或明确问题变化");
  }

  return evidence;
}

function buildPromptAttributionNextAction(category: PromptAttributionCategory) {
  const map: Record<PromptAttributionCategory, string> = {
    prompt_effective: "保留这类 Prompt 约束，继续复诊下一版。",
    execution_gap: "不要急着换方向，先按原 Prompt 补足未执行部分。",
    wrong_direction: "重写下一轮 Prompt，明确保留边界和目标问题。",
    idea_or_structure_blocker: "先回到脑洞、开局承诺或章节结构，不要只微调正文。",
    insufficient_data: "补充本版人工备注，再观察下一次复诊变化。",
  };

  return map[category];
}

function buildPromptAttributionReason({
  category,
  scoreDelta,
  gateDelta,
  repeatedIssues,
  resolvedIssues,
}: {
  category: PromptAttributionCategory;
  scoreDelta: number;
  gateDelta: number;
  repeatedIssues: string[];
  resolvedIssues: string[];
}) {
  if (category === "prompt_effective") {
    const resolvedLabel = resolvedIssues.length
      ? `已解决 ${resolvedIssues.slice(0, 2).join("、")}`
      : "旧问题出现解决迹象";
    return `新版分数提升 ${scoreDelta}，且 ${
      gateDelta > 0 ? "Gate 同步改善" : resolvedLabel
    }，说明上一轮 Prompt 的约束大概率推动了有效改稿。`;
  }
  if (category === "execution_gap") {
    return `核心问题仍在复发${
      repeatedIssues.length ? `：${repeatedIssues.slice(0, 2).join("、")}` : ""
    }，当前更像是执行不到位，而不是需要立刻更换方向。`;
  }
  if (category === "wrong_direction") {
    return `新版分数或 Gate 变差，说明上一轮 Prompt 可能把注意力带偏，下一轮要先收紧目标和保留边界。`;
  }
  if (category === "idea_or_structure_blocker") {
    return `旧版处在重构或废稿 Gate，复诊后关键问题仍未松动，瓶颈更可能在脑洞、开局承诺或章节结构。`;
  }

  return `目前只看到有限变化，缺少人工备注、问题消解或 Gate 改善等强证据，暂不做强归因。`;
}

function buildPromptAttributionSignals({
  scoreDelta,
  gateDelta,
  repeatedIssueCount,
  resolvedIssueCount,
  promptConcreteScore,
  hasExecutionGapNote,
  hasNote,
}: {
  scoreDelta: number;
  gateDelta: number;
  repeatedIssueCount: number;
  resolvedIssueCount: number;
  promptConcreteScore: number;
  hasExecutionGapNote: boolean;
  hasNote: boolean;
}): PromptAttributionSignal[] {
  return [
    {
      label: "分数变化",
      value: `${scoreDelta > 0 ? "+" : ""}${scoreDelta}`,
      direction: scoreDelta >= 0.5 ? "positive" : scoreDelta <= -0.5 ? "negative" : "neutral",
      weight: Math.min(3, Math.round(Math.abs(scoreDelta) * 2)),
    },
    {
      label: "Gate 变化",
      value:
        gateDelta === 0
          ? "持平"
          : gateDelta > 0
            ? `改善 ${gateDelta}`
            : `下降 ${Math.abs(gateDelta)}`,
      direction: gateDelta > 0 ? "positive" : gateDelta < 0 ? "negative" : "neutral",
      weight: Math.min(3, Math.abs(gateDelta) + 1),
    },
    {
      label: "问题消解",
      value: `${resolvedIssueCount} 个解决 / ${repeatedIssueCount} 个复发`,
      direction:
        resolvedIssueCount > repeatedIssueCount
          ? "positive"
          : repeatedIssueCount > 0
            ? "negative"
            : "neutral",
      weight: Math.min(3, resolvedIssueCount + repeatedIssueCount),
    },
    {
      label: "Prompt 约束密度",
      value: promptConcreteScore >= 2 ? "具体" : promptConcreteScore === 1 ? "偏弱" : "模糊",
      direction: promptConcreteScore >= 2 ? "positive" : "neutral",
      weight: Math.max(1, promptConcreteScore),
    },
    {
      label: "人工备注",
      value: hasExecutionGapNote ? "提示未执行" : hasNote ? "有备注" : "缺失",
      direction: hasExecutionGapNote ? "negative" : hasNote ? "positive" : "neutral",
      weight: hasNote ? 2 : 1,
    },
  ];
}

function buildMissingData({
  current,
  previous,
  promptConcreteScore,
}: {
  current: PromptAttributionSession;
  previous: PromptAttributionSession;
  promptConcreteScore: number;
}) {
  const missingData: string[] = [];
  if (!current.revisionNote?.trim()) {
    missingData.push("本版没有人工备注，无法确认作者是否按上一轮 Prompt 执行。");
  }
  if (!previous.issueTitles.length) {
    missingData.push("相邻版本缺少结构化问题标签，问题复发判断会偏弱。");
  }
  if (promptConcreteScore < 2) {
    missingData.push("上一轮 Prompt 约束不够具体，难以判断是 Prompt 错还是执行弱。");
  }
  return missingData;
}

function buildAttributionConfidence({
  category,
  scoreDelta,
  gateDelta,
  repeatedIssueCount,
  resolvedIssueCount,
  hasNote,
  promptConcreteScore,
  missingDataCount,
}: {
  category: PromptAttributionCategory;
  scoreDelta: number;
  gateDelta: number;
  repeatedIssueCount: number;
  resolvedIssueCount: number;
  hasNote: boolean;
  promptConcreteScore: number;
  missingDataCount: number;
}) {
  let confidence = 0.35;
  if (Math.abs(scoreDelta) >= 0.5) confidence += 0.18;
  if (gateDelta !== 0) confidence += 0.14;
  if (repeatedIssueCount || resolvedIssueCount) confidence += 0.14;
  if (hasNote) confidence += 0.16;
  if (promptConcreteScore >= 2) confidence += 0.08;
  confidence -= Math.min(0.2, missingDataCount * 0.06);

  if (category === "insufficient_data") {
    confidence = Math.min(confidence, 0.55);
  }

  return Math.max(0.2, Math.min(0.95, Number(confidence.toFixed(2))));
}

function buildCalibrationNotes(category: PromptAttributionCategory) {
  const base = "当前为规则归因，不等于严格因果证明；连续 3 次以上复诊后可信度会更高。";
  const map: Record<PromptAttributionCategory, string> = {
    prompt_effective: "可把上一轮 Prompt 中有效约束沉淀为项目方法论。",
    execution_gap: "需要作者备注实际改动，否则容易把执行问题误判成 Prompt 问题。",
    wrong_direction: "建议保留上一版有效部分，避免下一轮 Prompt 过度重写。",
    idea_or_structure_blocker: "应优先重审卖点承诺、主角目标和章节结构，再生成正文改写指令。",
    insufficient_data: "下一次复诊前先记录本版具体按哪些指令改动。",
  };

  return [base, map[category]];
}

function buildCalibrationEvidenceGaps(items: PromptAttributionItem[]) {
  const gaps = new Set<string>();
  if (items.length < 3) {
    gaps.add("可归因复诊少于 3 次，趋势容易被单次改稿波动影响。");
  }
  if (items.some((item) => !item.revisionNote?.trim())) {
    gaps.add("部分复诊缺少人工备注，无法确认作者是否按上一轮 Prompt 执行。");
  }
  if (items.some((item) => item.missingData.some((gap) => gap.includes("Prompt 约束不够具体")))) {
    gaps.add("部分上一轮 Prompt 约束偏模糊，难以区分 Prompt 问题和执行问题。");
  }
  if (items.some((item) => item.missingData.some((gap) => gap.includes("结构化问题标签")))) {
    gaps.add("部分复诊缺少结构化问题标签，问题复发判断会偏弱。");
  }
  return Array.from(gaps);
}

function resolveCalibrationReadiness({
  sampleSize,
  averageConfidence,
  evidenceGapCount,
  dominantPercent,
}: {
  sampleSize: number;
  averageConfidence: number | null;
  evidenceGapCount: number;
  dominantPercent: number;
}): PromptAttributionReadiness {
  if (sampleSize < 2) {
    return "insufficient_data";
  }
  if (evidenceGapCount > 0 || (averageConfidence ?? 0) < 0.65) {
    return "needs_more_notes";
  }
  if (sampleSize >= 5 && dominantPercent >= 60 && (averageConfidence ?? 0) >= 0.72) {
    return "stable_signal";
  }
  return "ready_for_review";
}

function buildCalibrationHeadline({
  readiness,
  dominantCategory,
  averageConfidence,
}: {
  readiness: PromptAttributionReadiness;
  dominantCategory?: PromptAttributionCalibration["dominantCategory"];
  averageConfidence: number | null;
}) {
  if (!dominantCategory) {
    return "复诊样本还不够，暂时不要把单次结果当成稳定方法论。";
  }
  const confidenceLabel =
    averageConfidence === null ? "未知" : `${Math.round(averageConfidence * 100)}%`;
  if (readiness === "stable_signal") {
    return `当前主导归因是「${dominantCategory.label}」，占 ${dominantCategory.percent}%，平均置信度 ${confidenceLabel}，可以沉淀为项目级改稿策略。`;
  }
  if (readiness === "ready_for_review") {
    return `当前最常见归因是「${dominantCategory.label}」，但仍建议人工复核后再固化为方法论。`;
  }
  return `当前归因倾向「${dominantCategory.label}」，但证据链还不够稳，需要补备注和复诊样本。`;
}

function buildCalibrationNextAction({
  readiness,
  dominantCategory,
}: {
  readiness: PromptAttributionReadiness;
  dominantCategory?: PromptAttributionCalibration["dominantCategory"];
}) {
  if (!dominantCategory || readiness === "insufficient_data") {
    return "继续完成至少两次带备注的复诊，再判断 Prompt 是否真的有效。";
  }
  if (readiness === "needs_more_notes") {
    return "下一版复诊前先记录实际改动点，尤其标明哪些 Prompt 指令执行了、哪些没执行。";
  }
  const map: Record<PromptAttributionCategory, string> = {
    prompt_effective: "把有效 Prompt 中的约束抽成方法论卡，并沿用到下一章或下一轮改稿。",
    execution_gap: "先建立执行清单，不要急着换 Prompt；逐条补齐未执行的指令后再复诊。",
    wrong_direction: "重写下一轮 Prompt，明确保留项、禁止项和只解决的目标问题。",
    idea_or_structure_blocker: "暂停正文润色，回到脑洞、开局承诺、主角目标和章节结构做重构。",
    insufficient_data: "补充人工备注和结构化问题标签，再观察下一轮变化。",
  };
  return map[dominantCategory.category];
}

function formatReadiness(readiness: PromptAttributionReadiness) {
  const map: Record<PromptAttributionReadiness, string> = {
    insufficient_data: "样本不足",
    needs_more_notes: "需要补证据",
    ready_for_review: "可人工复核",
    stable_signal: "信号稳定",
  };
  return map[readiness];
}

function buildModelAssistedReviewPrompt({
  headline,
  nextBestAction,
  dominantCategory,
  evidenceGaps,
  items,
}: {
  headline: string;
  nextBestAction: string;
  dominantCategory?: PromptAttributionCalibration["dominantCategory"];
  evidenceGaps: string[];
  items: PromptAttributionItem[];
}) {
  const recentItems = items.slice(0, 5);
  const itemLines = recentItems.map(
    (item, index) =>
      `${index + 1}. ${item.previousTitle} -> ${item.currentTitle}：${item.label}，分数 ${item.scoreDelta >= 0 ? "+" : ""}${item.scoreDelta}，证据：${item.evidence.join("；")}`,
  );
  return [
    "请作为网文编辑复核下面的 Prompt 归因校准结果。",
    `当前结论：${headline}`,
    `主导归因：${dominantCategory?.label || "暂无"}`,
    `建议动作：${nextBestAction}`,
    `证据缺口：${evidenceGaps.join("；") || "暂无"}`,
    "最近复诊：",
    itemLines.join("\n") || "暂无可归因复诊。",
    "请判断：1. 归因是否可信；2. 是否该改 Prompt、补执行、重构脑洞结构，还是继续沿用；3. 下一轮最小动作是什么。",
  ].join("\n");
}

function scorePromptConcreteness(prompt: string) {
  let score = 0;
  if (/必须|不要|不能|保留|删除|补出|改成|前\s*\d+|第\s*\d+|字/.test(prompt)) {
    score += 1;
  }
  if (/目标|代价|阻碍|冲突|钩子|爽点|节奏|设定|人设|读者|下一章/.test(prompt)) {
    score += 1;
  }
  if (prompt.trim().length >= 80) {
    score += 1;
  }
  return Math.min(3, score);
}

function gateRank(gate: string | undefined) {
  const map: Record<string, number> = {
    discard: 0,
    rebuild: 1,
    revise: 2,
    continue: 3,
  };

  return map[gate || "revise"] ?? 2;
}

function formatPromptAttributionCategory(category: PromptAttributionCategory) {
  const map: Record<PromptAttributionCategory, string> = {
    prompt_effective: "Prompt 有效",
    execution_gap: "执行不到位",
    wrong_direction: "方向错误",
    idea_or_structure_blocker: "脑洞/结构阻塞",
    insufficient_data: "证据不足",
  };

  return map[category];
}

function buildCountRows(values: string[], labeler: (value: PromptAttributionCategory) => string) {
  const counts = values.filter(Boolean).reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      id,
      label: labeler(id as PromptAttributionCategory),
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}
