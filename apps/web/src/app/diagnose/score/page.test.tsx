import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/workspace/deep/DeepDiagnosisPage", () => ({
	DeepDiagnosisPage: (props: { entryView?: string }) => (
		<div data-entry-view={props.entryView || "deep"}>score-page</div>
	),
}));

import ScoreReportPage from "./page";

describe("/diagnose/score page", () => {
	it("passes the score entry view to the deep page", () => {
		const html = renderToStaticMarkup(<ScoreReportPage />);
		expect(html).toContain('data-entry-view="score"');
		expect(html).toContain("score-page");
	});
});
