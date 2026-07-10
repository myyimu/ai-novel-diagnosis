import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/workspace/deep/DeepDiagnosisPage", () => ({
	DeepDiagnosisPage: (props: { entryView?: string }) => (
		<div data-entry-view={props.entryView || "deep"}>evidence-page</div>
	),
}));

import EvidenceChainPage from "./page";

describe("/diagnose/evidence page", () => {
	it("passes the evidence entry view to the deep page", () => {
		const html = renderToStaticMarkup(<EvidenceChainPage />);
		expect(html).toContain('data-entry-view="evidence"');
		expect(html).toContain("evidence-page");
	});
});
