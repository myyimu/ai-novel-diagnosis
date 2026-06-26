import type {
	MethodologyCard,
	ProjectMethodologyCard,
	QuickReviewResult,
	RevisionSession,
	WorkspaceProject,
} from "@/stores/workspace-store";
import { hashString } from "@/lib/workspace-cache";
import { buildPromptAttribution } from "@ai-novel-diagnosis/ai-core";

export function createRevisionSession({
	projectId = "default-project",
	chapterTitle,
	chapterText,
	result,
	methodologyCardIds,
	now = new Date().toISOString(),
}: {
	projectId?: string;
	chapterTitle: string;
	chapterText: string;
	result: QuickReviewResult;
	methodologyCardIds: string[];
	now?: string;
}): RevisionSession {
	const text = chapterText.trim();
	const textHash = hashString(text);

	return {
		id: `revision-${hashString([now, textHash, result.quickScore, result.mainProblem].join("|"))}`,
		projectId,
		createdAt: now,
		chapterTitle: chapterTitle.trim() || result.title || "未命名章节",
		genre: result.genre || "other",
		inputKind: result.inputKind || "human-draft",
		textHash,
		textLength: text.length,
		quickScore: typeof result.quickScore === "number" ? result.quickScore : 0,
		gateDecision: result.gateDecision || "revise",
		mainProblem: result.mainProblem || "未返回明确问题",
		issueTitles: Array.isArray(result.issues)
			? result.issues
					.map((issue) => issue.title)
					.filter(Boolean)
					.slice(0, 5)
			: [],
		issueCategories: Array.isArray(result.issues)
			? result.issues
					.map((issue) => issue.category)
					.filter(Boolean)
					.slice(0, 5)
			: [],
		nextPrompt: result.nextPrompt?.prompt,
		methodologyCardIds,
	};
}

export function upsertRevisionSession(
	sessions: RevisionSession[],
	session: RevisionSession,
	limit = 20,
) {
	return [session, ...sessions.filter((item) => item.id !== session.id)].slice(0, limit);
}

export function mergeProjectMethodologyCards({
	projectId = "default-project",
	currentCards,
	resultCards,
	result,
	chapterTitle,
	now = new Date().toISOString(),
}: {
	projectId?: string;
	currentCards: ProjectMethodologyCard[];
	resultCards: MethodologyCard[] | undefined;
	result: QuickReviewResult;
	chapterTitle: string;
	now?: string;
}) {
	const cards = Array.isArray(resultCards) ? resultCards.filter((card) => card?.title) : [];
	const issues = Array.isArray(result.issues) ? result.issues : [];
	const nextCards = [...currentCards];
	const cardIds: string[] = [];

	for (const card of cards) {
		const key = buildMethodologyKey(card);
		const projectCardId = `method-${hashString(`${projectId}|${key}`)}`;
		const existingIndex = nextCards.findIndex(
			(item) =>
				item.projectCardId === projectCardId &&
				(item.projectId || "default-project") === projectId,
		);
		const sourceIssue = issues.find((issue) => issue.id === card.sourceIssueId);

		if (existingIndex >= 0) {
			const existing = nextCards[existingIndex];
			nextCards[existingIndex] = {
				...existing,
				...card,
				projectCardId,
				projectId,
				firstSeenAt: existing.firstSeenAt,
				lastSeenAt: now,
				sourceChapterTitle: existing.sourceChapterTitle || chapterTitle || result.title,
				sourceIssueTitle: existing.sourceIssueTitle || sourceIssue?.title,
				occurrenceCount: existing.occurrenceCount + 1,
				usageCount: (existing.usageCount || 0) + 1,
			};
		} else {
			nextCards.unshift({
				...card,
				projectCardId,
				projectId,
				firstSeenAt: now,
				lastSeenAt: now,
				sourceChapterTitle: chapterTitle.trim() || result.title || "未命名章节",
				sourceIssueTitle: sourceIssue?.title,
				occurrenceCount: 1,
				usageCount: card.usageCount || 1,
			});
		}

		cardIds.push(projectCardId);
	}

	return {
		cards: nextCards.slice(0, 50),
		cardIds,
	};
}

