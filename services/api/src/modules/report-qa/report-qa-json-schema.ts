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

const citationSchema = objectSchema(
	{
		quote: stringSchema,
		source: { type: "string", enum: ["report", "source-text"] },
		locator: stringSchema,
		note: stringSchema,
	},
	["quote", "source"],
);

export const reportQaJsonSchema = objectSchema({
	answer: stringSchema,
	citations: {
		type: "array",
		items: citationSchema,
		maxItems: 6,
	},
	gaps: {
		type: "array",
		items: stringSchema,
		maxItems: 5,
	},
});
