import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  PREMISE_LAYER_META,
  PREMISE_REVIEW_LAYERS,
  anchorPremiseSecondReviewEvidence,
  buildPremiseConsultResult,
  buildPremiseSecondReviewPrompt,
  parsePremiseSecondReviewOutput,
  type PremiseConsultResult,
  type PremiseConsultTrigger,
  type PremiseLayerAssessment,
  type PremiseReviewVerdict,
  type PremiseSecondReviewOutput,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import { PremiseConsultDto } from "./dto/premise-consult.dto";
import { premiseSecondReviewJsonSchema } from "./premise-json-schemas";

/**
 * 立项会诊 (premise consultation): a blind second reviewer with the opposite
 * editorial stance re-reviews the premise, then the verdict relation is
 * computed in code and presented side by side — the original verdict is never
 * overwritten and disagreements are never silently resolved.
 */
@Injectable()
export class PremiseConsultService {
  private readonly logger = new Logger(PremiseConsultService.name);

  constructor(private readonly modelProviders: ModelProviderService) {}

  async consult(input: PremiseConsultDto): Promise<PremiseConsultResult> {
    const provider = this.resolveProvider(input.provider);
    const consultId = randomUUID();

    if (provider.kind === "mock") {
      this.logger.log(
        {
          action: "premise.consult",
          mode: "mock",
          trigger: input.trigger,
          premiseLength: input.premiseText.length,
        },
        "premise consult served in demo mode",
      );
      return this.assembleResult(input, consultId, "mock", this.mockSecondReview(input), 0);
    }

    const bundle = buildPremiseSecondReviewPrompt({
      genre: input.genre ?? "",
      premiseText: input.premiseText,
    });
    const content = await this.modelProviders.chat(
      provider,
      bundle.messages as ProviderMessage[],
      {
        maxOutputTokens: 1400,
        jsonSchema: {
          name: "premise_second_review_result",
          schema: premiseSecondReviewJsonSchema,
        },
        usageMeta: {
          jobId: consultId,
          stage: "premise-consult",
          component: "premise",
          requestKind: "diagnosis",
        },
      },
    );

    const parsed = (await parseJsonWithRepair(
      this.modelProviders,
      provider,
      content,
      "立项会诊",
    )) as unknown;
    const second = parsePremiseSecondReviewOutput(parsed);
    if (!second) {
      throw new BadRequestException(
        "第二审稿人输出不符合契约（四层不齐或枚举非法），会诊失败，可重试。",
      );
    }

    const anchored = anchorPremiseSecondReviewEvidence(second.evidence, input.premiseText);
    this.logger.log(
      {
        action: "premise.consult",
        mode: "model",
        trigger: input.trigger,
        verdict: second.verdict,
        droppedEvidence: anchored.droppedEvidenceCount,
      },
      "premise consult completed",
    );

    return this.assembleResult(
      input,
      consultId,
      "model",
      { ...second, evidence: anchored.evidence },
      anchored.droppedEvidenceCount,
    );
  }

  private assembleResult(
    input: PremiseConsultDto,
    consultId: string,
    mode: "mock" | "model",
    second: PremiseSecondReviewOutput,
    droppedEvidenceCount: number,
  ): PremiseConsultResult {
    return buildPremiseConsultResult({
      consultId,
      mode,
      trigger: input.trigger as PremiseConsultTrigger,
      original: {
        verdict: input.original.verdict as PremiseReviewVerdict,
        oneLineVerdict: input.original.oneLineVerdict,
        layers: input.original.layers.map((layer) => ({
          layer: layer.layer as PremiseLayerAssessment["layer"],
          status: layer.status as PremiseLayerAssessment["status"],
          statement: layer.statement,
          confidence: layer.confidence,
          ...(layer.comment ? { comment: layer.comment } : {}),
        })),
      },
      second,
      droppedEvidenceCount,
    });
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

  /** Demo-mode placeholder: anchored by construction, never a real judgment. */
  private mockSecondReview(input: PremiseConsultDto): PremiseSecondReviewOutput {
    const quote = input.premiseText.slice(0, 24);

    return {
      verdict: "fixable",
      oneLineVerdict:
        "当前是演示结构：切换真实模型后重新会诊，才能得到第二审稿人的真实判断。",
      layers: PREMISE_REVIEW_LAYERS.map((key) => ({
        layer: key,
        status: "weak",
        statement: `演示模式不判断${PREMISE_LAYER_META[key].label}的真实状态。`,
        confidence: 0,
        comment: "mock provider 只验证会诊结构，不读取故事信号。",
      })),
      strongestArgument:
        "演示数据：最强成立论证需要真实模型从作者原文中构建，此处不代写、不占位成真判断。",
      evidence: quote ? [{ quote, note: "输入开头，仅用于验证引文锚定结构。" }] : [],
    };
  }
}
