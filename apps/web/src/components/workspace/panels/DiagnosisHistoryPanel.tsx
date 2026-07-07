"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertTriangle } from "lucide-react";

export function DiagnosisHistoryPanel() {
	const revisionSessions = useWorkspaceStore((s) => s.revisionSessions);
	const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

	const filteredSessions = revisionSessions.filter(
		(s) => !s.projectId || s.projectId === activeProjectId,
	);

	return (
		<div className="h-full flex flex-col">
			<div className="p-3 border-b border-border">
				<h3 className="font-semibold text-sm">诊断历史</h3>
				<p className="text-xs text-muted-foreground mt-1">
					共 {filteredSessions.length} 条记录
				</p>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-2">
					{filteredSessions.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground text-sm">
							<Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>暂无诊断记录</p>
						</div>
					) : (
						filteredSessions.map((session) => (
							<Card key={session.id} className="p-3">
								<CardHeader className="p-0 pb-2">
									<div className="flex items-start justify-between gap-2">
										<CardTitle className="text-sm font-medium line-clamp-1">
											{session.chapterTitle}
										</CardTitle>
										<Badge
											variant={
												session.gateDecision === "continue"
													? "default"
													: "destructive"
											}
											className="shrink-0 text-xs"
										>
											{session.gateDecision === "continue"
												? "可继续"
												: "需修改"}
										</Badge>
									</div>
									<CardDescription className="text-xs">
										{new Date(session.createdAt).toLocaleString("zh-CN")}
									</CardDescription>
								</CardHeader>
								<CardContent className="p-0 space-y-2">
									{session.mainProblem && (
										<div className="flex items-start gap-2 text-xs">
											<AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
											<span className="line-clamp-2 text-muted-foreground">
												{session.mainProblem}
											</span>
										</div>
									)}
									{session.issueTitles?.length > 0 && (
										<div className="flex flex-wrap gap-1">
											{session.issueTitles.slice(0, 3).map((issue, i) => (
												<Badge
													key={i}
													variant="outline"
													className="text-xs"
												>
													{issue}
												</Badge>
											))}
											{session.issueTitles.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{session.issueTitles.length - 3}
												</Badge>
											)}
										</div>
									)}
								</CardContent>
							</Card>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
