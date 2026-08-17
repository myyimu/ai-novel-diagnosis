/**
 * 复诊迭代纯函数：正文版本管理与相邻复诊对比。
 *
 * web 工作区与 api 服务端共用，保证两端生成完全一致的
 * 版本 ID（`version-<hash(projectId|归一化title|textHash)>`）
 * 与对比结论，避免服务端复诊与本地镜像出现分叉。
 */

export interface RevisionVersionLike {
  id: string;
  projectId?: string;
  createdAt: string;
  chapterTitle: string;
  textHash: string;
}

export interface RevisionVersion {
  id: string;
  projectId: string;
  createdAt: string;
  chapterTitle: string;
  versionLabel: string;
  textHash: string;
  textLength: number;
  text: string;
  sourceSessionId?: string;
  previousVersionId?: string;
}

export interface RevisionComparisonSession {
  quickScore: number | null;
  gateDecision?: string;
  issueTitles: string[];
  mainProblem: string;
  nextPrompt?: string;
}

export type RevisionPromptOutcomeStatus = "unknown" | "effective" | "partial" | "ineffective";

export interface RevisionPromptOutcome {
  status: RevisionPromptOutcomeStatus;
  label: string;
  reason: string;
}

export interface RevisionComparison {
  scoreDelta: number;
  gateDelta: number;
  gateChangeLabel: string;
  repeatedIssues: string[];
  resolvedIssues: string[];
  newIssues: string[];
  promptOutcome: RevisionPromptOutcome;
  nextAction: string;
}

/**
 * 与 web 端 `hashString` 完全一致的文本哈希（32 位整数折叠）。
 * 版本 ID 与 textHash 判等依赖其跨端稳定性，禁止改动算法。
 *
 * @example
 * hashRevisionText("同一份正文"); // 两端结果一致
 */
export function hashRevisionText(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return String(hash);
}

/**
 * 归一化章节标题：折叠空白；空标题回退为「未命名章节」。
 * 版本 ID 与版本归属判等必须经过该归一化。
 *
 * @example
 * normalizeRevisionChapterTitle("  第一章　退婚 "); // "第一章 退婚"
 */
export function normalizeRevisionChapterTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ") || "未命名章节";
}

/**
 * 为章节正文创建确定性的文本版本。
 * 同一 project + 归一化标题 + 正文哈希总是得到同一 ID 与更高版本号。
 *
 * @example
 * const version = createRevisionVersion({
 *   projectId: "project-a",
 *   chapterTitle: "第一章",
 *   chapterText: "正文",
 *   existingVersions: [],
 * });
 */
export function createRevisionVersion({
  projectId = "default-project",
  chapterTitle,
  chapterText,
  sourceSessionId,
  previousVersion,
  existingVersions = [],
  now = new Date().toISOString(),
}: {
  projectId?: string;
  chapterTitle: string;
  chapterText: string;
  sourceSessionId?: string;
  previousVersion?: RevisionVersionLike | null;
  existingVersions?: RevisionVersionLike[];
  now?: string;
}): RevisionVersion {
  const text = chapterText.trim();
  const title = chapterTitle.trim() || "未命名章节";
  const textHash = hashRevisionText(text);
  const versionNumber =
    existingVersions.filter(
      (version) =>
        (version.projectId || "default-project") === projectId &&
        normalizeRevisionChapterTitle(version.chapterTitle) ===
          normalizeRevisionChapterTitle(title),
    ).length + 1;

  return {
    id: `version-${hashRevisionText(
      [projectId, normalizeRevisionChapterTitle(title), textHash].join("|"),
    )}`,
    projectId,
    createdAt: now,
    chapterTitle: title,
    versionLabel: `V${versionNumber}`,
    textHash,
    textLength: text.length,
    text,
    sourceSessionId,
    previousVersionId: previousVersion?.id,
  };
}

/**
 * 在既有版本中查找与当前草稿（同项目 + 同归一化标题 + 同正文哈希）完全一致的版本。
 * 泛型保留调用方的版本元素类型（web 端为携带正文的完整版本）。
 *
 * @example
 * findRevisionVersionForDraft({ versions, chapterTitle, chapterText }); // 命中或 undefined
 */
export function findRevisionVersionForDraft<TVersion extends RevisionVersionLike>({
  versions,
  projectId = "default-project",
  chapterTitle,
  chapterText,
}: {
  versions: TVersion[];
  projectId?: string;
  chapterTitle: string;
  chapterText: string;
}): TVersion | undefined {
  const title = chapterTitle.trim() || "未命名章节";
  const textHash = hashRevisionText(chapterText.trim());

  return versions.find(
    (version) =>
      (version.projectId || "default-project") === projectId &&
      normalizeRevisionChapterTitle(version.chapterTitle) ===
        normalizeRevisionChapterTitle(title) &&
      version.textHash === textHash,
  );
}

/**
 * 查找同章节下正文不同的最近一个历史版本（作为改稿基线）。
 * 泛型保留调用方的版本元素类型。
 *
 * @example
 * findPreviousRevisionVersion({ versions, chapterTitle, chapterText });
 */
