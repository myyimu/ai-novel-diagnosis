import { describe, expect, it } from "vitest";
import {
  computeDialogueStatistics,
  extractDialogueSpans,
  DEFAULT_DIALOGUE_QUOTE_STYLES,
} from "./dialogue-statistics";

const CURLY = "“";
const CURLY_CLOSE = "”";
const CORNER = "「";
const CORNER_CLOSE = "」";
const DOUBLE_CORNER = "『";
const DOUBLE_CORNER_CLOSE = "』";
const ASCII = '"';
const ASCII_CLOSE = '"';

describe("extractDialogueSpans", () => {
  it("recognizes each of the four quote styles in isolation", () => {
    const cases: Array<{ style: string; text: string }> = [
      { style: "curly", text: `${CURLY}你好${CURLY_CLOSE}` },
      { style: "corner", text: `${CORNER}你好${CORNER_CLOSE}` },
      { style: "double-corner", text: `${DOUBLE_CORNER}你好${DOUBLE_CORNER_CLOSE}` },
      { style: "ascii", text: `${ASCII}你好${ASCII_CLOSE}` },
    ];
    for (const item of cases) {
      const { spans, warnings } = extractDialogueSpans(item.text);
      expect(spans, `style ${item.style}`).toHaveLength(1);
      expect(spans[0].style, `style ${item.style}`).toBe(item.style);
      expect(spans[0].closed, `style ${item.style}`).toBe(true);
      expect(warnings, `style ${item.style}`).toEqual([]);
    }
  });

  it("treats nested and title-mark glyphs as content, never splitting the outer span", () => {
    const text = `${CURLY}我读过《红楼梦》，他说${DOUBLE_CORNER}好${DOUBLE_CORNER_CLOSE}。${CURLY_CLOSE}`;
    const { spans, warnings } = extractDialogueSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].style).toBe("curly");
    expect(spans[0].start).toBe(0);
    expect(spans[0].end).toBe(text.length);
    expect(warnings).toEqual([]);
  });

  it("does not treat book title marks (《》) as dialogue", () => {
    const text = "他推荐了《三体》这本书。";
    const { spans, warnings } = extractDialogueSpans(text);
    expect(spans).toHaveLength(0);
    expect(warnings).toEqual([]);
  });

  it("keeps dialogue spanning multiple paragraphs as one span", () => {
    const text = `他说：${CURLY}这是第一段，\n继续第二段。${CURLY_CLOSE}`;
    const { spans } = extractDialogueSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].closed).toBe(true);
  });

  it("warns on unclosed quotes instead of silently swallowing the rest", () => {
    const text = `他说：${CURLY}你来了。`;
    const { spans, warnings } = extractDialogueSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].closed).toBe(false);
    expect(spans[0].end).toBe(text.length);
    expect(warnings.some((w) => w.includes("未闭合"))).toBe(true);
  });

  it("warns on an unmatched stray close quote", () => {
    const text = `结束。${CURLY_CLOSE}然后他走了。`;
    const { spans, warnings } = extractDialogueSpans(text);
    expect(spans).toHaveLength(0);
    expect(warnings.some((w) => w.includes("未匹配"))).toBe(true);
  });

  it("respects an explicit quote-style allowlist", () => {
    const text = `${CURLY}你好${CURLY_CLOSE}${CORNER}再见${CORNER_CLOSE}`;
    const onlyCurly = extractDialogueSpans(text, ["curly"]);
    expect(onlyCurly.spans).toHaveLength(1);
    expect(onlyCurly.spans[0].style).toBe("curly");
  });

  it("falls back to defaults when given an empty style list", () => {
    const text = `${CURLY}你好${CURLY_CLOSE}`;
    const { spans } = extractDialogueSpans(text, []);
    expect(spans).toHaveLength(1);
    expect(DEFAULT_DIALOGUE_QUOTE_STYLES).toContain("curly");
  });
});

