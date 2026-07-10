"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EvidenceItem = {
	quote: string;
	locationHint?: string;
	confidence?: number;
};

export interface QuickEvidenceDetailProps {
	issue: {
		title: string;
		description: string;
		severity: string;
		category: string;
		readerImpact: string;
		fixAction: string;
		evidence?: EvidenceItem[];
	};
	quickScore?: number | null;
	mainProblem?: string | null;
}

export function QuickEvidenceDetail({ issue, quickScore, mainProblem }: QuickEvidenceDetailProps) {
	return (
		<Card className="border-muted/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">证据详情：{issue.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{issue.severity}</Badge>
					<Badge variant="outline">{issue.category}</Badge>
					{typeof quickScore === "number" ? <Badge>{quickScore}/10</Badge> : null}
				</div>
				{mainProblem ? (
					<p className="leading-6 text-muted-foreground">{mainProblem}</p>
				) : null}
				<p className="leading-6">{issue.description}</p>
				<p className="leading-6">
					<span className="font-medium">读者影响：</span>
					{issue.readerImpact}
				</p>
				<p className="leading-6">
					<span className="font-medium">下一步动作：</span>
					{issue.fixAction}
				</p>
				<div className="rounded-md border border-border bg-background p-3">
					<p className="text-xs font-medium text-muted-foreground">正文证据</p>
					<div className="mt-2 space-y-2">
						{issue.evidence?.length ? (
							issue.evidence.map((evidence, index) => (
								<div
									key={`${evidence.quote}-${index}`}
									className="flex flex-col gap-1 rounded-md border border-border bg-card p-3"
								>
									<p className="leading-5">
										{evidence.locationHint ? `${evidence.locationHint}：` : ""}
										{evidence.quote}
									</p>
									{typeof evidence.confidence === "number" ? (
										<p className="text-xs text-muted-foreground">
											置信度 {Math.round(evidence.confidence * 100)}%
										</p>
									) : null}
								</div>
							))
						) : (
							<p className="text-xs text-muted-foreground">当前证据链为空。</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