export function summarizeRevisionTrend(sessions: RevisionSession[]) {
	if (!sessions.length) {
		return null;
	}

	const latest = sessions[0];
	const previous = sessions.find((session) => session.id !== latest.id);
	const scoreDelta =
		previous && typeof latest.quickScore === "number" && typeof previous.quickScore === "number"
			? Number((latest.quickScore - previous.quickScore).toFixed(1))
			: null;
	const gateCounts = sessions.reduce<Record<string, number>>((result, session) => {
		const gate = session.gateDecision || "revise";
		result[gate] = (result[gate] || 0) + 1;
		return result;
	}, {});
	const mostCommonGate =
		Object.entries(gateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "revise";

	return {
		latest,
		previous,
		scoreDelta,
		mostCommonGate,
		total: sessions.length,
	};
}

export function buildDiagnosisDashboard({
	sessions,
	methodologyCards,
}: {
	sessions: RevisionSession[];
	methodologyCards: ProjectMethodologyCard[];
}) {
	const orderedSessions = [...sessions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	const latest = orderedSessions[0] ?? null;
	const previous = orderedSessions[1] ?? null;
	const scoreDelta =
		latest && previous ? Number((latest.quickScore - previous.quickScore).toFixed(1)) : null;
	const gateDistribution = buildCountRows(
		orderedSessions.map((session) => session.gateDecision || "revise"),
		formatGateLabel,
	);
	const commonIssues = buildCountRows(
		orderedSessions.flatMap((session) =>
			session.issueTitles.length ? session.issueTitles : [session.mainProblem],
		),
		(value) => value,
	).slice(0, 6);
	const categoryDistribution = buildCountRows(
		orderedSessions.flatMap((session) => session.issueCategories ?? []),
		formatIssueCategory,
	).slice(0, 6);
	const promptEffectiveness = buildPromptEffectiveness(orderedSessions);
	const promptAttribution = buildPromptAttribution(orderedSessions);
	const qualityTrend = [...orderedSessions]
		.reverse()
		.slice(-8)
		.map((session, index) => ({
			id: session.id,
			label: `第 ${index + 1} 次`,
			score: session.quickScore,
			gateDecision: session.gateDecision || "revise",
			mainProblem: session.mainProblem,
		}));
	const reusableMethodologyCards = [...methodologyCards]
		.sort((a, b) => b.occurrenceCount - a.occurrenceCount)
		.slice(0, 6);
	const coach = buildDashboardCoach({
		latest,
		previous,
		scoreDelta,
		commonIssues,
		categoryDistribution,
		promptAttribution,
		reusableMethodologyCards,
	});

	return {
		totalSessions: orderedSessions.length,
		totalMethodologyCards: methodologyCards.length,
		latest,
		previous,
		scoreDelta,
		gateDistribution,
		commonIssues,
		categoryDistribution,
		promptEffectiveness,
		promptAttribution,
		qualityTrend,
		reusableMethodologyCards,
		coach,
	};
}

function buildDashboardCoach({
	latest,
	previous,
	scoreDelta,
	commonIssues,
	categoryDistribution,
	promptAttribution,
	reusableMethodologyCards,
}: {
	latest: RevisionSession | null;
	previous: RevisionSession | null;
	scoreDelta: number | null;
	commonIssues: Array<{ id: string; label: string; count: number; percent: number }>;
	categoryDistribution: Array<{ id: string; label: string; count: number; percent: number }>;
	promptAttribution: ReturnType<typeof buildPromptAttribution>;
	reusableMethodologyCards: ProjectMethodologyCard[];
}) {
	const latestGate = latest?.gateDecision || "revise";
	const topIssue = commonIssues[0]?.label || latest?.mainProblem || "最大流失点待补";
	const topCategory = categoryDistribution[0]?.label || "问题类型待观察";
	const topMethodology = reusableMethodologyCards[0];
	const promptAction = promptAttribution.calibration.nextBestAction;
	const scoreAction =
		scoreDelta === null
			? "先完成第二次复诊，建立同一章节或同一开局的可比较基线。"
			: scoreDelta >= 0.5
				? "分数在改善，下一轮只处理仍然重复出现的最大问题，不要同时大改所有内容。"
				: scoreDelta <= -0.5
					? "质量回落，先回看上一版改动是否牺牲了开局承诺、冲突压力或章末钩子。"
					: "分数基本持平，下一轮 Prompt 要把修改动作写成可检查事件。";
	const methodologyAction = topMethodology
		? `把「${topMethodology.title}」固化为写前自查项；它已经出现 ${topMethodology.occurrenceCount} 次。`
		: "继续复诊 2-3 次，让系统把重复问题沉淀成作者自己的方法论卡。";

	let headline = "先抓最大重复问题，再做下一轮复诊";
	let explanation = `当前最该关注「${topIssue}」，它属于「${topCategory}」方向。`;
	if (latestGate === "discard") {
		headline = "当前稿件接近废稿，先停下局部修补";
		explanation = "不要继续微调句子，先重做核心承诺、主角压力和开局事件。";
	} else if (latestGate === "rebuild") {
		headline = "下一步应重构，不是润色";
		explanation = `先重构「${topIssue}」，再回到复诊确认 Gate 是否能回到修改或继续。`;
	} else if (latestGate === "continue" && scoreDelta !== null && scoreDelta >= 0) {
		headline = "趋势可继续，进入小步迭代";
		explanation = "当前方向有改善迹象，下一轮只补最影响追读的剩余问题。";
	} else if (scoreDelta !== null && scoreDelta < 0) {
		headline = "趋势回落，先复盘上一轮改法";
		explanation = "不要急着生成新 Prompt，先确认上一轮改动是否解决了原问题。";
	}

	return {
		headline,
		explanation,
		nextActions: [`优先处理：${topIssue}`, scoreAction, promptAction, methodologyAction],
		hasComparableRevision: Boolean(previous),
	};
}

export function buildRevisionHistory({
	sessions,
	selectedSessionId,
}: {
	sessions: RevisionSession[];
	selectedSessionId?: string;
}) {
	const orderedSessions = [...sessions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	const selected =
		orderedSessions.find((session) => session.id === selectedSessionId) ??
		orderedSessions[0] ??
		null;
	const selectedIndex = selected
		? orderedSessions.findIndex((session) => session.id === selected.id)
		: -1;
	const previous =
		selectedIndex >= 0 && selectedIndex < orderedSessions.length - 1
			? orderedSessions[selectedIndex + 1]
			: null;
	const next = selectedIndex > 0 ? orderedSessions[selectedIndex - 1] : null;
	const scoreDelta =
		selected && previous
			? Number((selected.quickScore - previous.quickScore).toFixed(1))
			: null;
	const comparison =
		selected && previous ? buildRevisionComparison({ current: selected, previous }) : null;

	return {
		sessions: orderedSessions,
		selected,
		previous,
		next,
		scoreDelta,
		comparison,
	};
}

export function buildRevisionComparison({
	current,
	previous,
}: {
	current: RevisionSession;
	previous: RevisionSession;
}) {
	const scoreDelta = Number((current.quickScore - previous.quickScore).toFixed(1));
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
	promptOutcome: ReturnType<typeof buildSinglePromptOutcome>;
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

function getGateRank(gate: RevisionSession["gateDecision"]) {
	const rank: Record<string, number> = {
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

export function buildProjectExportMarkdown({
	project,
	revisionSessions,
	methodologyCards,
	generatedAt = new Date().toISOString(),
}: {
	project: WorkspaceProject;
	revisionSessions: RevisionSession[];
	methodologyCards: ProjectMethodologyCard[];
	generatedAt?: string;
}) {
	const history = buildRevisionHistory({ sessions: revisionSessions });
	const orderedCards = [...methodologyCards].sort((a, b) => {
		if (b.occurrenceCount !== a.occurrenceCount) {
			return b.occurrenceCount - a.occurrenceCount;
		}
		return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
	});
	const promptCards = orderedCards.filter((card) => card.promptTemplate?.trim());
	const dashboard = buildDiagnosisDashboard({
		sessions: history.sessions,
		methodologyCards: orderedCards,
	});
	const lines = [
		`# AI网文诊断台项目导出：${escapeMarkdown(project.name)}`,
		"",
		`- 导出时间：${formatExportDateTime(generatedAt)}`,
		`- 项目创建：${formatExportDateTime(project.createdAt)}`,
		`- 最近更新：${formatExportDateTime(project.updatedAt)}`,
		`- 复诊次数：${history.sessions.length}`,
		`- 方法论卡：${orderedCards.length}`,
		`- Prompt 模板：${promptCards.length}`,
		"",
		"## 项目概览",
		"",
		`- 最新分数：${dashboard.latest ? `${dashboard.latest.quickScore}/10` : "暂无"}`,
		`- 相对上一版：${formatExportScoreDelta(dashboard.scoreDelta)}`,
		`- 最新 Gate：${dashboard.latest ? formatGateLabel(dashboard.latest.gateDecision) : "暂无"}`,
		`- 高频 Gate：${dashboard.gateDistribution[0]?.label || "暂无"}`,
		`- Prompt 有效率：${formatPromptEffectiveness(dashboard.promptEffectiveness)}`,
		`- Prompt 归因有效率：${formatPromptAttributionRate(dashboard.promptAttribution)}`,
		`- 常见问题：${dashboard.commonIssues.map((issue) => issue.label).join("、") || "暂无"}`,
		"",
		"## 编辑建议",
		"",
		`- 判断：${dashboard.coach.headline}`,
		`- 说明：${dashboard.coach.explanation}`,
		`- 是否已有可比较复诊：${dashboard.coach.hasComparableRevision ? "是" : "否"}`,
		"",
		"下一步动作：",
		"",
		...dashboard.coach.nextActions.map((action, index) => `${index + 1}. ${action}`),
		"",
		"## 复诊轨迹",
		"",
	];

	if (!history.sessions.length) {
		lines.push("暂无复诊记录。", "");
	} else {
		history.sessions.forEach((session, index) => {
			lines.push(
				`### ${history.sessions.length - index}. ${escapeMarkdown(session.chapterTitle)}`,
				"",
				`- 时间：${formatExportDateTime(session.createdAt)}`,
				`- 来源：${formatInputKindLabel(session.inputKind)}`,
				`- 题材：${session.genre}`,
				`- 分数：${session.quickScore}/10`,
				`- Gate：${formatGateLabel(session.gateDecision)}`,
				`- 正文长度：${session.textLength} 字`,
				`- 主要问题：${session.mainProblem}`,
				`- 问题标签：${session.issueTitles.join("、") || "暂无"}`,
				`- 问题类型：${(session.issueCategories ?? []).map(formatIssueCategory).join("、") || "暂无"}`,
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

	if (!dashboard.promptAttribution.items.length) {
		lines.push("暂无可归因复诊。", "");
	} else {
		lines.push(
			"### 项目级归因校准",
			"",
			`- 状态：${dashboard.promptAttribution.calibration.readinessLabel}`,
			`- 样本数：${dashboard.promptAttribution.calibration.sampleSize}`,
			`- 平均置信度：${formatNullableAttributionConfidence(dashboard.promptAttribution.calibration.averageConfidence)}`,
			`- 主导归因：${dashboard.promptAttribution.calibration.dominantCategory?.label || "暂无"}`,
			`- 校准结论：${dashboard.promptAttribution.calibration.headline}`,
			`- 下一步：${dashboard.promptAttribution.calibration.nextBestAction}`,
			`- 待补证据：${dashboard.promptAttribution.calibration.evidenceGaps.join("；") || "暂无"}`,
			"",
			"模型/编辑复核提示：",
			"",
			"```text",
			escapeCodeFence(dashboard.promptAttribution.calibration.modelAssistedReviewPrompt),
			"```",
			"",
		);

		dashboard.promptAttribution.items.forEach((item, index) => {
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

	if (!orderedCards.length) {
		lines.push("暂无方法论卡。", "");
	} else {
		orderedCards.forEach((card, index) => {
			lines.push(
				`### ${index + 1}. ${escapeMarkdown(card.title)}`,
				"",
				`- 类型：${formatMethodologyTypeLabel(card.type)}`,
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

function buildPromptEffectiveness(sessions: RevisionSession[]) {
	let comparable = 0;
	let improved = 0;
	let worsened = 0;
	let unchanged = 0;

	for (let index = 0; index < sessions.length - 1; index += 1) {
		const current = sessions[index];
		const previous = sessions[index + 1];
		if (!previous.nextPrompt) {
			continue;
		}

		comparable += 1;
		const delta = Number((current.quickScore - previous.quickScore).toFixed(1));
		if (delta >= 0.5) {
			improved += 1;
		} else if (delta <= -0.5) {
			worsened += 1;
		} else {
			unchanged += 1;
		}
	}

	return {
		comparable,
		improved,
		worsened,
		unchanged,
		rate: comparable > 0 ? Math.round((improved / comparable) * 100) : null,
	};
}

function buildCountRows(values: string[], labeler: (value: string) => string) {
	const counts = values.filter(Boolean).reduce<Record<string, number>>((result, value) => {
		result[value] = (result[value] || 0) + 1;
		return result;
	}, {});
	const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.map(([id, count]) => ({
			id,
			label: labeler(id),
			count,
			percent: total > 0 ? Math.round((count / total) * 100) : 0,
		}));
}

function formatGateLabel(gate: string | undefined) {
	const map: Record<string, string> = {
		continue: "继续",
		revise: "修改",
		rebuild: "重构",
		discard: "废稿",
	};

	return map[gate || ""] || "修改";
}

function formatIssueCategory(category: string) {
	const map: Record<string, string> = {
		opening: "开头",
		hook: "钩子",
		character_goal: "主角目标",
		conflict_pressure: "冲突压力",
		payoff: "爽点兑现",
		pacing: "节奏",
		setting_load: "设定负担",
		prose_ai_flavor: "AI 腔",
		prompt_constraint: "Prompt 约束",
		market_promise: "市场承诺",
		other: "其他",
	};

	return map[category] || "其他";
}

function formatInputKindLabel(value: string) {
	const map: Record<string, string> = {
		"human-draft": "作者正文",
		"ai-draft": "AI 生成稿",
		idea: "脑洞",
		outline: "大纲",
		prompt: "Prompt 草稿",
	};

	return map[value] || "作者正文";
}

function formatMethodologyTypeLabel(type: string) {
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

function formatExportDateTime(value: string) {
	const time = new Date(value);
	if (Number.isNaN(time.getTime())) {
		return "时间未知";
	}

	return time.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatExportScoreDelta(value: number | null) {
	if (value === null) return "暂无上一版";
	if (value === 0) return "持平";
	return value > 0 ? `+${value}` : `${value}`;
}

function formatPromptEffectiveness(value: {
	comparable: number;
	improved: number;
	worsened: number;
	unchanged: number;
	rate: number | null;
}) {
	if (!value.comparable || value.rate === null) {
		return "暂无可比较复诊";
	}

	return `${value.rate}%（改善 ${value.improved}，持平 ${value.unchanged}，变差 ${value.worsened}）`;
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

function formatNullableAttributionConfidence(value: number | null) {
	return value === null ? "暂无" : formatAttributionConfidence(value);
}

function escapeMarkdown(value: string) {
	return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function escapeCodeFence(value: string) {
	return value.replace(/```/g, "'''");
}

function buildMethodologyKey(card: MethodologyCard) {
	return [card.type || "method", normalizeText(card.title)].join("|");
}

function normalizeText(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}
