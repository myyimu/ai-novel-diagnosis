import {
  compileBookSkill,
  compileDistilledSkill,
  type BookSkillSource,
} from "./book-skill-compiler";
import type { DistilledSkillData } from "./book-skill-aggregator";

function makeSource(overrides: Partial<BookSkillSource> = {}): BookSkillSource {
  return {
    jobId: "book_test_abc",
    title: "废墟纪元",
    genre: "xuanhuan",
    generatedAt: "2026-06-27T00:00:00.000Z",
    styleCard: {
      coreStyleTags: ["低视角悬疑", "压迫式开局"],
      narrativeVoice: "第三人称限制视角，紧贴主角感知",
      sentenceRhythm: "短句为主，关键场景插入长句铺垫",
      paragraphPattern: "段落短小、移动端友好",
      dialoguePattern: "对白偏简，标签少，靠动作辅助",
      sensoryFocus: ["视觉", "触觉"],
      pleasureMechanisms: ["公开打脸", "证物式反转"],
      hookPatterns: ["危机型", "揭示型"],
      styleRules: ["开篇 500 字内必须给出主角失败代价"],
      antiPatterns: ["不要使用上帝视角解释设定"],
    },
    styleBible: {
      narrativePOV: "第三人称限制",
      toneKeywords: ["压抑", "克制"],
      proseRules: ["设定通过事件揭示，不直接讲解"],
      dialogueRules: ["对白不带说教"],
      tabooList: ["避免抒情段落连续超过三句"],
    },
    consistencyChecklist: ["主角认知边界要保持一致"],
    boundary: {
      doNotReuse: ["主角姓名「林无道」", "核心宝物「七窍玲珑」"],
      needsTransformation: ["仇人公会的具体名字"],
      learnablePatterns: ["开局-认知反转-行动 三幕节奏"],
      safeRewriteMoves: ["换主角性别保留困境结构"],
    },
    riskNotice: {
      summary: "本 skill 仅供学习；不要用于发布商业作品时直接复刻可识别表达。",
    },
    ...overrides,
  };
}

describe("compileBookSkill", () => {
  it("emits valid YAML frontmatter with name and description", () => {
    const result = compileBookSkill(makeSource());
    const [, frontmatter] = result.content.split("---");
    expect(frontmatter).toMatch(/name: book-structure-/);
    expect(frontmatter).toMatch(/description: /);
  });

  it("uses a slugified title in skill name and filename", () => {
    const result = compileBookSkill(makeSource({ title: "废墟纪元 / 卷一" }));
    expect(result.filename).toMatch(/^skill-book-structure-/);
    expect(result.content).toMatch(/name: book-structure-废墟纪元-卷一/);
  });

  it("escapes description colons so YAML stays valid", () => {
    const source = makeSource({
      title: "Field Test: Cold Open",
    });
    const result = compileBookSkill(source);
    const frontmatter = result.content.split("---")[1];
    // 书名里含 ASCII 冒号时，description 必须包裹引号，否则 YAML 解析会断行
    expect(frontmatter).toMatch(/description: "[^"]+"/);
  });

  it("includes the structure DNA section with style rules and anti-patterns", () => {
    const result = compileBookSkill(makeSource());
    expect(result.content).toContain("## 核心写作 DNA");
    expect(result.content).toContain("开篇 500 字内必须给出主角失败代价");
    expect(result.content).toContain("## 反面清单（必须避免）");
    expect(result.content).toContain("不要使用上帝视角解释设定");
  });

  it("merges referenceBoundaryCheck.doNotReuse into the anti-pattern section", () => {
    const result = compileBookSkill(makeSource());
    expect(result.content).toContain("不可复用的原作元素");
    expect(result.content).toContain("主角姓名「林无道」");
    expect(result.content).toContain("核心宝物「七窍玲珑」");
  });

  it("labels confidence low for single-sample distillation", () => {
    const result = compileBookSkill(makeSource());
    expect(result.content).toContain("蒸馏样本：**1 本作品**");
    expect(result.content).toContain("置信度：**low**");
  });

  it("never points the reader at copy/continue use cases", () => {
    const result = compileBookSkill(makeSource());
    expect(result.content).toContain("**不适合**");
    expect(result.content).toContain("不复制原作内容");
  });

  it("falls back to generic compliance text when riskNotice is missing", () => {
    const result = compileBookSkill(makeSource({ riskNotice: undefined }));
    expect(result.content).toContain("结构学习");
    expect(result.content).toContain("不得用于直接复制");
  });

  it("emits placeholder text when style fields are missing", () => {
    const result = compileBookSkill(
      makeSource({
        styleCard: {},
        styleBible: {},
      }),
    );
    expect(result.content).toContain("叙事声音**：_未识别_");
  });
});

