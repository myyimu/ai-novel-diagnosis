"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectMethodologyCard } from "@/stores/workspace-store";

export interface MethodologyCardDetailProps {
	card: ProjectMethodologyCard;
}

export function MethodologyCardDetail({ card }: MethodologyCardDetailProps) {
	return (
		<Card className="border-muted/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">方法论卡：{card.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{card.occurrenceCount} 次</Badge>
					<Badge variant="outline">{card.sourceChapterTitle}</Badge>
				</div>
				<p className="leading-6 text-muted-foreground">{card.reusableRule}</p>
				<p className="leading-6">
					<span className="font-medium">自查问题：</span>
					{card.selfCheckQuestion}
				</p>
				{card.sourceIssueTitle ? (
					<p className="leading-6 text-muted-foreground">
						源问题：{card.sourceIssueTitle}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
