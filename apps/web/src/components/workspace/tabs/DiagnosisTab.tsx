"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target, FileCheck, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Upload, Loader2, Edit, TrendingUp, ChevronRight } from "lucide-react";
import type { RubricResult, ScoreResult } from "@/stores/workspace-store";

interface ChapterStep {
  label: string;
  done: boolean;
  detail: string;
}

interface DiagnosisTabProps {
  quickReviewResult?: any;
  rubricResult?: RubricResult | null;
  scoreResult?: ScoreResult | null;
  quickScore?: number;
  onOpenFullDiagnosis?: () => void;
  onBuildRubric?: () => void;
  onScoreChapter?: () => void;
  loading?: boolean;
  hasRubricCache?: boolean;
  hasScoreCache?: boolean;
  onRebuildRubric?: () => void;
  onRescoreChapter?: () => void;
  chapterText?: string;
  chapterTitle?: string;
  referenceText?: string;
  onReferenceTextChange?: (value: string) => void;
  onImportReferenceFile?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  platformLabel?: string;
  readingModeLabel?: string;
  competitionLevelLabel?: string;
  pushStageLabel?: string;
  competitionNotes?: string;
  chapterCompletion?: number;
  nextChapterAction?: string;
  chapterProjectSteps?: ChapterStep[];
  onOpenPlatformStrategy?: () => void;
  onOpenChapterDraft?: () => void;
}

