"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb } from "lucide-react";

export function ReferenceContextPanel() {
  const methodologyCards = useWorkspaceStore((s) => s.methodologyCards);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const filteredCards = methodologyCards.filter(
    (c) => !c.projectId || c.projectId === activeProjectId
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">参考资料</h3>
        <p className="text-xs text-muted-foreground mt-1">
          方法卡片: {filteredCards.length}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无方法卡片</p>
              <p className="text-xs mt-1">完成诊断后会自动生成</p>
            </div>
          ) : (
            filteredCards.map((card) => (
              <Card key={card.projectCardId} className="p-3">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium line-clamp-1">
                      {card.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {card.occurrenceCount}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {card.reusableRule}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>来源: {card.sourceChapterTitle}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
