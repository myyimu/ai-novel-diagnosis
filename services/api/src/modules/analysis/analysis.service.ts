import { BadRequestException, Injectable } from "@nestjs/common";
import { AnalyzeBookDto } from "./dto/analyze-book.dto";
import { BuildRubricDto } from "./dto/build-rubric.dto";
import { PreviewAnalysisDto } from "./dto/preview-analysis.dto";
import { ProviderConfigDto } from "./dto/provider-config.dto";
import { ScoreChapterDto } from "./dto/score-chapter.dto";

const metrics = [
  {
    metricId: "chapter-goal",
    name: "主角目标清晰度",
    fix: "把本章目标写成读者能立刻理解的一句话，并补上失败代价。",
  },
  {
    metricId: "conflict-pressure",
    name: "冲突压力",
    fix: "把阻碍改成具体损失，例如资格、资源、身份、关系或生命风险。",
  },
  {
    metricId: "emotion-debt",
    name: "情绪债",
    fix: "增加可被兑现的羞辱、误解、秘密或承诺，让读者等待释放。",
  },
  {
    metricId: "hook",
    name: "追读钩子",
    fix: "结尾加入更高一级的危机、奖励、身份暴露风险或反转信息。",
  },
];

const baseRubricMetrics = [
  {
    id: "chapter-goal",
    name: "主角目标清晰度",
    description: "读者是否能快速知道主角这一章想得到什么或避免什么。",
    scale: {
      low: "0-3：主角只是被事件推着走，目标不清。",
      medium: "4-6：目标存在，但压力和结果不够具体。",
      high: "7-10：目标、代价、完成标志都很明确。",
    },
  },
  {
    id: "conflict-pressure",
    name: "冲突压力",
    description: "阻碍是否具体，是否会造成损失、羞辱、危机或机会流失。",
    scale: {
      low: "0-3：只有态度冲突，没有实际后果。",
      medium: "4-6：有阻碍，但压迫对象或损失不够尖锐。",
      high: "7-10：阻碍具体且会逼迫主角立刻行动。",
    },
  },
  {
    id: "emotion-debt",
    name: "情绪债",
    description: "章节是否让读者积累愤怒、期待、心疼、好奇等待兑现情绪。",
    scale: {
      low: "0-3：读者没有明显情绪等待释放。",
      medium: "4-6：有情绪，但铺垫或延迟不足。",
      high: "7-10：情绪债清晰，读者期待主角反击或真相揭开。",
    },
  },
  {
    id: "payoff",
    name: "爽点/期待兑现",
    description: "前文制造的期待是否得到阶段性兑现，并带来情绪释放。",
    scale: {
      low: "0-3：没有兑现，或兑现和铺垫无关。",
      medium: "4-6：有释放，但力度、时机或结果偏弱。",
      high: "7-10：兑现清楚，读者能获得明确情绪回报。",
    },
  },
  {
    id: "information-gain",
    name: "信息增量",
    description: "本章是否新增了会改变局势、人物关系或读者判断的信息。",
    scale: {
      low: "0-3：重复已知信息，删掉也不影响故事。",
      medium: "4-6：有新信息，但和主线压力连接不紧。",
      high: "7-10：新信息直接改变期待或冲突等级。",
    },
  },
  {
    id: "pacing-density",
    name: "节奏密度",
    description: "段落是否持续承担推进、情绪、信息或铺垫功能。",
    scale: {
      low: "0-3：大量段落只在解释或空转。",
      medium: "4-6：核心情节可读，但铺垫和重复偏多。",
      high: "7-10：段落功能清晰，几乎没有无效停顿。",
    },
  },
  {
    id: "character-drive",
    name: "人物驱动力",
    description: "主角行动是否来自明确欲望、恐惧、承诺或价值判断。",
    scale: {
      low: "0-3：主角像工具人，行动动机薄弱。",
      medium: "4-6：动机存在，但和本章选择连接不够强。",
      high: "7-10：主角选择稳定地展示性格和长期欲望。",
    },
  },
  {
    id: "platform-fit",
    name: "平台节奏匹配度",
    description: "章节节奏、信息直给程度和情绪反馈是否符合目标平台读者习惯。",
    scale: {
      low: "0-3：写法明显偏离目标平台，读者进入成本高。",
      medium: "4-6：大方向匹配，但节奏或表达不够贴平台。",
      high: "7-10：节奏、表达、卡点都贴合目标平台阅读习惯。",
    },
  },
  {
    id: "audience-fit",
    name: "目标读者匹配度",
    description: "人物标签、情绪类型、冲突形态是否满足目标读者的主要期待。",
    scale: {
      low: "0-3：读者画像和章节卖点错位。",
      medium: "4-6：有匹配点，但核心情绪或卖点不够集中。",
      high: "7-10：章节明确服务目标读者的高频期待。",
    },
  },
  {
    id: "category-fit",
    name: "分类期待匹配度",
    description: "章节是否符合细分分类读者默认期待，而不是只停留在大题材层面。",
    scale: {
      low: "0-3：分类卖点缺席，读者点进来会觉得货不对板。",
      medium: "4-6：有分类元素，但出现太晚或没有形成期待。",
      high: "7-10：分类核心期待清楚出现并参与推进冲突。",
    },
  },
  {
    id: "theme-promise",
    name: "主题承诺清晰度",
    description: "章节是否让读者明确感到主题承诺，比如逆袭、救赎、追妻或悬疑解谜。",
    scale: {
      low: "0-3：主题模糊，读者不知道该期待什么情绪回报。",
      medium: "4-6：主题存在，但表达不够集中。",
      high: "7-10：主题承诺明确，并和主角目标/冲突绑定。",
    },
  },
  {
    id: "keyword-hit",
    name: "关键词与标签命中度",
    description: "显性关键词和隐性期待是否自然进入章节，不是机械堆词。",
    scale: {
      low: "0-3：关键词缺席或堆砌，隐性期待没有对应结构。",
      medium: "4-6：部分命中，但与剧情推进连接弱。",
      high: "7-10：关键词自然出现，隐性期待转化为冲突和钩子。",
    },
  },
  {
    id: "selling-point-frontload",
    name: "卖点前置程度",
    description: "分类、主题、能力、人设或关系卖点是否足够早地出现。",
    scale: {
      low: "0-3：开头看不出卖点，读者需要等太久。",
      medium: "4-6：卖点有暗示，但不够清楚或不够早。",
      high: "7-10：卖点在前段清楚可感，能支撑点击后的继续阅读。",
    },
  },
  {
    id: "hook",
    name: "追读钩子",
    description: "结尾是否留下下一章不可延迟的危机、奖励、秘密或反转。",
    scale: {
      low: "0-3：自然收尾，没有新期待。",
      medium: "4-6：留下问题，但不够紧迫。",
      high: "7-10：结尾制造明确升级，读者想立刻进入下一章。",
    },
  },
];

