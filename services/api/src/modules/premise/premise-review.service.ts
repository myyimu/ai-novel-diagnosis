import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  PREMISE_LAYER_META,
  PREMISE_REVIEW_LAYERS,
  type PremiseClicheFinding,
  type PremiseEvidenceQuote,
  type PremiseLayerAssessment,
  type PremiseLayerKey,
  type PremiseReviewResult,
  type PremiseUpgradeDirection,
  type PremiseUpgradeOrientation,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import { asText, asTextList, clampNumber } from "@/shared/utils/coercion";
import { PremiseReviewDto } from "./dto/premise-review.dto";
import { premiseReviewJsonSchema } from "./premise-json-schemas";
import { PremiseLlmVerifier } from "./premise-llm-verifier";
import { verifyPremiseClicheFindings } from "./premise-verifier";

const premiseVerdicts = ["solid", "fixable", "not-worth-writing"] as const;
const layerStatuses = ["established", "weak", "missing"] as const;
const findingSeverities = ["high", "medium", "low"] as const;
const upgradeOrientations = ["emotion", "intrigue", "war"] as const;

/**
 * 立项审稿 (premise review): the acquisitions-editor gate that runs before any
 * chapter is written. Mock providers return a deterministic demo result;
 * real providers go through a JSON-schema-constrained chat, normalization,
 * then the two-layer cliché verification (quote substring check + LLM pass).
 */
@Injectable()
export class PremiseReviewService {
  private readonly logger = new Logger(PremiseReviewService.name);

  constructor(
    private readonly modelProviders: ModelProviderService,
    private readonly premiseLlmVerifier: PremiseLlmVerifier,
  ) {}

