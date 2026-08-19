import { PREMISE_REVIEW_LAYERS } from "@ai-novel-diagnosis/ai-core";

const stringSchema = { type: "string" };

function objectSchema(
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const contractFieldEnum = {
  type: "string",
  enum: [
    "coreConflict",
    "protagonistDesire",
    "opposingForce",
    "irreducibilityTest",
    "readerHookQuestion",
  ],
};

export const premiseDialogueAskJsonSchema = objectSchema({
  focusedLayer: { type: "string", enum: [...PREMISE_REVIEW_LAYERS] },
  question: stringSchema,
  whyThisQuestion: stringSchema,
  hintQuote: stringSchema,
});

export const premiseDialogueJudgeJsonSchema = objectSchema({
  verdict: { type: "string", enum: ["strengthened", "not-yet", "weakened"] },
  quoteAuthor: stringSchema,
  reason: stringSchema,
  layerStatusSuggestion: {
    type: "string",
    enum: ["established", "weak", "missing"],
  },
  followUp: stringSchema,
  disagreementNote: stringSchema,
});

export const premiseDialogueContractReviewJsonSchema = objectSchema({
  divergencePoints: {
    type: "array",
    maxItems: 3,
    items: objectSchema({
      field: contractFieldEnum,
      authorView: stringSchema,
      editorView: stringSchema,
      questionToAuthor: stringSchema,
    }),
  },
  feynmanVerdict: { type: "string", enum: ["clear", "partial", "unclear"] },
  quoteAuthor: stringSchema,
  reason: stringSchema,
});
