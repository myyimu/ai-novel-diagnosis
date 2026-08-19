import {
	PREMISE_LAYER_META,
	PREMISE_REVIEW_LAYERS,
	PREMISE_UPGRADE_ORIENTATION_LABELS,
	PREMISE_VERDICT_LABELS,
	type PremiseReviewResult,
	type QuickReviewResult,
	type StoryAuditResult,
} from "@ai-novel-diagnosis/ai-core";

/**
 * 报告问答的文本上下文构建器：把三种诊断报告压成一份纯文本，
 * 作为无状态问答端点的 `report` 输入。引用锚定发生在服务端，
 * 这里的唯一职责是如实、有界地转述报告内容。
 */

/** 服务端 DTO 上限是 20000 字，留出截断标记的余量。 */
export const QA_REPORT_MAX_LENGTH = 19000;

const premiseLayerStatusLabels: Record<string, string> = {
	established: "成立",
	weak: "待修补",
	missing: "缺失",
};

const premiseFindingStatusLabels: Record<string, string> = {
	verified: "已复核",
	candidate: "待复核",
	needs_human: "需人工判断",
	dismissed: "已驳回",
};

const issueSeverityLabels: Record<string, string> = {
	critical: "致命",
	high: "高",
	medium: "中",
	low: "低",
};

const auditFindingStatusLabels: Record<string, string> = {
	verified: "已复核",
	candidate: "待复核",
	needs_human: "需人工判断",
	dismissed: "已驳回",
};

function capReportText(text: string, maxLength = QA_REPORT_MAX_LENGTH): string {
	const normalized = text.trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	const marker = "\n\n……报告过长，已截断；完整内容以页面展示为准。……";
	return `${normalized.slice(0, maxLength - marker.length)}${marker}`;
}

/** 立项审稿报告 → 问答上下文文本。 */
export function buildPremiseReviewQaReport(result: PremiseReviewResult): string {
	const lines: string[] = [
		"【立项审稿报告】",
		`审稿结论：${PREMISE_VERDICT_LABELS[result.engineVerdict]}`,
		`一句话判定：${result.oneLineVerdict}`,
		`故事概述：${result.premiseSummary}`,
		`核心冲突：${result.coreConflict}`,
		`主角欲望：${result.protagonistDesire}`,
		`对立阻力：${result.opposingForce}`,
		`不可替代性测试：${result.irreducibilityTest}`,
		`读者钩子问题：${result.readerHookQuestion}`,
		"",
		"四层审计：",
	];

	for (const key of PREMISE_REVIEW_LAYERS) {
		const layer = result.layers.find((item) => item.layer === key);
		if (!layer) {
			continue;
		}
		const status = premiseLayerStatusLabels[layer.status] ?? layer.status;
		lines.push(
			`- ${PREMISE_LAYER_META[key].label}（${status}）：${layer.statement}${
				layer.comment ? `；${layer.comment}` : ""
			}`,
		);
	}

	if (result.clicheFindings.length) {
		lines.push("", "俗套判定：");
		result.clicheFindings.slice(0, 6).forEach((finding, index) => {
			const severity = issueSeverityLabels[finding.severity] ?? finding.severity;
			const status = premiseFindingStatusLabels[finding.status] ?? finding.status;
			lines.push(
				`${index + 1}. ${finding.title}（严重度${severity}，${status}）`,
				`   判定：${finding.claim}`,
			);
			if (finding.evidence.length) {
				lines.push(`   证据：${finding.evidence.map((quote) => quote.quote).join("……")}`);
			}
			if (finding.suggestion) {
				lines.push(`   破套动作：${finding.suggestion}`);
			}
		});
	}

	if (result.upgradeDirections.length) {
		lines.push("", "升级方向：");
		result.upgradeDirections.slice(0, 3).forEach((direction, index) => {
			lines.push(
				`${index + 1}. ${direction.pitch}（${
					PREMISE_UPGRADE_ORIENTATION_LABELS[direction.orientation]
				}）`,
				`   替换后的核心冲突：${direction.changedConflict}`,
			);
		});
	}

	return capReportText(lines.join("\n"));
}

