# AI Core

`packages/ai-core` 是前端和 API 共享的分析契约包。

它不负责调用模型，也不负责 UI；它提供第一章急诊、深度质检、整书资产和关系图谱复核所需的共享类型，避免 Web 与 API 各自维护一套不一致的字段。

## 当前职责

- `types.ts`：`ProviderKind`、`ProviderPresetId`、`QuickReviewResult`、`RubricResult`、`ScoreResult` 等共享契约。
- `metrics.ts`：默认章节质检指标。
- `validation.ts`：外部输入的轻量结构校验。
- `preview.ts`：可插拔的预览报告策略。
- `prompts.ts`：共享提示词契约构造器，供 API 侧接入真实 provider。
- `QuickReviewResult`：章节急诊结果。
- `RubricResult`：成熟样本拆出的评分标准。
- `ScoreResult`：章节质检评分报告。
- 推荐平台、评分指标、改稿提示词等共享结构。

`createPreviewReport` 是本地预览能力，不等同于真实 LLM 语义诊断。真实的证据抽取、prompt 编排和模型调用由 `services/api` 负责。

## 使用示例

```ts
import {
  buildChapterTriagePrompt,
  createPreviewReport,
  validateProviderConfig,
  type PreviewStrategy,
} from "@ai-novel-diagnosis/ai-core";

const provider = validateProviderConfig({
  id: "qwen",
  kind: "openai-compatible",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen-plus",
  capabilities: {
    jsonMode: true,
    streaming: false,
    maxContextTokens: 32768,
  },
});

const llmBackedPreview: PreviewStrategy = {
  id: "llm-backed-preview",
  createReport(input, context) {
    // 在 services/api 中把 input/context 转成 prompt，再调用 provider。
    // ai-core 只定义契约，不在包内持有 API key 或发起网络请求。
    return createPreviewReport(input, { metrics: context.metrics });
  },
};

const report = createPreviewReport(
  {
    title: "第一章",
    text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
    rubricId: "default",
  },
  { strategy: llmBackedPreview },
);

const prompt = buildChapterTriagePrompt({
  title: "第一章",
  text: "主角进入考场，却发现考官正是三年前废掉他经脉的人。",
  rubricId: "default",
});

console.log(provider.model, report.totalScore, prompt.id);
```

## 模块边界

- `ai-core` 负责稳定类型、默认指标、输入验证、prompt 契约和可插拔策略接口。
- `services/api` 负责 prompt、LLM provider、JSON 修复、证据抽取和真实诊断流程。
- `apps/web` 负责展示、交互、缓存和用户工作流。

## 使用方

- `apps/web`：用于类型约束、渲染第一章急诊、深度质检、整书资产和图谱复核数据。
- `services/api`：用于约束模型输出、mock fallback 和接口返回结构。

## 本地开发

```bash
pnpm --filter @ai-novel-diagnosis/ai-core check
pnpm --filter @ai-novel-diagnosis/ai-core test
pnpm --filter @ai-novel-diagnosis/ai-core build
```

## 维护原则

- 这里放稳定的跨端契约，不放只属于某个页面的视图模型。
- 新增字段时同时检查 Web 展示、API mock fallback 和相关测试。
- 模型输出结构要优先服务“第一章急诊 -> 深度质检 -> 整书资产 -> 图谱复核”的产品路径。
