/**
 * Compile a single BookAnalysisResult into a Claude Code SKILL.md file.
 *
 * This is the first compilation level ("L1"): one book -> one skill.
 * Higher levels (author-level / genre-level distillation across multiple books)
 * will reuse this serializer once the aggregation pipeline lands.
 *
 * The compiler is intentionally a pure function so it can be reused outside
 * of the BookExportService (e.g. by a future distill endpoint, by tests, or
 * by a workflow script).
 */

import type {
  AggregatedItem,
  DistilledSkillData,
  PerSourceItem,
  SkillGroupBy,
} from "./book-skill-aggregator";

export interface BookSkillSource {
  jobId: string;
  title: string;
  genre: string;
  /** ISO 8601 timestamp, passed in so the function stays pure (no clock call). */
  generatedAt: string;

  /** Optional metadata used by the cross-sample aggregator (L3). */
  metadata?: {
    author?: string;
    platform?: string;
    publishedYear?: number;
  };

  styleCard?: {
    coreStyleTags?: string[];
    narrativeVoice?: string;
    sentenceRhythm?: string;
    paragraphPattern?: string;
    dialoguePattern?: string;
    sensoryFocus?: string[];
    pleasureMechanisms?: string[];
    hookPatterns?: string[];
    styleRules?: string[];
    antiPatterns?: string[];
  };

  styleBible?: {
    narrativePOV?: string;
    toneKeywords?: string[];
    proseRules?: string[];
    dialogueRules?: string[];
    tabooList?: string[];
  };

  consistencyChecklist?: string[];

  boundary?: {
    doNotReuse?: string[];
    needsTransformation?: string[];
    learnablePatterns?: string[];
    safeRewriteMoves?: string[];
  };

  riskNotice?: {
    summary?: string;
  };
}

export interface CompiledBookSkill {
  filename: string;
  content: string;
}

/**
 * Slugify a title for the skill name. Keeps CJK characters as-is; drops
 * whitespace and punctuation that would break Claude Code's skill-name parser
 * (which expects letters, digits, dots, underscores, dashes).
 */
export function slugify(input: string): string {
  return (
    input
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/[\s　]+/g, "-")
      .replace(/[^\p{L}\p{N}.\-_]+/gu, "")
      .slice(0, 48) || "untitled"
  );
}

