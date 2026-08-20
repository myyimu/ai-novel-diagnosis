import { PREMISE_REVIEW_LAYERS } from "@ai-novel-diagnosis/ai-core";

const stringSchema = { type: "string" };
const numberSchema = { type: "number" };

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

const layerAssessmentSchema = objectSchema({
  layer: { type: "string", enum: [...PREMISE_REVIEW_LAYERS] },
  status: { type: "string", enum: ["established", "weak", "missing"] },
  statement: stringSchema,
  confidence: numberSchema,
  comment: stringSchema,
});

const evidenceQuoteSchema = objectSchema(
  {
    quote: stringSchema,
    note: stringSchema,
  },
  ["quote"],
);

const clicheFindingSchema = objectSchema(
  {
    id: stringSchema,
    layer: { type: "string", enum: [...PREMISE_REVIEW_LAYERS] },
    severity: { type: "string", enum: ["high", "medium", "low"] },
    title: stringSchema,
    claim: stringSchema,
    evidence: {
      type: "array",
      items: evidenceQuoteSchema,
      minItems: 1,
    },
    patternReference: stringSchema,
    suggestion: stringSchema,
  },
  ["id", "layer", "severity", "title", "claim", "evidence"],
);

const upgradeDirectionSchema = objectSchema(
  {
    directionId: stringSchema,
    orientation: { type: "string", enum: ["emotion", "intrigue", "war"] },
    pitch: stringSchema,
    changedConflict: stringSchema,
    preservedElements: { type: "array", items: stringSchema },
    risk: stringSchema,
  },
  ["directionId", "orientation", "pitch", "changedConflict"],
);

export const premiseReviewJsonSchema = objectSchema(
  {
    premiseSummary: stringSchema,
    coreConflict: stringSchema,
    protagonistDesire: stringSchema,
    opposingForce: stringSchema,
    irreducibilityTest: stringSchema,
    readerHookQuestion: stringSchema,
    engineVerdict: {
      type: "string",
      enum: ["solid", "fixable", "not-worth-writing"],
    },
    oneLineVerdict: stringSchema,
    layers: {
      type: "array",
      items: layerAssessmentSchema,
      minItems: 4,
      maxItems: 4,
    },
    clicheFindings: {
      type: "array",
      items: clicheFindingSchema,
      maxItems: 6,
    },
    upgradeDirections: {
      type: "array",
      items: upgradeDirectionSchema,
      maxItems: 3,
    },
  },
  [
    "premiseSummary",
    "coreConflict",
    "protagonistDesire",
    "opposingForce",
    "irreducibilityTest",
    "readerHookQuestion",
    "engineVerdict",
    "oneLineVerdict",
    "layers",
    "clicheFindings",
    "upgradeDirections",
  ],
);

/** Constrained output shape for the blind second reviewer (premise consult). */
export const premiseSecondReviewJsonSchema = objectSchema(
  {
    verdict: {
      type: "string",
      enum: ["solid", "fixable", "not-worth-writing"],
    },
    oneLineVerdict: stringSchema,
    layers: {
      type: "array",
      items: layerAssessmentSchema,
      minItems: 4,
      maxItems: 4,
    },
    strongestArgument: stringSchema,
    evidence: {
      type: "array",
      items: evidenceQuoteSchema,
      maxItems: 5,
    },
  },
  ["verdict", "oneLineVerdict", "layers", "strongestArgument", "evidence"],
);

