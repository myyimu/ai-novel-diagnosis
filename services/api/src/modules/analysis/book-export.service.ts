import { BadRequestException, Injectable } from "@nestjs/common";

interface BookAnalysisExportResult {
  book?: {
    title?: string;
    genre?: string;
    oneSentencePremise?: string;
    coreAppeal?: string[];
  };
  characters?: Array<{
    sourceName?: string;
    role?: string;
    archetype?: string;
    personalityCore?: string[];
    originalCharacterCard?: unknown;
  }>;
  worldbuilding?: {
    worldRules?: string[];
    powerSystem?: string[];
    itemsAndTerms?: Array<{ name?: string; function?: string; risk?: string }>;
  };
  relationships?: unknown;
  plotlines?: Array<{
    name?: string;
    type?: string;
    reusablePattern?: string;
    payoff?: string;
  }>;
  chronicle?: Array<{ order?: number; event?: string; storyFunction?: string }>;
  historyBook?: Record<string, string[]>;
  generationAssets?: {
    worldBook?: {
      entries?: unknown[];
      activationRules?: string[];
      importNotes?: string;
    };
    styleBible?: {
      narrativePOV?: string;
      toneKeywords?: string[];
      proseRules?: string[];
      dialogueRules?: string[];
      tabooList?: string[];
    };
    volumePlan?: Array<{
      volume?: string;
      goal?: string;
      mainConflict?: string;
      climax?: string;
      endingHook?: string;
    }>;
    sceneTemplates?: Array<{
      name?: string;
      useWhen?: string;
      beats?: string[];
      avoid?: string[];
    }>;
    characterVoiceGuide?: Array<{
      character?: string;
      speechStyle?: string;
      forbiddenTone?: string[];
    }>;
    antagonistPressurePlan?: Array<{
      antagonist?: string;
      pressureMethod?: string;
      defeatCost?: string;
    }>;
    titleSynopsisKeywordPack?: {
      titleKeywords?: string[];
      synopsisSellingPoints?: string[];
      searchTags?: string[];
      openingKeywords?: string[];
    };
    consistencyChecklist?: string[];
  };
  writingSupport?: {
    chapterFunctionTable?: Array<{
      chapterOrder?: number;
      title?: string;
      function?: string;
      goal?: string;
      conflict?: string;
      hook?: string;
    }>;
    foreshadowingLedger?: Array<{
      setup?: string;
      setupChapter?: number;
      payoff?: string;
      status?: string;
      risk?: string;
    }>;
    emotionalBeatMap?: Array<{
      chapterOrder?: number;
      beats?: string[];
      intensity?: string;
      readerPromise?: string;
    }>;
    pacingCurve?: Array<{
      chapterOrder?: number;
      informationDensity?: string;
      conflictIntensity?: string;
      hookStrength?: string;
      risk?: string;
    }>;
    readerPromiseChecklist?: Array<{
      promise?: string;
      status?: string;
      nextCheck?: string;
    }>;
    conflictMatrix?: Array<{
      parties?: string[];
      conflict?: string;
      level?: string;
      nextEscalation?: string;
    }>;
    continuationPack?: {
      currentState?: string;
      nextChapterGoal?: string;
      openThreads?: string[];
      oocGuards?: string[];
      settingGuards?: string[];
      styleConstraints?: string[];
      aiPrompt?: string;
    };
    qualityDiagnosis?: {
      strengths?: string[];
      weaknesses?: string[];
      priorityFixes?: string[];
    };
  };
  sourceAssetArchive?: unknown;
  exportPackage?: {
    tavernCharacterCards?: unknown[];
    worldBookEntries?: unknown[];
    writingConstraints?: string[];
    doNotCopyList?: string[];
  };
  originalizationReport?: {
    riskLevel?: string;
    safeToLearn?: string[];
    mustTransform?: string[];
    rewriteStrategy?: string[];
    fanFictionWarning?: string;
  };
  usageRiskNotice?: {
    summary?: string;
    recommendedUse?: string[];
    higherRiskUse?: string[];
    userResponsibility?: string;
  };
  mapReduce?: {
    mapCount?: number;
    reducerNote?: string;
  };
}

