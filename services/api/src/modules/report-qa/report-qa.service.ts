import { Injectable, Logger } from "@nestjs/common";
import {
	REPORT_QA_REPORT_KIND_LABELS,
	REPORT_QA_SOURCE_KIND_LABELS,
	type ReportQaCitation,
	type ReportQaResult,
	type ReportQaSourceKind,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
	ModelProviderService,
	type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import { asText, asTextList } from "@/shared/utils/coercion";
import { ReportQaDto } from "./dto/report-qa.dto";
import { reportQaJsonSchema } from "./report-qa-json-schema";

/**
 * 报告问答 (report QA): anchored Q&A over a diagnosis report the client
 * supplies. Stateless by design — quick-review results live in client cache
 * and premise results are deliberately not persisted, so the report content
 * travels with the request and nothing here is stored. The model's citations
 * are verified server-side: every quote must be a contiguous substring of the
 * report or the source text (the premise-review substring rule applied to
 * QA), unverifiable quotes are dropped and disclosed in `gaps`.
 */
@Injectable()
export class ReportQaService {
	private readonly logger = new Logger(ReportQaService.name);

	constructor(private readonly modelProviders: ModelProviderService) {}

	async answer(input: ReportQaDto): Promise<ReportQaResult> {
		const provider = this.resolveProvider(input.provider);

		if (provider.kind === "mock") {
			this.logger.log(
				{ action: "report.qa", mode: "mock", reportKind: input.reportKind },
				"report QA served in demo mode",
			);
			return this.mockAnswer(input);
		}

		const content = await this.modelProviders.chat(
			provider,
			this.buildMessages(input),
			{
				maxOutputTokens: 1200,
				jsonSchema: {
					name: "report_qa_result",
					schema: reportQaJsonSchema,
				},
				usageMeta: {
					stage: "report-qa",
					component: "report-qa",
					requestKind: "qa",
				},
			},
		);

		try {
			const parsed = (await parseJsonWithRepair(
				this.modelProviders,
				provider,
				content,
				"报告问答",
			)) as unknown;
			return this.normalizeAnswer(input, parsed);
		} catch (error) {
			// Honest disclosure instead of a 400: the author asked a question,
			// a malformed model payload must not turn that into a dead end.
			this.logger.warn(
				{
					action: "report.qa.parse_failed",
					reportKind: input.reportKind,
					message: error instanceof Error ? error.message : "unknown",
				},
				"report QA model output unparsable, returning disclosure fallback",
			);
			return {
				mode: "model",
				reportKind: input.reportKind,
				question: input.question,
				answer:
					"模型已返回内容，但结构化输出解析失败，未能读取到可靠回答；请稍后重试这个问题。",
				citations: [],
				gaps: ["本次模型回答格式异常，未采用任何模型结论。"],
			};
		}
	}

	private resolveProvider(provider?: ProviderConfigDto): ProviderConfigDto {
		if (provider?.kind) {
			return provider;
		}

		return {
			preset: "shared-gpu",
			kind: "openai-compatible",
		};
	}

	private buildMessages(input: ReportQaDto): ProviderMessage[] {
		const sourceBlock = input.sourceText
			? `作品原文：
${input.sourceText}`
			: "作品原文：（本次未提供，引用只能来自报告内文。）";

		return [
			{
				role: "system",
				content:
					"你是网文诊断报告的答疑编辑，职责是把报告的判定解释给作者听，不是重新评审作品。" +
					"只能基于提供的报告内文与作品原文回答；材料不足以回答时必须明确说明缺什么，不要编造。" +
					"每条引用必须逐字来自材料的连续片段。只返回合法 JSON，不使用 Markdown。",
			},
			{
				role: "user",
				content: `作者的问题：${input.question}
报告种类：${REPORT_QA_REPORT_KIND_LABELS[input.reportKind]}

报告内文：
${input.report}

${sourceBlock}

要求：
1. 只解释报告已有内容，不新增判定；与原文对照时引用作品原文。
2. citations[].quote 必须逐字复制上面材料的连续片段；source 写 "report"（报告内文）或 "source-text"（作品原文）。
3. 材料回答不了的部分写进 gaps，明确缺什么。

严格返回 JSON：{"answer":"...","citations":[{"quote":"...","source":"report|source-text","locator":"出处，如某判定标题或章节","note":"为什么引用这段"}],"gaps":["材料不足点"]}`,
			},
		];
	}

	private normalizeAnswer(input: ReportQaDto, parsed: unknown): ReportQaResult {
		const raw =
			parsed && typeof parsed === "object"
				? (parsed as Record<string, unknown>)
				: {};
		const modelCitations: ReportQaCitation[] = [];
		if (Array.isArray(raw.citations)) {
			for (const item of raw.citations.slice(0, 6)) {
				if (!item || typeof item !== "object") continue;
				const record = item as Record<string, unknown>;
				const quote = asText(record.quote);
				if (!quote) continue;
				modelCitations.push({
					quote,
					// Unrecognized sources coerce to "report" and must survive its
					// substring check — same defensive posture as premise layers.
					source:
						asText(record.source) === "source-text"
							? "source-text"
							: "report",
					locator: asText(record.locator) || undefined,
					note: asText(record.note) || undefined,
				});
			}
		}

		const anchored = this.anchorCitations(modelCitations, input);
		return {
			mode: "model",
			reportKind: input.reportKind,
			question: input.question,
			answer:
				asText(raw.answer) ||
				"模型没有给出可用回答；请换个问法或稍后重试。",
			citations: anchored.citations,
			gaps: [...asTextList(raw.gaps).slice(0, 5), ...anchored.gaps].slice(0, 8),
		};
	}

	/**
	 * Mechanical anchor: a citation survives only if its quote is a contiguous
	 * substring of the corpus it claims. "source-text" citations are dropped
	 * when no source text was supplied — there is nothing to anchor to.
	 */
	private anchorCitations(
		citations: ReportQaCitation[],
		input: ReportQaDto,
	): { citations: ReportQaCitation[]; gaps: string[] } {
		const kept: ReportQaCitation[] = [];
		const gaps: string[] = [];
		for (const citation of citations) {
			const corpus =
				citation.source === "source-text" ? input.sourceText : input.report;
			if (corpus && corpus.includes(citation.quote)) {
				kept.push(citation);
				continue;
			}
			gaps.push(
				`一条来自${REPORT_QA_SOURCE_KIND_LABELS[citation.source as ReportQaSourceKind]}的引用无法定位，已被移除。`,
			);
		}
		return { citations: kept, gaps };
	}

	private mockAnswer(input: ReportQaDto): ReportQaResult {
		const quote = input.report.slice(0, 24);

		return {
			mode: "mock",
			reportKind: input.reportKind,
			question: input.question,
			answer:
				"演示模式：当前使用 mock provider，只验证问答结构，不能基于报告给出真实解释；切换真实模型后再提问。",
			citations: quote
				? [
						{
							quote,
							source: "report",
							note: "报告开头片段，仅用于验证引用结构。",
						},
					]
				: [],
			gaps: ["演示模式不读取报告内容。"],
		};
	}
}
