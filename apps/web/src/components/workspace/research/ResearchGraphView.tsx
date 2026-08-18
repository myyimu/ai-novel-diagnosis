"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

import {
	RESEARCH_GRAPH_MAX_NODES_PER_GROUP,
	layoutResearchGraph,
} from "@/lib/research-graph-layout";
import type { ResearchGraphEdge, ResearchGraphNode } from "@/lib/research-library";

type FocusTarget = { kind: "node"; id: string } | { kind: "edge"; id: string } | null;

const NODE_FILL_BY_TYPE: Record<string, string> = {
	character: "fill-primary",
	location: "fill-secondary",
	faction: "fill-destructive/70",
	event: "fill-muted-foreground/70",
	foreshadowing: "fill-primary/60",
	promise: "fill-secondary/60",
};

function nodeFillClass(type: string): string {
	return NODE_FILL_BY_TYPE[type] ?? "fill-muted";
}

/** Curved edge path: control point pulled 18% toward the canvas center. */
function buildEdgePath(
	source: { x: number; y: number },
	target: { x: number; y: number },
	center: { x: number; y: number },
): string {
	const controlX = source.x + (center.x - source.x) * 0.18 + (target.x - source.x) * 0.32;
	const controlY = source.y + (center.y - source.y) * 0.18 + (target.y - source.y) * 0.32;
	return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function truncateLabel(label: string, maxLength = 8): string {
	return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
}

export function ResearchGraphView({
	nodes,
	edges,
	caption,
}: {
	nodes: ResearchGraphNode[];
	edges: ResearchGraphEdge[];
	caption?: string;
}) {
	const [focus, setFocus] = useState<FocusTarget>(null);

	const layout = useMemo(() => layoutResearchGraph(nodes), [nodes]);
	const positionById = useMemo(
		() => new Map(layout.nodes.map((position) => [position.id, position])),
		[layout],
	);

	const focusNode =
		focus?.kind === "node" ? nodes.find((node) => node.id === focus.id) : undefined;
	const focusEdge =
		focus?.kind === "edge" ? edges.find((edge) => edge.id === focus.id) : undefined;
	const center = { x: layout.width / 2, y: layout.height / 2 };

	const handleNodeKeyDown = (event: KeyboardEvent<SVGGElement>, nodeId: string) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			setFocus({ kind: "node", id: nodeId });
		}
	};

	if (!nodes.length) {
		return (
			<div className="p-6 rounded-lg border bg-card text-center text-sm text-muted-foreground">
				当前拆解结果没有可绘制的图谱节点。
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="rounded-lg border bg-card p-2 overflow-x-auto">
				<svg
					viewBox={`0 0 ${layout.width} ${layout.height}`}
					className="w-full h-auto min-w-[640px]"
					role="img"
					aria-label={caption ?? "研究图谱"}
				>
					{/* group halos */}
					{layout.groups.map((group) => (
						<g key={`group-${group.type}`}>
							<circle
								cx={group.x}
								cy={group.y}
								r={group.haloRadius}
								className="fill-muted/30 stroke-muted-foreground/40"
								strokeDasharray="6 6"
								strokeWidth={1}
							/>
							<text
								x={group.x}
								y={group.y - group.haloRadius - 8}
								textAnchor="middle"
								className="fill-muted-foreground"
								fontSize={13}
							>
								{group.label}（{group.totalCount}）
							</text>
							{group.collapsedCount > 0 && (
								<text
									x={group.x}
									y={group.y + 4}
									textAnchor="middle"
									className="fill-muted-foreground"
									fontSize={12}
								>
									+{group.collapsedCount} 折叠
								</text>
							)}
						</g>
					))}

					{/* edges */}
					{edges.map((edge) => {
						const source = positionById.get(edge.source);
						const target = positionById.get(edge.target);
						if (!source || !target) {
							return null;
						}
						const isActive = focus?.kind === "edge" && focus.id === edge.id;
						return (
							<path
								key={edge.id}
								d={buildEdgePath(source, target, center)}
								fill="none"
								className={
									isActive
										? "stroke-primary"
										: "stroke-muted-foreground/50 hover:stroke-primary/70"
								}
								strokeWidth={isActive ? 2.5 : 1.4}
								aria-label={`${edge.label}：${edge.detail}`}
							>
								<title>{`${edge.label}｜${edge.detail}`}</title>
							</path>
						);
					})}

					{/* nodes */}
					{nodes.map((node) => {
						const position = positionById.get(node.id);
						if (!position) {
							return null;
						}
						const isActive = focus?.kind === "node" && focus.id === node.id;
						return (
							<g
								key={node.id}
								tabIndex={0}
								role="button"
								aria-label={`${node.label}：${node.detail}`}
								className="cursor-pointer outline-none"
								onMouseEnter={() => setFocus({ kind: "node", id: node.id })}
								onClick={() => setFocus({ kind: "node", id: node.id })}
								onKeyDown={(event) => handleNodeKeyDown(event, node.id)}
							>
								<circle
									cx={position.x}
									cy={position.y}
									r={isActive ? 19 : 16}
									className={`${nodeFillClass(node.type)} ${isActive ? "stroke-primary" : "stroke-background"}`}
									strokeWidth={2}
								/>
								<text
									x={position.x}
									y={position.y + 32}
									textAnchor="middle"
									className="fill-foreground"
									fontSize={12}
								>
									{truncateLabel(node.label)}
								</text>
								<title>{`${node.label}｜${node.detail}`}</title>
							</g>
						);
					})}
				</svg>
			</div>

			{/* detail card */}
			{focusNode ? (
				<div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 space-y-1">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-semibold">{focusNode.label}</span>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground"
							onClick={() => setFocus(null)}
						>
							关闭
						</button>
					</div>
					<p className="text-muted-foreground">来源：{focusNode.source}</p>
					<p>{focusNode.detail}</p>
					{focusNode.risk && (
						<p className="text-destructive">原创化风险：{focusNode.risk}</p>
					)}
				</div>
			) : focusEdge ? (
				<div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 space-y-1">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-semibold">关系：{focusEdge.label}</span>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground"
							onClick={() => setFocus(null)}
						>
							关闭
						</button>
					</div>
					<p>{focusEdge.detail}</p>
				</div>
			) : (
				<p className="text-xs text-muted-foreground">
					悬停或用键盘聚焦节点查看详情；每组最多绘制 {RESEARCH_GRAPH_MAX_NODES_PER_GROUP}{" "}
					个节点，其余折叠显示。
					{caption ? ` ${caption}` : ""}
				</p>
			)}
		</div>
	);
}
