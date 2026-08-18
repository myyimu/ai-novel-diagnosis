import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import type {
  PremiseClicheFindingVerifier,
  PremiseClicheVerifierDecision,
  PremiseClicheVerifierInput,
} from "./premise-verifier";

const verifierDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    findingId: { type: "string" },
    status: { type: "string", enum: ["verified", "needs_human", "dismissed"] },
    reason: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["findingId", "status", "reason", "confidence"],
} as const;

const verifierStatuses = ["verified", "needs_human", "dismissed"] as const;

/**
 * LLM second pass over premise cliché candidates.
 *
 * Provider-bound per review run (`forProvider`), so the same singleton serves
 * every premise review. Any thrown error (network, JSON, shape mismatch)
 * propagates to `verifyPremiseClicheFindings`, which degrades that single
 * finding back to "candidate" — a flaky verifier never blocks the review.
 */
@Injectable()
export class PremiseLlmVerifier {
  constructor(private readonly modelProviders: ModelProviderService) {}

  /** Returns a PremiseClicheFindingVerifier bound to the review's provider. */
  forProvider(provider: ProviderConfigDto): PremiseClicheFindingVerifier {
    return {
      verify: (input) => this.verifyWithProvider(provider, input),
    };
  }

  private async verifyWithProvider(
    provider: ProviderConfigDto,
    input: PremiseClicheVerifierInput,
  ): Promise<PremiseClicheVerifierDecision> {
    const messages = this.buildMessages(input);
    const content = await this.modelProviders.chat(provider, messages, {
      maxOutputTokens: 400,
      jsonSchema: {
        name: "premise_verifier_decision",
        schema: verifierDecisionJsonSchema,
      },
      usageMeta: {
        jobId: input.reviewId,
        stage: "premise-review-verify",
        component: "premise",
        requestKind: "verify",
      },
    });

    const parsed = (await parseJsonWithRepair(
      this.modelProviders,
      provider,
      content,
      `俗套复核 ${input.finding.id}`,
    )) as unknown;

    return this.toDecision(parsed);
  }

  private buildMessages(input: PremiseClicheVerifierInput): ProviderMessage[] {
    return [
      {
        role: "system",
        content:
          "你是中文网文立项审稿的独立复核编辑。你会拿到一条候选俗套判定、作者的原始灵感和已通过原文定位的引文。" +
          "请独立判断该俗套指控是否成立：指控确实与原文相符且该模式确实泛滥时标记 verified；" +
          "指控有道理但证据不足或存在合理解释时标记 needs_human；指控与原文明显不符或属于作者刻意设计时标记 dismissed。" +
          "只返回合法 JSON，不使用 Markdown。",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            reviewId: input.reviewId,
            finding: input.finding,
            premiseText: input.premiseText,
            verifiedQuotes: input.verifiedQuotes,
            instructions: {
              findingId: `必须原样返回 "${input.finding.id}"`,
              status: "verified | needs_human | dismissed",
              confidence: "0-1 的小数，verified 需要不低于 0.85",
            },
          },
          null,
          0,
        ),
      },
    ];
  }

  private toDecision(parsed: unknown): PremiseClicheVerifierDecision {
    if (!parsed || typeof parsed !== "object") {
      throw new BadRequestException("复核模型输出不是 JSON 对象。");
    }

    const raw = parsed as Record<string, unknown>;
    const findingId =
      typeof raw.findingId === "string" ? raw.findingId.trim() : "";
    if (!findingId) {
      throw new BadRequestException("复核输出缺少 findingId。");
    }

    const status = verifierStatuses.includes(
      raw.status as (typeof verifierStatuses)[number],
    )
      ? (raw.status as PremiseClicheVerifierDecision["status"])
      : null;
    if (!status) {
      throw new BadRequestException(
        `复核输出 status 非法：${String(raw.status)}`,
      );
    }

    const confidence = Number(raw.confidence);
    return {
      findingId,
      status,
      reason: typeof raw.reason === "string" ? raw.reason : "",
      confidence: Number.isFinite(confidence)
        ? Math.min(1, Math.max(0, confidence))
        : 0,
    };
  }
}
