import { describe, expect, it } from "vitest";
import {
  AiCoreValidationError,
  validateProviderConfig,
  validateReferenceChapterInput,
  validateUserChapterInput,
} from "./validation";

describe("validateUserChapterInput", () => {
  it("accepts valid user chapter input", () => {
    expect(
      validateUserChapterInput({
        title: "第一章",
        text: "主角被迫进入试炼场。",
        rubricId: "default",
      }),
    ).toMatchObject({ title: "第一章" });
  });

  it("returns structured issues for invalid values", () => {
    try {
      validateUserChapterInput({ title: "", text: "", rubricId: "" });
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AiCoreValidationError);
      expect((error as AiCoreValidationError).issues.map((issue) => issue.path)).toEqual([
        "title",
        "text",
        "rubricId",
        "text",
      ]);
    }
  });
});

describe("validateReferenceChapterInput", () => {
  it("rejects unsupported genres", () => {
    expect(() =>
      validateReferenceChapterInput({
        title: "样本",
        genre: "unknown",
        text: "参考章节正文。",
      }),
    ).toThrow("genre: must be a supported genre");
  });
});

describe("validateProviderConfig", () => {
  it("accepts a minimal openai-compatible provider config", () => {
    expect(
      validateProviderConfig({
        id: "local",
        kind: "openai-compatible",
        baseUrl: "https://example.test/v1",
        model: "model-id",
        capabilities: {
          jsonMode: true,
          streaming: false,
          maxContextTokens: 8192,
        },
      }),
    ).toMatchObject({ id: "local", kind: "openai-compatible" });
  });

  it("rejects unsafe provider shape", () => {
    expect(() =>
      validateProviderConfig({
        id: "bad",
        kind: "bad",
        model: "",
        capabilities: {
          jsonMode: "yes",
          streaming: false,
          maxContextTokens: 0,
        },
      }),
    ).toThrow("kind: must be a supported provider kind");
  });
});
