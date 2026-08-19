import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  PREMISE_LAYER_META,
  PREMISE_REVIEW_LAYERS,
  anchorPremiseAskOutput,
  anchorPremiseContractReviewOutput,
  anchorPremiseJudgeOutput,
  buildPremiseDialogueAskPrompt,
  buildPremiseDialogueContractReviewPrompt,
  buildPremiseDialogueJudgePrompt,
  parsePremiseDialogueAskOutput,
  parsePremiseDialogueContractReviewOutput,
  parsePremiseDialogueJudgeOutput,
  premiseContractLineForLayer,
  selectPremiseDialogueLayerForSession,
  type PremiseAuthorContract,
  type PremiseContractFields,
  type PremiseDialogueAskOutput,
  type PremiseDialogueContractReviewOutput,
  type PremiseDialogueJudgeOutput,
  type PremiseDialogueTurnRecord,
  type PremiseLayerAssessment,
  type PremiseLayerKey,
} from "@ai-novel-diagnosis/ai-core";
import { PremiseDialogueRepository } from "@/dao/repositories/premise-dialogue.repository";
import type { PremiseDialogueSessionRecord } from "@/dao/repositories/premise-dialogue.repository";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { parseJsonWithRepair } from "@/modules/ai-provider/json-repair";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import { asText, clampNumber } from "@/shared/utils/coercion";
import {
  premiseDialogueAskJsonSchema,
  premiseDialogueContractReviewJsonSchema,
  premiseDialogueJudgeJsonSchema,
} from "./premise-dialogue-json-schemas";
import {
  AnswerPremiseDialogueDto,
  StartPremiseDialogueDto,
  SubmitPremiseDialogueContractDto,
} from "./dto/premise-dialogue.dto";

const layerStatuses = new Set(["established", "weak", "missing"]);
const contractFieldNames = [
  "coreConflict",
  "protagonistDesire",
  "opposingForce",
  "irreducibilityTest",
  "readerHookQuestion",
] as const;

/** Response of the contract submission: the record plus an honest notice when the optional review failed. */
export interface SubmitContractResult {
  record: PremiseDialogueSessionRecord;
  contractReviewNotice?: string;
}

/**
 * 立项引导对话 (premise dialogue): the teacher-posture guided conversation
 * over one premise review. Turn orchestration and the hard round cap live in
 * ai-core pure code; this service owns persistence, the three model calls
 * (ASK / JUDGE / CONTRACT-REVIEW) and the server-side anchoring rules —
 * unanchored judgments are recorded as rejected, never silently downgraded.
 */
@Injectable()
export class PremiseDialogueService {
  private readonly logger = new Logger(PremiseDialogueService.name);

  constructor(
    private readonly repository: PremiseDialogueRepository,
    private readonly modelProviders: ModelProviderService,
  ) {}

  async startSession(
    input: StartPremiseDialogueDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const { layers, editorContract, reviewId } = this.normalizeReview(input.review);
    const record = await this.repository.createSession({
      id: randomUUID(),
      layers,
      editorContract,
      session: {
        schemaVersion: "premise-dialogue.v1",
        projectId: input.projectId,
        reviewId,
        genre: input.genre,
        premiseText: input.premiseText,
        turns: [],
        status: "active",
      },
    });
    return this.advance(record, input.provider);
  }

