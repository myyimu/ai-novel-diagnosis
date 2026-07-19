import type {
  ProjectMethodologyCardSnapshot,
  RevisionSessionSnapshot,
  StoryAuditFindingReviewSnapshot,
  RevisionTextVersionSnapshot,
  WorkspaceProjectSnapshot,
} from "./workspace-assets.repository";
import {
  buildPromptAttribution,
  type StoryAuditResult,
} from "@ai-novel-diagnosis/ai-core";

interface StoryAuditExportSnapshot {
  schemaVersion: string;
  auditId: string;
  bookJobId: string;
  generatedAt: string;
  coverage: StoryAuditResult["coverage"];
  dialogue: Array<{
    scopeId: string;
    dialogueCharacterRatio: number;
    dialogueTurnCount: number;
    parserWarningCount: number;
  }>;
  findings: Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    title: string;
    claim: string;
    confidence: number;
    evidence: Array<{
      anchorId: string;
      chapterId: string;
      chapterOrder: number;
      quote: string;
      source: string;
    }>;
    alternativeExplanations: string[];
    readerImpact?: string;
    fixAction?: string;
    humanReviewState?: StoryAuditFindingReviewSnapshot["reviewState"];
    linkedRevisionSessionIds: string[];
  }>;
  views: {
    sceneCount: number;
    eventCount: number;
    factCount: number;
    characterStateCount: number;
    plotlineCount: number;
    setupPayoffEdgeCount: number;
    temporalEdgeCount: number;
  };
}

