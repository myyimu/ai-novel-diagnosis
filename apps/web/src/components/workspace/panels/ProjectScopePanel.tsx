"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Calendar, BookOpen } from "lucide-react";

export function ProjectScopePanel() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">项目范围</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {activeProject && (
            <Card className="p-3">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  {activeProject.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>创建于 {new Date(activeProject.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>更新于 {new Date(activeProject.updatedAt).toLocaleDateString("zh-CN")}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="p-3">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                所有项目
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                    project.id === activeProjectId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {project.name}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