export function findPreviousRevisionVersion<TVersion extends RevisionVersionLike>({
  versions,
  projectId = "default-project",
  chapterTitle,
  chapterText,
}: {
  versions: TVersion[];
  projectId?: string;
  chapterTitle: string;
  chapterText: string;
}): TVersion | undefined {
  const title = chapterTitle.trim() || "未命名章节";
  const textHash = hashRevisionText(chapterText.trim());

  return [...versions]
    .filter(
      (version) =>
        (version.projectId || "default-project") === projectId &&
        normalizeRevisionChapterTitle(version.chapterTitle) ===
          normalizeRevisionChapterTitle(title) &&
        version.textHash !== textHash,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/**
 * 判断 quickScore 是否可比较（有限数字）。信息不足时保持 null，不折算为 0。
 *
 * @example
 * hasComparableQuickScore(6.2); // true
 * hasComparableQuickScore(null); // false
 */
export function hasComparableQuickScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 对比相邻两次复诊：分数/Gate 变化、问题重复/解决/新增、上一轮 Prompt 有效性归因与下一步动作。
 * 任一侧 quickScore 不可比较时返回 null。
 *
 * @example
 * const comparison = buildRevisionComparison({ current, previous });
 */
export function buildRevisionComparison({
  current,
  previous,
}: {
  current: RevisionComparisonSession;
  previous: RevisionComparisonSession;
}): RevisionComparison | null {
  const scoreDelta = calculateScoreDelta(current, previous);
  if (scoreDelta === null) {
    return null;
  }
  const gateDelta = getGateRank(current.gateDecision) - getGateRank(previous.gateDecision);
  const previousIssues = uniqueTextList(
    previous.issueTitles.length ? previous.issueTitles : [previous.mainProblem],
    8,
  );
  const currentIssues = uniqueTextList(
    current.issueTitles.length ? current.issueTitles : [current.mainProblem],
    8,
  );
  const repeatedIssues = currentIssues.filter((issue) => previousIssues.includes(issue));
  const resolvedIssues = previousIssues.filter((issue) => !currentIssues.includes(issue));
  const newIssues = currentIssues.filter((issue) => !previousIssues.includes(issue));
  const promptOutcome = buildSinglePromptOutcome({
    hasPreviousPrompt: Boolean(previous.nextPrompt?.trim()),
    scoreDelta,
    gateDelta,
    repeatedIssueCount: repeatedIssues.length,
    resolvedIssueCount: resolvedIssues.length,
  });

  return {
    scoreDelta,
    gateDelta,
    gateChangeLabel: formatGateChange(gateDelta),
    repeatedIssues,
    resolvedIssues,
    newIssues,
    promptOutcome,
    nextAction: buildRevisionComparisonNextAction({
      scoreDelta,
      gateDelta,
      repeatedIssues,
      resolvedIssues,
      newIssues,
      promptOutcome,
    }),
  };
}

function calculateScoreDelta(
  current: RevisionComparisonSession | null | undefined,
  previous: RevisionComparisonSession | null | undefined,
) {
  if (
    !hasComparableQuickScore(current?.quickScore) ||
    !hasComparableQuickScore(previous?.quickScore)
  ) {
    return null;
  }

  return Number((current.quickScore - previous.quickScore).toFixed(1));
}

function buildSinglePromptOutcome({
  hasPreviousPrompt,
  scoreDelta,
  gateDelta,
  repeatedIssueCount,
  resolvedIssueCount,
}: {
  hasPreviousPrompt: boolean;
  scoreDelta: number;
  gateDelta: number;
  repeatedIssueCount: number;
  resolvedIssueCount: number;
}) {
  if (!hasPreviousPrompt) {
    return {
      status: "unknown" as const,
      label: "缺少上一轮 Prompt",
      reason: "上一版没有保存改稿 Prompt，无法判断这次修改是否由 Prompt 推动。",
    };
  }

  if (scoreDelta >= 0.5 && gateDelta >= 0 && resolvedIssueCount > 0) {
    return {
      status: "effective" as const,
      label: "上一轮 Prompt 看起来有效",
      reason: "分数提升，Gate 没有变差，并且上一版问题有被解决的迹象。",
    };
  }

  if (scoreDelta >= 0 && (resolvedIssueCount > 0 || repeatedIssueCount > 0)) {
    return {
      status: "partial" as const,
      label: "上一轮 Prompt 部分有效",
      reason: "结果没有明显变差，但仍有问题重复或新增，下一轮需要继续收窄约束。",
    };
  }

  return {
    status: "ineffective" as const,
    label: "上一轮 Prompt 暂未证明有效",
    reason: "分数或 Gate 没有改善，需要回到证据链重写下一轮约束。",
  };
}

function buildRevisionComparisonNextAction({
  scoreDelta,
  gateDelta,
  repeatedIssues,
  resolvedIssues,
  newIssues,
  promptOutcome,
}: {
  scoreDelta: number;
  gateDelta: number;
  repeatedIssues: string[];
  resolvedIssues: string[];
  newIssues: string[];
  promptOutcome: RevisionPromptOutcome;
}) {
  if (promptOutcome.status === "effective") {
    return "把已解决问题沉淀成方法论卡，下一轮只处理新增或剩余的最大问题。";
  }

  if (repeatedIssues.length) {
    return `优先重改重复问题：${repeatedIssues[0]}。下一轮 Prompt 要把动作写成可检查事件。`;
  }

  if (newIssues.length && scoreDelta >= 0 && gateDelta >= 0) {
    return `旧问题已有变化，下一轮处理新问题：${newIssues[0]}。`;
  }

  if (resolvedIssues.length && scoreDelta < 0) {
    return "虽然旧问题有变化，但整体变弱了；检查是否为了修问题牺牲了开局承诺或章末钩子。";
  }

  return "回到上一版最大流失点，重新生成更具体的改稿 Prompt 后再复诊。";
}

function getGateRank(gate: string | undefined) {
  const rank: Record<string, number> = {
    insufficient: 0,
    discard: 0,
    rebuild: 1,
    revise: 2,
    continue: 3,
  };

  return rank[gate || "revise"] ?? rank.revise;
}

function formatGateChange(delta: number) {
  if (delta > 0) return "Gate 改善";
  if (delta < 0) return "Gate 变差";
  return "Gate 持平";
}

function uniqueTextList(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}
