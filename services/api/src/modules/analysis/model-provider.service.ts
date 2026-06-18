import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProviderPreset } from "@ai-novel-first-step/ai-core";
import { ProviderConfigDto } from "./dto/provider-config.dto";

export interface ProviderMessage {
  role: "system" | "user";
  content: string;
}

export interface ProviderChatOptions {
  maxOutputTokens?: number;
}

const providerPresets: Array<
  ProviderPreset & { id: NonNullable<ProviderConfigDto["preset"]> }
> = [
  {
    id: "custom",
    label: "自定义 OpenAI-compatible",
    kind: "openai-compatible",
    baseUrl: "",
    model: "",
    modelOptions: [],
    jsonMode: false,
    needsApiKey: true,
  },
  {
    id: "shared-gpu",
    label: "免费共享算力",
    kind: "openai-compatible",
    baseUrl: "",
    model: "",
    modelOptions: [],
    jsonMode: false,
    needsApiKey: false,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    modelOptions: ["deepseek-chat", "deepseek-reasoner"],
    jsonMode: false,
    needsApiKey: true,
  },
  {
    id: "doubao",
    label: "豆包/火山方舟",
    kind: "openai-compatible",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-1-6",
    modelOptions: ["doubao-seed-1-6"],
    jsonMode: false,
    needsApiKey: true,
  },
  {
    id: "qwen",
    label: "阿里云百炼/通义千问",
    kind: "openai-compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    modelOptions: [
      "qwen-plus",
      "qwen-plus-latest",
      "qwen3-max",
      "qwen3-max-preview",
      "qwen-max",
      "qwen-max-latest",
      "qwen-flash",
      "qwen-turbo",
      "qwen-turbo-latest",
      "qwen3.5-plus",
      "qwen3.5-flash",
      "qwen3-coder-plus",
      "qwen3-coder-flash",
      "qwq-plus",
    ],
    jsonMode: false,
    needsApiKey: true,
  },
  {
    id: "ollama",
    label: "Ollama 本地模型",
    kind: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen2.5:7b",
    modelOptions: ["qwen2.5:7b", "qwen3:8b", "llama3.1:8b"],
    jsonMode: false,
    needsApiKey: false,
  },
];

@Injectable()
export class ModelProviderService {
  getPresets() {
    return providerPresets;
  }

  async test(provider: ProviderConfigDto) {
    const resolved = this.resolve(provider);
    if (resolved.kind === "mock") {
      return {
        ok: true,
        provider: "mock",
        preset: provider.preset || "custom",
        message: "mock provider ready",
      };
    }

    const result = await this.chat(
      resolved,
      [
        {
          role: "system",
          content: "你是连接测试器。只返回 JSON，不要解释。",
        },
        {
          role: "user",
          content: '请返回 {"ok":true,"message":"connected"}',
        },
      ],
      { maxOutputTokens: 256 },
    );

    return {
      ok: true,
      provider: resolved.kind,
      preset: provider.preset || "custom",
      model: resolved.model,
      raw: result,
    };
  }

  async chat(
    provider: ProviderConfigDto,
    messages: ProviderMessage[],
    options: ProviderChatOptions = {},
  ) {
    const resolved = this.resolve(provider);
    if (resolved.kind === "mock") {
      throw new BadRequestException(
        "Mock provider does not support chat calls.",
      );
    }

    return this.callOpenAICompatible(resolved, messages, options);
  }

  resolve(provider: ProviderConfigDto): ProviderConfigDto {
    if (provider.kind === "mock") {
      return provider;
    }

    const preset = providerPresets.find((item) => item.id === provider.preset);

    if (provider.preset === "shared-gpu") {
      return {
        ...provider,
        kind: "openai-compatible",
        baseUrl: process.env.SHARED_GPU_BASE_URL?.trim(),
        apiKey: process.env.SHARED_GPU_API_KEY?.trim(),
        model: process.env.SHARED_GPU_MODEL?.trim(),
        jsonMode:
          process.env.SHARED_GPU_JSON_MODE === "true"
            ? true
            : (preset?.jsonMode ?? false),
      };
    }

    return {
      ...provider,
      kind: "openai-compatible",
      baseUrl: provider.baseUrl?.trim() || preset?.baseUrl,
      model: provider.model?.trim() || preset?.model,
      jsonMode: provider.jsonMode ?? preset?.jsonMode ?? false,
    };
  }

  private async callOpenAICompatible(
    provider: ProviderConfigDto,
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): Promise<string> {
    if (!provider.baseUrl || !provider.model) {
      if (provider.preset === "shared-gpu") {
        throw new BadRequestException(
          "免费共享算力尚未配置：请在 API 服务环境变量中设置 SHARED_GPU_BASE_URL 和 SHARED_GPU_MODEL。",
        );
      }

      throw new BadRequestException(
        "OpenAI-compatible provider requires baseUrl and model.",
      );
    }

    const preset = providerPresets.find((item) => item.id === provider.preset);
    if (preset?.needsApiKey !== false && !provider.apiKey) {
      const providerLabel = preset?.label || "OpenAI-compatible provider";
      throw new BadRequestException(
        `${providerLabel} requires a user-owned API key for this request.`,
      );
    }

    const url = `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: provider.temperature ?? 0.2,
    };
    if (options.maxOutputTokens) {
      body.max_tokens = options.maxOutputTokens;
    }

    if (provider.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (provider.apiKey) {
      headers.authorization = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Provider request failed: ${response.status} ${errorText.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadRequestException(
        "Provider response did not include message content.",
      );
    }

    return content;
  }
}