  async getSession(id: string): Promise<PremiseDialogueSessionRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundException(`立项引导对话会话 ${id} 不存在`);
    }
    return record;
  }

  async answerTurn(
    sessionId: string,
    input: AnswerPremiseDialogueDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const record = await this.requireActive(sessionId);
    const turn = record.session.turns[record.session.turns.length - 1];
    if (!turn || turn.authorAnswer !== undefined) {
      throw new BadRequestException("当前没有待回答的问题");
    }
    const turns = [...record.session.turns];
    turns[turns.length - 1] = { ...turn, authorAnswer: input.answer };
    const answered = this.mustRecord(
      await this.repository.update(record.id, { turns }),
      record.id,
    );
    return this.runJudge(answered, input.provider);
  }

  /** Re-run the judgment after a "model-failed" rejection (quote rejections are final). */
  async retryJudge(
    sessionId: string,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const record = await this.requireActive(sessionId);
    const turn = record.session.turns[record.session.turns.length - 1];
    const retryable =
      turn?.authorAnswer !== undefined &&
      !turn.judge &&
      turn.judgeRejected?.reason === "model-failed";
    if (!retryable) {
      throw new BadRequestException("当前轮次不需要重新评判");
    }
    return this.runJudge(record, provider);
  }

  /** Generate the next ask (or transition to collection) after the current turn resolved. */
  async next(
    sessionId: string,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const record = await this.requireActive(sessionId);
    const last = record.session.turns[record.session.turns.length - 1];
    const resolved =
      !last ||
      (last.authorAnswer !== undefined && (last.judge || last.judgeRejected));
    if (!resolved) {
      throw new BadRequestException("当前问题还没有作答，不能进入下一轮");
    }
    return this.advance(record, provider);
  }

  /** Author-initiated early collection: end the dialogue before the round cap. */
  async finish(sessionId: string): Promise<PremiseDialogueSessionRecord> {
    const record = await this.requireActive(sessionId);
    return this.mustRecord(
      await this.repository.update(record.id, { status: "collecting" }),
      record.id,
    );
  }

  /**
   * Accept the author's hand-written contract and optionally run the
   * CONTRACT-REVIEW Feynman pass. Allowed while collecting; a completed
   * session may re-submit (idempotent retry when the optional review failed).
   */
  async submitContract(
    sessionId: string,
    input: SubmitPremiseDialogueContractDto,
  ): Promise<SubmitContractResult> {
    const record = await this.getSession(sessionId);
    if (record.session.status === "active") {
      throw new BadRequestException("对话尚未收束，不能提交契约");
    }

    const authorContract: PremiseAuthorContract = {
      premiseSummary: input.premiseSummary,
      coreConflict: input.coreConflict,
      protagonistDesire: input.protagonistDesire,
      opposingForce: input.opposingForce,
      irreducibilityTest: input.irreducibilityTest,
      readerHookQuestion: input.readerHookQuestion,
    };
    let updated = this.mustRecord(
      await this.repository.update(record.id, {
        authorContract,
        status: "completed",
      }),
      record.id,
    );
    if (!input.requestReview) {
      return { record: updated };
    }

    try {
      const review = await this.callContractReview(record, authorContract, input.provider);
      const anchored = anchorPremiseContractReviewOutput(review, authorContract);
      if (anchored.status === "rejected") {
        updated = this.mustRecord(
          await this.repository.update(record.id, { contractReview: null }),
          record.id,
        );
        return {
          record: updated,
          contractReviewNotice: "评判未能锚定原话，已被服务端拒绝",
        };
      }
      updated = this.mustRecord(
        await this.repository.update(record.id, {
          contractReview: {
            ...anchored.review,
            droppedPointCount: anchored.droppedPointCount,
          },
        }),
        record.id,
      );
      this.logger.log(
        {
          action: "premise-dialogue.contract-review",
          sessionId: record.id,
          feynmanVerdict: anchored.review.feynmanVerdict,
          divergencePoints: anchored.review.divergencePoints.length,
          droppedPoints: anchored.droppedPointCount,
        },
        "contract review anchored",
      );
      return { record: updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        { action: "premise-dialogue.contract-review", sessionId: record.id, error: message },
        "contract review failed; session stays completed without a review",
      );
      return { record: updated, contractReviewNotice: "契约点评生成失败，可重新提交重试" };
    }
  }

  /* —— 编排推进（纯代码选择层，模型只产问题） —— */

  private async advance(
    record: PremiseDialogueSessionRecord,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const selection = selectPremiseDialogueLayerForSession(
      record.layers,
      record.session,
    );
    if (selection.phase === "collect") {
      return this.mustRecord(
        await this.repository.update(record.id, { status: "collecting" }),
        record.id,
      );
    }

    const layer = selection.layer as PremiseLayerKey;
    const assessment = record.layers.find((item) => item.layer === layer);
    if (!assessment) {
      throw new BadRequestException(`找不到层 ${layer} 的审稿判定`);
    }
    const ask = await this.callAsk(record, assessment, provider);
    const anchored = anchorPremiseAskOutput(ask, record.session.premiseText);
    if (!anchored.questionUsable) {
      throw new BadRequestException("生成的提问未以问号结尾，已被服务端拒绝，请重试");
    }
    const turn: PremiseDialogueTurnRecord = {
      round: record.session.turns.length + 1,
      layer,
      ask: {
        question: anchored.ask.question,
        whyThisQuestion: anchored.ask.whyThisQuestion,
        hintQuote: anchored.ask.hintQuote,
        hintQuoteStatus: anchored.hintQuoteStatus,
      },
    };
    this.logger.log(
      { action: "premise-dialogue.ask", sessionId: record.id, round: turn.round, layer },
      "ask generated",
    );
    return this.mustRecord(
      await this.repository.update(record.id, {
        turns: [...record.session.turns, turn],
      }),
      record.id,
    );
  }

  private async runJudge(
    record: PremiseDialogueSessionRecord,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueSessionRecord> {
    const turn = record.session.turns[record.session.turns.length - 1];
    const answer = turn?.authorAnswer;
    if (!turn || answer === undefined) {
      throw new BadRequestException("当前轮次还没有作者回答");
    }
    try {
      const judge = await this.callJudge(record, turn, provider);
      const anchored = anchorPremiseJudgeOutput(judge, answer);
      const turns = [...record.session.turns];
      turns[turns.length - 1] =
        anchored.status === "anchored"
          ? { ...turn, judge: anchored.judge, judgeRejected: undefined }
          : { ...turn, judgeRejected: { reason: "quote-not-found" } };
      if (anchored.status === "rejected") {
        this.logger.warn(
          { action: "premise-dialogue.judge", sessionId: record.id, round: turn.round },
          "judgment rejected: quoteAuthor not found in the author answer",
        );
      }
      return this.mustRecord(await this.repository.update(record.id, { turns }), record.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        { action: "premise-dialogue.judge", sessionId: record.id, round: turn.round, error: message },
        "judge call failed; recorded as retryable model-failed",
      );
      const turns = [...record.session.turns];
      turns[turns.length - 1] = { ...turn, judgeRejected: { reason: "model-failed" } };
      return this.mustRecord(await this.repository.update(record.id, { turns }), record.id);
    }
  }

  /* —— 模型调用（mock 短路返回按构造即可锚定的输出） —— */

  private async callAsk(
    record: PremiseDialogueSessionRecord,
    assessment: PremiseLayerAssessment,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueAskOutput> {
    const resolved = this.resolveProvider(provider);
    if (resolved.kind === "mock") {
      const meta = PREMISE_LAYER_META[assessment.layer];
      return {
        focusedLayer: assessment.layer,
        question: `${meta.label}这一层还缺一块：${meta.question}——用你自己故事里的具体人物回答？`,
        whyThisQuestion: "演示模式：把这一层最薄弱的部分交还给作者自己回答。",
        hintQuote: "",
      };
    }

    const bundle = buildPremiseDialogueAskPrompt({
      genre: record.session.genre ?? "",
      premiseText: record.session.premiseText,
      layer: assessment.layer,
      layerStatus: assessment.status,
      layerStatement: assessment.statement,
      layerComment: assessment.comment,
      contractLine: premiseContractLineForLayer(assessment.layer, record.editorContract),
    });
    const content = await this.modelProviders.chat(resolved, bundle.messages as ProviderMessage[], {
      maxOutputTokens: 900,
      jsonSchema: {
        name: "premise_dialogue_ask_result",
        schema: premiseDialogueAskJsonSchema,
      },
      usageMeta: {
        jobId: record.id,
        stage: "premise-dialogue-ask",
        component: "premise-dialogue",
        requestKind: "diagnosis",
      },
    });
    const parsed = parsePremiseDialogueAskOutput(
      await parseJsonWithRepair(this.modelProviders, resolved, content, "立项引导提问"),
    );
    if (!parsed) {
      throw new BadRequestException("提问输出不符合契约，请重试");
    }
    return parsed;
  }

  private async callJudge(
    record: PremiseDialogueSessionRecord,
    turn: PremiseDialogueTurnRecord,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueJudgeOutput> {
    const answer = turn.authorAnswer ?? "";
    const resolved = this.resolveProvider(provider);
    if (resolved.kind === "mock") {
      return {
        verdict: "not-yet",
        quoteAuthor: answer.slice(0, 30),
        reason: "演示模式：判定必须锚定作者原话，此为占位评判。",
        layerStatusSuggestion: "weak",
        followUp: "谁会在故事里具体阻止她？",
        disagreementNote: "",
      };
    }

    const assessment = record.layers.find((item) => item.layer === turn.layer);
    const bundle = buildPremiseDialogueJudgePrompt({
      layer: turn.layer,
      layerStatus: assessment?.status ?? "weak",
      layerStatement: assessment?.statement ?? "",
      question: turn.ask.question,
      authorAnswer: answer,
    });
    const content = await this.modelProviders.chat(resolved, bundle.messages as ProviderMessage[], {
      maxOutputTokens: 900,
      jsonSchema: {
        name: "premise_dialogue_judge_result",
        schema: premiseDialogueJudgeJsonSchema,
      },
      usageMeta: {
        jobId: record.id,
        stage: "premise-dialogue-judge",
        component: "premise-dialogue",
        requestKind: "diagnosis",
      },
    });
    const parsed = parsePremiseDialogueJudgeOutput(
      await parseJsonWithRepair(this.modelProviders, resolved, content, "立项引导评判"),
    );
    if (!parsed) {
      throw new BadRequestException("评判输出不符合契约");
    }
    return parsed;
  }

  private async callContractReview(
    record: PremiseDialogueSessionRecord,
    authorContract: PremiseAuthorContract,
    provider?: ProviderConfigDto,
  ): Promise<PremiseDialogueContractReviewOutput> {
    const resolved = this.resolveProvider(provider);
    if (resolved.kind === "mock") {
      return {
        divergencePoints: [
          {
            field: "coreConflict",
            authorView: authorContract.coreConflict.slice(0, 20),
            editorView: "演示模式：编辑观点占位。",
            questionToAuthor: "用一句话说出欲望与阻力的对撞？",
          },
        ],
        feynmanVerdict: "partial",
        quoteAuthor: authorContract.coreConflict.slice(0, 30),
        reason: "演示模式：费曼判定占位。",
      };
    }

    const bundle = buildPremiseDialogueContractReviewPrompt({
      premiseText: record.session.premiseText,
      editorContract: record.editorContract,
      authorContract,
    });
    const content = await this.modelProviders.chat(resolved, bundle.messages as ProviderMessage[], {
      maxOutputTokens: 900,
      jsonSchema: {
        name: "premise_dialogue_contract_review_result",
        schema: premiseDialogueContractReviewJsonSchema,
      },
      usageMeta: {
        jobId: record.id,
        stage: "premise-dialogue-contract",
        component: "premise-dialogue",
        requestKind: "diagnosis",
      },
    });
    const parsed = parsePremiseDialogueContractReviewOutput(
      await parseJsonWithRepair(this.modelProviders, resolved, content, "契约费曼点评"),
    );
    if (!parsed) {
      throw new BadRequestException("契约点评输出不符合契约");
    }
    return parsed;
  }

  /* —— 输入规整与守卫 —— */

  private normalizeReview(
    value: Record<string, unknown>,
  ): { layers: PremiseLayerAssessment[]; editorContract: PremiseContractFields; reviewId: string } {
    const reviewId = asText(value.reviewId);
    if (!reviewId) {
      throw new BadRequestException("立项审稿结果缺少 reviewId，无法锚定对话");
    }

    const rawLayers = value.layers;
    if (!Array.isArray(rawLayers) || rawLayers.length !== PREMISE_REVIEW_LAYERS.length) {
      throw new BadRequestException("立项审稿结果必须携带恰好四层的 layers 判定");
    }
    const layers: PremiseLayerAssessment[] = rawLayers.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const layer = asText(item.layer) as PremiseLayerKey;
      const status = asText(item.status);
      const statement = asText(item.statement);
      if (!PREMISE_REVIEW_LAYERS.includes(layer) || !layerStatuses.has(status) || !statement) {
        throw new BadRequestException("立项审稿结果的 layers 判定不完整（layer/status/statement）");
      }
      return {
        layer,
        status: status as PremiseLayerAssessment["status"],
        statement,
        confidence: clampNumber(item.confidence, 0, 1, 0.5),
        comment: asText(item.comment) || undefined,
      };
    });

    const editorContract = {} as PremiseContractFields;
    for (const field of contractFieldNames) {
      const text = asText(value[field]);
      if (!text) {
        throw new BadRequestException(`立项审稿结果缺少契约字段 ${field}`);
      }
      editorContract[field] = text;
    }

    return { layers, editorContract, reviewId };
  }

  private resolveProvider(provider?: ProviderConfigDto): ProviderConfigDto {
    if (provider?.kind) {
      return provider;
    }
    return { preset: "shared-gpu", kind: "openai-compatible" };
  }

  private async requireActive(id: string): Promise<PremiseDialogueSessionRecord> {
    const record = await this.getSession(id);
    if (record.session.status !== "active") {
      throw new BadRequestException("对话已收束，不能再作答或提问");
    }
    return record;
  }

  private mustRecord(
    record: PremiseDialogueSessionRecord | null,
    id: string,
  ): PremiseDialogueSessionRecord {
    if (!record) {
      throw new NotFoundException(`立项引导对话会话 ${id} 不存在`);
    }
    return record;
  }
}
