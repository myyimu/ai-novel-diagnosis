import { AnalysisService } from "./analysis.service";
import { ProviderConfigDto } from "./dto/provider-config.dto";

const quickReviewJson = JSON.stringify({
  title: "第一章",
  genre: "xuanhuan",
  positioning: "公开压迫后的反击开局",
  sellingPoints: ["冲突明确", "线索有悬念"],
  mainProblem: "反击目标还不够具体",
  actionableFixes: ["补清失败代价", "结尾加一个更强钩子", "压缩解释段落"],
  readyForFullReview: true,
  readyReason: "文本量足够，适合完整评分",
  quickScore: 6.8,
  confidence: 0.7,
});

function createService(modelProviders: { chat: jest.Mock }) {
  return new AnalysisService(
    {} as never,
    {} as never,
    {} as never,
    modelProviders as never,
    {} as never,
    {} as never,
  );
}

describe("AnalysisService quickReview", () => {
  it("uses the user configured paid provider when supplied", async () => {
    const modelProviders = {
      chat: jest.fn(async () => quickReviewJson),
    };
    const service = createService(modelProviders);
    const provider: ProviderConfigDto = {
      preset: "deepseek",
      kind: "openai-compatible",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-user-owned",
      model: "deepseek-chat",
      temperature: 0.2,
      jsonMode: false,
    };

    await service.quickReview({
      provider,
      chapterText:
        "主角在宗门大殿被公开否定，所有人都等着看他失败。他却在旧案信物里发现父亲留下的线索，决定当场接下试炼。",
    });

    expect(modelProviders.chat).toHaveBeenCalledWith(
      provider,
      expect.any(Array),
      { maxOutputTokens: 1400 },
    );
  });

  it("falls back to the shared provider only when no provider is supplied", async () => {
    const modelProviders = {
      chat: jest.fn(async () => quickReviewJson),
    };
    const service = createService(modelProviders);

    await service.quickReview({
      chapterText:
        "主角在宗门大殿被公开否定，所有人都等着看他失败。他却在旧案信物里发现父亲留下的线索，决定当场接下试炼。",
    });

    expect(modelProviders.chat).toHaveBeenCalledWith(
      {
        preset: "shared-gpu",
        kind: "openai-compatible",
      },
      expect.any(Array),
      { maxOutputTokens: 1400 },
    );
  });
});