export function buildWorkspaceProjectMarkdown(input: {
  project: WorkspaceProjectSnapshot;
  revisionSessions: RevisionSessionSnapshot[];
  revisionVersions?: RevisionTextVersionSnapshot[];
  methodologyCards: ProjectMethodologyCardSnapshot[];
  storyAudit?: StoryAuditResult | null;
  storyAuditFindingReviews?: StoryAuditFindingReviewSnapshot[];
  generatedAt?: string;
}) {
  const sessions = [...input.revisionSessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const cards = [...input.methodologyCards].sort((a, b) => {
    if (b.occurrenceCount !== a.occurrenceCount) {
      return b.occurrenceCount - a.occurrenceCount;
    }
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
  const promptCards = cards.filter((card) => card.promptTemplate?.trim());
  const latest = sessions[0];
  const previous = sessions[1];
  const versionsById = new Map(
    (input.revisionVersions || []).map((version) => [version.id, version]),
  );
  const storyAuditExport = input.storyAudit
    ? buildStoryAuditExportSnapshot({
        storyAudit: input.storyAudit,
        revisionSessions: sessions,
        reviews: input.storyAuditFindingReviews || [],
      })
    : null;
  const scoreDelta = calculateScoreDelta(latest, previous);
  const promptAttribution = buildPromptAttribution(sessions);
  const commonIssues = countRows(
    sessions.flatMap((session) =>
      session.issueTitles.length ? session.issueTitles : [session.mainProblem],
    ),
  )
    .slice(0, 6)
    .map((row) => row.label);

  const lines = [
    `# AI网文诊断台项目导出：${escapeMarkdown(input.project.name)}`,
    "",
    `- 导出时间：${formatDateTime(input.generatedAt || new Date().toISOString())}`,
    `- 项目创建：${formatDateTime(input.project.createdAt)}`,
    `- 最近更新：${formatDateTime(input.project.updatedAt)}`,
    `- 复诊次数：${sessions.length}`,
    `- 正文版本：${input.revisionVersions?.length || 0}`,
    `- 方法论卡：${cards.length}`,
    `- Prompt 模板：${promptCards.length}`,
    `- 故事体检：${storyAuditExport ? "已包含摘要" : "暂无"}`,
    "",
    "## 项目概览",
    "",
    `- 最新分数：${latest ? formatQuickScore(latest.quickScore) : "暂无"}`,
    `- 相对上一版：${formatScoreDelta(scoreDelta)}`,
    `- 最新 Gate：${latest ? formatGate(latest.gateDecision) : "暂无"}`,
    `- Prompt 归因有效率：${formatPromptAttributionRate(promptAttribution)}`,
    `- 常见问题：${commonIssues.join("、") || "暂无"}`,
    "",
  ];

  appendStoryAuditMarkdown(lines, storyAuditExport);

  lines.push("## 复诊轨迹", "");

  if (!sessions.length) {
    lines.push("暂无复诊记录。", "");
  } else {
    sessions.forEach((session, index) => {
      lines.push(
        `### ${sessions.length - index}. ${escapeMarkdown(session.chapterTitle)}`,
        "",
        `- 时间：${formatDateTime(session.createdAt)}`,
        `- 来源：${formatInputKind(session.inputKind)}`,
        `- 题材：${session.genre}`,
        `- 分数：${formatQuickScore(session.quickScore)}`,
        `- Gate：${formatGate(session.gateDecision)}`,
        `- 正文版本：${formatVersionTransition(session, versionsById)}`,
        `- 正文长度：${session.textLength} 字`,
        `- 主要问题：${session.mainProblem}`,
        `- 问题标签：${session.issueTitles.join("、") || "暂无"}`,
        "",
      );

      if (session.revisionNote?.trim()) {
        lines.push("人工备注：", "", session.revisionNote.trim(), "");
      }

      if (session.nextPrompt?.trim()) {
        lines.push(
          "下一轮 Prompt：",
          "",
          "```text",
          escapeCodeFence(session.nextPrompt.trim()),
          "```",
          "",
        );
      }
    });
  }

  lines.push("## Prompt 归因", "");
  if (!promptAttribution.items.length) {
    lines.push("暂无可归因复诊。", "");
  } else {
    lines.push(
      "### 项目级归因校准",
      "",
      `- 状态：${promptAttribution.calibration.readinessLabel}`,
      `- 样本数：${promptAttribution.calibration.sampleSize}`,
      `- 平均置信度：${formatNullableAttributionConfidence(promptAttribution.calibration.averageConfidence)}`,
      `- 主导归因：${promptAttribution.calibration.dominantCategory?.label || "暂无"}`,
      `- 校准结论：${promptAttribution.calibration.headline}`,
      `- 下一步：${promptAttribution.calibration.nextBestAction}`,
      `- 待补证据：${promptAttribution.calibration.evidenceGaps.join("；") || "暂无"}`,
      "",
      "模型/编辑复核提示：",
      "",
      "```text",
      escapeCodeFence(promptAttribution.calibration.modelAssistedReviewPrompt),
      "```",
      "",
    );

    promptAttribution.items.forEach((item, index) => {
      lines.push(
        `### 单次归因 ${index + 1}. ${item.label}`,
        "",
        `- 版本：${item.previousTitle} -> ${item.currentTitle}`,
        `- 分数变化：${item.scoreDelta >= 0 ? "+" : ""}${item.scoreDelta}`,
        `- 置信度：${formatAttributionConfidence(item.confidence)}`,
        `- 诊断理由：${item.diagnosisReason}`,
        `- 证据：${item.evidence.join("；")}`,
        `- 信号：${item.signalStrengths.map((signal) => `${signal.label}=${signal.value}`).join("；")}`,
        `- 下一步：${item.nextAction}`,
        `- 待补数据：${item.missingData.join("；") || "暂无"}`,
        "",
      );
    });
  }

  lines.push("## 方法论卡", "");
  if (!cards.length) {
    lines.push("暂无方法论卡。", "");
  } else {
    cards.forEach((card, index) => {
      lines.push(
        `### ${index + 1}. ${escapeMarkdown(card.title)}`,
        "",
        `- 类型：${formatMethodologyType(card.type)}`,
        `- 出现次数：${card.occurrenceCount}`,
        `- 来源章节：${card.sourceChapterTitle}`,
        `- 来源问题：${card.sourceIssueTitle || card.triggerProblem || "暂无"}`,
        `- 触发问题：${card.triggerProblem}`,
        `- 复用规则：${card.reusableRule}`,
        `- 自查问题：${card.selfCheckQuestion}`,
        "",
      );
    });
  }

  lines.push("## Prompt 模板合集", "");
  if (!promptCards.length) {
    lines.push("暂无可复用 Prompt 模板。", "");
  } else {
    promptCards.forEach((card, index) => {
      lines.push(
        `### ${index + 1}. ${escapeMarkdown(card.title)}`,
        "",
        "```text",
        escapeCodeFence(card.promptTemplate?.trim() || ""),
        "```",
        "",
      );
    });
  }

  return `${lines.join("\n").trim()}\n`;
}

function buildStoryAuditExportSnapshot({
  storyAudit,
  revisionSessions,
  reviews,
}: {
  storyAudit: StoryAuditResult;
  revisionSessions: RevisionSessionSnapshot[];
  reviews: StoryAuditFindingReviewSnapshot[];
}): StoryAuditExportSnapshot {
  const reviewByFindingId = new Map(
    reviews.map((review) => [review.findingId, review]),
  );
  const revisionIdsByFindingId = new Map<string, string[]>();

  revisionSessions.forEach((session) => {
    (session.storyAuditFindingIds || []).forEach((findingId) => {
      const current = revisionIdsByFindingId.get(findingId) || [];
      current.push(session.id);
      revisionIdsByFindingId.set(findingId, current);
    });
  });

  return {
    schemaVersion: storyAudit.schemaVersion,
    auditId: storyAudit.auditId,
    bookJobId: storyAudit.bookJobId,
    generatedAt: storyAudit.generatedAt,
    coverage: storyAudit.coverage,
    dialogue: storyAudit.metrics.dialogue.map((item) => ({
      scopeId: item.scopeId,
      dialogueCharacterRatio: item.dialogueCharacterRatio,
      dialogueTurnCount: item.dialogueTurnCount,
      parserWarningCount: item.parserWarnings.length,
    })),
    findings: storyAudit.findings.map((finding) => ({
      id: finding.id,
      category: finding.category,
      severity: finding.severity,
      status: finding.status,
      title: finding.title,
      claim: finding.claim,
      confidence: finding.confidence,
      evidence: finding.evidence.map((anchor) => ({
        anchorId: anchor.anchorId,
        chapterId: anchor.chapterId,
        chapterOrder: anchor.chapterOrder,
        quote: anchor.quote,
        source: anchor.source,
      })),
      alternativeExplanations: finding.alternativeExplanations,
      readerImpact: finding.readerImpact,
      fixAction: finding.fixAction,
      humanReviewState: reviewByFindingId.get(finding.id)?.reviewState,
      linkedRevisionSessionIds: revisionIdsByFindingId.get(finding.id) || [],
    })),
    views: {
      sceneCount: storyAudit.scenes.length,
      eventCount: storyAudit.events.length,
      factCount: storyAudit.facts.length,
      characterStateCount: storyAudit.characterStates.length,
      plotlineCount: storyAudit.views.plotlineMatrix.length,
      setupPayoffEdgeCount: storyAudit.views.setupPayoffEdges.length,
      temporalEdgeCount: storyAudit.views.temporalGraph.relationEdges.length,
    },
  };
}

function appendStoryAuditMarkdown(
  lines: string[],
  storyAuditExport: StoryAuditExportSnapshot | null,
) {
  lines.push("## 故事体检 storyAudit", "");

  if (!storyAuditExport) {
    lines.push("暂无 storyAudit 摘要。", "");
    return;
  }

  lines.push(
    `- auditId：${storyAuditExport.auditId}`,
    `- bookJobId：${storyAuditExport.bookJobId}`,
    `- 生成时间：${formatDateTime(storyAuditExport.generatedAt)}`,
    `- 覆盖章节：${storyAuditExport.coverage.analyzedChapterIds.length}/${storyAuditExport.coverage.totalChapterCount}`,
    `- partial：${storyAuditExport.coverage.isPartial ? "是，仅导出已分析范围" : "否"}`,
    `- 场景抽取率：${formatPercent(storyAuditExport.coverage.sceneExtractionRate)}`,
    `- 证据校验率：${formatPercent(storyAuditExport.coverage.evidenceValidationRate)}`,
    `- 结构摘要：场景 ${storyAuditExport.views.sceneCount}，事件 ${storyAuditExport.views.eventCount}，事实 ${storyAuditExport.views.factCount}，人物状态 ${storyAuditExport.views.characterStateCount}`,
    `- 图谱摘要：剧情线 ${storyAuditExport.views.plotlineCount}，伏笔兑现 ${storyAuditExport.views.setupPayoffEdgeCount}，时间关系 ${storyAuditExport.views.temporalEdgeCount}`,
    "",
    "### 文本统计",
    "",
  );

  const dialogue = storyAuditExport.dialogue.slice(0, 6);
  if (!dialogue.length) {
    lines.push("暂无对话统计。", "");
  } else {
    dialogue.forEach((item) => {
      lines.push(
        `- ${item.scopeId}：对话字占比 ${formatPercent(item.dialogueCharacterRatio)}，对话轮次 ${item.dialogueTurnCount}，解析警告 ${item.parserWarningCount}`,
      );
    });
    lines.push("");
  }

  lines.push("### Finding 摘要", "");
  if (!storyAuditExport.findings.length) {
    lines.push("暂无候选 finding。", "");
    return;
  }

  storyAuditExport.findings.slice(0, 10).forEach((finding, index) => {
    lines.push(
      `#### ${index + 1}. ${escapeMarkdown(finding.title)}`,
      "",
      `- 类型：${finding.category}`,
      `- 严重度：${finding.severity}`,
      `- 状态：${finding.status}`,
      `- 置信度：${formatPercent(finding.confidence)}`,
      `- 人工复核：${finding.humanReviewState || "unreviewed"}`,
      `- 关联复诊：${finding.linkedRevisionSessionIds.join("、") || "暂无"}`,
      `- 候选判断：${finding.claim}`,
      `- 替代解释：${finding.alternativeExplanations.join("；") || "暂无"}`,
      `- 读者影响：${finding.readerImpact || "暂无"}`,
      `- 修改动作：${finding.fixAction || "暂无"}`,
      "",
    );

    if (!finding.evidence.length) {
      lines.push("证据：暂无。", "");
      return;
    }

    lines.push("证据：", "");
    finding.evidence.slice(0, 3).forEach((anchor) => {
      lines.push(
        `- ${anchor.chapterId}#${anchor.chapterOrder} ${anchor.source}：${escapeMarkdown(anchor.quote)}`,
      );
    });
    lines.push("");
  });
}

function countRows(values: string[]) {
  const counts = values
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function formatGate(value: string | undefined) {
  const map: Record<string, string> = {
    continue: "继续",
    revise: "修改",
    rebuild: "重构",
    discard: "废稿",
  };
  return map[value || ""] || "修改";
}

function formatInputKind(value: string) {
  const map: Record<string, string> = {
    "human-draft": "作者正文",
    "ai-draft": "AI 生成稿",
    idea: "脑洞",
    outline: "大纲",
    prompt: "Prompt 草稿",
  };
  return map[value] || "作者正文";
}

function formatVersionTransition(
  session: RevisionSessionSnapshot,
  versionsById: Map<string, RevisionTextVersionSnapshot>,
) {
  const toVersion = session.toVersionId
    ? versionsById.get(session.toVersionId)
    : undefined;
  const fromVersion = session.fromVersionId
    ? versionsById.get(session.fromVersionId)
    : undefined;
  const toLabel = toVersion?.versionLabel || session.toVersionId || "未保存";

  if (session.textChanged === false) {
    return `${toLabel}（正文未变化）`;
  }

  if (!fromVersion) {
    return `${toLabel}（首次保存）`;
  }

  return `${fromVersion.versionLabel} -> ${toLabel}`;
}

function formatMethodologyType(type: string) {
  const map: Record<string, string> = {
    opening_rule: "开头规则",
    prompt_rule: "Prompt 规则",
    pacing_rule: "节奏规则",
    hook_rule: "钩子规则",
    payoff_rule: "爽点兑现",
    anti_pattern: "反模式",
  };
  return map[type] || "方法论";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScoreDelta(value: number | null) {
  if (value === null) return "暂无上一版";
  if (value === 0) return "持平";
  return value > 0 ? `+${value}` : `${value}`;
}

function calculateScoreDelta(
  latest:
    | {
        quickScore: number | null;
      }
    | undefined,
  previous:
    | {
        quickScore: number | null;
      }
    | undefined,
) {
  if (
    !isComparableScore(latest?.quickScore) ||
    !isComparableScore(previous?.quickScore)
  ) {
    return null;
  }

  return Number((latest.quickScore - previous.quickScore).toFixed(1));
}

function formatQuickScore(value: number | null | undefined) {
  return isComparableScore(value) ? `${value}/10` : "信息不足，暂不评分";
}

function isComparableScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPromptAttributionRate(value: {
  total: number;
  effective: number;
  rate: number | null;
}) {
  if (!value.total || value.rate === null) {
    return "暂无可归因复诊";
  }
  return `${value.rate}%（${value.effective}/${value.total} 次归因为 Prompt 有效）`;
}

function formatAttributionConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "暂无";
  }
  return `${Math.round(value * 100)}%`;
}

function formatNullableAttributionConfidence(value: number | null) {
  return value === null ? "暂无" : formatAttributionConfidence(value);
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function escapeCodeFence(value: string) {
  return value.replace(/```/g, "'''");
}
