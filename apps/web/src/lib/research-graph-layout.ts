/**
 * Deterministic grouped layout for the research patterns graph.
 *
 * Pure geometry — no forces, no randomness. Nodes are grouped by `type`
 * (known types first in a fixed order, unknown types after, alphabetical),
 * each group sits on an orbit around the canvas center, and nodes within a
 * group sit on a ring around the group center. Groups larger than
 * {@link RESEARCH_GRAPH_MAX_NODES_PER_GROUP} are truncated and the overflow
 * is reported so the view can render a "+N" affordance.
 */

export interface ResearchGraphLayoutNode {
	id: string;
	label: string;
	type: string;
}

export interface ResearchGraphNodePosition {
	id: string;
	x: number;
	y: number;
}

export interface ResearchGraphGroupLayout {
	type: string;
	label: string;
	totalCount: number;
	renderedCount: number;
	collapsedCount: number;
	x: number;
	y: number;
	haloRadius: number;
}

export interface ResearchGraphLayout {
	width: number;
	height: number;
	nodes: ResearchGraphNodePosition[];
	groups: ResearchGraphGroupLayout[];
}

/** Server graphs can have hundreds of events; cap each ring to keep the SVG readable. */
export const RESEARCH_GRAPH_MAX_NODES_PER_GROUP = 12;

const GROUP_TYPE_ORDER = [
	"character",
	"location",
	"faction",
	"event",
	"foreshadowing",
	"promise",
] as const;

const GROUP_TYPE_LABELS: Record<string, string> = {
	character: "人物",
	location: "地点",
	faction: "势力",
	event: "事件",
	foreshadowing: "伏笔",
	promise: "读者承诺",
};

export function researchGraphGroupLabel(type: string): string {
	return GROUP_TYPE_LABELS[type] ?? type;
}

export function layoutResearchGraph(
	nodes: ResearchGraphLayoutNode[],
	options: { width?: number; height?: number } = {},
): ResearchGraphLayout {
	const width = options.width ?? 900;
	const height = options.height ?? 640;
	if (!nodes.length) {
		return { width, height, nodes: [], groups: [] };
	}

	const byType = new Map<string, ResearchGraphLayoutNode[]>();
	for (const node of nodes) {
		const bucket = byType.get(node.type);
		if (bucket) {
			bucket.push(node);
		} else {
			byType.set(node.type, [node]);
		}
	}

	const typeRank = (type: string) => {
		const index = GROUP_TYPE_ORDER.indexOf(type as (typeof GROUP_TYPE_ORDER)[number]);
		return index === -1 ? GROUP_TYPE_ORDER.length : index;
	};
	const groupTypes = [...byType.keys()].sort(
		(left, right) => typeRank(left) - typeRank(right) || left.localeCompare(right),
	);

	const centerX = width / 2;
	const centerY = height / 2;
	const groupCount = groupTypes.length;
	const orbitRadius = Math.min(width, height) * 0.32;

	const positions: ResearchGraphNodePosition[] = [];
	const groups: ResearchGraphGroupLayout[] = [];
	groupTypes.forEach((type, groupIndex) => {
		const bucket = byType.get(type) ?? [];
		const rendered = bucket.slice(0, RESEARCH_GRAPH_MAX_NODES_PER_GROUP);
		const collapsedCount = bucket.length - rendered.length;

		const groupAngle = -Math.PI / 2 + (2 * Math.PI * groupIndex) / groupCount;
		const groupX = groupCount === 1 ? centerX : centerX + orbitRadius * Math.cos(groupAngle);
		const groupY = groupCount === 1 ? centerY : centerY + orbitRadius * Math.sin(groupAngle);

		const ringRadius = rendered.length <= 1 ? 0 : Math.min(30 + rendered.length * 7, 96);
		rendered.forEach((node, nodeIndex) => {
			const nodeAngle = -Math.PI / 2 + (2 * Math.PI * nodeIndex) / rendered.length;
			positions.push({
				id: node.id,
				x: groupX + ringRadius * Math.cos(nodeAngle),
				y: groupY + ringRadius * Math.sin(nodeAngle),
			});
		});

		groups.push({
			type,
			label: researchGraphGroupLabel(type),
			totalCount: bucket.length,
			renderedCount: rendered.length,
			collapsedCount,
			x: groupX,
			y: groupY,
			haloRadius: ringRadius + 26,
		});
	});

	return { width, height, nodes: positions, groups };
}
