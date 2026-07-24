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
  it("should accept a known purpose and profiles", () => {
    const errors = validate({
      ...basePayload,
      purpose: "own-draft",
      profiles: ["statistics", "continuity"],
    });

    expect(
      errors.filter((error) =>
        ["purpose", "profiles"].includes(error.property),
      ),
    ).toEqual([]);
  });

  it("should reject an unknown purpose or profile", () => {
    const errors = validate({
      ...basePayload,
      purpose: "bogus",
      profiles: ["bogus"],
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["purpose", "profiles"]),
    );
  });

  it("should treat purpose and profiles as optional", () => {
    const errors = validate(basePayload);

    expect(errors.map((error) => error.property)).not.toEqual(
      expect.arrayContaining(["purpose", "profiles"]),
    );
  });
});
