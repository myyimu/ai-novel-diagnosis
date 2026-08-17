import { estimateChatUsage, estimateTokenCount } from "./estimate-tokens";

describe("estimateTokenCount", () => {
  it("should return 0 for empty text but count whitespace-only as one token", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("   ")).toBe(1);
  });

  it("should count CJK characters at roughly one token each", () => {
    expect(estimateTokenCount("你好世界")).toBe(4);
  });

  it("should count ASCII text at roughly four characters per token", () => {
    expect(estimateTokenCount("abcdefgh")).toBe(2);
  });

  it("should blend CJK and ASCII segments", () => {
    // 5 CJK chars ≈ 5.5 + 8 ASCII chars / 4 = 2 → 7.5 → 8
    expect(estimateTokenCount("主角开挂了abcdefgh")).toBe(8);
  });
});

describe("estimateChatUsage", () => {
  it("should sum prompt and completion into totals", () => {
    const usage = estimateChatUsage("你好世界", "abcdefgh");

    expect(usage).toEqual({
      promptTokens: 4,
      completionTokens: 2,
      totalTokens: 6,
    });
  });

  it("should keep a minimum of one token for non-empty completion text", () => {
    const usage = estimateChatUsage("", "a");

    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(1);
    expect(usage.totalTokens).toBe(1);
  });
});