describe("computeDialogueStatistics", () => {
  it("returns stable output for identical input", () => {
    const text = `他说：${CURLY}你好。${CURLY_CLOSE}她问：${CURLY}没事吧？${CURLY_CLOSE}`;
    const a = computeDialogueStatistics(text, { scopeId: "ch1" });
    const b = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(a).toEqual(b);
  });

  it("computes dialogue character counts and ratios", () => {
    const text = `${CURLY}你好${CURLY_CLOSE}`;
    const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(stats.scopeId).toBe("ch1");
    expect(stats.dialogueCharacterCount).toBe(2);
    expect(stats.effectiveCharacterCount).toBeGreaterThan(stats.dialogueCharacterCount);
    expect(stats.dialogueCharacterRatio).toBeCloseTo(2 / 4, 5);
    expect(stats.dialogueTurnCount).toBe(1);
    expect(stats.dialogueParagraphCount).toBe(1);
    expect(stats.parserWarnings).toEqual([]);
  });

  it("counts dialogue tags around quotes", () => {
    const text = `他说：${CURLY}你好。${CURLY_CLOSE}她问：${CURLY}没事吧？${CURLY_CLOSE}`;
    const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(stats.dialogueTurnCount).toBe(2);
    expect(stats.dialogueTagCount).toBe(2);
    expect(stats.unattributedTurnCandidateCount).toBe(0);
  });

  it("flags consecutive untagged turns as unattributed candidates", () => {
    const text = `${CURLY}你好。${CURLY_CLOSE}${CURLY}我很好。${CURLY_CLOSE}${CURLY}再见。${CURLY_CLOSE}`;
    const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(stats.dialogueTurnCount).toBe(3);
    expect(stats.unattributedTurnCandidateCount).toBe(2);
  });

  it("counts paragraphs and dialogue paragraphs across multiple lines", () => {
    const text = `第一段没有对话。\n第二段${CURLY}有对话${CURLY_CLOSE}。`;
    const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(stats.paragraphCount).toBe(2);
    expect(stats.dialogueParagraphCount).toBe(1);
  });

  it("reports zero dialogue for prose without quotes", () => {
    const text = "他推荐了《三体》这本书，没有说一句话。";
    const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
    expect(stats.dialogueCharacterCount).toBe(0);
    expect(stats.dialogueCharacterRatio).toBe(0);
    expect(stats.dialogueTurnCount).toBe(0);
    expect(stats.dialogueParagraphCount).toBe(0);
  });

  it("handles empty text without throwing", () => {
    const stats = computeDialogueStatistics("", { scopeId: "empty" });
    expect(stats.effectiveCharacterCount).toBe(0);
    expect(stats.dialogueCharacterRatio).toBe(0);
    expect(stats.paragraphCount).toBe(0);
    expect(stats.dialogueTurnCount).toBe(0);
    expect(stats.parserWarnings).toEqual([]);
  });

  it("clamps ratios into [0, 1]", () => {
    const stats = computeDialogueStatistics(`${CURLY}你好${CURLY_CLOSE}`, { scopeId: "ch1" });
    expect(stats.dialogueCharacterRatio).toBeGreaterThanOrEqual(0);
    expect(stats.dialogueCharacterRatio).toBeLessThanOrEqual(1);
    expect(stats.dialogueParagraphRatio).toBeGreaterThanOrEqual(0);
    expect(stats.dialogueParagraphRatio).toBeLessThanOrEqual(1);
  });

  describe("excludeKinds", () => {
    it("does not exclude anything by default", () => {
      const text = `${CURLY}【系统提示：获得技能】${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, { scopeId: "ch1" });
      expect(stats.dialogueTurnCount).toBe(1);
      expect(stats.parserWarnings).toEqual([]);
    });

    it("excludes system panel lines when configured", () => {
      const text = `${CURLY}【系统提示：获得技能】${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, {
        scopeId: "ch1",
        excludeKinds: ["system"],
      });
      expect(stats.dialogueTurnCount).toBe(0);
      expect(stats.dialogueCharacterCount).toBe(0);
      expect(stats.parserWarnings.some((w) => w.includes("已排除"))).toBe(true);
    });

    it("excludes message-style lines when configured", () => {
      const text = `${CURLY}短信：我到了${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, {
        scopeId: "ch1",
        excludeKinds: ["message"],
      });
      expect(stats.dialogueTurnCount).toBe(0);
    });

    it("excludes letter-style lines when configured", () => {
      const text = `${CURLY}亲爱的妈妈：近来可好${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, {
        scopeId: "ch1",
        excludeKinds: ["letter"],
      });
      expect(stats.dialogueTurnCount).toBe(0);
    });

    it("excludes inner-monologue lines when configured", () => {
      const text = `${CURLY}我心想，这怎么可能${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, {
        scopeId: "ch1",
        excludeKinds: ["inner-monologue"],
      });
      expect(stats.dialogueTurnCount).toBe(0);
    });

    it("keeps ordinary dialogue untouched when only one exclude kind is set", () => {
      const text = `${CURLY}你好。${CURLY_CLOSE}${CURLY}【系统：升级】${CURLY_CLOSE}`;
      const stats = computeDialogueStatistics(text, {
        scopeId: "ch1",
        excludeKinds: ["system"],
      });
      expect(stats.dialogueTurnCount).toBe(1);
    });
  });
});
