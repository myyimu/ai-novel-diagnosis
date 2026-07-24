import { describe, expect, it } from "vitest";
import { buildDialogueStatistics } from "./dialogue-statistics";

describe("buildDialogueStatistics", () => {
  it("should count curly, corner, double-corner, and ascii quotes", () => {
    const stats = buildDialogueStatistics({
      scopeId: "book",
      text: '她说：“走。”\n他问：「现在？」\n旁白『必须快』\nHe said "go".',
    });

    expect(stats.dialogueTurnCount).toBe(4);
    expect(stats.dialogueParagraphCount).toBe(4);
    expect(stats.dialogueCharacterCount).toBe("走。现在？必须快go".length);
  });

  it("should keep nested quotes inside the outer turn without double counting", () => {
    const stats = buildDialogueStatistics({
      scopeId: "ch-1",
      text: "她说：「别再提『旧誓』，现在先走。」",
    });

    expect(stats.dialogueTurnCount).toBe(1);
    expect(stats.dialogueCharacterCount).toBe("别再提『旧誓』，现在先走。".length);
  });

  it("should support dialogue that crosses paragraph breaks", () => {
    const stats = buildDialogueStatistics({
      scopeId: "ch-1",
      text: "他说：“第一句还没完\n第二句才落下。”\n\n众人沉默。",
    });

    expect(stats.dialogueTurnCount).toBe(1);
    expect(stats.dialogueParagraphCount).toBe(2);
    expect(stats.dialogueCharacterCount).toBe("第一句还没完第二句才落下。".length);
  });

  it("should warn but still count an unclosed quote", () => {
    const stats = buildDialogueStatistics({
      scopeId: "ch-1",
      text: "她低声说：“这里不对",
    });

    expect(stats.dialogueTurnCount).toBe(1);
    expect(stats.parserWarnings).toHaveLength(1);
    expect(stats.dialogueCharacterCount).toBe("这里不对".length);
  });

  it("should ignore book titles and optionally exclude non-spoken quoted text", () => {
    const stats = buildDialogueStatistics({
      scopeId: "ch-1",
      text: "桌上放着《旧案录》。短信：“马上撤。”她说：“不，继续。”心想：“不能怕。”系统：“权限不足。”",
      excludeKinds: ["message", "inner-monologue", "system"],
    });

    expect(stats.dialogueTurnCount).toBe(1);
    expect(stats.dialogueCharacterCount).toBe("不，继续。".length);
  });
});