const platformProfiles: Record<string, Record<string, string>> = {
  qidian: {
    pace: "中高节奏，允许一定设定铺垫",
    emotion: "目标感、成长感、长期期待并重",
    hookDensity: "章节末要有清楚升级或新问题",
    language: "信息清楚，设定和行动逻辑要站得住",
    setupTolerance: "中等",
  },
  fanqie: {
    pace: "快节奏",
    emotion: "直给、强反馈、低理解成本",
    hookDensity: "高",
    language: "白话、短句、情绪明确",
    setupTolerance: "低",
  },
  jinjiang: {
    pace: "中节奏，重人物关系推进",
    emotion: "细腻情绪、关系张力、人物选择",
    hookDensity: "中高，偏关系变化和情感悬念",
    language: "情绪辨识度和人物声音要强",
    setupTolerance: "中等",
  },
  qimao: {
    pace: "快节奏",
    emotion: "强冲突、强爽点、强反转",
    hookDensity: "高",
    language: "直白、场景转换快",
    setupTolerance: "低",
  },
  "wechat-short": {
    pace: "极快节奏",
    emotion: "强刺激、强反转、强付费卡点",
    hookDensity: "极高",
    language: "极低理解成本，开头必须迅速进入冲突",
    setupTolerance: "极低",
  },
  other: {
    pace: "按题材和目标读者调整",
    emotion: "按目标读者期待调整",
    hookDensity: "中等",
    language: "清楚优先",
    setupTolerance: "中等",
  },
};

const labelMaps = {
  platform: {
    qidian: "起点",
    fanqie: "番茄",
    jinjiang: "晋江",
    qimao: "七猫",
    "wechat-short": "微信短篇/小程序文",
    other: "其他平台",
  },
  audience: {
    "male-fast-paced": "男频快节奏爽文读者",
    "female-emotional": "女频情绪流读者",
    "setting-heavy": "设定党/世界观读者",
    "light-reader": "快节奏小白文读者",
    "suspense-brainstorm": "悬疑脑洞读者",
    other: "其他读者",
  },
  readingMode: {
    "long-serialization": "长篇追更",
    "mobile-fragmented": "移动端碎片阅读",
    "short-paid": "短篇付费",
    other: "其他场景",
  },
};

@Injectable()
export class AnalysisService {
  previewScore(input: PreviewAnalysisDto) {
    const score = input.text.length > 800 ? 6.8 : 5.2;

    return {
      productName: "新手AI小说第一步",
      mode: "mock-preview",
      title: input.title,
      rubricId: input.rubricId,
      totalScore: score,
      strongestPoint: "API 链路已可接收章节并返回结构化评分报告。",
      weakestPoint: "尚未接入用户自己的 LLM Key，证据段落与真实评分由 Worker 补齐。",
      nextRevisionMove: "先跑通目标、冲突、情绪债、追读钩子四项硬指标。",
      scores: metrics.map((metric) => ({
        metricId: metric.metricId,
        name: metric.name,
        score,
        reason: `${metric.name} 已进入预览评分，正式任务会要求模型给出文本证据。`,
        evidence: "preview endpoint does not quote user text",
        fix: metric.fix,
      })),
    };
  }

  getPipeline() {
    return {
      stages: [
        "ingest_reference_chapters",
        "build_style_profile",
        "build_market_profile",
        "extract_story_principles",
        "build_genre_rubric",
        "score_user_chapter",
        "critic_pass",
        "generate_revision_plan",
      ],
      providerModes: ["mock", "openai-compatible", "ollama"],
      storagePolicy: "local-first; user text and API keys stay in the deployment",
    };
  }

  async testProvider(provider: ProviderConfigDto) {
    if (provider.kind === "mock") {
      return {
        ok: true,
        provider: "mock",
        message: "mock provider ready",
      };
    }

    const result = await this.callOpenAICompatible(provider, [
      {
        role: "system",
        content: "你是连接测试器。只返回 JSON，不要解释。",
      },
      {
        role: "user",
        content: '请返回 {"ok":true,"message":"connected"}',
      },
    ]);

    return this.parseJson(result);
  }

  async buildRubric(input: BuildRubricDto) {
    if (input.provider.kind === "mock") {
      return this.mockRubric(input);
    }

    const content = await this.callOpenAICompatible(input.provider, [
      {
        role: "system",
        content:
          "你是资深中文网文编辑和拆书教练。你只返回合法 JSON，不使用 Markdown。",
      },
      {
        role: "user",
        content: this.buildRubricPrompt(input),
      },
    ]);

    return this.parseJson(content);
  }