export function DiagnosisTab({
  quickReviewResult,
  rubricResult,
  scoreResult,
  quickScore,
  onOpenFullDiagnosis,
  onBuildRubric,
  onScoreChapter,
  loading = false,
  hasRubricCache = false,
  hasScoreCache = false,
  onRebuildRubric,
  onRescoreChapter,
  chapterText = "",
  chapterTitle = "",
  referenceText = "",
  onReferenceTextChange,
  onImportReferenceFile,
  platformLabel = "",
  readingModeLabel = "",
  competitionLevelLabel = "",
  pushStageLabel = "",
  competitionNotes = "",
  chapterCompletion = 0,
  nextChapterAction = "继续诊断",
  onOpenPlatformStrategy,
  onOpenChapterDraft,
  chapterProjectSteps = [],
}: DiagnosisTabProps) {
  const hasQuickResult = Boolean(quickReviewResult);
  const hasRubric = Boolean(rubricResult);
  const hasScore = Boolean(scoreResult);

  const gateDecision = quickReviewResult?.gateDecision;
  const isPassed = gateDecision === "continue";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5" />
        <h2 className="text-lg font-semibold">诊断</h2>
      </div>

      {/* 快速诊断结果摘要 */}
      <Card className={isPassed ? "border-success-border bg-success-surface/10" : "border-warning-border bg-warning-surface/10"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              {isPassed ? (
                <CheckCircle2 className="w-4 h-4 text-success-foreground" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning-foreground" />
              )}
              快速诊断结果
            </CardTitle>
            {hasQuickResult && quickScore !== undefined && (
              <Badge variant={isPassed ? "default" : "destructive"} className="text-lg px-3">
                {quickScore}/10
              </Badge>
            )}
          </div>
          <CardDescription>
            {hasQuickResult
              ? (isPassed
                  ? "章节基础良好，可以继续打磨或进入深度质检"
                  : quickReviewResult?.gateReason || "需要解决主要问题后再继续")
              : "运行快速诊断获取章节质量评估"}
          </CardDescription>
        </CardHeader>
        {hasQuickResult && (
          <CardContent className="space-y-3">
            {quickReviewResult?.issues?.slice(0, 3).map((issue: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  issue.severity === "critical" || issue.severity === "high"
                    ? "bg-destructive"
                    : "bg-warning"
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{issue.title}</p>
                  {issue.category && (
                    <p className="text-xs text-muted-foreground">{issue.category}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* 平台设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            评分标准设置
          </CardTitle>
          <CardDescription>
            上传参考章节以生成更准确的评分标准
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 参考章节导入（简化版） */}
          <div className="space-y-2">
            <Label htmlFor="reference-file">上传参考章节（可选）</Label>
            <Input
              id="reference-file"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={onImportReferenceFile}
            />
            {referenceText && (
              <p className="text-xs text-muted-foreground">
                已导入参考文本 ({referenceText.length} 字)
              </p>
            )}
          </div>

          {referenceText && (
            <div className="space-y-2">
              <Label htmlFor="reference-text">参考章节内容</Label>
              <textarea
                id="reference-text"
                className="min-h-32 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6"
                value={referenceText}
                onChange={(e) => onReferenceTextChange?.(e.target.value)}
                placeholder="粘贴成熟章节作为参考..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onBuildRubric}
              disabled={loading || !hasQuickResult}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : null}
              生成评分标准
            </Button>
            {hasRubricCache && onRebuildRubric && (
              <Button
                variant="outline"
                onClick={onRebuildRubric}
                disabled={loading}
              >
                重新生成
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 评分标准展示 */}
      {rubricResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              评分标准
            </CardTitle>
            <CardDescription>
              基于参考章节和平台风格生成的评分指标
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rubricResult.reference.oneSentenceSummary}
            </p>

            {rubricResult.styleProfile && (
              <div className="grid gap-2 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">平台：</span>{rubricResult.styleProfile.platform}</p>
                <p><span className="text-muted-foreground">读者：</span>{rubricResult.styleProfile.audience}</p>
                <p><span className="text-muted-foreground">节奏：</span>{rubricResult.styleProfile.pace}</p>
                <p><span className="text-muted-foreground">钩子密度：</span>{rubricResult.styleProfile.hookDensity}</p>
              </div>
            )}

            {rubricResult.marketProfile && (
              <div className="rounded-md border border-border bg-background p-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">分类：</span>{rubricResult.marketProfile.category}</p>
                  <p><span className="text-muted-foreground">主题：</span>{rubricResult.marketProfile.theme}</p>
                  <p><span className="text-muted-foreground">标签：</span>{rubricResult.marketProfile.tags.join("、") || "无"}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium">可迁移原则</p>
              {rubricResult.principles.slice(0, 2).map((principle) => (
                <div key={principle.id} className="rounded-md border border-border bg-background p-3">
                  <p className="text-sm font-medium">{principle.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{principle.reusableRule}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {rubricResult.rubric.metrics.slice(0, 4).map((metric) => (
                <div key={metric.id} className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="text-sm font-medium">{metric.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                </div>
              ))}
            </div>

            <Button onClick={onScoreChapter} disabled={loading || !rubricResult} className="w-full">
              {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              开始评分
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 评分结果展示 */}
      {scoreResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                评分报告
              </CardTitle>
              <Badge variant="default" className="text-lg px-3">
                {scoreResult.totalScore}/10
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
              <p className="text-sm font-medium">编辑结论</p>
              <div className="mt-3 grid gap-2 text-sm">
                <p><span className="text-muted-foreground">优先改：</span>{scoreResult.weakestPoint}</p>
                <p><span className="text-muted-foreground">下一步：</span>{scoreResult.nextRevisionMove}</p>
                <p><span className="text-muted-foreground">保留优势：</span>{scoreResult.strongestPoint}</p>
              </div>
            </div>

            {scoreResult.styleFit && (
              <div className="rounded-md border border-border bg-background p-4 text-sm">
                <p className="font-medium">平台风格匹配</p>
                <p className="mt-2 text-muted-foreground">平台风险：{scoreResult.styleFit.platformRisk}</p>
                <p className="text-muted-foreground">读者风险：{scoreResult.styleFit.audienceRisk}</p>
              </div>
            )}

            {scoreResult.scores.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">详细评分</p>
                {scoreResult.scores.slice(0, 3).map((score) => (
                  <div key={score.metricId} className="rounded-md border border-border bg-background p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{score.name}</p>
                      <span className="text-sm font-medium">{score.score}/10</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{score.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">改法：{score.fix}</p>
                  </div>
                ))}
              </div>
            )}

            {hasScoreCache && onRescoreChapter && (
              <Button variant="outline" onClick={onRescoreChapter} disabled={loading} className="w-full">
                重新评分
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 平台策略摘要 */}
      {(platformLabel || readingModeLabel) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              平台策略
            </CardTitle>
            <CardDescription>
              当前选定的平台和策略配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">平台：</span>
              <span className="font-medium">{platformLabel || "未设置"}</span>
              <span className="text-muted-foreground">阅读模式：</span>
              <span className="font-medium">{readingModeLabel || "未设置"}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">竞争程度：</span>
              <span className="font-medium">{competitionLevelLabel || "未设置"}</span>
              <span className="text-muted-foreground">推书阶段：</span>
              <span className="font-medium">{pushStageLabel || "未设置"}</span>
            </div>
            {competitionNotes && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {competitionNotes}
              </p>
            )}
            {onOpenPlatformStrategy && (
              <Button variant="outline" size="sm" onClick={onOpenPlatformStrategy} className="w-full">
                调整平台策略
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 章节草稿修订 */}
      {chapterText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit className="w-4 h-4" />
              章节草稿
            </CardTitle>
            <CardDescription>
              当前章节文本和完成度
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">章节标题</span>
                <span className="font-medium truncate max-w-[200px]">{chapterTitle || "未设置"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">字数</span>
                <span className="font-medium">{chapterText.length} 字</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">完成度</span>
                <span className="font-medium">{chapterCompletion > 0 ? `${chapterCompletion}%` : "计算中"}</span>
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 max-h-32 overflow-auto">
              <p className="text-xs leading-5 text-muted-foreground line-clamp-4">
                {chapterText.slice(0, 300)}
                {chapterText.length > 300 && "..."}
              </p>
            </div>
            {onOpenChapterDraft && (
              <Button variant="outline" size="sm" onClick={onOpenChapterDraft} className="w-full">
                {nextChapterAction}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 章节项目步骤 */}
      {chapterProjectSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              章节项目步骤
            </CardTitle>
            <CardDescription>
              当前章节在项目中的进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chapterProjectSteps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                    step.done
                      ? "border-success-border/50 bg-success-surface/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className={`mt-0.5 size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                    step.done
                      ? "border-success-foreground bg-success-foreground text-success-surface"
                      : "border-muted-foreground bg-transparent"
                  }`}>
                    {step.done && <CheckCircle2 className="size-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完整诊断入口 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">完整诊断功能</CardTitle>
          <CardDescription>
            访问完整的章节诊断页面，包含更多详细功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenFullDiagnosis} className="w-full">
            打开完整诊断
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
