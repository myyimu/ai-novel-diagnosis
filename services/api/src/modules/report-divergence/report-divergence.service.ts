import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
	anchorReportDivergencePoints,
	buildReportDivergencePrompt,
	parseReportDivergenceOutput,
	type ReportDivergenceResult,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
	ModelProviderService,
	type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import { ReportDivergenceDto } from "./dto/report-divergence.dto";
import { reportDivergenceJsonSchema } from "./report-divergence-json-schema";

/**
 * 报告会诊 (report divergence): explicit contradiction detection between the
 * client-supplied quick-review and story-audit report texts for one chapter.
 * Stateless by design — both reports live client-side. Every divergence point
 * must quote both reports verbatim (mechanical substring check); points that
 * miss are dropped and disclosed. Neither report is modified, and the author —
 * not this service — adjudicates.
 *
 * A parse failure throws (retryable) instead of returning an empty list: an
 * empty divergences array means "no direct contradictions found", and a
 * malformed payload must never be passed off as that finding.
 */
@Injectable()
export class ReportDivergenceService {
	private readonly logger = new Logger(ReportDivergenceService.name);

	constructor(private readonly modelProviders: ModelProviderService) {}

	async detect(input: ReportDivergenceDto): Promise<ReportDivergenceResult> {
		const provider = this.resolveProvider(input.provider);
		const divergenceId = randomUUID();

		if (provider.kind === "mock") {
			this.logger.log(
				{ action: "report.divergence", mode: "mock", chapterTitle: input.chapterTitle },
				"report divergence served in demo mode",
			);
			return this.mockResult(input, divergenceId);
		}

		const bundle = buildReportDivergencePrompt({
			chapterTitle: input.chapterTitle,
			quickReviewReport: input.quickReviewReport,
			storyAuditReport: input.storyAuditReport,
		});
		const content = await this.modelProviders.chat(
			provider,
			bundle.messages as ProviderMessage[],
			{
				maxOutputTokens: 1200,
				jsonSchema: {
					name: "report_divergence_result",
					schema: reportDivergenceJsonSchema,
				},
				usageMeta: {
					jobId: divergenceId,
					stage: "report-divergence",
					component: "report-divergence",
					requestKind: "diagnosis",
				},
			},
		);

		const parsed = (await parseJsonWithRepair(
			this.modelProviders,
			provider,
			content,
			"报告会诊",
		)) as unknown;
		const narrowed = parseReportDivergenceOutput(parsed);
		if (!narrowed) {
			throw new BadRequestException(
			"报告会诊输出不符合契约（divergences 缺失或形状非法），检测失败，可重试。",
			);
		}

		const anchored = anchorReportDivergencePoints(
			narrowed.divergences,
			input.quickReviewReport,
			input.storyAuditReport,
		);
		this.logger.log(
			{
				action: "report.divergence",
				mode: "model",
				chapterTitle: input.chapterTitle,
				divergences: anchored.divergences.length,
				dropped: anchored.droppedPointCount,
			},
			"report divergence detection completed",
		);

		return {
			schemaVersion: "report-divergence.v1",
			divergenceId,
			mode: "model",
			chapterTitle: input.chapterTitle,
			divergences: anchored.divergences,
			droppedPointCount: anchored.droppedPointCount,
			agreementNote: narrowed.agreementNote || undefined,
		};
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

	/** Demo-mode placeholder: anchored by construction, never a real finding. */
	private mockResult(input: ReportDivergenceDto, divergenceId: string): ReportDivergenceResult {
		const quickReviewQuote = input.quickReviewReport.slice(0, 24);
		const storyAuditQuote = input.storyAuditReport.slice(0, 24);

		return {
			schemaVersion: "report-divergence.v1",
			divergenceId,
			mode: "mock",
			chapterTitle: input.chapterTitle,
			divergences:
				quickReviewQuote && storyAuditQuote
					? [
							{
								id: "divergence-demo",
								topic: "演示",
								quickReviewQuote,
								storyAuditQuote,
								explanation:
									"演示模式：这条“分歧”只验证引文锚定结构，不代表两份报告真实矛盾。",
								questionForAuthor: "切换真实模型后重新检测，两份报告真的矛盾吗？",
							},
						]
					: [],
			droppedPointCount: 0,
			agreementNote: "演示模式不读取报告内容，无法判断真实分歧。",
		};
	}
}
