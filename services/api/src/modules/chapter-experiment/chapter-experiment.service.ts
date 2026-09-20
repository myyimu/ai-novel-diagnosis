import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  chapterExperimentText,
  nextChapterRevision,
  type ChapterExperiment,
  type ChapterExperimentSummary,
} from "@ai-novel-diagnosis/ai-core";
import { ChapterExperimentsRepository } from "@/dao/repositories/chapter-experiments.repository";
import {
  ModelProviderService,
  type ProviderMessage,
} from "@/modules/ai-provider/model-provider.service";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import {
  ChapterExperimentActionDto,
  CreateChapterExperimentDto,
} from "./dto/chapter-experiment.dto";
import {
  guidanceMessages,
  revisionMessages,
} from "./chapter-experiment.prompts";

@Injectable()
export class ChapterExperimentService {
  constructor(
    private readonly repository: ChapterExperimentsRepository,
    private readonly models: ModelProviderService,
  ) {}

  async create(input: CreateChapterExperimentDto): Promise<ChapterExperiment> {
    if (
      !input.goal.trim() ||
      !input.preserve.trim() ||
      input.originalText.trim().length < 50 ||
      !input.projectId.trim() ||
      !input.chapterTitle.trim()
    ) {
      throw new BadRequestException(
        "请填写章节、创作目标和保留项，正文至少 50 字。",
      );
    }
    return this.repository.create({
      projectId: input.projectId,
      chapterTitle: input.chapterTitle,
      originalText: input.originalText,
      goal: input.goal,
      preserve: input.preserve,
      context: input.context,
      ...(input.diagnosis ? { diagnosis: input.diagnosis } : {}),
      id: randomUUID(),
      revision: 0,
      createdAt: new Date().toISOString(),
      turns: [],
      plan: null,
      writerFingerprint: null,
      versions: [],
      decisions: [],
    });
  }

  async get(id: string): Promise<ChapterExperiment> {
    const experiment = await this.repository.find(id);
    if (!experiment) throw new NotFoundException("找不到这次章节对照。");
    return experiment;
  }

  async list(projectId: string): Promise<ChapterExperimentSummary[]> {
    return this.repository.list(projectId);
  }

