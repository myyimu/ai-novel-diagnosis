import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import type { StoryEvidenceAnchor } from "@ai-novel-diagnosis/ai-core";
import type {
  StoryAuditFindingVerifier,
  StoryAuditVerifierDecision,
  StoryAuditVerifierInput,
} from "./story-audit-verifier";

interface BoundStoryAuditVerifier {
  verify(input: StoryAuditVerifierInput): Promise<StoryAuditVerifierDecision>;
}

const verifierDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    findingId: { type: "string" },
    status: { type: "string", enum: ["verified", "needs_human", "dismissed"] },
    reason: { type: "string" },
    alternativeExplanations: { type: "array", items: { type: "string" } },
    evidenceAnchorIds: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: [
    "findingId",
    "status",
    "reason",
    "alternativeExplanations",
    "evidenceAnchorIds",
    "confidence",
  ],
} as const;

const verifierStatuses = ["verified", "needs_human", "dismissed"] as const;

/**
 * LLM second pass over story-audit finding candidates.
 *
 * The verifier is provider-bound per audit run (`forProvider`), so the same
 * singleton serves every book analysis. Any thrown error (network, JSON,
 * shape mismatch) propagates to `verifyStoryAuditFindings`, which degrades
 * that single finding to "candidate/unavailable" — a flaky verifier never
 * blocks the audit itself.
 */
@Injectable()
export class StoryAuditLlmVerifier {
  constructor(private readonly modelProviders: ModelProviderService) {}

  /** Returns a StoryAuditFindingVerifier bound to the audit's provider. */
  forProvider(provider: ProviderConfigDto): StoryAuditFindingVerifier {
    const bound: BoundStoryAuditVerifier = {
      verify: (input) => this.verifyWithProvider(provider, input),
    };
    return bound;
  }

  private async verifyWithProvider(
    provider: ProviderConfigDto,
    input: StoryAuditVerifierInput,
  ): Promise<StoryAuditVerifierDecision> {
    const messages = this.buildMessages(input);
    const content = await this.modelProviders.chat(provider, messages, {
      maxOutputTokens: 600,
      jsonSchema: {
        name: "story_audit_verifier_decision",
        schema: verifierDecisionJsonSchema,
      },
      usageMeta: {
        jobId: input.auditId,
        stage: "story-audit-verify",
        component: "story-audit",
        requestKind: "verify",
      },
    });

    const parsed = (await parseJsonWithRepair(
      this.modelProviders,
      provider,
      content,
      `审计复核 ${input.finding.id}`,
    )) as unknown;

    return this.toDecision(parsed);
  }

  private buildMessages(input: StoryAuditVerifierInput): ProviderMessage[] {
    return [
      {
        role: "system",
        content:
          "你是中文网文的故事一致性审校。你会拿到一条由规则产出的候选问题、其证据引文和相关事实/事件。" +
          "请独立判断该候选是否成立：只有当证据充分且彼此印证时才标记 verified；证据不足或存在合理替代解释时标记 needs_human；" +
          "候选与正文明显不符时标记 dismissed。只返回合法 JSON，不使用 Markdown。",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            auditId: input.auditId,
            finding: input.finding,
            evidenceAnchors: input.evidence.map(slimAnchor),
            relatedFacts: input.relatedFacts,
            relatedEvents: input.relatedEvents,
            temporalNeighbors: input.temporalNeighbors,
            instructions: {
              findingId: `必须原样返回 "${input.finding.id}"`,
              status: "verified | needs_human | dismissed",
              evidenceAnchorIds:
                "只能引用 evidenceAnchors 中出现过的 anchorId，至少两个才能 verified",
              confidence: "0-1 的小数",
            },
          },
          null,
          0,
        ),
      },
    ];
  }

  private toDecision(parsed: unknown): StoryAuditVerifierDecision {
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
      ? (raw.status as StoryAuditVerifierDecision["status"])
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
      alternativeExplanations: toStringArray(raw.alternativeExplanations),
      evidenceAnchorIds: toStringArray(raw.evidenceAnchorIds),
      confidence: Number.isFinite(confidence)
        ? Math.min(1, Math.max(0, confidence))
        : 0,
    };
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function slimAnchor(anchor: StoryEvidenceAnchor) {
  // Keep the prompt lean: identifiers + quote, drop offsets/counts.
  return {
    anchorId: anchor.anchorId,
    chapterId: anchor.chapterId,
    quote: anchor.quote,
  };
}
