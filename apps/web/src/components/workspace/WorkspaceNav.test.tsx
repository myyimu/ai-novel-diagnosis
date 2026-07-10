import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceNav } from "./WorkspaceNav";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	usePathname: () => "/project/current",
	useRouter: () => ({
		push,
	}),
}));

vi.mock("@/stores/workspace-nav-store", () => ({
	useWorkspaceNavStore: () => ({
		activeWorkspace: "diagnose",
		setActiveWorkspace: vi.fn(),
	}),
}));

describe("WorkspaceNav", () => {
	it("marks the active workspace from the URL instead of stale store state", () => {
		const html = renderToStaticMarkup(<WorkspaceNav />);

		expect((html.match(/border-primary text-primary/g) ?? []).length).toBe(1);
		expect(html).toContain("项目");
		expect(push).not.toHaveBeenCalled();
	});
});