  async act(
    id: string,
    input: ChapterExperimentActionDto,
  ): Promise<ChapterExperiment> {
    const current = await this.get(id);
    if (current.revision !== input.revision)
      throw new ConflictException("记录已更新，请重新载入后继续。");
    const next: ChapterExperiment = structuredClone(current);
    if (input.action === "ask") await this.ask(next, input);
    if (input.action === "confirm-plan") {
      if (next.versions.length || next.plan)
        throw new ConflictException("修改计划已固定；新的目标请另建对照。");
      if (!next.turns.length || !input.plan?.trim())
        throw new BadRequestException("请先进行引导，再确认具体的修改计划。");
      next.plan = input.plan.trim();
    }
    if (input.action === "generate") await this.generate(next, input);
    if (input.action === "evaluate") {
      if (
        !input.leftId ||
        !input.rightId ||
        input.leftId === input.rightId ||
        !chapterExperimentText(next, input.leftId) ||
        !chapterExperimentText(next, input.rightId) ||
        !input.choice ||
        !input.reason?.trim()
      ) {
        throw new BadRequestException(
          "请选择两个已有的不同版本，并记录判断理由。",
        );
      }
      next.decisions.push({
        leftId: input.leftId,
        rightId: input.rightId,
        choice: input.choice,
        reason: input.reason.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    next.revision += 1;
    if (!(await this.repository.save(next, current.revision)))
      throw new ConflictException(
        "另一个操作已更新记录，本次结果未覆盖它。请重新载入。",
      );
    return next;
  }

  private provider(input?: ProviderConfigDto): ProviderConfigDto {
    const provider = input ?? {
      kind: "openai-compatible",
      preset: "shared-gpu",
    };
    if (provider.kind === "mock")
      throw new BadRequestException(
        "演示模式不能验证改稿效果，请先在 AI 设置中选择真实模型。",
      );
    return provider;
  }

  private async ask(
    next: ChapterExperiment,
    input: ChapterExperimentActionDto,
  ): Promise<void> {
    if (next.plan || next.versions.length)
      throw new ConflictException("计划已确认，当前对照的引导已结束。");
    if (next.turns.length >= 6)
      throw new BadRequestException("已完成六轮交流，请整理并确认本轮计划。");
    if (!input.message?.trim())
      throw new BadRequestException("请写下你的想法或问题。");
    const mode = input.mode ?? "auto";
    const started = Date.now();
    const output = await this.call(
      this.provider(input.provider),
      guidanceMessages(next, input.message, mode),
      ["reply", "quote", "suggestedPlan"],
      2000,
      "chapter-guidance",
    );
    const reply = this.text(output, "reply", 1, 4000);
    const quote = this.text(output, "quote", 0, 2000);
    const suggestedPlan = this.text(output, "suggestedPlan", 0, 2000);
    if (quote && !next.originalText.includes(quote))
      throw new BadGatewayException(
        "模型引用未出现在原稿中，本次回答未保存，请重试。",
      );
    next.turns.push({
      mode,
      message: input.message,
      reply,
      quote,
      suggestedPlan,
      elapsedMs: Date.now() - started,
    });
  }

  private async generate(
    next: ChapterExperiment,
    input: ChapterExperimentActionDto,
  ): Promise<void> {
    if (!next.plan || !input.route)
      throw new BadRequestException("请先确认计划，再生成两个路线的版本。");
    const source = nextChapterRevision(next, input.route);
    if (!source)
      throw new BadRequestException("这条路线已完成两轮，请对比现有版本。");
    const provider = this.provider(input.provider);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          provider.kind,
          provider.preset ?? "",
          provider.baseUrl ?? "",
          provider.model ?? "",
          provider.temperature ?? null,
          provider.jsonMode ?? null,
        ]),
      )
      .digest("hex");
    if (next.writerFingerprint && next.writerFingerprint !== fingerprint)
      throw new ConflictException(
        "模型设置已改变。请恢复此前的设置，或另建对照，避免混淆修改效果。",
      );
    const started = Date.now();
    const output = await this.call(
      provider,
      revisionMessages(next, source.text, input.route === "guided"),
      ["text"],
      16000,
      "chapter-revision",
    );
    const text = this.text(output, "text", 50, 24000);
    if (text.trim() === source.text.trim())
      throw new BadGatewayException(
        "模型没有修改正文，本次不计作新版本；可以重试或结束本轮。",
      );
    next.writerFingerprint = fingerprint;
    next.versions.push({
      id: randomUUID(),
      route: input.route,
      round: source.round,
      parentId: source.parentId,
      text,
      createdAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      modelLabel:
        provider.model?.trim() ||
        `${provider.preset || provider.kind}（自动线路，模型可能变化）`,
    });
  }

  private async call(
    provider: ProviderConfigDto,
    messages: ProviderMessage[],
    fields: string[],
    maxOutputTokens: number,
    stage: string,
  ): Promise<Record<string, unknown>> {
    const content = await this.models.chat(provider, messages, {
      maxOutputTokens,
      jsonSchema: {
        name: stage.replaceAll("-", "_"),
        schema: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            fields.map((field) => [field, { type: "string" }]),
          ),
          required: fields,
        },
      },
      usageMeta: {
        stage,
        component: "chapter-experiment",
        requestKind: "comparison",
      },
    });
    let parsed: unknown;
    try {
      // Do not repair truncated prose into an apparently complete manuscript.
      parsed = JSON.parse(
        content
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, ""),
      );
    } catch {
      throw new BadGatewayException(
        "模型输出格式不完整，未保存新结果。请重试或更换模型后另建对照。",
      );
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new BadGatewayException("模型未返回可用结果。");
    return parsed as Record<string, unknown>;
  }

  private text(
    output: Record<string, unknown>,
    key: string,
    min: number,
    max: number,
  ): string {
    const value = output[key];
    if (
      typeof value !== "string" ||
      value.trim().length < min ||
      value.length > max
    )
      throw new BadGatewayException("模型返回的正文或引导不完整，本次未保存。");
    return value;
  }
}
