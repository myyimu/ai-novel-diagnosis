import { BadRequestException } from "@nestjs/common";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import type { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { StoryAuditLlmVerifier } from "./story-audit-llm-verifier";
import type { StoryAuditVerifierInput } from "./story-audit-verifier";

const provider: ProviderConfigDto = {
  preset: "custom",
  kind: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-test",
  model: "gpt-test",
  temperature: 0.2,
  jsonMode: false,
};

function buildInput(): StoryAuditVerifierInput {
  return {
    auditId: "job-1:story-audit.v1",
    finding: {
      id: "finding-1",
      category: "causal_gap",
      severity: "medium",
      claim: "主角在第二章突然原谅了仇人，缺少动机铺垫。",
      relatedFactIds: ["fact-1"],
      relatedEventIds: ["event-1"],
      ruleIds: ["motivation-gap"],
      alternativeExplanations: [],
    },
    evidence: [
      {
        anchorId: "anchor-1",
        chapterId: "chapter-2",
        chapterOrder: 2,
        quote: "他忽然笑了，说一切都过去了。",
        startOffset: 0,
        endOffset: 12,
        source: "text",
      },
      {
        anchorId: "anchor-2",
        chapterId: "chapter-1",
        chapterOrder: 1,
        quote: "他在坟前发誓绝不饶恕。",
        startOffset: 0,
        endOffset: 10,
        source: "text",
      },
    ],
    relatedFacts: [],
    relatedEvents: [],
    temporalNeighbors: [],
  };
}

function buildHarness(chatImpl: jest.Mock) {
  const modelProviders = { chat: chatImpl } as unknown as ModelProviderService;
  const verifier = new StoryAuditLlmVerifier(modelProviders);
  return { verifier, chatImpl };
}

describe("StoryAuditLlmVerifier", () => {
  it("should map a well-formed model decision onto the verifier contract", async () => {
    const chatImpl = jest.fn().mockResolvedValue(
      JSON.stringify({
        findingId: "finding-1",
        status: "verified",
        reason: "两条证据互相印证，动机变化成立。",
        alternativeExplanations: [],
        evidenceAnchorIds: ["anchor-1", "anchor-2"],
        confidence: 1.4,
      }),
    );
    const { verifier } = buildHarness(chatImpl);

    const decision = await verifier.forProvider(provider).verify(buildInput());

    expect(decision).toEqual({
      findingId: "finding-1",
      status: "verified",
      reason: "两条证据互相印证，动机变化成立。",
      alternativeExplanations: [],
      evidenceAnchorIds: ["anchor-1", "anchor-2"],
      confidence: 1,
    });
    expect(chatImpl).toHaveBeenCalledWith(
      provider,
      expect.any(Array),
      expect.objectContaining({
        jsonSchema: expect.objectContaining({
          name: "story_audit_verifier_decision",
        }),
        usageMeta: {
          jobId: "job-1:story-audit.v1",
          stage: "story-audit-verify",
          component: "story-audit",
          requestKind: "verify",
        },
      }),
    );
  });

  it("should repair malformed JSON once and use the repaired decision", async () => {
    const repairedDecision = {
      findingId: "finding-1",
      status: "needs_human",
      reason: "证据不足。",
      alternativeExplanations: ["可能有未分析章节。"],
      evidenceAnchorIds: ["anchor-1"],
      confidence: 0.5,
    };
    const chatImpl = jest
      .fn()
      .mockResolvedValueOnce("{not valid json")
      .mockResolvedValueOnce(JSON.stringify(repairedDecision));
    const { verifier } = buildHarness(chatImpl);

    const decision = await verifier.forProvider(provider).verify(buildInput());

    expect(decision.status).toBe("needs_human");
    expect(decision.alternativeExplanations).toEqual(["可能有未分析章节。"]);
    expect(chatImpl).toHaveBeenCalledTimes(2);
  });

  it("should throw when the model output stays unparseable after repair", async () => {
    const chatImpl = jest
      .fn()
      .mockResolvedValueOnce("{still broken")
      .mockResolvedValueOnce("also not json");
    const { verifier } = buildHarness(chatImpl);

    await expect(
      verifier.forProvider(provider).verify(buildInput()),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw on structurally invalid decisions (bad status)", async () => {
    const chatImpl = jest.fn().mockResolvedValue(
      JSON.stringify({
        findingId: "finding-1",
        status: "maybe",
        reason: "",
        alternativeExplanations: [],
        evidenceAnchorIds: [],
        confidence: 0.2,
      }),
    );
    const { verifier } = buildHarness(chatImpl);

    await expect(
      verifier.forProvider(provider).verify(buildInput()),
    ).rejects.toThrow("复核输出 status 非法");
  });

  it("should throw on decisions without a findingId", async () => {
    const chatImpl = jest.fn().mockResolvedValue(
      JSON.stringify({
        status: "dismissed",
        reason: "",
        alternativeExplanations: [],
        evidenceAnchorIds: [],
        confidence: 0.1,
      }),
    );
    const { verifier } = buildHarness(chatImpl);

    await expect(
      verifier.forProvider(provider).verify(buildInput()),
    ).rejects.toThrow("复核输出缺少 findingId");
  });

  it("should propagate provider timeouts so the engine can degrade the finding", async () => {
    const chatImpl = jest.fn().mockRejectedValue(new Error("fetch timeout"));
    const { verifier } = buildHarness(chatImpl);

    await expect(
      verifier.forProvider(provider).verify(buildInput()),
    ).rejects.toThrow("fetch timeout");
  });
});