export function escapeYamlString(input: string): string {
  // Description goes inside YAML frontmatter on a single line - escape only
  // the characters that would break a bare scalar. Wrap in double quotes if
  // the value contains a colon, # or quote.
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (/[:#"]/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
  return trimmed;
}

export function bulletList(items?: string[]): string {
  const cleaned = (items || [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  if (cleaned.length === 0) return "_无_";
  return cleaned.map((item) => `- ${item}`).join("\n");
}

export function inlineList(items?: string[]): string {
  const cleaned = (items || [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return cleaned.length ? cleaned.join("、") : "_未识别_";
}

export function ifPresent(label: string, value?: string): string {
  const text = (value || "").trim();
  return text ? `**${label}**：${text}` : `**${label}**：_未识别_`;
}

export function compileBookSkill(source: BookSkillSource): CompiledBookSkill {
  const slug = slugify(source.title);
  const skillName = `book-structure-${slug}`;
  const description =
    `单本结构学习 skill，蒸馏自《${source.title.trim()}》（${source.genre.trim()}）。` +
    `提取可迁移的写作结构和反面清单，**不复制原作内容**；适合写同类型作品时作为结构参考。`;

  const card = source.styleCard || {};
  const bible = source.styleBible || {};
  const boundary = source.boundary || {};
  const risk = source.riskNotice || {};

  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: ${skillName}`);
  lines.push(`description: ${escapeYamlString(description)}`);
  lines.push("---");
  lines.push("");
  lines.push(`# 学习《${source.title}》的结构（不复制内容）`);
  lines.push("");
  lines.push(
    `本 skill 蒸馏自单本拆书结果 \`${source.jobId}\`。` +
      `目标是**结构学习**：节奏、钩子、爽点机制、情感工程，而不是复制原作的具体内容、人物名或事件链。`,
  );
  lines.push("");

  lines.push("## 何时使用");
  lines.push(
    `- 准备写同题材作品（${source.genre.trim()}）时，需要一个**结构参考**`,
  );
  lines.push("- 想要这个作品的节奏感、钩子结构或情绪设计");
  lines.push("- **不适合**：要求 AI 直接复述、续写、或仿写这本书的具体情节");
  lines.push("");

  lines.push("## 核心写作 DNA");
  if (card.coreStyleTags?.length) {
    lines.push(`**风格标签**：${inlineList(card.coreStyleTags)}`);
  }
  lines.push(ifPresent("叙事声音", card.narrativeVoice || bible.narrativePOV));
  lines.push(ifPresent("句式节奏", card.sentenceRhythm));
  lines.push(ifPresent("段落风格", card.paragraphPattern));
  lines.push(ifPresent("对白风格", card.dialoguePattern));
  if (card.sensoryFocus?.length) {
    lines.push(`**主导感官**：${inlineList(card.sensoryFocus)}`);
  }
  if (bible.toneKeywords?.length) {
    lines.push(`**语气关键词**：${inlineList(bible.toneKeywords)}`);
  }
  lines.push("");

  if (card.pleasureMechanisms?.length) {
    lines.push("## 可迁移的爽点机制");
    lines.push(bulletList(card.pleasureMechanisms));
    lines.push("");
  }

  if (card.hookPatterns?.length) {
    lines.push("## 钩子模式");
    lines.push(bulletList(card.hookPatterns));
    lines.push("");
  }

  const styleRules = [
    ...(card.styleRules || []),
    ...(bible.proseRules || []),
    ...(bible.dialogueRules || []),
  ];
  if (styleRules.length) {
    lines.push("## 可学习的写作规则");
    lines.push(bulletList(styleRules));
    lines.push("");
  }

  // Anti-patterns get equal billing with style rules — this is intentional.
  // Distilled skills are dangerous if positive rules dominate without the
  // matching "don't do this" guardrails, especially for survivorship-biased
  // success samples.
  const antiPatterns = [
    ...(card.antiPatterns || []),
    ...(bible.tabooList || []),
  ];
  if (antiPatterns.length || boundary.doNotReuse?.length) {
    lines.push("## 反面清单（必须避免）");
    if (antiPatterns.length) {
      lines.push("### 写作反模式");
      lines.push(bulletList(antiPatterns));
      lines.push("");
    }
    if (boundary.doNotReuse?.length) {
      lines.push("### 不可复用的原作元素");
      lines.push("下列内容来自原作的可识别表达；学结构时**必须**替换或重写：");
      lines.push(bulletList(boundary.doNotReuse));
      lines.push("");
    }
  }

  if (boundary.needsTransformation?.length) {
    lines.push("## 必须改造的元素");
    lines.push(bulletList(boundary.needsTransformation));
    lines.push("");
  }

  if (boundary.safeRewriteMoves?.length) {
    lines.push("## 安全迁移动作");
    lines.push(bulletList(boundary.safeRewriteMoves));
    lines.push("");
  }

  if (source.consistencyChecklist?.length) {
    lines.push("## 续写一致性检查项");
    lines.push(bulletList(source.consistencyChecklist));
    lines.push("");
  }

  lines.push("## 元数据");
  lines.push("- 蒸馏样本：**1 本作品**");
  lines.push(`- 作品：《${source.title}》`);
  lines.push(`- 题材：${source.genre}`);
  if (source.metadata?.author) {
    lines.push(`- 作者：${source.metadata.author}`);
  }
  if (source.metadata?.platform) {
    lines.push(`- 平台：${source.metadata.platform}`);
  }
  if (source.metadata?.publishedYear !== undefined) {
    lines.push(`- 出版年份：${source.metadata.publishedYear}`);
  }
  lines.push(`- 蒸馏时间：${source.generatedAt}`);
  lines.push(
    "- 置信度：**low** — 单样本结构学习。如要「作者级」或「题材级」 skill，请在 research library 累积更多样本后跑跨样本蒸馏。",
  );
  lines.push("");

  lines.push("## 合规声明");
  lines.push(
    risk.summary?.trim() ||
      "本 skill 只做结构学习。使用者需自行确认对原作的引用边界，不得用于直接复制原作内容、商业化未授权角色、或同人换皮发布。",
  );
  lines.push("");

  const content = lines.join("\n");
  const filename = `skill-${skillName}.md`;

  return { filename, content };
}

// ---------------------------------------------------------------------------
// L3 compiler: cross-sample distilled skill
// ---------------------------------------------------------------------------

const GROUP_BY_LABEL: Record<SkillGroupBy, string> = {
  author: "作者级",
  genre: "题材级",
  platform: "平台级",
};

const CONFIDENCE_LABEL: Record<DistilledSkillData["confidence"], string> = {
  low: "low",
  "medium-low": "medium-low",
  medium: "medium",
  high: "high",
};

const CONFIDENCE_CAVEAT: Record<DistilledSkillData["confidence"], string> = {
  low: "样本只有 1 本，请仅作单本结构参考；累积更多样本后置信度会自动提升。",
  "medium-low":
    "样本 2-4 本，模式刚开始浮现但仍可能受单本影响。继续累积到 5 本以上更稳。",
  medium:
    "样本 5-9 本，模式已具备一定共性；高频规则可信，单源规则需要作者复核。",
  high: "样本 10+ 本，跨样本共性较强；可作为题材/作者级骨架使用，但仍须避免复用具体内容。",
};

function aggregatedBulletList(items: AggregatedItem[]): string {
  if (!items.length) return "_无_";
  return items
    .map((item) => `- ${item.text} _(${item.occurrences} 本)_`)
    .join("\n");
}

function perSourceBulletList(items: PerSourceItem[]): string {
  if (!items.length) return "_无_";
  return items
    .map((item) => `- ${item.text} _（来自《${item.sourceTitle}》）_`)
    .join("\n");
}

function sourcesTable(sources: DistilledSkillData["sources"]): string {
  if (!sources.length) return "_无样本_";
  const header = "| jobId | 作品 | 作者 | 平台 | 年份 |";
  const sep = "|---|---|---|---|---|";
  const rows = sources.map(
    (source) =>
      `| \`${source.jobId}\` | 《${source.title}》 | ${
        source.author || "_未标注_"
      } | ${source.platform || "_未标注_"} | ${
        source.publishedYear ?? "_未标注_"
      } |`,
  );
  return [header, sep, ...rows].join("\n");
}

export function compileDistilledSkill(
  data: DistilledSkillData,
): CompiledBookSkill {
  const slug = slugify(data.groupValue);
  const skillName = `${data.groupBy}-method-${slug}`;
  const groupLabel = GROUP_BY_LABEL[data.groupBy];
  const description =
    `${groupLabel}写作方法论 skill (${data.groupValue})，` +
    `蒸馏自 ${data.sampleSize} 本样本，置信度 ${CONFIDENCE_LABEL[data.confidence]}。` +
    `仅用于结构学习，不复制具体内容。`;

  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: ${skillName}`);
  lines.push(`description: ${escapeYamlString(description)}`);
  lines.push("---");
  lines.push("");
  lines.push(
    `# ${groupLabel}写作方法论：${data.groupValue}（${data.sampleSize} 本样本蒸馏）`,
  );
  lines.push("");
  lines.push(
    `本 skill 由 **${data.sampleSize} 本样本**跨样本归纳生成，` +
      `不是复制任何一本书的具体内容。所有规则都附带"出现本数"作为置信度指标。`,
  );
  lines.push("");

  lines.push("## 何时使用");
  if (data.groupBy === "author") {
    lines.push(`- 想写一部结构上像 **${data.groupValue}** 的作品`);
    lines.push("- 想了解这位作者反复出现的写作偏好");
  } else if (data.groupBy === "genre") {
    lines.push(`- 准备写 **${data.groupValue}** 题材作品，需要骨架参考`);
    lines.push("- 想知道这个题材里反复成功的钩子和爽点设计");
  } else {
    lines.push(`- 投稿到 **${data.groupValue}** 平台，需要节奏/钩子参考`);
    lines.push("- 想了解这个平台上爆款作品的共同结构特征");
  }
  lines.push(
    "- **不适合**：要求 AI 直接续写任何一本贡献样本，或复刻其专属内容",
  );
  lines.push("");

  lines.push("## 置信度说明");
  lines.push(
    `- 样本数：**${data.sampleSize} 本**` +
      ` ｜ 高置信度阈值：**≥ ${data.intersectionThreshold} 本**` +
      ` ｜ 整体置信度：**${CONFIDENCE_LABEL[data.confidence]}**`,
  );
  lines.push(`- ${CONFIDENCE_CAVEAT[data.confidence]}`);
  lines.push("");

  if (data.highConfidenceStyleRules.length) {
    lines.push(
      `## 高置信度写作规则（≥ ${data.intersectionThreshold} 本样本同时出现）`,
    );
    lines.push(aggregatedBulletList(data.highConfidenceStyleRules));
    lines.push("");
  } else {
    lines.push("## 高置信度写作规则");
    lines.push(
      `_当前样本里没有规则同时出现在 ${data.intersectionThreshold} 本以上。建议累积更多样本，或先用下方的频次排行作为参考。_`,
    );
    lines.push("");
  }

  // B2 ranked output: show top-N only to keep skill readable.
  const RANKED_LIMIT = 15;
  const rankedToShow = data.rankedStyleRules
    .filter((item) => item.occurrences >= 2)
    .slice(0, RANKED_LIMIT);
  if (rankedToShow.length) {
    lines.push(`## 频次排行（出现 ≥2 本的全部规则，最多 ${RANKED_LIMIT} 条）`);
    lines.push(aggregatedBulletList(rankedToShow));
    lines.push("");
  }

  if (data.pleasureMechanisms.length) {
    lines.push("## 爽点机制");
    lines.push(aggregatedBulletList(data.pleasureMechanisms));
    lines.push("");
  }

  if (data.hookPatterns.length) {
    lines.push("## 钩子模式");
    lines.push(aggregatedBulletList(data.hookPatterns));
    lines.push("");
  }

  if (data.toneKeywords.length) {
    lines.push("## 语气关键词");
    lines.push(aggregatedBulletList(data.toneKeywords));
    lines.push("");
  }

  // Anti-patterns get the same prominence -- this is the survivorship-bias
  // guardrail. The reader should see what to avoid before applying positive
  // rules.
  if (data.antiPatterns.length) {
    lines.push("## 反面清单（必须避免）");
    lines.push(aggregatedBulletList(data.antiPatterns));
    lines.push("");
  }

  // Per-source single-shot rules: show them but visibly labeled as not yet
  // cross-validated.
  if (data.singleSourceStyleRules.length) {
    lines.push("## 单源规则（仅 1 本样本出现，请人工复核）");
    lines.push(perSourceBulletList(data.singleSourceStyleRules.slice(0, 12)));
    lines.push("");
  }

  if (data.perSourceDoNotReuse.length) {
    lines.push("## 不可复用的原作元素（**永远不要聚合**）");
    lines.push("下列内容是各贡献样本的可识别表达，**严禁**当作「规律」复用：");
    lines.push(perSourceBulletList(data.perSourceDoNotReuse));
    lines.push("");
  }

  if (data.perSourceNeedsTransformation.length) {
    lines.push("## 必须改造的元素");
    lines.push(perSourceBulletList(data.perSourceNeedsTransformation));
    lines.push("");
  }

  lines.push("## 贡献样本");
  lines.push(sourcesTable(data.sources));
  lines.push("");

  lines.push("## 元数据");
  lines.push(`- 分组维度：\`${data.groupBy}\` = \`${data.groupValue}\``);
  lines.push(`- 样本数：**${data.sampleSize} 本**`);
  lines.push(`- 蒸馏时间：${data.generatedAt}`);
  lines.push(`- 置信度：**${CONFIDENCE_LABEL[data.confidence]}**`);
  if (data.debug.droppedEmpty.length) {
    lines.push(
      `- 跳过：${data.debug.droppedEmpty.length} 个样本字段为空 (\`${data.debug.droppedEmpty.join(
        "`, `",
      )}\`)`,
    );
  }
  lines.push("");

  lines.push("## 合规声明");
  lines.push(
    "本 skill 是跨样本的**结构归纳**，不复制任何一本贡献样本的具体内容、" +
      "人物名、专有名词或事件链。使用者需自行确认对原作的引用边界，" +
      "不得用于商业化未授权复刻、同人换皮或换皮发布。",
  );
  lines.push("");

  const content = lines.join("\n");
  const filename = `skill-${skillName}.md`;

  return { filename, content };
}
