"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Library, Download, Network, ArrowRight, Loader2, ChevronDown, FileText, CheckCircle2, History, BookOpenCheck } from "lucide-react";

interface AnalysisTabProps {
  bookJob?: any;
  bookAnalysisResult?: any;
  bookText?: string;
  bookTitle?: string;
  researchReadiness?: number;
  graphNodeCount?: number;
  graphEdgeCount?: number;
  foreshadowingCount?: number;
  evidenceScoreCount?: number;
  comparableBookCount?: number;
  persistedResearchLibrary?: any;
  onOpenBookAnalysis?: () => void;
  onOpenLibrary?: () => void;
  onOpenExport?: () => void;
}

export function AnalysisTab({
  bookJob,
  bookAnalysisResult,
  bookText = "",
  bookTitle = "",
  researchReadiness = 0,
  graphNodeCount = 0,
  graphEdgeCount = 0,
  foreshadowingCount = 0,
  evidenceScoreCount = 0,
  comparableBookCount = 0,
  persistedResearchLibrary,
  onOpenBookAnalysis,
  onOpenLibrary,
  onOpenExport,
}: AnalysisTabProps) {
  const [showResearchDetail, setShowResearchDetail] = useState(false);
  const hasBookContent = Boolean(bookText || bookJob);
  const hasAnalysis = Boolean(bookAnalysisResult);
  const isJobRunning = bookJob?.status === "running" || bookJob?.status === "queued";

  const readinessLabel = researchReadiness >= 75 ? "就绪" : researchReadiness >= 50 ? "部分就绪" : "需要更多样本";
  const readinessColor = researchReadiness >= 75 ? "default" : researchReadiness >= 50 ? "secondary" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <h2 className="text-lg font-semibold">分析</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 全书分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              全书分析
            </CardTitle>
            <CardDescription>
              {hasBookContent
                ? isJobRunning
                  ? "正在分析中..."
                  : hasAnalysis
                    ? `已完成：${bookAnalysisResult.book?.title || "未命名"}`
                    : "准备就绪，可开始分析"
                : "上传书籍后进行 Map-Reduce 拆解"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasAnalysis && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">章节估计</span>
                  <span className="font-medium">{bookAnalysisResult.book?.chapterCountEstimate || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">人物数量</span>
                  <span className="font-medium">{bookAnalysisResult.characters?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关系数量</span>
                  <span className="font-medium">{bookAnalysisResult.relationships?.edges?.length || 0}</span>
                </div>
              </div>
            )}
            <Button
              variant={hasAnalysis ? "outline" : "default"}
              className="w-full"
              onClick={onOpenBookAnalysis}
            >
              {isJobRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : hasAnalysis ? (
                "查看分析结果"
              ) : (
                "开始分析"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 研究库 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Library className="w-4 h-4" />
              研究库
            </CardTitle>
            <CardDescription>
              小说创作决策库：资料、图谱、评分证据和对比样本
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">研究就绪度</span>
                <Badge variant={readinessColor as any}>{readinessLabel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">资料资产</span>
                <span className="font-medium">{persistedResearchLibrary?.sourceSummary?.completedBooks || 0} 本</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">图谱规模</span>
                <span className="font-medium">{graphNodeCount} 节点 / {graphEdgeCount} 关系</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">解释证据</span>
                <span className="font-medium">{evidenceScoreCount} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">可对比书籍</span>
                <span className="font-medium">{comparableBookCount} 本</span>
              </div>
            </div>
            {!showResearchDetail && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowResearchDetail(true)}
              >
                查看详情
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            )}
            {showResearchDetail && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowResearchDetail(false)}
                >
                  收起详情
                  <ChevronDown className="w-4 h-4 ml-2 rotate-180" />
                </Button>
                {persistedResearchLibrary?.graphAssets?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">已沉淀图谱资产</p>
                    {persistedResearchLibrary.graphAssets.slice(0, 3).map((asset: any) => (
                      <div key={asset.jobId} className="rounded-md border border-border bg-background p-2 text-xs">
                        <p className="font-medium">{asset.title}</p>
                        <p className="text-muted-foreground">
                          {asset.genre} · {asset.nodeCount} 节点 · {asset.edgeCount} 关系
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {persistedResearchLibrary?.comparisonSamples?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">对比样本</p>
                    {persistedResearchLibrary.comparisonSamples.slice(0, 3).map((sample: any) => (
                      <div key={sample.jobId} className="rounded-md border border-border bg-background p-2 text-xs">
                        <p className="font-medium">{sample.title}</p>
                        <p className="text-muted-foreground">
                          {sample.genre} · {sample.coreAppeal?.slice(0, 2).join("、") || "待提炼"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={onOpenLibrary}
            >
              打开完整研究库
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 关系图谱 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="w-4 h-4" />
            关系图谱
          </CardTitle>
          <CardDescription>
            {graphNodeCount > 0
              ? `包含 ${graphNodeCount} 个节点和 ${graphEdgeCount} 条关系`
              : "完成全书分析后生成人物关系图谱"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {graphNodeCount > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">人物节点</span>
                <span className="font-medium">{bookAnalysisResult?.characters?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">伏笔记录</span>
                <span className="font-medium">{foreshadowingCount}</span>
              </div>
            </div>
          )}
          {graphNodeCount > 0 ? (
            <Button variant="outline" className="w-full">
              查看关系图谱
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              需要先完成全书分析
            </p>
          )}
        </CardContent>
      </Card>

      {/* 导出入口 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出结果
          </CardTitle>
          <CardDescription>
            导出分析结果、世界书和原创化素材包
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onOpenExport}
            className="w-full"
            disabled={!hasAnalysis}
          >
            打开导出页面
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
