import {
  aggregateBookSkills,
  intersectionThresholdFor,
  type AggregateBookSkillsInput,
} from "./book-skill-aggregator";
import type { BookSkillSource } from "./book-skill-compiler";

function makeSource(
  jobId: string,
  overrides: Partial<BookSkillSource> = {},
): BookSkillSource {
  return {
    jobId,
    title: `测试书 ${jobId}`,
    genre: "xuanhuan",
    generatedAt: "2026-06-27T00:00:00.000Z",
    styleCard: {
      styleRules: [],
      antiPatterns: [],
      pleasureMechanisms: [],
      hookPatterns: [],
    },
    styleBible: {},
    ...overrides,
  };
}

const baseInput = (sources: BookSkillSource[]): AggregateBookSkillsInput => ({
  sources,
  options: { groupBy: "author", groupValue: "测试作者" },
  generatedAt: "2026-06-27T00:00:00.000Z",
});

describe("intersectionThresholdFor", () => {
  it("returns 1 for a single sample so single-book usage degrades to L1", () => {
    expect(intersectionThresholdFor(1)).toBe(1);
  });

  it("requires both samples to agree when there are 2", () => {
    expect(intersectionThresholdFor(2)).toBe(2);
  });

  it("requires 2-of-N for small samples (3-4 books)", () => {
    expect(intersectionThresholdFor(3)).toBe(2);
    expect(intersectionThresholdFor(4)).toBe(2);
  });

  it("requires 3-of-N for medium samples (5-9 books)", () => {
    expect(intersectionThresholdFor(5)).toBe(3);
    expect(intersectionThresholdFor(9)).toBe(3);
  });

  it("scales to 40% of sample size for large samples", () => {
    expect(intersectionThresholdFor(10)).toBe(4);
    expect(intersectionThresholdFor(20)).toBe(8);
  });
});

describe("aggregateBookSkills", () => {
  it("returns 1-of-1 high-confidence when only one source has rules", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          styleCard: {
            styleRules: ["开篇 500 字给失败代价"],
          },
        }),
      ]),
    );
    expect(result.sampleSize).toBe(1);
    expect(result.confidence).toBe("low");
    expect(result.intersectionThreshold).toBe(1);
    expect(result.highConfidenceStyleRules).toHaveLength(1);
    expect(result.highConfidenceStyleRules[0]).toEqual(
      expect.objectContaining({
        text: "开篇 500 字给失败代价",
        occurrences: 1,
      }),
    );
  });

  it("filters out sources that have no style signal and records them in debug", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          styleCard: { styleRules: ["规则 A"] },
        }),
        makeSource("b", { styleCard: {}, styleBible: {} }),
        makeSource("c", { styleCard: { styleRules: ["规则 B"] } }),
      ]),
    );
    expect(result.sampleSize).toBe(2);
    expect(result.debug.droppedEmpty).toEqual(["b"]);
  });

  it("promotes a rule to high-confidence when it crosses the threshold", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          styleCard: { styleRules: ["开篇必须给冲突", "对白短"] },
        }),
        makeSource("b", {
          styleCard: { styleRules: ["开篇必须给冲突", "段落短"] },
        }),
        makeSource("c", {
          styleCard: { styleRules: ["开篇必须给冲突"] },
        }),
      ]),
    );
    // Threshold for 3 samples is 2; "开篇必须给冲突" appears in all 3.
    const promoted = result.highConfidenceStyleRules.find(
      (item) => item.text === "开篇必须给冲突",
    );
    expect(promoted?.occurrences).toBe(3);
    expect(promoted?.sourceJobIds).toEqual(["a", "b", "c"]);
  });

  it("ranks all rules by occurrence count (B2 output)", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          styleCard: { styleRules: ["规则 X", "规则 Y"] },
        }),
        makeSource("b", { styleCard: { styleRules: ["规则 X"] } }),
        makeSource("c", { styleCard: { styleRules: ["规则 X", "规则 Z"] } }),
      ]),
    );
    expect(result.rankedStyleRules[0]).toEqual(
      expect.objectContaining({ text: "规则 X", occurrences: 3 }),
    );
    // The rest are tied at 1; they come after.
    expect(
      result.rankedStyleRules.slice(1).every((r) => r.occurrences === 1),
    ).toBe(true);
  });

  it("collects single-source rules separately for human review", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          title: "甲书",
          styleCard: { styleRules: ["共性规则", "甲独有规则"] },
        }),
        makeSource("b", {
          title: "乙书",
          styleCard: { styleRules: ["共性规则", "乙独有规则"] },
        }),
      ]),
    );
    const singleSourceTexts = result.singleSourceStyleRules.map((r) => r.text);
    expect(singleSourceTexts).toEqual(
      expect.arrayContaining(["甲独有规则", "乙独有规则"]),
    );
    expect(singleSourceTexts).not.toContain("共性规则");
  });

  it("never aggregates doNotReuse - keeps each item per-source", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          title: "甲书",
          styleCard: { styleRules: ["规则 1"] },
          boundary: { doNotReuse: ["主角名「林无道」"] },
        }),
        makeSource("b", {
          title: "乙书",
          styleCard: { styleRules: ["规则 1"] },
          boundary: { doNotReuse: ["主角名「叶凡」"] },
        }),
      ]),
    );
    expect(result.perSourceDoNotReuse).toHaveLength(2);
    expect(result.perSourceDoNotReuse[0]?.sourceTitle).toBe("甲书");
    expect(result.perSourceDoNotReuse[1]?.sourceTitle).toBe("乙书");
  });

  it("merges anti-patterns from styleCard.antiPatterns and styleBible.tabooList", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          styleCard: { antiPatterns: ["不要上帝视角"] },
          styleBible: { tabooList: ["不要上帝视角"] },
        }),
      ]),
    );
    // De-duped within a single source, so this is 1 not 2.
    const merged = result.antiPatterns.find(
      (item) => item.text === "不要上帝视角",
    );
    expect(merged?.occurrences).toBe(1);
  });

  it("normalizes whitespace and trailing punctuation so close variants merge", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", { styleCard: { styleRules: ["开篇必须给冲突"] } }),
        makeSource("b", {
          styleCard: { styleRules: [" 开篇必须给冲突 "] },
        }),
        makeSource("c", { styleCard: { styleRules: ["开篇必须给冲突。"] } }),
      ]),
    );
    const merged = result.rankedStyleRules.find(
      (item) => item.text === "开篇必须给冲突",
    );
    expect(merged?.occurrences).toBe(3);
  });

  it("attaches author/platform/year metadata to sources for downstream citation", () => {
    const result = aggregateBookSkills(
      baseInput([
        makeSource("a", {
          title: "甲书",
          metadata: { author: "猫腻", platform: "qidian", publishedYear: 2018 },
          styleCard: { styleRules: ["规则"] },
        }),
      ]),
    );
    expect(result.sources[0]).toEqual({
      jobId: "a",
      title: "甲书",
      author: "猫腻",
      platform: "qidian",
      publishedYear: 2018,
    });
  });

  it("sets confidence label by sample size buckets", () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, idx) =>
        makeSource(`job-${idx}`, {
          styleCard: { styleRules: [`规则-${idx}`] },
        }),
      );
    expect(aggregateBookSkills(baseInput(make(1))).confidence).toBe("low");
    expect(aggregateBookSkills(baseInput(make(3))).confidence).toBe(
      "medium-low",
    );
    expect(aggregateBookSkills(baseInput(make(6))).confidence).toBe("medium");
    expect(aggregateBookSkills(baseInput(make(12))).confidence).toBe("high");
  });
});
