import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { AnalyzeBookDto } from "./analyze-book.dto";

const basePayload = {
  provider: { preset: "shared-gpu", kind: "openai-compatible" },
  title: "示例长篇",
  genre: "xuanhuan",
  text: "x".repeat(600),
};

function validate(payload: Record<string, unknown>) {
  return validateSync(plainToInstance(AnalyzeBookDto, payload), {
    skipMissingProperties: false,
  });
}

describe("AnalyzeBookDto story-audit fields", () => {
  it("accepts a known purpose and profiles", () => {
    const errors = validate({
      ...basePayload,
      purpose: "own-draft",
      profiles: ["statistics", "continuity"],
    });
    const relevant = errors.filter(
      (error) => error.property === "purpose" || error.property === "profiles",
    );
    expect(relevant).toEqual([]);
  });

  it("rejects an unknown purpose", () => {
    const errors = validate({ ...basePayload, purpose: "bogus" });
    expect(errors.some((error) => error.property === "purpose")).toBe(true);
  });

  it("rejects an unknown profile", () => {
    const errors = validate({
      ...basePayload,
      purpose: "own-draft",
      profiles: ["bogus"],
    });
    expect(errors.some((error) => error.property === "profiles")).toBe(true);
  });

  it("treats purpose and profiles as optional", () => {
    const errors = validate(basePayload);
    expect(errors.some((error) => error.property === "purpose")).toBe(false);
    expect(errors.some((error) => error.property === "profiles")).toBe(false);
  });
});