export type BookExportFormat =
  | "markdown"
  | "json"
  | "tavern-card"
  | "world-book"
  | "sillytavern-world-info"
  | "continuation-pack"
  | "style-bible"
  | "outline"
  | "prompt-pack"
  | "do-not-copy";

export type BookExportMode = "notes" | "originalized";

@Injectable()
export class BookExportService {
  export(
    result: unknown,
    format: BookExportFormat,
    mode: BookExportMode = "notes",
  ) {
    const sourceAnalysis = result as BookAnalysisExportResult;
    const analysis =
      mode === "originalized"
        ? this.toOriginalizedAnalysis(sourceAnalysis)
        : sourceAnalysis;
    switch (format) {
      case "markdown":
        return {
          filename: this.filename(analysis, "md", mode),
          contentType: "text/markdown; charset=utf-8",
          content:
            mode === "originalized"
              ? this.withOriginalizedHeader(this.toMarkdown(analysis))
              : this.toMarkdown(analysis),
        };
      case "json":
        return {
          filename: this.filename(analysis, "json", mode),
          contentType: "application/json; charset=utf-8",
          content: JSON.stringify(
            {
              exportMode: mode,
              modeNote:
                mode === "originalized"
                  ? "原创化导出已尽量抽象、去标识化；仍需作者自行复核相似表达、专有名词、桥段组合与商业使用风险。"
                  : "原作拆解笔记保留更多来源信息，仅建议用于学习、复盘和内部研究。",
              ...analysis,
            },
            null,
            2,
          ),
        };
      case "tavern-card":
        return {
          filename: this.filename(analysis, "tavern-card.json", mode),
          contentType: "application/json; charset=utf-8",
          content: JSON.stringify(
            mode === "originalized"
              ? this.toOriginalizedTavernCards(analysis)
              : analysis.exportPackage?.tavernCharacterCards || [],
            null,
            2,
          ),
        };
      case "world-book":
        return {
          filename: this.filename(analysis, "world-book.json", mode),
          contentType: "application/json; charset=utf-8",
          content: JSON.stringify(
            analysis.generationAssets?.worldBook?.entries ||
              analysis.exportPackage?.worldBookEntries ||
              [],
            null,
            2,
          ),
        };
      case "sillytavern-world-info":
        return {
          filename: this.filename(
            analysis,
            "sillytavern-world-info.json",
            mode,
          ),
          contentType: "application/json; charset=utf-8",
          content: JSON.stringify(
            this.toSillyTavernWorldInfo(analysis),
            null,
            2,
          ),
        };
      case "continuation-pack":
        return {
          filename: this.filename(analysis, "continuation-pack.json", mode),
          contentType: "application/json; charset=utf-8",
          content: JSON.stringify(
            {
              exportMode: mode,
              book: analysis.book,
              continuationPack: analysis.writingSupport?.continuationPack,
              openForeshadowing: analysis.writingSupport?.foreshadowingLedger,
              conflictMatrix: analysis.writingSupport?.conflictMatrix,
              consistencyChecklist:
                analysis.generationAssets?.consistencyChecklist,
              writingConstraints: analysis.exportPackage?.writingConstraints,
            },
            null,
            2,
          ),
        };
      case "style-bible":
        return {
          filename: this.filename(analysis, "style-bible.md", mode),
          contentType: "text/markdown; charset=utf-8",
          content: this.toStyleBibleMarkdown(analysis),
        };
      case "outline":
        return {
          filename: this.filename(analysis, "outline.md", mode),
          contentType: "text/markdown; charset=utf-8",
          content: this.toOutlineMarkdown(analysis),
        };
      case "prompt-pack":
        return {
          filename: this.filename(analysis, "prompt-pack.md", mode),
          contentType: "text/markdown; charset=utf-8",
          content: this.toPromptPackMarkdown(analysis),
        };
      case "do-not-copy":
        return {
          filename: this.filename(analysis, "do-not-copy.md", mode),
          contentType: "text/markdown; charset=utf-8",
          content: this.toDoNotCopyMarkdown(analysis),
        };
      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  private toOriginalizedAnalysis(
    analysis: BookAnalysisExportResult,
  ): BookAnalysisExportResult {
    const genre = analysis.book?.genre || "通用题材";
    const safeToLearn = analysis.originalizationReport?.safeToLearn || [];
    const mustTransform = analysis.originalizationReport?.mustTransform || [];
    const rewriteStrategy =
      analysis.originalizationReport?.rewriteStrategy || [];
    const originalizedMustTransform = mustTransform.length
      ? mustTransform.map(
          (_, index) =>
            `高风险可识别元素 ${index + 1}：需替换为新书自有命名、背景、关系和事件。`,
        )
      : [
          "原作人物名、势力名、地名、道具名、能力名、标志桥段和连续事件组合均需重写。",
        ];
    const originalizedRewriteStrategy = rewriteStrategy.length
      ? rewriteStrategy.map(
          (_, index) =>
            `原创化策略 ${index + 1}：保留叙事功能，重写命名、身份、因果、场景和表达。`,
        )
      : [
          "拆出角色功能、冲突功能、世界规则功能和读者承诺，再重新设计新书表层素材。",
        ];
    const originalizedCharacters = (analysis.characters || []).map(
      (character, index) => {
        const label = this.genericCharacterLabel(character, index);
        return {
          sourceName: label,
          role: character.role,
          archetype: character.archetype,
          personalityCore: character.personalityCore,
          originalCharacterCard: {
            name: label,
            role: character.role || "待定角色功能",
            archetype: character.archetype || "待定人物原型",
            personalityCore: character.personalityCore || [],
            usage:
              "这是去标识化人物原型，只保留角色功能、性格底色和叙事职责；请重新设计姓名、身份、经历、关系链和关键事件。",
          },
        };
      },
    );
    return {
      ...analysis,
      book: {
        title: `${genre}原创化素材包`,
        genre,
        oneSentencePremise:
          "基于原作拆解得到的叙事功能、读者期待和结构规律，重新设计具体设定、人物关系、专有名词与事件链。",
        coreAppeal: [...(analysis.book?.coreAppeal || []), ...safeToLearn],
      },
      characters: originalizedCharacters,
      worldbuilding: {
        worldRules: [
          "保留规则服务剧情的功能，不沿用原作专有名词、组织名、地名、能力名和标志性设定组合。",
          ...originalizedRewriteStrategy,
        ],
        powerSystem: (analysis.worldbuilding?.powerSystem || []).map(
          (item, index) =>
            `能力体系模板 ${index + 1}：保留成长/代价/限制/升级节奏，重新命名并重写具体规则。参考功能：${item}`,
        ),
        itemsAndTerms: (analysis.worldbuilding?.itemsAndTerms || []).map(
          (item, index) => ({
            name: `设定要素 ${index + 1}`,
            function: item.function,
            risk: `${item.risk || "需复核"}；原创化导出已移除原名，仍需重写外观、来源、规则和使用场景。`,
          }),
        ),
      },
      relationships: {
        note: "原创化模式不导出原作关系图谱原名；请只参考关系功能，例如竞争、师徒、盟友、误解、债务、血缘压力等。",
      },
      plotlines: (analysis.plotlines || []).map((plotline, index) => ({
        name: `故事线模板 ${index + 1}`,
        type: plotline.type,
        reusablePattern: plotline.reusablePattern,
        payoff:
          "重新设计兑现事件，不沿用原作关键桥段、场景调度和专有解决方案。",
      })),
      chronicle: (analysis.chronicle || []).map((event, index) => ({
        order: event.order ?? index + 1,
        event: `阶段 ${index + 1}：${event.storyFunction || "剧情功能待补"}`,
        storyFunction: event.storyFunction,
      })),
      historyBook: {
        原创化历史书使用说明: [
          "只保留历史因果的功能模板，不保留原作年代、地名、组织名、人物名和标志事件名。",
          "重新设计势力兴衰、旧案原因、资源争夺和主角介入点。",
        ],
      },
      generationAssets: {
        ...analysis.generationAssets,
        worldBook: {
          entries: this.toOriginalizedWorldEntries(analysis),
          activationRules: [
            "触发词应使用新书自有名词，不使用原作专有词。",
            ...(analysis.generationAssets?.worldBook?.activationRules || []),
          ],
          importNotes:
            "原创化世界书只提供功能模板。导入写作软件前，请替换为新书专有名词、关系链和世界规则。",
        },
        characterVoiceGuide: originalizedCharacters.map((character, index) => ({
          character: character.sourceName || `角色原型 ${index + 1}`,
          speechStyle: `根据${character.role || "角色职责"}和${character.archetype || "人物原型"}重新设计口癖、句长、情绪表达和社交边界。`,
          forbiddenTone: [
            "不要照搬原作标志性台词",
            "不要复用原作称呼体系",
            "不要复用原作人物关系称谓",
          ],
        })),
        titleSynopsisKeywordPack: {
          titleKeywords:
            analysis.generationAssets?.titleSynopsisKeywordPack
              ?.titleKeywords || [],
          synopsisSellingPoints:
            analysis.generationAssets?.titleSynopsisKeywordPack
              ?.synopsisSellingPoints || [],
          searchTags:
            analysis.generationAssets?.titleSynopsisKeywordPack?.searchTags ||
            [],
          openingKeywords:
            analysis.generationAssets?.titleSynopsisKeywordPack
              ?.openingKeywords || [],
        },
      },
      writingSupport: {
        ...analysis.writingSupport,
        foreshadowingLedger: (
          analysis.writingSupport?.foreshadowingLedger || []
        ).map((item, index) => ({
          setup: `伏笔功能 ${index + 1}：${item.risk || item.status || "待重写"}`,
          setupChapter: item.setupChapter,
          payoff: "重写为新书独有的回收事件。",
          status: item.status,
          risk: item.risk,
        })),
        continuationPack: {
          currentState:
            "原创化素材状态：已抽象原作结构，下一步需要作者替换具体设定、人物名、地点、组织与关键桥段。",
          nextChapterGoal: "围绕新书主角目标推进冲突升级，不复用原作事件链。",
          openThreads: [
            "新主角的短期目标、长期目标、隐藏代价和外部压力需要重新设计。",
            "旧案、谜团、资源争夺或关系误解只保留叙事功能，不保留原作事件链。",
          ],
          oocGuards: [
            "角色只能继承功能和性格底色，不能继承原作姓名、经历、关系链和标志台词。",
            "为每个角色重新设计职业、身份压力、说话方式、核心秘密和关系称谓。",
          ],
          settingGuards: [
            "设定只能继承规则功能，不能继承原作专有名词、地图、组织结构和标志性道具。",
            "世界规则需要重新设计命名体系、资源体系、地理结构、组织层级和历史事件。",
          ],
          styleConstraints: [
            "可以学习节奏、信息密度、情绪推进和爽点布置，但必须重写具体表达。",
            "标题、简介、关键词和章节钩子应服务新书卖点，不沿用原作可识别组合。",
          ],
          aiPrompt: [
            "你是原创化改写顾问。请基于下列结构功能生成新书方案。",
            "要求：抽象学习叙事功能，重写人物、世界观、事件链、专有名词、场景调度和表达方式。",
            "禁止：复用原作名称、标志性桥段、台词、组织名、地点名、道具名和连续事件组合。",
            "输出：新书设定草案、角色原型表、前三章剧情方案、世界书条目和自查清单。",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
      exportPackage: {
        tavernCharacterCards: originalizedCharacters.map(
          (character, index) => ({
            name: character.sourceName || `角色原型 ${index + 1}`,
            description: character.originalCharacterCard,
          }),
        ),
        worldBookEntries: this.toOriginalizedWorldEntries(analysis),
        writingConstraints: [
          "原创化导出必须重写所有可识别元素，不能直接商业化复用原作表达或标志性组合。",
          "导入 AI 写作软件前，需要把所有角色名、组织名、地名、能力名、道具名和历史事件改成新书自有设定。",
        ],
        doNotCopyList: originalizedMustTransform,
      },
      originalizationReport: {
        riskLevel: analysis.originalizationReport?.riskLevel || "medium",
        safeToLearn,
        mustTransform: originalizedMustTransform,
        rewriteStrategy: originalizedRewriteStrategy,
        fanFictionWarning:
          analysis.originalizationReport?.fanFictionWarning ||
          "即使经过抽象和去标识化，仍需作者自行判断是否构成同人、改编或实质性相似。",
      },
    };
  }

  private toOriginalizedWorldEntries(analysis: BookAnalysisExportResult) {
    const entries =
      analysis.generationAssets?.worldBook?.entries ||
      analysis.exportPackage?.worldBookEntries ||
      [];

    if (!entries.length) {
      return [
        {
          keys: ["原创设定"],
          secondaryKeys: ["世界规则", "角色关系"],
          category: "originalized-template",
          content:
            "请基于原作拆解出的叙事功能，重新创建新书世界规则、组织结构、资源体系、地名、人名和冲突来源。",
          insertionOrder: 100,
          priority: 50,
          constant: false,
          selective: true,
          sourceRisk: "medium",
          originalizationNote:
            "未检测到可导出的世界书条目，已生成通用原创化模板。",
        },
      ];
    }

    return entries.map((entry, index) => {
      const item = entry as {
        category?: string;
        insertionOrder?: number;
        priority?: number;
        constant?: boolean;
        selective?: boolean;
        sourceRisk?: string;
        originalizationNote?: string;
      };
      return {
        keys: [`原创设定 ${index + 1}`, item.category || "设定模板"],
        secondaryKeys: ["功能模板", "需重命名"],
        category: item.category || "originalized-template",
        content:
          item.originalizationNote ||
          `设定功能模板 ${index + 1}：保留“${item.category || "设定"}”的叙事职责，重写具体命名、来源、规则、限制和使用场景。`,
        insertionOrder: item.insertionOrder ?? 100 + index,
        priority: item.priority ?? 50,
        constant: item.constant ?? false,
        selective: item.selective ?? true,
        sourceRisk: item.sourceRisk || "medium",
        originalizationNote:
          "原创化模式已移除原始触发词；导入前请替换为新书自有关键词。",
      };
    });
  }

  private toOriginalizedTavernCards(analysis: BookAnalysisExportResult) {
    return (analysis.characters || []).map((character, index) => ({
      name: character.sourceName || `角色原型 ${index + 1}`,
      description: {
        role: character.role,
        archetype: character.archetype,
        personalityCore: character.personalityCore || [],
        usage:
          "原创化角色卡仅保留角色功能和性格底色，请重新设计姓名、身份、外貌、经历、关系链和标志事件。",
      },
    }));
  }

  private genericCharacterLabel(
    character: NonNullable<BookAnalysisExportResult["characters"]>[number],
    index: number,
  ) {
    const base = character.role || character.archetype || "角色";
    return `${base}原型 ${index + 1}`;
  }

  private withOriginalizedHeader(content: string) {
    return [
      "> 原创化导出说明：本文件已尽量抽象、去标识化，用于学习结构、角色功能和写作策略。作者仍需自行重写具体表达、专有名词、桥段组合和可识别设定，并自行承担使用风险。",
      "",
      content,
    ].join("\n");
  }

  private toMarkdown(analysis: BookAnalysisExportResult) {
    const lines = [
      `# ${analysis.book?.title || "整书拆解报告"}`,
      "",
      `题材：${analysis.book?.genre || "未填写"}`,
      "",
      `一句话设定：${analysis.book?.oneSentencePremise || "无"}`,
      "",
      "## 核心吸引力",
      ...this.list(analysis.book?.coreAppeal),
      "",
      "## 世界观",
      "### 世界规则",
      ...this.list(analysis.worldbuilding?.worldRules),
      "### 能力体系",
      ...this.list(analysis.worldbuilding?.powerSystem),
      "### 专有名词风险",
      ...this.list(
        analysis.worldbuilding?.itemsAndTerms?.map(
          (item) => `${item.name}：${item.function}（${item.risk}）`,
        ),
      ),
      "",
      "## 人物",
      ...this.list(
        analysis.characters?.map(
          (item) =>
            `${item.sourceName} / ${item.role} / ${item.archetype}：${item.personalityCore?.join("、") || "无"}`,
        ),
      ),
      "",
      "## 故事线",
      ...this.list(
        analysis.plotlines?.map(
          (item) =>
            `${item.name}（${item.type}）：${item.reusablePattern}；兑现：${item.payoff}`,
        ),
      ),
      "",
      "## 大事纪",
      ...this.list(
        analysis.chronicle?.map(
          (item) => `${item.order}. ${item.event} - ${item.storyFunction}`,
        ),
      ),
      "",
      "## 写作支持包",
      "### 章节功能表",
      ...this.list(
        analysis.writingSupport?.chapterFunctionTable?.map(
          (item) =>
            `${item.chapterOrder}. ${item.title}：${item.function}；目标：${item.goal}；冲突：${item.conflict}；钩子：${item.hook}`,
        ),
      ),
      "### 伏笔与回收表",
      ...this.list(
        analysis.writingSupport?.foreshadowingLedger?.map(
          (item) =>
            `第 ${item.setupChapter} 章 ${item.status}：${item.setup} -> ${item.payoff}；风险：${item.risk}`,
        ),
      ),
      "### 爽点/情绪点地图",
      ...this.list(
        analysis.writingSupport?.emotionalBeatMap?.map(
          (item) =>
            `第 ${item.chapterOrder} 章 ${item.intensity}：${item.beats?.join("、") || "无"}；承诺：${item.readerPromise}`,
        ),
      ),
      "### 节奏曲线",
      ...this.list(
        analysis.writingSupport?.pacingCurve?.map(
          (item) =>
            `第 ${item.chapterOrder} 章：信息 ${item.informationDensity} / 冲突 ${item.conflictIntensity} / 钩子 ${item.hookStrength}；风险：${item.risk}`,
        ),
      ),
      "### 读者承诺",
      ...this.list(
        analysis.writingSupport?.readerPromiseChecklist?.map(
          (item) => `${item.promise}：${item.status}；${item.nextCheck}`,
        ),
      ),
      "### 冲突矩阵",
      ...this.list(
        analysis.writingSupport?.conflictMatrix?.map(
          (item) =>
            `${item.parties?.join(" vs ") || "冲突双方"}：${item.conflict}；升级：${item.nextEscalation}`,
        ),
      ),
      "### 续写约束包",
      `当前状态：${analysis.writingSupport?.continuationPack?.currentState || "无"}`,
      "",
      `下一章目标：${analysis.writingSupport?.continuationPack?.nextChapterGoal || "无"}`,
      "",
      "未解决线索：",
      ...this.list(analysis.writingSupport?.continuationPack?.openThreads),
      "人物不跑偏：",
      ...this.list(analysis.writingSupport?.continuationPack?.oocGuards),
      "设定不冲突：",
      ...this.list(analysis.writingSupport?.continuationPack?.settingGuards),
      "风格约束：",
      ...this.list(analysis.writingSupport?.continuationPack?.styleConstraints),
      "",
      "给写作 AI 的续写提示词：",
      analysis.writingSupport?.continuationPack?.aiPrompt || "无",
      "",
      "### 质量诊断",
      "强项：",
      ...this.list(analysis.writingSupport?.qualityDiagnosis?.strengths),
      "短板：",
      ...this.list(analysis.writingSupport?.qualityDiagnosis?.weaknesses),
      "优先修正：",
      ...this.list(analysis.writingSupport?.qualityDiagnosis?.priorityFixes),
      "",
      "## 世界书与生成资产",
      "### 世界书条目",
      ...this.list(
        analysis.generationAssets?.worldBook?.entries?.map((entry) =>
          JSON.stringify(entry),
        ),
      ),
      "### 世界书触发规则",
      ...this.list(analysis.generationAssets?.worldBook?.activationRules),
      "",
      `导入说明：${analysis.generationAssets?.worldBook?.importNotes || "无"}`,
      "",
      "### 风格圣经",
      `叙事视角：${analysis.generationAssets?.styleBible?.narrativePOV || "无"}`,
      "",
      "语气关键词：",
      ...this.list(analysis.generationAssets?.styleBible?.toneKeywords),
      "文风规则：",
      ...this.list(analysis.generationAssets?.styleBible?.proseRules),
      "对话规则：",
      ...this.list(analysis.generationAssets?.styleBible?.dialogueRules),
      "禁忌：",
      ...this.list(analysis.generationAssets?.styleBible?.tabooList),
      "### 卷/阶段规划",
      ...this.list(
        analysis.generationAssets?.volumePlan?.map(
          (item) =>
            `${item.volume}：目标 ${item.goal}；冲突 ${item.mainConflict}；高潮 ${item.climax}；钩子 ${item.endingHook}`,
        ),
      ),
      "### 场景模板",
      ...this.list(
        analysis.generationAssets?.sceneTemplates?.map(
          (item) =>
            `${item.name}：${item.useWhen}；节拍 ${item.beats?.join(" -> ") || "无"}；避开 ${item.avoid?.join("、") || "无"}`,
        ),
      ),
      "### 角色语气",
      ...this.list(
        analysis.generationAssets?.characterVoiceGuide?.map(
          (item) =>
            `${item.character}：${item.speechStyle}；禁忌 ${item.forbiddenTone?.join("、") || "无"}`,
        ),
      ),
      "### 反派压力",
      ...this.list(
        analysis.generationAssets?.antagonistPressurePlan?.map(
          (item) =>
            `${item.antagonist}：${item.pressureMethod}；代价 ${item.defeatCost}`,
        ),
      ),
      "### 标题/简介/关键词",
      "标题关键词：",
      ...this.list(
        analysis.generationAssets?.titleSynopsisKeywordPack?.titleKeywords,
      ),
      "简介卖点：",
      ...this.list(
        analysis.generationAssets?.titleSynopsisKeywordPack
          ?.synopsisSellingPoints,
      ),
      "搜索标签：",
      ...this.list(
        analysis.generationAssets?.titleSynopsisKeywordPack?.searchTags,
      ),
      "开局关键词：",
      ...this.list(
        analysis.generationAssets?.titleSynopsisKeywordPack?.openingKeywords,
      ),
      "### 一致性检查",
      ...this.list(analysis.generationAssets?.consistencyChecklist),
      "",
      "## 原创化避险",
      `风险等级：${analysis.originalizationReport?.riskLevel || "unknown"}`,
      "",
      "### 可学习",
      ...this.list(analysis.originalizationReport?.safeToLearn),
      "### 必须转换",
      ...this.list(analysis.originalizationReport?.mustTransform),
      "### 迁移策略",
      ...this.list(analysis.originalizationReport?.rewriteStrategy),
      "",
      analysis.originalizationReport?.fanFictionWarning || "",
      "",
      "## 使用风险提示",
      analysis.usageRiskNotice?.summary || "",
      "",
      "### 推荐用途",
      ...this.list(analysis.usageRiskNotice?.recommendedUse),
      "### 较高风险用途",
      ...this.list(analysis.usageRiskNotice?.higherRiskUse),
      "",
      analysis.usageRiskNotice?.userResponsibility || "",
    ];

    return lines.join("\n");
  }

  private toDoNotCopyMarkdown(analysis: BookAnalysisExportResult) {
    return [
      `# ${analysis.book?.title || "整书拆解"} Do Not Copy 清单`,
      "",
      "## 不应直接复制",
      ...this.list(analysis.exportPackage?.doNotCopyList),
      "",
      "## 必须转换",
      ...this.list(analysis.originalizationReport?.mustTransform),
      "",
      "## 较高风险用途",
      ...this.list(analysis.usageRiskNotice?.higherRiskUse),
      "",
      "## 风险提示",
      analysis.originalizationReport?.fanFictionWarning || "",
      "",
      analysis.usageRiskNotice?.userResponsibility || "",
    ].join("\n");
  }

  private toStyleBibleMarkdown(analysis: BookAnalysisExportResult) {
    const style = analysis.generationAssets?.styleBible;
    return [
      `# ${analysis.book?.title || "整书"} 风格圣经`,
      "",
      `叙事视角：${style?.narrativePOV || "无"}`,
      "",
      "## 语气关键词",
      ...this.list(style?.toneKeywords),
      "",
      "## 文风规则",
      ...this.list(style?.proseRules),
      "",
      "## 对话规则",
      ...this.list(style?.dialogueRules),
      "",
      "## 禁忌",
      ...this.list(style?.tabooList),
      "",
      "## 角色语气",
      ...this.list(
        analysis.generationAssets?.characterVoiceGuide?.map(
          (item) =>
            `${item.character}：${item.speechStyle}；禁忌：${item.forbiddenTone?.join("、") || "无"}`,
        ),
      ),
    ].join("\n");
  }

  private toOutlineMarkdown(analysis: BookAnalysisExportResult) {
    return [
      `# ${analysis.book?.title || "整书"} 大纲`,
      "",
      `一句话设定：${analysis.book?.oneSentencePremise || "无"}`,
      "",
      "## 卷/阶段规划",
      ...this.list(
        analysis.generationAssets?.volumePlan?.map(
          (item) =>
            `${item.volume}：目标 ${item.goal}；冲突 ${item.mainConflict}；高潮 ${item.climax}；钩子 ${item.endingHook}`,
        ),
      ),
      "",
      "## 故事线",
      ...this.list(
        analysis.plotlines?.map(
          (item) =>
            `${item.name}（${item.type}）：${item.reusablePattern}；兑现：${item.payoff}`,
        ),
      ),
      "",
      "## 大事纪",
      ...this.list(
        analysis.chronicle?.map(
          (item) => `${item.order}. ${item.event} - ${item.storyFunction}`,
        ),
      ),
      "",
      "## 伏笔与回收",
      ...this.list(
        analysis.writingSupport?.foreshadowingLedger?.map(
          (item) =>
            `第 ${item.setupChapter} 章 ${item.status}：${item.setup} -> ${item.payoff}`,
        ),
      ),
    ].join("\n");
  }

  private toPromptPackMarkdown(analysis: BookAnalysisExportResult) {
    return [
      `# ${analysis.book?.title || "整书"} 提示词包`,
      "",
      "## 续写提示词",
      analysis.writingSupport?.continuationPack?.aiPrompt || "无",
      "",
      "## 改写约束",
      ...this.list(analysis.exportPackage?.writingConstraints),
      "",
      "## 人物不跑偏",
      ...this.list(analysis.writingSupport?.continuationPack?.oocGuards),
      "",
      "## 设定不冲突",
      ...this.list(analysis.writingSupport?.continuationPack?.settingGuards),
      "",
      "## 风格约束",
      ...this.list(analysis.writingSupport?.continuationPack?.styleConstraints),
      "",
      "## 场景模板",
      ...this.list(
        analysis.generationAssets?.sceneTemplates?.map(
          (item) =>
            `${item.name}：${item.useWhen}；节拍 ${item.beats?.join(" -> ") || "无"}`,
        ),
      ),
    ].join("\n");
  }

  private toSillyTavernWorldInfo(analysis: BookAnalysisExportResult) {
    const entries = analysis.generationAssets?.worldBook?.entries || [];
    return {
      entries: Object.fromEntries(
        entries.map((entry, index) => {
          const item = entry as {
            keys?: string[];
            secondaryKeys?: string[];
            category?: string;
            content?: string;
            insertionOrder?: number;
            priority?: number;
            constant?: boolean;
            selective?: boolean;
            originalizationNote?: string;
          };
          return [
            String(index),
            {
              uid: index,
              key: item.keys || [],
              keysecondary: item.secondaryKeys || [],
              comment: item.category || "world",
              content: [
                item.content || "",
                item.originalizationNote
                  ? `原创化提醒：${item.originalizationNote}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
              constant: Boolean(item.constant),
              selective: item.selective ?? true,
              order: item.insertionOrder ?? 100,
              position: 0,
              disable: false,
              addMemo: true,
              probability: 100,
              depth: 4,
              group: "",
              groupOverride: false,
              groupWeight: 100,
              scanDepth: null,
              caseSensitive: null,
              matchWholeWords: null,
              useProbability: true,
              excludeRecursion: false,
              preventRecursion: false,
              delayUntilRecursion: false,
              selectiveLogic: 0,
              role: null,
              vectorized: false,
              displayIndex: item.priority ?? index,
            },
          ];
        }),
      ),
      originalData: {
        name: analysis.book?.title || "world-info",
        importNotes: analysis.generationAssets?.worldBook?.importNotes || "",
      },
    };
  }

  private list(items?: Array<string | undefined>) {
    const values = (items || []).filter(Boolean);
    return values.length ? values.map((item) => `- ${item}`) : ["- 无"];
  }

  private filename(
    analysis: BookAnalysisExportResult,
    ext: string,
    mode: BookExportMode = "notes",
  ) {
    const rawTitle =
      mode === "originalized"
        ? `${analysis.book?.genre || "book"}-originalized-export`
        : analysis.book?.title || "book-analysis";
    const title = rawTitle.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
    return `${title}.${ext}`;
  }
}
