import { describe, expect, it } from "vitest";

import { getExportAvailability } from "./ProjectExportPage";

describe("getExportAvailability", () => {
	it("should enable export when the project has any exportable asset", () => {
		expect(
			getExportAvailability({ revisionCount: 2, methodologyCount: 0, hasStoryAudit: false }),
		).toEqual({ assetCount: 2, canExport: true });
	});

	it("should keep export unavailable when the project has no assets", () => {
		expect(
			getExportAvailability({ revisionCount: 0, methodologyCount: 0, hasStoryAudit: false }),
		).toEqual({ assetCount: 0, canExport: false });
	});
});

it("should allow export when only an engine card exists", () => {
	expect(
		getExportAvailability({
			revisionCount: 0,
			methodologyCount: 0,
			hasStoryAudit: false,
			hasEngineCard: true,
		}),
	).toEqual({ assetCount: 1, canExport: true });
});
