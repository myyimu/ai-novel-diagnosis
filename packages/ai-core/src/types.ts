export type Genre = "xuanhuan" | "urban" | "romance" | "suspense" | "infinite-flow" | "other";

export type ProviderKind = "mock" | "openai-compatible";

export type ProviderPresetId = "custom" | "shared-gpu" | "deepseek" | "doubao" | "qwen" | "ollama";

export interface ProviderPreset {
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  modelOptions?: string[];
  jsonMode: boolean;
  needsApiKey: boolean;
  notice?: string;
}

export interface LLMProviderConfig {
  id: string;
  kind: ProviderKind;
  baseUrl?: string;
  model: string;
  apiKeyRef?: string;
  capabilities: {
    jsonMode: boolean;
    streaming: boolean;
    maxContextTokens: number;
  };
}

export interface ReferenceChapterInput {
  title: string;
  genre: Genre;
  text: string;
}

export interface UserChapterInput {
  title: string;
  text: string;
  rubricId: string;
}

export interface StoryPrinciple {
  id: string;
  title: string;
  sourceObservation: string;
  reusableRule: string;
  migrationQuestion: string;
}

export interface RubricMetric {
  id: string;
  name: string;
  description: string;
  scale: {
    low: string;
    medium: string;
    high: string;
  };
}

export interface RubricResult {
  mode: string;
  reference: {
    title: string;
    genre: string;
    platform: string;
    audience: string;
    readingMode: string;
    oneSentenceSummary: string;
  };
  styleProfile?: {
    platform: string;
    audience: string;
    readingMode: string;
    pace: string;
    emotion: string;
    hookDensity: string;
    language: string;
    setupTolerance: string;
  };
  marketProfile?: {
    category: string;
    theme: string;
    tags: string[];
    explicitKeywords: string[];
    implicitExpectations: string[];
    positioningPromise: string;
    readerExpectationModel: string[];
  };
  principles: Array<{
    id: string;
    title: string;
    sourceObservation: string;
    reusableRule: string;
    migrationQuestion: string;
  }>;
  rubric: {
    id: string;
    genre: string;
    platform?: string;
    audience?: string;
    readingMode?: string;
    styleProfile?: Record<string, string>;
    category?: string;
    theme?: string;
    marketProfile?: Record<string, unknown>;
    metrics: RubricMetric[];
  };
  editorNote: string;
}

export interface ScoreResult {
  mode: string;
  chapterTitle: string;
  totalScore: number;
  scores: Array<{
    metricId: string;
    name: string;
    score: number;
    reason: string;
    evidence: string;
    fix: string;
    referencePrincipleId?: string;
  }>;
  strongestPoint: string;
  weakestPoint: string;
  styleFit?: {
    score: number;
    platformRisk: string;
    audienceRisk: string;
    readingModeRisk: string;
  };
  marketFit?: {
    score: number;
    categoryRisk: string;
    themeRisk: string;
    keywordRisk: string;
    frontloadRisk: string;
  };
  platformStrategyFit?: {
    score: number;
    recommendationRisk: string;
    competitionRisk: string;
    pushBottleneck: string;
    trafficEntryAction: string;
  };
  performanceFit?: {
    hasData: boolean;
    funnelSummary: string;
    impressionDiagnosis: string;
    clickDiagnosis: string;
    read30sDiagnosis: string;
    read60sDiagnosis: string;
    bottomDiagnosis: string;
    followDiagnosis: string;
    validReadDiagnosis?: string;
    avgReadProgressDiagnosis?: string;
    paidUnlockDiagnosis?: string;
    bookshelfDiagnosis?: string;
    firstChapterCompletionDiagnosis?: string;
    nextChapterClickDiagnosis?: string;
    threeChapterRetentionDiagnosis?: string;
    priority: string;
  };
  selfTestFit?: {
    enabled: boolean;
    summary: string;
    dialogueMaskDiagnosis: string;
    jumpReadDiagnosis: string;
    emotionDiagnosis: string;
    settingRecapDiagnosis: string;
    deleteSentenceDiagnosis: string;
    aiTraceDiagnosis: string;
    promptAddons: string[];
  };
  nextRevisionMove: string;
  rewriteBrief?: {
    target: string;
    strategy: string;
  };
  revisionPrompt?: {
    title: string;
    prompt: string;
  };
}

export type RecommendedPlatformId =
  | "qidian"
  | "fanqie"
  | "jinjiang"
  | "qimao"
  | "wechat-short"
  | "other";

export interface RecommendedPlatform {
  id: RecommendedPlatformId;
  label: string;
  fit: string;
  reason: string;
}

export interface QuickReviewResult {
  title: string;
  genre: string;
  positioning: string;
  sellingPoints: string[];
  mainProblem: string;
  actionableFixes: string[];
  recommendedPlatforms: RecommendedPlatform[];
  readyForFullReview: boolean;
  readyReason: string;
  quickScore: number;
  confidence: number;
}

export interface MetricScore {
  metricId: string;
  score: number;
  reason: string;
  evidence: string;
  fix: string;
  referencePrincipleId?: string;
}

export interface ChapterScoreReport {
  totalScore: number;
  scores: MetricScore[];
  strongestPoint: string;
  weakestPoint: string;
  nextRevisionMove: string;
}
