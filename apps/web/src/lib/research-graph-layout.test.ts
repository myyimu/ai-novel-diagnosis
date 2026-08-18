import { describe, expect, it } from "vitest";
import {
	RESEARCH_GRAPH_MAX_NODES_PER_GROUP,
	layoutResearchGraph,
	researchGraphGroupLabel,
} from "./research-graph-layout";

function node(id: string, type: string) {
	return { id, label: id, type };
}

describe("layoutResearchGraph", () => {
	it("returns an empty layout when there are no nodes", () => {
		const layout = layoutResearchGraph([]);

		expect(layout).toEqual({ width: 900, height: 640, nodes: [], groups: [] });
	});

	it("groups nodes by type in the canonical order", () => {
		const layout = layoutResearchGraph([
			node("promise-1", "promise"),
			node("event-1", "event"),
			node("char-1", "character"),
		]);

		expect(layout.groups.map((group) => group.type)).toEqual(["character", "event", "promise"]);
		expect(layout.nodes).toHaveLength(3);
		for (const position of layout.nodes) {
			expect(position.x).toBeGreaterThanOrEqual(0);
			expect(position.x).toBeLessThanOrEqual(layout.width);
			expect(position.y).toBeGreaterThanOrEqual(0);
			expect(position.y).toBeLessThanOrEqual(layout.height);
		}
	});

	it("caps each group and reports the collapsed overflow", () => {
		const events = Array.from({ length: 15 }, (_, index) =>
			node(`event-${index + 1}`, "event"),
		);
		const layout = layoutResearchGraph([...events, node("char-1", "character")]);

		const eventGroup = layout.groups.find((group) => group.type === "event");
		expect(eventGroup?.renderedCount).toBe(RESEARCH_GRAPH_MAX_NODES_PER_GROUP);
		expect(eventGroup?.collapsedCount).toBe(3);
		expect(layout.nodes.filter((item) => item.id.startsWith("event-"))).toHaveLength(
			RESEARCH_GRAPH_MAX_NODES_PER_GROUP,
		);
	});

	it("is deterministic for identical input", () => {
		const input = [
			node("char-1", "character"),
			node("char-2", "character"),
			node("faction-1", "faction"),
		];

		expect(layoutResearchGraph(input)).toEqual(layoutResearchGraph(input));
	});

	it("labels known types in Chinese and falls back to the raw type", () => {
		expect(researchGraphGroupLabel("character")).toBe("人物");
		expect(researchGraphGroupLabel("custom-type")).toBe("custom-type");
	});
});
