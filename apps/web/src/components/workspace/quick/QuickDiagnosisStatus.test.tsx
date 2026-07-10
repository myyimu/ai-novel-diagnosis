import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisStatus } from "./QuickDiagnosisStatus";

describe("QuickDiagnosisStatus", () => {
	it("shows a loading state with disabled action intent", () => {
		const html = renderToStaticMarkup(
			<QuickDiagnosisStatus loading error={null} onRetry={vi.fn()} onOpenModel={vi.fn()} />,
		);

		expect(html).toContain("正在生成改稿方案");
		expect(html).toContain("按钮已禁用");
	});

	it("sanitizes html-like provider errors before rendering", () => {
		const html = renderToStaticMarkup(
			<QuickDiagnosisStatus
				loading={false}
				error={"<html><body>521 gateway error</body></html>"}
				onRetry={vi.fn()}
				onOpenModel={vi.fn()}
			/>,
		);

		expect(html).toContain("无法直接展示的网页内容");
		expect(html).not.toContain("521 gateway error");
		expect(html).not.toContain("<html>");
	});
});