  async review(input: PremiseReviewDto): Promise<PremiseReviewResult> {
    const provider = this.resolveProvider(input.provider);
    const reviewId = randomUUID();

    if (provider.kind === "mock") {
      this.logger.log(
        {
          action: "premise.review",
          mode: "mock",
          premiseLength: input.premiseText.length,
        },
        "premise review served in demo mode",
      );
      return this.mockReview(input);
    }

    const content = await this.modelProviders.chat(
      provider,
      this.buildMessages(input),
      {
        maxOutputTokens: 1800,
        jsonSchema: {
          name: "premise_review_result",
          schema: premiseReviewJsonSchema,
        },
        usageMeta: {
          jobId: reviewId,
          stage: "premise-review",
          component: "premise",
          requestKind: "diagnosis",
        },
      },
    );

    const parsed = (await parseJsonWithRepair(
      this.modelProviders,
      provider,
      content,
      "立项审稿",
    )) as unknown;
    const result = this.normalizeReviewResult(parsed);

    const verification = await verifyPremiseClicheFindings(
      result,
      input.premiseText,
      {
        verifier: this.premiseLlmVerifier.forProvider(provider),
        reviewId,
      },
    );
    this.logger.log(
      {
        action: "premise.review",
        mode: "model",
        verdict: result.engineVerdict,
        clicheFindings: verification.clicheFindings.length,
        verified: verification.verifiedCount,
        rejected: verification.rejectedCount,
      },
      "premise review completed",
    );

    return {
      ...result,
      clicheFindings: verification.clicheFindings,
      verification: {
        attemptedCount: verification.attemptedCount,
        skippedCount: verification.skippedCount,
        rejectedCount: verification.rejectedCount,
        unavailableCount: verification.unavailableCount,
        verifiedCount: verification.verifiedCount,
      },
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

  private buildMessages(input: PremiseReviewDto): ProviderMessage[] {
    const layerSpec = PREMISE_REVIEW_LAYERS.map(
      (key) =>
        `- ${key}（${PREMISE_LAYER_META[key].label}）：${PREMISE_LAYER_META[key].question}`,
    ).join("\n");
    const genreHint = input.genre ? `题材提示：${input.genre}\n\n` : "";

    return [
      {
        role: "system",
        content:
          "你是中文网文的立项审稿编辑，职责是判断这个故事值不值得写，不是夸作者。" +
          "对大多数灵感给出 fixable 或 not-worth-writing 是正常且正确的：只有四层审计全部成立才给 solid。" +
          "禁止空泛表扬和客套话；每条俗套判定必须引用作者原文的连续片段作为证据，引文必须逐字来自作者输入。" +
          "升级方向只允许改核心冲突，不允许新增设定、金手指或人物。只返回合法 JSON，不使用 Markdown。",
      },
      {
        role: "user",
        content: `${genreHint}作者提交的原始灵感：
${input.premiseText}

四层审计（layers 数组必须恰好四项，每项一层）：
${layerSpec}

生成要求：
1. engineVerdict 三态：solid（四层全部成立）/ fixable（发动机在但需修补）/ not-worth-writing（发动机不成立或设定依赖）。
2. coreConflict 用一句话写出欲望与阻力的对撞；irreducibilityTest 写出换掉全部设定后故事是否仍成立及原因。
3. clicheFindings 每条 evidence 的 quote 必须是上面作者原文的连续片段；找不到原文证据的俗套不要写。
4. upgradeDirections 最多三条，orientation 只能是 emotion/intrigue/war，changedConflict 是替换后的核心冲突。
5. oneLineVerdict 用编辑口吻一句话给结论，诚实但可执行。

严格返回 JSON：{"premiseSummary":"...","coreConflict":"...","protagonistDesire":"...","opposingForce":"...","irreducibilityTest":"...","readerHookQuestion":"...","engineVerdict":"solid|fixable|not-worth-writing","oneLineVerdict":"...","layers":[{"layer":"engine|desire|conflict|irreducibility","status":"established|weak|missing","statement":"...","confidence":0.0,"comment":"..."}],"clicheFindings":[{"id":"cliche-1","layer":"...","severity":"high|medium|low","title":"...","claim":"...","evidence":[{"quote":"作者原文连续片段","note":"..."}],"patternReference":"...","suggestion":"..."}],"upgradeDirections":[{"directionId":"direction-1","orientation":"emotion|intrigue|war","pitch":"...","changedConflict":"...","preservedElements":["..."],"risk":"..."}]}`,
      },
    ];
  }

  private mockReview(input: PremiseReviewDto): PremiseReviewResult {
    const quote = input.premiseText.slice(0, 24);

    return {
      schemaVersion: "premise-review.v1",
      premiseSummary:
        "演示模式：这是对作者灵感的占位审稿结构，未连接真实模型，不能代表编辑判断。",
      coreConflict: "演示数据：欲望与阻力的对撞需要真实模型从原文中提取。",
      protagonistDesire: "演示数据：主角想要什么需要真实模型判断。",
      opposingForce: "演示数据：谁来阻止需要真实模型判断。",
      irreducibilityTest:
        "演示数据：换掉设定后故事是否成立，需要真实模型执行替换测试。",
      readerHookQuestion: "演示数据：读者为什么要翻下一页？",
      engineVerdict: "fixable",
      oneLineVerdict:
        "当前是演示结构：切换真实模型后重新审稿，才能得到值得写与否的判断。",
      layers: PREMISE_REVIEW_LAYERS.map((key) => ({
        layer: key,
        status: "weak",
        statement: `演示模式不判断${PREMISE_LAYER_META[key].label}的真实状态。`,
        confidence: 0,
        comment: "mock provider 只验证报告结构，不读取故事信号。",
      })),
      clicheFindings: [
        {
          id: "cliche-1",
          layer: "engine",
          severity: "medium",
          title: "演示模式不会输出真实俗套判定。",
          claim: "当前使用 mock provider，无法判断该灵感是否撞上泛滥模式。",
          evidence: quote
            ? [{ quote, note: "输入开头，仅用于验证引文结构。" }]
            : [],
          patternReference: "演示数据",
          suggestion: "切换共享站或付费模型后重新运行立项审稿。",
          status: "candidate",
        },
      ],
      upgradeDirections: [
        {
          directionId: "direction-emotion",
          orientation: "emotion",
          pitch: "演示数据：情感方向的升级需要真实模型生成。",
          changedConflict: "演示数据：替换后的核心冲突需要真实模型生成。",
        },
      ],
    };
  }

  private normalizeReviewResult(parsed: unknown): PremiseReviewResult {
    if (!parsed || typeof parsed !== "object") {
      throw new BadRequestException("立项审稿输出不是 JSON 对象。");
    }
    const raw = parsed as Record<string, unknown>;

    const engineVerdict = premiseVerdicts.includes(
      raw.engineVerdict as (typeof premiseVerdicts)[number],
    )
      ? (raw.engineVerdict as PremiseReviewResult["engineVerdict"])
      : null;
    if (!engineVerdict) {
      throw new BadRequestException(
        `立项审稿输出 engineVerdict 非法：${String(raw.engineVerdict)}`,
      );
    }

    return {
      schemaVersion: "premise-review.v1",
      premiseSummary: asText(raw.premiseSummary),
      coreConflict: asText(raw.coreConflict),
      protagonistDesire: asText(raw.protagonistDesire),
      opposingForce: asText(raw.opposingForce),
      irreducibilityTest: asText(raw.irreducibilityTest),
      readerHookQuestion: asText(raw.readerHookQuestion),
      engineVerdict,
      oneLineVerdict: asText(raw.oneLineVerdict),
      layers: normalizeLayers(raw.layers),
      clicheFindings: normalizeClicheFindings(raw.clicheFindings),
      upgradeDirections: normalizeUpgradeDirections(raw.upgradeDirections),
    };
  }
}

function normalizeLayers(value: unknown): PremiseLayerAssessment[] {
  const byLayer = new Map<string, PremiseLayerAssessment>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const layer = PREMISE_REVIEW_LAYERS.find(
        (key) => key === asText(record.layer),
      );
      if (!layer) continue;

      const status = layerStatuses.includes(
        record.status as (typeof layerStatuses)[number],
      )
        ? (record.status as PremiseLayerAssessment["status"])
        : "missing";
      const statement = asText(record.statement);
      byLayer.set(layer, {
        layer,
        status: statement ? status : "missing",
        statement,
        confidence: clampNumber(record.confidence, 0, 1, 0),
        comment: asText(record.comment) || undefined,
      });
    }
  }