function makeDistilledData(
  overrides: Partial<DistilledSkillData> = {},
): DistilledSkillData {
  return {
    groupBy: "author",
    groupValue: "猫腻",
    generatedAt: "2026-06-27T00:00:00.000Z",
    sampleSize: 3,
    sources: [
      { jobId: "job-a", title: "庆余年", author: "猫腻" },
      { jobId: "job-b", title: "将夜", author: "猫腻" },
      { jobId: "job-c", title: "择天记", author: "猫腻" },
    ],
    intersectionThreshold: 2,
    confidence: "medium-low",
    highConfidenceStyleRules: [
      {
        text: "开篇压低主角处境",
        occurrences: 3,
        sourceJobIds: ["job-a", "job-b", "job-c"],
      },
    ],
    rankedStyleRules: [
      {
        text: "开篇压低主角处境",
        occurrences: 3,
        sourceJobIds: ["job-a", "job-b", "job-c"],
      },
      { text: "对白少标签", occurrences: 2, sourceJobIds: ["job-a", "job-b"] },
    ],
    singleSourceStyleRules: [
      { text: "三章一爽点", sourceJobId: "job-a", sourceTitle: "庆余年" },
    ],
    pleasureMechanisms: [
      { text: "认知反转", occurrences: 2, sourceJobIds: ["job-a", "job-b"] },
    ],
    hookPatterns: [
      {
        text: "揭示型",
        occurrences: 3,
        sourceJobIds: ["job-a", "job-b", "job-c"],
      },
    ],
    antiPatterns: [
      {
        text: "避免叙述者直评",
        occurrences: 2,
        sourceJobIds: ["job-a", "job-c"],
      },
    ],
    toneKeywords: [],
    perSourceDoNotReuse: [
      { text: "范闲", sourceJobId: "job-a", sourceTitle: "庆余年" },
    ],
    perSourceNeedsTransformation: [],
    debug: {
      inputJobIds: ["job-a", "job-b", "job-c"],
      droppedEmpty: [],
    },
    ...overrides,
  };
}

describe("compileDistilledSkill", () => {
  it("emits a YAML frontmatter naming the group and confidence", () => {
    const result = compileDistilledSkill(makeDistilledData());
    expect(result.content).toMatch(/^---\nname: author-method-猫腻\n/);
    expect(result.content).toContain("description:");
    expect(result.filename).toBe("skill-author-method-猫腻.md");
  });

  it("renders the high-confidence rules with their occurrence count", () => {
    const result = compileDistilledSkill(makeDistilledData());
    expect(result.content).toContain(
      "## 高置信度写作规则（≥ 2 本样本同时出现）",
    );
    expect(result.content).toContain("开篇压低主角处境 _(3 本)_");
  });

  it("warns visibly when no rule clears the intersection threshold", () => {
    const data = makeDistilledData({
      highConfidenceStyleRules: [],
      intersectionThreshold: 2,
    });
    const result = compileDistilledSkill(data);
    expect(result.content).toContain("## 高置信度写作规则");
    expect(result.content).toContain("没有规则同时出现在 2 本以上");
  });

  it("labels single-source rules as needing human review", () => {
    const result = compileDistilledSkill(makeDistilledData());
    expect(result.content).toContain(
      "## 单源规则（仅 1 本样本出现，请人工复核）",
    );
    expect(result.content).toContain("三章一爽点 _（来自《庆余年》）_");
  });

  it("never aggregates doNotReuse - shows per-source citation", () => {
    const result = compileDistilledSkill(makeDistilledData());
    expect(result.content).toContain("## 不可复用的原作元素");
    expect(result.content).toContain("范闲");
    expect(result.content).toContain("来自《庆余年》");
  });

  it("includes a sources table for provenance", () => {
    const result = compileDistilledSkill(makeDistilledData());
    expect(result.content).toContain("## 贡献样本");
    expect(result.content).toContain("| jobId |");
    expect(result.content).toContain("`job-a`");
    expect(result.content).toContain("《庆余年》");
  });

  it("uses the right when-to-use copy for each groupBy mode", () => {
    expect(
      compileDistilledSkill(
        makeDistilledData({ groupBy: "genre", groupValue: "xuanhuan" }),
      ).content,
    ).toContain("准备写 **xuanhuan** 题材作品");
    expect(
      compileDistilledSkill(
        makeDistilledData({ groupBy: "platform", groupValue: "fanqie" }),
      ).content,
    ).toContain("投稿到 **fanqie** 平台");
  });

  it("reports a low-sample caveat when confidence is low", () => {
    const result = compileDistilledSkill(
      makeDistilledData({ sampleSize: 1, confidence: "low" }),
    );
    expect(result.content).toContain("置信度：**low**");
    expect(result.content).toContain("样本只有 1 本");
  });
});
