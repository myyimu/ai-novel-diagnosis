"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Clock, CheckCircle2, FileText, BookOpen, ExternalLink } from "lucide-react";

interface HistoryTask {
  id: string;
  title: string;
  type: "book" | "chapter" | "analysis";
  status: "completed" | "running" | "failed";
  createdAt: string;
  genre?: string;
  chapterCount?: number;
}

interface HistoryTasksPanelProps {
  tasks?: HistoryTask[];
  onOpenHistory?: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function HistoryTasksPanel({
  tasks = [],
  onOpenHistory,
  onOpenTask,
}: HistoryTasksPanelProps) {
  const completedTasks = tasks.filter((t) => t.status === "completed").slice(0, 5);
  const runningTasks = tasks.filter((t) => t.status === "running");

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "book":
        return <BookOpen className="w-3 h-3" />;
      case "chapter":
        return <FileText className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="text-xs">完成</Badge>;
      case "running":
        return <Badge variant="secondary" className="text-xs">运行中</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs">失败</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            历史任务
          </CardTitle>
          <CardDescription>
            已完成的诊断和分析任务
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {runningTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">运行中</p>
              {runningTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getTaskIcon(task.type)}
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </div>
          )}

          {completedTasks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">最近完成</p>
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask?.(task.id)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getTaskIcon(task.type)}
                    <div className="min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</p>
                    </div>
                  </div>
                  {getStatusBadge(task.status)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无历史任务
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onOpenHistory}
          >
            查看全部
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
