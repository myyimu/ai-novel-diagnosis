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

const divergencePointSchema = objectSchema(
  {
    id: stringSchema,
    topic: stringSchema,
    quickReviewQuote: stringSchema,
    storyAuditQuote: stringSchema,
    explanation: stringSchema,
    questionForAuthor: stringSchema,
  },
  [
    "topic",
    "quickReviewQuote",
    "storyAuditQuote",
    "explanation",
    "questionForAuthor",
  ],
);

export const reportDivergenceJsonSchema = objectSchema({
  divergences: {
    type: "array",
    items: divergencePointSchema,
    maxItems: 5,
  },
  agreementNote: stringSchema,
});
