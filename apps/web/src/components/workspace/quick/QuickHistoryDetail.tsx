"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGateLabel } from "@/components/workspace/quick-experience-panel";
import { formatQuickScore } from "@/lib/workspace-iteration";
import type { RevisionSession } from "@/stores/workspace-store";

export interface QuickHistoryDetailProps {
	session: RevisionSession;
}

export function QuickHistoryDetail({ session }: QuickHistoryDetailProps) {
	return (
		<Card className="border-muted/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">历史详情：{session.chapterTitle}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{session.genre || "类型待确认"}</Badge>
					<Badge variant="outline">{session.inputKind}</Badge>
					<Badge>{formatQuickScore(session.quickScore)}</Badge>
					<Badge variant="outline">{formatGateLabel(session.gateDecision)}</Badge>
				</div>
				<p className="leading-6">{session.mainProblem}</p>
				{session.nextPrompt ? (
					<div className="rounded-md border border-border bg-background p-3">
						<p className="text-xs font-medium text-muted-foreground">下一轮修改指令</p>
						<p className="mt-1 whitespace-pre-wrap leading-6">{session.nextPrompt}</p>
					</div>
				) : null}
				<div className="grid gap-2 sm:grid-cols-2">
					<p className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
						问题数：{session.issueTitles.length}
					</p>
					<p className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
						方法论卡：{session.methodologyCardIds.length}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