  async scoreChapter(input: ScoreChapterDto) {
    if (input.provider.kind === "mock") {
      return this.mockScore(input);
    }

    const content = await this.callOpenAICompatible(input.provider, [
      {
        role: "system",
        content:
          "你是严谨的中文网文点评官。你只返回合法 JSON，所有评分必须给出具体证据和可执行改法。",
      },
      {
        role: "user",
        content: this.scoreChapterPrompt(input),
      },
    ]);

    return this.parseJson(content);
  }

  async analyzeBook(input: AnalyzeBookDto) {
    if (input.provider.kind === "mock") {
      return this.mockBookAnalysis(input);
    }

    const content = await this.callOpenAICompatible(input.provider, [
      {
        role: "system",
        content:
          "你是中文长篇小说拆书架构师。你只返回合法 JSON，不使用 Markdown，不输出版权文本长摘录。",
      },
      {
        role: "user",
        content: this.analyzeBookPrompt(input),
      },
    ]);

    return this.parseJson(content);
  }

  private async callOpenAICompatible(
    provider: ProviderConfigDto,
    messages: Array<{ role: "system" | "user"; content: string }>,
  ): Promise<string> {
    if (!provider.baseUrl || !provider.apiKey || !provider.model) {
      throw new BadRequestException(
        "OpenAI-compatible provider requires baseUrl, apiKey, and model.",
      );
    }

    const url = `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: provider.temperature ?? 0.2,
    };

    if (provider.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
      },
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
      throw new BadRequestException("Provider response did not include message content.");
    }

    return content;
  }

  private parseJson(content: string) {
    const trimmed = content.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new BadRequestException("Provider response was not JSON.");
    }

    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch (error) {
      throw new BadRequestException(
        `Provider response JSON parse failed: ${(error as Error).message}`,
      );
    }
  }

  private buildRubricPrompt(input: BuildRubricDto): string {
    const styleProfile = this.buildStyleProfile(input);
    const marketProfile = this.buildMarketProfile(input);
    return `
请拆解一章成熟中文网文，提炼它为什么能让读者继续读，并生成可迁移的评分 Rubric。

作品类型：${input.genre}
目标平台：${styleProfile.platformLabel}
目标读者：${styleProfile.audienceLabel}
阅读场景：${styleProfile.readingModeLabel}
平台风格画像：${JSON.stringify(styleProfile.profile)}
细分分类：${marketProfile.category}
主题承诺：${marketProfile.theme}
标签：${marketProfile.tags.join("、") || "无"}
显性关键词：${marketProfile.explicitKeywords.join("、") || "无"}
隐性期待：${marketProfile.implicitExpectations.join("、") || "无"}
标题/简介承诺：${marketProfile.positioningPromise || "无"}
章节标题：${input.referenceTitle}

成熟章节：
${input.referenceText}

请严格返回这个 JSON 结构：
{
  "mode": "llm-rubric",
  "reference": {
    "title": "章节标题",
    "genre": "作品类型",
    "platform": "目标平台",
    "audience": "目标读者",
    "readingMode": "阅读场景",
    "oneSentenceSummary": "本章一句话功能"
  },
  "styleProfile": {
    "platform": "目标平台",
    "audience": "目标读者",
    "readingMode": "阅读场景",
    "pace": "节奏要求",
    "emotion": "情绪要求",
    "hookDensity": "钩子密度要求",
    "language": "语言风格要求",
    "setupTolerance": "铺垫容忍度"
  },
  "marketProfile": {
    "category": "细分分类",
    "theme": "主题承诺",
    "tags": ["标签"],
    "explicitKeywords": ["显性关键词"],
    "implicitExpectations": ["隐性期待"],
    "positioningPromise": "标题或简介承诺",
    "readerExpectationModel": ["该市场定位下读者默认期待的结构元素"]
  },
  "principles": [
    {
      "id": "p1",
      "title": "可复用原则名称",
      "sourceObservation": "从参考章节观察到的具体优点，不要大段复述原文",
      "reusableRule": "抽象成其他作品也能迁移的写作原则",
      "migrationQuestion": "用户写自己章节时应该自问的问题"
    }
  ],
  "rubric": {
    "id": "rubric-webnovel-v1",
    "genre": "${input.genre}",
    "platform": "${input.platform}",
    "audience": "${input.audience}",
    "readingMode": "${input.readingMode}",
    "category": "${input.category}",
    "theme": "${input.theme}",
    "styleProfile": {},
    "marketProfile": {},
    "metrics": [
      {
        "id": "chapter-goal",
        "name": "主角目标清晰度",
        "description": "指标定义",
        "scale": {
          "low": "0-3 分标准",
          "medium": "4-6 分标准",
          "high": "7-10 分标准"
        },
        "referencePrincipleId": "p1"
      }
    ]
  },
  "editorNote": "这份 Rubric 最适合检查什么类型的章节"
}

Rubric 必须包含这些指标：${baseRubricMetrics.map((item) => item.name).join("、")}。
Rubric 必须按目标平台和目标读者校准，不要只判断文学质量。
Rubric 必须判断分类、主题、标签、关键词和隐性期待是否命中。
关键词不是词频统计，而是读者点击期待信号。显性关键词要自然出现，隐性期待要落实到结构。
如果参考章节优点和目标平台风格不完全一致，请明确哪些原则可迁移、哪些不该迁移。
每个指标必须能用于评分，不要写空泛表述。
`.trim();
  }

  private analyzeBookPrompt(input: AnalyzeBookDto): string {
    return `
请把一本文本小说拆解成可复用的创作资产。目标不是复刻原作，而是帮助作者理解结构，并导出“原创化”角色/世界书/写作约束。

作品标题：${input.title}
作品题材：${input.genre}

小说正文：
${input.text}

请严格返回这个 JSON 结构：
{
  "mode": "book-asset-analysis",
  "book": {
    "title": "作品标题",
    "genre": "题材",
    "chapterCountEstimate": 0,
    "oneSentencePremise": "一句话概括",
    "coreAppeal": ["核心吸引力"]
  },
  "worldbuilding": {
    "worldRules": ["世界运行规则"],
    "powerSystem": ["能力/修炼/技术体系"],
    "locations": [{"name":"地点","function":"叙事功能","originalizationNote":"原创化时如何替换"}],
    "factions": [{"name":"势力","goal":"目标","conflictRole":"冲突功能","originalizationNote":"原创化时如何替换"}],
    "itemsAndTerms": [{"name":"专有名词","function":"功能","risk":"direct-copy-risk|generic|low"}]
  },
  "characters": [
    {
      "sourceName": "原作角色名或代号",
      "role": "主角/反派/导师/配角",
      "archetype": "抽象原型",
      "personalityCore": ["性格底色"],
      "desire": "核心欲望",
      "fearOrWound": "恐惧或创伤",
      "capability": "能力功能，不复制专名",
      "relationshipFunction": "在关系网中的叙事功能",
      "originalCharacterCard": {
        "namePlaceholder": "原创角色名占位",
        "summary": "可导入写作软件的原创化角色简介",
        "personality": "原创化性格描述",
        "scenario": "适合开局场景",
        "firstMessage": "角色开场白草稿",
        "doNotCopy": ["必须避开的原作可识别元素"]
      }
    }
  ],
  "relationships": {
    "nodes": [{"id":"c1","label":"角色","type":"character|faction|location"}],
    "edges": [{"source":"c1","target":"c2","label":"关系","tension":"冲突/依赖/暧昧/师徒等"}]
  },
  "plotlines": [
    {
      "name": "故事线名称",
      "type": "主线/成长线/感情线/副本线/阴谋线",
      "start": "起点",
      "turningPoints": ["关键转折"],
      "payoff": "阶段兑现",
      "reusablePattern": "可学习的结构模式"
    }
  ],
  "chronicle": [
    {"order": 1, "event": "大事纪事件", "impact": "影响", "storyFunction": "叙事功能"}
  ],
  "historyBook": {
    "ancientHistory": ["远古史/背景史"],
    "recentHistory": ["近代事件"],
    "publicMyths": ["世界内流传的传说"],
    "hiddenTruths": ["隐藏真相，不要大段复述原文"]
  },
  "sourceAssetArchive": {
    "usageNotice": "原作拆解笔记，仅供学习、研究、合法授权或个人私用场景；商业复用需自行确认权利边界。",
    "sourceCharacterNotes": [
      {
        "name": "原作角色名或代号",
        "role": "角色定位",
        "recognizableTraits": ["可识别特征摘要"],
        "relationshipNotes": ["关系笔记"],
        "plotFunction": "在原作中的功能"
      }
    ],
    "sourceWorldNotes": ["原作世界观笔记"],
    "sourceTimelineNotes": ["原作大事纪笔记"],
    "sourceRelationshipNotes": ["原作关系网笔记"],
    "sourceTermNotes": ["原作专有名词笔记"]
  },
  "exportPackage": {
    "tavernCharacterCards": [
      {
        "name": "原创角色名占位",
        "description": "角色卡描述",
        "personality": "性格",
        "scenario": "场景",
        "first_mes": "开场白",
        "creator_notes": "原创化说明和避险提醒"
      }
    ],
    "worldBookEntries": [
      {"keys":["关键词"],"content":"原创化世界书条目","insertion_order":100}
    ],
    "writingConstraints": ["给 AI 小说生成器的写作约束"],
    "doNotCopyList": ["不能直接复制的专名、关系、桥段、事件链"]
  },
  "originalizationReport": {
    "riskLevel": "low|medium|high",
    "safeToLearn": ["可以学习的抽象原则"],
    "mustTransform": ["必须重写或替换的可识别元素"],
    "fanFictionWarning": "同人/换皮/商业化风险提示",
    "rewriteStrategy": ["原创化迁移策略"]
  },
  "usageRiskNotice": {
    "summary": "工具只做文本拆解和格式转换，不判断用户最终用途是否合法。",
    "recommendedUse": ["读书笔记", "学习分析", "合法授权素材整理", "个人私用角色扮演", "原创化迁移参考"],
    "higherRiskUse": ["商业化使用原作可识别角色", "复制专有名词和关系网", "换皮复刻关键事件链"],
    "userResponsibility": "用户应确认自己对上传文本、导出素材和后续使用方式拥有必要权利或合法依据。"
  }
}

要求：
1. 不要大段复述原文。
2. 可以保留原作拆解笔记，但必须和原创化导出包分区。
3. 原作拆解笔记用于学习、研究、合法授权或个人私用场景；原创化导出包用于低风险迁移。
4. 不要鼓励未授权商业化复制原作姓名、专有名词、人物关系网、关键事件链。
5. 对角色和世界观必须同时输出“原作拆解笔记”和“抽象原型 + 原创化导出卡”。
6. 如果输入文本很长，只基于当前可见文本做分析，并在结果中提示 chapterCountEstimate 是估算。
`.trim();
  }

  private scoreChapterPrompt(input: ScoreChapterDto): string {
    const styleProfile = this.buildStyleProfile(input);
    const marketProfile = this.buildMarketProfile(input);
    const performanceSnapshot = this.buildPerformanceSnapshot(input.performanceSnapshot);
    return `
请使用给定 Rubric 质检用户章节。你要像网文编辑一样严格打分，并指出具体证据、问题和改法。

目标平台：${styleProfile.platformLabel}
目标读者：${styleProfile.audienceLabel}
阅读场景：${styleProfile.readingModeLabel}
平台风格画像：${JSON.stringify(styleProfile.profile)}
细分分类：${marketProfile.category}
主题承诺：${marketProfile.theme}
标签：${marketProfile.tags.join("、") || "无"}
显性关键词：${marketProfile.explicitKeywords.join("、") || "无"}
隐性期待：${marketProfile.implicitExpectations.join("、") || "无"}
标题/简介承诺：${marketProfile.positioningPromise || "无"}
数据表现快照：${performanceSnapshot.summary}

Rubric：
${JSON.stringify(input.rubric, null, 2)}

用户章节标题：${input.chapterTitle}

用户章节：
${input.chapterText}

请严格返回这个 JSON 结构：
{
  "mode": "llm-score",
  "chapterTitle": "用户章节标题",
  "totalScore": 6.5,
  "scores": [
    {
      "metricId": "chapter-goal",
      "name": "主角目标清晰度",
      "score": 7,
      "reason": "为什么这么打分",
      "evidence": "用户文本中的具体证据，控制在 40 字以内",
      "fix": "可执行修改建议",
      "referencePrincipleId": "p1"
    }
  ],
  "strongestPoint": "最强项",
  "weakestPoint": "最大短板",
  "styleFit": {
    "score": 7,
    "platformRisk": "和目标平台不匹配的最大风险",
    "audienceRisk": "和目标读者不匹配的最大风险",
    "readingModeRisk": "和阅读场景不匹配的最大风险"
  },
  "marketFit": {
    "score": 7,
    "categoryRisk": "和细分分类不匹配的最大风险",
    "themeRisk": "主题承诺不清或兑现不足的风险",
    "keywordRisk": "显性关键词或隐性期待命中不足的风险",
    "frontloadRisk": "卖点没有足够前置的风险"
  },
  "performanceFit": {
    "hasData": true,
    "funnelSummary": "用一句话总结数据漏斗",
    "impressionDiagnosis": "展现量对应的入口/分发问题；没有数据则写未提供",
    "clickDiagnosis": "点击率对应的标题、分类、关键词承诺问题；没有数据则写未提供",
    "read30sDiagnosis": "阅读30s对应的开头理解成本和初始钩子问题；没有数据则写未提供",
    "read60sDiagnosis": "阅读60s对应的冲突升级和情绪维持问题；没有数据则写未提供",
    "bottomDiagnosis": "触底率对应的中后段节奏、信息密度和段落功能问题；没有数据则写未提供",
    "followDiagnosis": "追更对应的结尾钩子、长期目标和系列承诺问题；没有数据则写未提供",
    "priority": "最该先修的漏斗环节"
  },
  "nextRevisionMove": "下一步最该改什么",
  "rewriteBrief": {
    "target": "建议局部重写的位置",
    "strategy": "重写策略，不直接整章代写"
  },
  "revisionPrompt": {
    "title": "给写作 AI 的改文提示词标题",
    "prompt": "一段可以直接复制给写作 AI 的提示词，必须包含修改目标、平台风格、市场定位、需要保留的内容、重点改法、禁止事项、输出格式"
  }
}

要求：
1. 每个 Rubric 指标都必须评分。
2. score 是 0 到 10 的数字。
3. evidence 必须来自用户章节，不要引用参考章节。
4. fix 必须是可执行改法，不要只说“加强描写”。
5. 评分不是文学奖评分，而是目标平台读者是否愿意继续读的商业阅读体验评分。
6. 如果关键词没有直接出现但隐性期待已经被结构满足，要说明；如果关键词出现但没有承载期待，也要扣分。
7. 数据表现只做归因辅助，不要把低数据直接等同于文本差；要结合章节证据判断可能原因。
8. revisionPrompt 要写给另一个“负责改文的 AI”，让它知道怎么改文；不要让它重新开新故事。
`.trim();
  }

  private mockRubric(input: BuildRubricDto) {
    const styleProfile = this.buildStyleProfile(input);
    const marketProfile = this.buildMarketProfile(input);
    return {
      mode: "mock-rubric",
      reference: {
        title: input.referenceTitle,
        genre: input.genre,
        platform: input.platform,
        audience: input.audience,
        readingMode: input.readingMode,
        oneSentenceSummary:
          "用具体压迫和延迟兑现建立读者期待，再把期待转成可追读的问题。",
      },
      styleProfile: {
        platform: styleProfile.platformLabel,
        audience: styleProfile.audienceLabel,
        readingMode: styleProfile.readingModeLabel,
        ...styleProfile.profile,
      },
      marketProfile: {
        ...marketProfile,
        readerExpectationModel: [
          `${marketProfile.category} 的核心卖点要尽早出现`,
          `${marketProfile.theme} 需要绑定主角目标和冲突`,
          "显性关键词要自然进入场景，隐性期待要转化为情绪债和钩子",
        ],
      },
      principles: [
        {
          id: "p1",
          title: "具体损失制造情绪债",
          sourceObservation: "参考章节通过可感知的损失或羞辱，让读者等待主角反击。",
          reusableRule: "不要只写态度冲突，要让阻碍造成资格、资源、关系或身份损失。",
          migrationQuestion: "我的主角这一章如果失败，会失去什么具体东西？",
        },
        {
          id: "p2",
          title: "结尾用升级问题推动追读",
          sourceObservation: "章节结尾没有自然停住，而是抛出更高一级的新风险。",
          reusableRule: "结尾要把已解决的小冲突转成更大的危机、秘密或奖励。",
          migrationQuestion: "读者看完本章后，会立刻想知道哪个具体问题的答案？",
        },
        {
          id: "p3",
          title: "市场关键词不是堆词，而是期待兑现",
          sourceObservation: "成熟章节会让分类卖点自然进入冲突，不把关键词孤立摆放。",
          reusableRule:
            "把标签和关键词翻译成读者期待的结构元素，例如低估、反转、关系破裂或能力展示。",
          migrationQuestion: "我的关键词是否真的带来了读者期待的事件、情绪或反转？",
        },
      ],
      rubric: {
        id: `rubric-${input.genre}-mock-v1`,
        genre: input.genre,
        platform: input.platform,
        audience: input.audience,
        readingMode: input.readingMode,
        category: input.category,
        theme: input.theme,
        styleProfile: {
          platform: styleProfile.platformLabel,
          audience: styleProfile.audienceLabel,
          readingMode: styleProfile.readingModeLabel,
          ...styleProfile.profile,
        },
        marketProfile: {
          ...marketProfile,
          readerExpectationModel: [
            `${marketProfile.category} 的核心卖点要尽早出现`,
            `${marketProfile.theme} 需要绑定主角目标和冲突`,
            "显性关键词要自然进入场景，隐性期待要转化为情绪债和钩子",
          ],
        },
        metrics: baseRubricMetrics.map((metric, index) => ({
          ...metric,
          referencePrincipleId: index < 4 ? "p1" : index < 10 ? "p2" : "p3",
        })),
      },
      editorNote: "这份 Rubric 适合先验证开局和单章追读能力。",
    };
  }

  private mockScore(input: ScoreChapterDto) {
    const styleProfile = this.buildStyleProfile(input);
    const marketProfile = this.buildMarketProfile(input);
    const performanceSnapshot = this.buildPerformanceSnapshot(input.performanceSnapshot);
    const lengthScore = input.chapterText.length > 800 ? 6.8 : 5.4;
    const rubric = input.rubric as { metrics?: Array<{ id: string; name: string }> };
    const rubricMetrics = rubric.metrics?.length ? rubric.metrics : baseRubricMetrics;

    return {
      mode: "mock-score",
      chapterTitle: input.chapterTitle,
      totalScore: lengthScore,
      scores: rubricMetrics.map((metric) => ({
        metricId: metric.id,
        name: metric.name,
        score: lengthScore,
        reason: "mock 模式只验证接口和报告结构，不判断真实文本质量。",
        evidence: input.chapterText.slice(0, 40),
        fix: "接入真实 OpenAI-compatible Provider 后，让模型给出证据段落和局部改法。",
        referencePrincipleId: "p1",
      })),
      strongestPoint: "章节已经可以进入结构化质检流程。",
      weakestPoint: "mock 模式不会读取真实剧情逻辑。",
      styleFit: {
        score: lengthScore,
        platformRisk: `${styleProfile.platformLabel} 需要按平台节奏重新验证真实文本。`,
        audienceRisk: `${styleProfile.audienceLabel} 的核心期待需要真实模型判断。`,
        readingModeRisk: `${styleProfile.readingModeLabel} 下的卡点强度需要进一步校准。`,
      },
      marketFit: {
        score: lengthScore,
        categoryRisk: `${marketProfile.category} 的分类期待需要真实模型检查是否前置。`,
        themeRisk: `${marketProfile.theme} 是否清楚绑定本章目标和冲突，需要真实模型判断。`,
        keywordRisk: `显性关键词「${marketProfile.explicitKeywords.join("、") || "无"}」与隐性期待「${marketProfile.implicitExpectations.join("、") || "无"}」需要验证是否自然命中。`,
        frontloadRisk: "卖点是否出现在前段并支撑点击后的继续阅读，需要真实模型判断。",
      },
      performanceFit: {
        hasData: performanceSnapshot.hasData,
        funnelSummary: performanceSnapshot.hasData
          ? "mock 模式已接收数据漏斗，真实模型会结合文本证据做归因。"
          : "未提供数据表现快照，仅进行文本结构评分。",
        impressionDiagnosis: performanceSnapshot.values.impressions
          ? `展现量 ${performanceSnapshot.values.impressions}，需要结合平台分发和标签命中判断入口问题。`
          : "未提供展现量。",
        clickDiagnosis: performanceSnapshot.values.clickThroughRate
          ? `点击率 ${performanceSnapshot.values.clickThroughRate}%，优先检查标题/简介承诺和正文卖点是否一致。`
          : "未提供点击率。",
        read30sDiagnosis: performanceSnapshot.values.read30sRate
          ? `阅读30s ${performanceSnapshot.values.read30sRate}%，优先检查开头500字是否快速建立目标、冲突和卖点。`
          : "未提供阅读30s。",
        read60sDiagnosis: performanceSnapshot.values.read60sRate
          ? `阅读60s ${performanceSnapshot.values.read60sRate}%，优先检查冲突是否持续升级。`
          : "未提供阅读60s。",
        bottomDiagnosis: performanceSnapshot.values.bottomRate
          ? `触底率 ${performanceSnapshot.values.bottomRate}%，优先检查中后段是否空转或信息重复。`
          : "未提供触底率。",
        followDiagnosis: performanceSnapshot.values.followRate
          ? `追更 ${performanceSnapshot.values.followRate}%，优先检查章节末钩子和长期目标是否足够明确。`
          : "未提供追更。",
        priority: performanceSnapshot.hasData
          ? "先看点击率和30s，再看触底率和追更。"
          : "先补充平台后台数据，再做漏斗归因。",
      },
      nextRevisionMove: "配置真实模型后重新评分，重点检查目标、冲突、情绪债和钩子。",
      rewriteBrief: {
        target: "待真实模型判断",
        strategy: "先保持剧情事实，只做目标和冲突增强。",
      },
      revisionPrompt: {
        title: "按网文点评报告局部改写章节",
        prompt: this.buildMockRevisionPrompt(input, {
          styleProfile,
          marketProfile,
          performanceSnapshot,
        }),
      },
    };
  }

  private mockBookAnalysis(input: AnalyzeBookDto) {
    return {
      mode: "book-asset-analysis",
      book: {
        title: input.title,
        genre: input.genre,
        chapterCountEstimate: Math.max(1, Math.ceil(input.text.length / 3000)),
        oneSentencePremise:
          "一个被低估的主角在压力中发现隐藏能力，并被卷入更大的势力冲突。",
        coreAppeal: ["低谷开局", "能力觉醒", "身份反转", "升级危机"],
      },
      worldbuilding: {
        worldRules: [
          "资源、身份和能力共同决定角色社会位置。",
          "公开场合的评价会转化为情绪债和后续反击期待。",
        ],
        powerSystem: ["隐藏能力来源", "阶段性解锁", "能力展示带来新敌人"],
        locations: [
          {
            name: "考场/演武场",
            function: "公开评价和身份压迫的舞台",
            originalizationNote: "替换为原创机构、公司考核、试炼场或医院急诊等场景。",
          },
        ],
        factions: [
          {
            name: "家族/学院/评审机构",
            goal: "维护既有秩序和资源分配",
            conflictRole: "压迫主角并制造反击舞台",
            originalizationNote: "更换组织名称、制度、利益来源和内部派系。",
          },
        ],
        itemsAndTerms: [
          {
            name: "特殊石碑/玉牌/信物",
            function: "触发隐藏身份或旧案线索",
            risk: "generic",
          },
        ],
      },
      characters: [
        {
          sourceName: "主角原型",
          role: "主角",
          archetype: "被低估的隐忍型成长主角",
          personalityCore: ["克制", "重承诺", "抗压", "不轻易解释"],
          desire: "证明自身价值并夺回被剥夺的尊严和资源",
          fearOrWound: "重要关系或过去失败造成的自我怀疑",
          capability: "一个尚未被公众理解的特殊能力来源",
          relationshipFunction: "承载读者代入、压抑和反击期待",
          originalCharacterCard: {
            namePlaceholder: "原创主角名",
            summary:
              "出身普通或被边缘化的青年，表面沉默，实际掌握一项尚未公开的关键能力。",
            personality: "少言、敏锐、重承诺，在被压迫时优先观察局势再反击。",
            scenario:
              "主角在公开考核中被取消资格，却发现一件旧案信物指向更大的阴谋。",
            firstMessage: "你们可以取消我的资格，但这件信物，最好解释清楚。",
            doNotCopy: ["原作姓名", "原作专有能力名", "原作导师设定", "原作关键事件链"],
          },
        },
      ],
      relationships: {
        nodes: [
          { id: "c1", label: "原创主角名", type: "character" },
          { id: "f1", label: "原创评审机构", type: "faction" },
          { id: "l1", label: "公开考核场", type: "location" },
        ],
        edges: [
          { source: "c1", target: "f1", label: "被压制/反击", tension: "冲突" },
          { source: "c1", target: "l1", label: "身份被公开评价", tension: "压力" },
        ],
      },
      plotlines: [
        {
          name: "主角成长线",
          type: "主线",
          start: "主角被公开否定并失去机会",
          turningPoints: ["发现旧案线索", "展示隐藏能力", "引出更高层敌人"],
          payoff: "主角获得阶段性认可，但危机升级",
          reusablePattern: "压迫 -> 暗示底牌 -> 反击 -> 更大危机",
        },
      ],
      chronicle: [
        {
          order: 1,
          event: "主角在公开场合被取消资格",
          impact: "建立情绪债和反击期待",
          storyFunction: "开局冲突",
        },
        {
          order: 2,
          event: "旧案信物出现",
          impact: "把个人羞辱升级为长期阴谋",
          storyFunction: "追读钩子",
        },
      ],
      historyBook: {
        ancientHistory: ["某个旧制度长期决定能力者的资源分配。"],
        recentHistory: ["三年前发生过一场影响主角命运的旧案。"],
        publicMyths: ["公众相信考核公平，强者自然上位。"],
        hiddenTruths: ["考核背后存在利益操控，主角旧案并非意外。"],
      },
      sourceAssetArchive: {
        usageNotice:
          "原作拆解笔记，仅供学习、研究、合法授权或个人私用场景；商业复用需自行确认权利边界。",
        sourceCharacterNotes: [
          {
            name: "主角原型",
            role: "主角",
            recognizableTraits: ["被公开否定", "隐忍观察", "隐藏能力", "旧案关联"],
            relationshipNotes: ["与评审机构存在压迫关系", "与旧案人物存在潜在线索关系"],
            plotFunction: "承载代入、压抑、反击和追查旧案的主线功能",
          },
        ],
        sourceWorldNotes: [
          "公开考核决定资源分配。",
          "旧案信物连接个人遭遇和更大阴谋。",
        ],
        sourceTimelineNotes: [
          "三年前发生旧案。",
          "主角被取消资格。",
          "主角发现信物并开始调查。",
        ],
        sourceRelationshipNotes: [
          "主角与评审机构：压迫/反击。",
          "主角与旧案线索：调查/揭露。",
        ],
        sourceTermNotes: ["考核场", "旧案信物", "隐藏能力"],
      },
      exportPackage: {
        tavernCharacterCards: [
          {
            name: "原创主角名",
            description:
              "被低估的青年，表面沉默克制，实际掌握能改变局势的隐藏能力。",
            personality: "隐忍、敏锐、重承诺、反击时果断。",
            scenario:
              "公开考核现场，主角被当众剥夺资格，却发现评审身上有旧案信物。",
            first_mes: "这场考核我可以不参加，但你腰间那枚信物，从哪里来的？",
            creator_notes:
              "这是原创化角色卡。不要使用原作姓名、专有能力名、组织名或关键桥段。",
          },
        ],
        worldBookEntries: [
          {
            keys: ["公开考核", "旧案信物", "隐藏能力"],
            content:
              "在这个原创世界中，公开考核决定资源分配。旧案信物会触发主角调查线，隐藏能力用于阶段性反击。",
            insertion_order: 100,
          },
        ],
        writingConstraints: [
          "保持主角隐忍但不软弱。",
          "每次能力展示都必须带来更高层级的新问题。",
          "不要复制原作专有名词、地名、功法、组织名和事件链。",
        ],
        doNotCopyList: ["原作角色名", "原作组织名", "原作能力体系专名", "原作关键桥段顺序"],
      },
      originalizationReport: {
        riskLevel: "medium",
        safeToLearn: ["压迫-反击结构", "隐藏能力的阶段性揭示", "公开评价场景的情绪债"],
        mustTransform: ["姓名", "专有名词", "人物关系网", "关键事件链", "世界历史具体事件"],
        fanFictionWarning:
          "同人或换皮商业化存在风险。应抽象人物底色和结构功能，再重写姓名、关系、设定规则和事件链。",
        rewriteStrategy: [
          "把角色换成原创身份、原创创伤和原创关系。",
          "把世界规则改成新的资源分配逻辑。",
          "保留情绪模型，不保留具体桥段。",
        ],
      },
      usageRiskNotice: {
        summary: "工具只做文本拆解和格式转换，不判断用户最终用途是否合法。",
        recommendedUse: [
          "读书笔记",
          "学习分析",
          "合法授权素材整理",
          "个人私用角色扮演",
          "原创化迁移参考",
        ],
        higherRiskUse: [
          "商业化使用原作可识别角色",
          "复制专有名词和关系网",
          "换皮复刻关键事件链",
        ],
        userResponsibility:
          "用户应确认自己对上传文本、导出素材和后续使用方式拥有必要权利或合法依据。",
      },
    };
  }

  private buildStyleProfile(input: {
    platform: string;
    audience: string;
    readingMode: string;
  }) {
    return {
      platformLabel:
        labelMaps.platform[input.platform as keyof typeof labelMaps.platform] ||
        input.platform,
      audienceLabel:
        labelMaps.audience[input.audience as keyof typeof labelMaps.audience] ||
        input.audience,
      readingModeLabel:
        labelMaps.readingMode[
          input.readingMode as keyof typeof labelMaps.readingMode
        ] || input.readingMode,
      profile: platformProfiles[input.platform] || platformProfiles.other,
    };
  }

  private buildMarketProfile(input: {
    category: string;
    theme: string;
    tags?: string[];
    explicitKeywords?: string[];
    implicitExpectations?: string[];
    positioningPromise?: string;
  }) {
    return {
      category: input.category,
      theme: input.theme,
      tags: this.cleanList(input.tags),
      explicitKeywords: this.cleanList(input.explicitKeywords),
      implicitExpectations: this.cleanList(input.implicitExpectations),
      positioningPromise: input.positioningPromise?.trim() || "",
    };
  }

  private cleanList(value?: string[]) {
    return [...new Set((value || []).map((item) => item.trim()).filter(Boolean))];
  }

  private buildPerformanceSnapshot(
    value?: ScoreChapterDto["performanceSnapshot"],
  ) {
    const values = {
      impressions: value?.impressions,
      clickThroughRate: value?.clickThroughRate,
      bottomRate: value?.bottomRate,
      read30sRate: value?.read30sRate,
      read60sRate: value?.read60sRate,
      followRate: value?.followRate,
    };
    const entries = Object.entries(values).filter(([, item]) => item !== undefined);

    return {
      hasData: entries.length > 0,
      values,
      summary: entries.length
        ? entries.map(([key, item]) => `${key}: ${item}`).join(", ")
        : "未提供数据表现快照",
    };
  }

  private buildMockRevisionPrompt(
    input: ScoreChapterDto,
    context: {
      styleProfile: ReturnType<AnalysisService["buildStyleProfile"]>;
      marketProfile: ReturnType<AnalysisService["buildMarketProfile"]>;
      performanceSnapshot: ReturnType<AnalysisService["buildPerformanceSnapshot"]>;
    },
  ) {
    const { styleProfile, marketProfile, performanceSnapshot } = context;
    return `
你是负责改文的中文网文写作 AI。请基于下面的定位和问题，对章节做“局部增强式改写”，不要另起炉灶。

目标平台：${styleProfile.platformLabel}
目标读者：${styleProfile.audienceLabel}
阅读场景：${styleProfile.readingModeLabel}
平台风格要求：${JSON.stringify(styleProfile.profile)}

细分分类：${marketProfile.category}
主题承诺：${marketProfile.theme}
标签：${marketProfile.tags.join("、") || "无"}
显性关键词：${marketProfile.explicitKeywords.join("、") || "无"}
隐性期待：${marketProfile.implicitExpectations.join("、") || "无"}
标题/简介承诺：${marketProfile.positioningPromise || "无"}

数据表现：${performanceSnapshot.summary}

请优先修改：
1. 前 500 字更早亮出分类卖点和主角目标。
2. 把标签和关键词转化为事件、冲突、情绪债，不要机械堆词。
3. 增强目标平台需要的节奏、情绪反馈和结尾钩子。
4. 保留原章节的基本人物、场景和剧情事实，只调整表达、顺序、冲突强度和钩子。

禁止：
1. 不要新增无关世界观和大量设定说明。
2. 不要把整章改成完全不同的故事。
3. 不要只润色文笔，必须解决目标、冲突、卖点前置和追读问题。
4. 不要输出分析过程。

输出格式：
{
  "revisionStrategy": "一句话说明改写策略",
  "changedSections": ["改动了哪些段落功能"],
  "revisedChapter": "改写后的章节正文",
  "whyItWorks": ["对应解决了哪些追读/点击/留存问题"]
}

待改章节标题：${input.chapterTitle}
待改章节正文：
${input.chapterText}
`.trim();
  }
}