  // Fill absent layers so the contract always carries exactly four entries.
  return PREMISE_REVIEW_LAYERS.map(
    (key) =>
      byLayer.get(key) ?? {
        layer: key,
        status: "missing",
        statement: "",
        confidence: 0,
      },
  );
}

function normalizeClicheFindings(value: unknown): PremiseClicheFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const findings: PremiseClicheFinding[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const layer = asText(record.layer);
    const title = asText(record.title);
    const claim = asText(record.claim);
    if (!title || !claim) continue;

    const evidence = Array.isArray(record.evidence)
      ? record.evidence
          .map((quote): PremiseEvidenceQuote | null => {
            if (!quote || typeof quote !== "object") return null;
            const quoteRecord = quote as Record<string, unknown>;
            const text = asText(quoteRecord.quote);
            return text
              ? { quote: text, note: asText(quoteRecord.note) || undefined }
              : null;
          })
          .filter((quote): quote is PremiseEvidenceQuote => Boolean(quote))
      : [];
    if (evidence.length === 0) continue;

    findings.push({
      id: asText(record.id) || `cliche-${index + 1}`,
      layer: PREMISE_REVIEW_LAYERS.includes(layer as PremiseLayerKey)
        ? (layer as PremiseClicheFinding["layer"])
        : "engine",
      severity: findingSeverities.includes(
        record.severity as (typeof findingSeverities)[number],
      )
        ? (record.severity as PremiseClicheFinding["severity"])
        : "medium",
      title,
      claim,
      evidence,
      patternReference: asText(record.patternReference) || undefined,
      suggestion: asText(record.suggestion) || undefined,
      // Verification owns the lifecycle; model output always enters as candidate.
      status: "candidate",
    });
  }
  return findings;
}

function normalizeUpgradeDirections(value: unknown): PremiseUpgradeDirection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const directions: PremiseUpgradeDirection[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const orientation = asText(record.orientation);
    const pitch = asText(record.pitch);
    const changedConflict = asText(record.changedConflict);
    if (!pitch || !changedConflict) continue;
    if (
      !upgradeOrientations.includes(orientation as PremiseUpgradeOrientation)
    ) {
      continue;
    }

    directions.push({
      directionId: asText(record.directionId) || `direction-${index + 1}`,
      orientation: orientation as PremiseUpgradeOrientation,
      pitch,
      changedConflict,
      preservedElements: asTextList(record.preservedElements),
      risk: asText(record.risk) || undefined,
    });
  }
  return directions;
}