/** 章节初诊报告 → 问答上下文文本。 */
export function buildQuickReviewQaReport(result: QuickReviewResult): string {
	const lines: string[] = [
		"【章节初诊报告】",
		`章节：${result.title}`,
		`题材：${result.genre}`,
		`定位：${result.positioning}`,
	];

	if (result.oneLineDiagnosis) {
		lines.push(`一句话诊断：${result.oneLineDiagnosis}`);
	}
	lines.push(
		`急诊分：${typeof result.quickScore === "number" ? `${result.quickScore}/10` : "待确认"}`,
		`主要问题：${result.mainProblem}`,
	);

	if (result.gateReason) {
		lines.push(`门禁判断：${result.gateReason}`);
	}
	if (result.sellingPoints.length) {
		lines.push("", "卖点：", ...result.sellingPoints.slice(0, 4).map((point) => `- ${point}`));
	}
	if (result.actionableFixes.length) {
		lines.push(
			"",
			"修改动作：",
			...result.actionableFixes.slice(0, 4).map((fix, index) => `${index + 1}. ${fix}`),
		);
	}

	const issues = (result.issues ?? []).filter((issue) => issue && issue.title);
	if (issues.length) {
		lines.push("", "问题分析：");
		issues.slice(0, 6).forEach((issue, index) => {
			const severity = issueSeverityLabels[issue.severity] ?? issue.severity;
			lines.push(
				`${index + 1}. ${issue.title}（严重度${severity}）`,
				`   描述：${issue.description}`,
			);
			if (issue.readerImpact) {
				lines.push(`   读者影响：${issue.readerImpact}`);
			}
			if (issue.fixAction) {
				lines.push(`   修改动作：${issue.fixAction}`);
			}
			if (issue.evidence?.length) {
				lines.push(
					`   证据：${issue.evidence
						.slice(0, 2)
						.map((anchor) => anchor.quote)
						.join("……")}`,
				);
			}
		});
	}

	if (result.nextPrompt?.prompt) {
		lines.push("", `下一轮 Prompt：${result.nextPrompt.prompt}`);
	}
	if (result.readyReason) {
		lines.push("", `就绪说明：${result.readyReason}`);
	}

	return capReportText(lines.join("\n"));
}

/** 故事体检报告摘要 → 问答上下文文本。 */
export function buildStoryAuditQaReport(audit: StoryAuditResult): string {
	const lines: string[] = [
		"【故事体检报告】",
		`体检编号：${audit.auditId}`,
		`覆盖章节：${audit.coverage.analyzedChapterIds.length}/${audit.coverage.totalChapterCount}${
			audit.coverage.isPartial ? "（部分覆盖）" : ""
		}`,
		`结构摘要：场景 ${audit.scenes.length}，事件 ${audit.events.length}，事实 ${audit.facts.length}，人物状态 ${audit.characterStates.length}`,
		`证据校验率：${Math.round(audit.coverage.evidenceValidationRate * 100)}%`,
	];

	const findings = audit.findings;
	if (!findings.length) {
		lines.push("", "候选问题：暂无。");
		return capReportText(lines.join("\n"));
	}

	lines.push(
		"",
		`候选问题（共 ${findings.length} 条，列出前 ${Math.min(12, findings.length)} 条）：`,
	);
	findings.slice(0, 12).forEach((finding, index) => {
		const severity = issueSeverityLabels[finding.severity] ?? finding.severity;
		const status = auditFindingStatusLabels[finding.status] ?? finding.status;
		lines.push(
			`${index + 1}. ${finding.title}（类别 ${finding.category}，严重度${severity}，${status}，置信度 ${Math.round(
				finding.confidence * 100,
			)}%）`,
			`   判断：${finding.claim}`,
		);
		if (finding.alternativeExplanations.length) {
			lines.push(`   替代解释：${finding.alternativeExplanations.join("；")}`);
		}
		if (finding.readerImpact) {
			lines.push(`   读者影响：${finding.readerImpact}`);
		}
		if (finding.fixAction) {
			lines.push(`   修改动作：${finding.fixAction}`);
		}
		if (finding.evidence.length) {
			lines.push(
				...finding.evidence
					.slice(0, 2)
					.map(
						(anchor) =>
							`   证据：${anchor.chapterId} 第 ${anchor.chapterOrder} 章：${anchor.quote}`,
					),
			);
		}
	});

	return capReportText(lines.join("\n"));
}
