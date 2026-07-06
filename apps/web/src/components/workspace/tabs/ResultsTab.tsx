"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Lightbulb, History, TrendingUp, ArrowRight, Search, Layers3, Download, Clipboard, RotateCcw, ChevronDown } from "lucide-react";
import type { ProjectMethodologyCard, RevisionSession } from "@/stores/workspace-store";
import { buildRevisionHistory } from "@/lib/workspace-iteration";

const methodologyTypeLabels: Record<string, string> = {
	opening_rule: "开头规则",
	prompt_rule: "Prompt 规则",
	pacing_rule: "节奏规则",
	hook_rule: "钩子规则",
	payoff_rule: "爽点兑现",
	anti_pattern: "反模式",
};

interface ResultsTabProps {
  revisionSessions?: RevisionSession[];
  methodologyCards?: ProjectMethodologyCard[];
  bookStatus?: string;
  bookCompletion?: number;
  onOpenMethodology?: () => void;
  onOpenHistory?: () => void;
  onOpenDashboard?: () => void;
  onExportProject?: () => void;
  onSaveRevisionNote?: (sessionId: string, note: string) => void;
}

function formatMethodologyType(type: string) {
  return methodologyTypeLabels[type] || "方法论";
}

function formatDate(value: string) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return "时间未知";
  }
  return time.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function MethodologyCardPanel({ card }: { card: ProjectMethodologyCard }) {
  const promptTemplate = card.promptTemplate?.trim();

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {formatMethodologyType(card.type)}
            </span>
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {card.occurrenceCount} 次
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold">{card.title}</h3>
        </div>
        <p className="shrink-0 text-xs leading-5 text-muted-foreground">
          {formatDate(card.lastSeenAt)}
        </p>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-5">
        <p>
          <span className="font-medium">触发问题：</span>
          {card.triggerProblem}
        </p>
        <p>
          <span className="font-medium">复用规则：</span>
          {card.reusableRule}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          来源：{card.sourceChapterTitle}
          {card.sourceIssueTitle ? ` · ${card.sourceIssueTitle}` : ""}
        </p>
      </div>
      {promptTemplate && (
        <div className="mt-3 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Prompt 模板</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(promptTemplate);
              }}
            >
              <Clipboard className="mr-2 size-3" />
              复制
            </Button>
          </div>
          <textarea
            readOnly
            className="mt-2 min-h-16 w-full resize-y rounded-md border border-input bg-card px-2 py-2 text-xs leading-4 text-muted-foreground outline-none"
            value={promptTemplate}
          />
        </div>
      )}
    </article>
  );
}

export function ResultsTab({
  revisionSessions = [],
  methodologyCards = [],
  bookStatus = "",
  bookCompletion = 0,
  onOpenMethodology,
  onOpenHistory,
  onOpenDashboard,
  onExportProject,
  onSaveRevisionNote,
}: ResultsTabProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFullMethodology, setShowFullMethodology] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [noteDraft, setNoteDraft] = useState("");

  const history = useMemo(
    () => buildRevisionHistory({ sessions: revisionSessions, selectedSessionId }),
    [revisionSessions, selectedSessionId],
  );
  const selected = history.selected;

  useEffect(() => {
    setNoteDraft(selected?.revisionNote || "");
  }, [selected?.id, selected?.revisionNote]);

  const sortedCards = useMemo(
    () =>
      [...methodologyCards].sort((a, b) => {
        if (b.occurrenceCount !== a.occurrenceCount) {
          return b.occurrenceCount - a.occurrenceCount;
        }
        return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
      }),
    [methodologyCards],
  );

  const typeOptions = Array.from(new Set(sortedCards.map((card) => card.type))).filter(Boolean);

  const visibleCards = sortedCards.filter((card) => {
    const matchType = typeFilter === "all" || card.type === typeFilter;
    const keyword = query.trim().toLowerCase();
    if (!keyword) return matchType;
    const haystack = [
      card.title,
      card.triggerProblem,
      card.reusableRule,
      card.selfCheckQuestion,
      card.promptTemplate,
      card.sourceChapterTitle,
      card.sourceIssueTitle,
    ]
.
      filter(Boolean)
      .join("\n")
      .toLowerCase();
    return matchType && haystack.includes(keyword);
  });

  const recentSessions = revisionSessions.slice(0, 5);
  const repeatedCount = methodologyCards.filter((card) => card.occurrenceCount > 1).length;
  const promptTemplateCount = methodologyCards.filter((card) => card.promptTemplate).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        <h2 className="text-lg font-semibold">结果</h2>
      </div>

      {/* 项目状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">项目状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">书籍状态</p>
              <p className="text-sm font-medium">{bookStatus || "未开始"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完成度</p>
              <p className="text-sm font-medium">{bookCompletion > 0 ? `${bookCompletion}%` : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">诊断记录</p>
              <p className="text-sm font-medium">{revisionSessions.length} 次</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 方法论卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              方法卡片库
            </CardTitle>
            <Badge variant="secondary">{methodologyCards.length}</Badge>
          </div>
          <CardDescription>
            {methodologyCards.length === 0
              ? "完成诊断后会自动生成方法卡片"
              : `重复出现 ${repeatedCount} 张 · Prompt 模板 ${promptTemplateCount} 个`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methodologyCards.length === 0 ? (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
              <Layers3 className="mt-0.5 size-5 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">暂无方法卡片</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  完成快速诊断后，系统会把可复用规则沉淀成方法论卡片
                </p>
                <Button className="mt-3" size="sm" onClick={onOpenMethodology}>
                  开始诊断
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 搜索和筛选 */}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    placeholder="搜索方法卡片..."
                  />
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">全部类型</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {formatMethodologyType(type)}
                    </option>
                  ))}
                </select>
                {onExportProject && (
                  <Button variant="outline" size="sm" onClick={onExportProject}>
                    <Download className="mr-2 size-4" />
                    导出
                  </Button>
                )}
              </div>

              {/* 卡片列表 */}
              {showFullMethodology ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {visibleCards.length ? (
                    visibleCards.map((card) => (
                      <MethodologyCardPanel key={card.projectCardId} card={card} />
                    ))
                  ) : (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                      没有匹配的方法论卡
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCards.slice(0, 5).map((card) => (
                    <div
                      key={card.projectCardId}
                      className="flex items-start justify-between text-sm group cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {card.sourceChapterTitle}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 ml-2">
                        {card.occurrenceCount}
                      </Badge>
                    </div>
                  ))}
                  {methodologyCards.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{methodologyCards.length - 5} 张卡片
                    </p>
                  )}
                </div>
              )}

              {methodologyCards.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowFullMethodology((v) => !v)}
                >
                  {showFullMethodology ? "收起" : `查看全部 ${methodologyCards.length} 张卡片`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 诊断历史 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              诊断历史
            </CardTitle>
            <Badge variant="secondary">{history.sessions.length}</Badge>
          </div>
          <CardDescription>
            章节诊断和修订记录
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无诊断记录
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {history.sessions.slice(0, selectedSessionId ? undefined : 5).map((session, index) => {
                  const active = selected?.id === session.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(active ? undefined : session.id)}
                      className={`w-full flex items-start justify-between text-sm group transition-colors p-2 rounded ${
                        active
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium">
                          第 {history.sessions.length - index} 次复诊
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{session.chapterTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(session.createdAt)} · {formatGateLabel(session.gateDecision)}
                        </p>
                      </div>
                      <Badge
                        variant={session.gateDecision === "continue" ? "default" : "destructive"}
                        className="shrink-0 ml-2"
                      >
                        {session.quickScore}/10
                      </Badge>
                    </button>
                  );
                })}
              </div>
              {selectedSessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSessionId(undefined)}
                  className="w-full"
                >
                  收起详情
                  <ChevronDown className="w-4 h-4 ml-1 rotate-180" />
                </Button>
              )}
              {!selectedSessionId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onOpenHistory}
                >
                  查看全部历史
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 选中会话详情 */}
      {selected ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{selected.chapterTitle}</CardTitle>
            <CardDescription>
              {formatDateTime(selected.createdAt)} · {selected.genre} · {formatInputKind(selected.inputKind)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <DetailStat label="急诊分" value={`${selected.quickScore}/10`} />
              <DetailStat label="相对上一版" value={formatScoreDelta(history.scoreDelta)} />
              <DetailStat label="正文长度" value={`${selected.textLength} 字`} />
            </div>

            {history.previous ? (
              <div className="space-y-3 rounded-md border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">与上一版对比</h3>
                </div>
                {history.comparison ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailStat
                        label="分数变化"
                        value={formatScoreDelta(history.comparison.scoreDelta)}
                      />
                      <DetailStat
                        label="Gate 变化"
                        value={history.comparison.gateChangeLabel}
                      />
                      <div
                        className={`rounded-md border p-3 ${formatPromptOutcomeClass(history.comparison.promptOutcome.status)}`}
                      >
                        <p className="text-xs text-muted-foreground">Prompt 判断</p>
                        <p className="mt-2 text-sm font-semibold">
                          {history.comparison.promptOutcome.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {history.comparison.promptOutcome.reason}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">问题变化</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <IssueChangeList
                          label="已解决"
                          items={history.comparison.resolvedIssues}
                        />
                        <IssueChangeList
                          label="仍重复"
                          items={history.comparison.repeatedIssues}
                        />
                        <IssueChangeList
                          label="新出现"
                          items={history.comparison.newIssues}
                        />
                      </div>
                    </div>
                    <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
                      <p className="text-xs text-muted-foreground">下一版只做这件事</p>
                      <p className="mt-2 text-sm leading-6">
                        {history.comparison.nextAction}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <CompareBlock
                    label="上一版问题"
                    value={history.previous.mainProblem}
                  />
                  <CompareBlock label="当前问题" value={selected.mainProblem} />
                </div>
              </div>
            ) : null}

            <div className="rounded-md border border-border bg-background p-4">
              <h3 className="text-sm font-semibold">主要问题</h3>
              <p className="mt-2 text-sm leading-6">{selected.mainProblem}</p>
              {selected.issueTitles.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.issueTitles.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {onSaveRevisionNote && (
              <div className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">本版人工备注</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      记录这一版实际按哪些建议改了，后续判断 Prompt 是否有效时会更清楚。
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSaveRevisionNote(selected.id, noteDraft)}
                  >
                    保存备注
                  </Button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  className="mt-3 min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="例如：这一版按 Prompt 补了章末代价，但还没有改开头目标。"
                />
                {selected.revisionNote ? (
                  <div className="mt-3 rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">已保存备注</p>
                    <p className="mt-1 text-sm leading-6">{selected.revisionNote}</p>
                  </div>
                ) : null}
                {selected.revisionNoteUpdatedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    上次保存：{formatDateTime(selected.revisionNoteUpdatedAt)}
                  </p>
                ) : null}
              </div>
            )}

            {selected.nextPrompt ? (
              <div className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold">当时生成的下一轮 Prompt</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(selected.nextPrompt || "");
                    }}
                  >
                    <Clipboard className="mr-2 size-4" />
                    复制
                  </Button>
                </div>
                <textarea
                  readOnly
                  className="mt-3 min-h-40 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 text-muted-foreground outline-none"
                  value={selected.nextPrompt}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* 仪表盘入口 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            数据仪表盘
          </CardTitle>
          <CardDescription>
            查看详细的诊断数据统计和趋势分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenDashboard} className="w-full">
            打开仪表盘
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function CompareBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function IssueChangeList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-sm leading-5 text-muted-foreground">
          {items.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无</p>
      )}
    </div>
  );
}

function formatScoreDelta(value: number | null) {
  if (value === null) return "暂无上一版";
  if (value === 0) return "持平";
  return value > 0 ? `+${value}` : `${value}`;
}

function formatPromptOutcomeClass(status: string) {
  const map: Record<string, string> = {
    effective: "border-success-border bg-success-surface",
    partial: "border-primary/30 bg-primary/10",
    ineffective: "border-warning-border bg-warning-surface",
    unknown: "border-border bg-background",
  };
  return map[status] || map.unknown;
}

function formatGateLabel(gate: string | undefined) {
  const map: Record<string, string> = {
    continue: "继续",
    revise: "修改",
    rebuild: "重构",
    discard: "废稿",
  };
  return map[gate || ""] || "修改";
}

function formatInputKind(value: string) {
  const map: Record<string, string> = {
    "human-draft": "作者正文",
    "ai-draft": "AI 生成稿",
    idea: "脑洞",
    outline: "大纲",
    prompt: "Prompt 草稿",
  };
  return map[value] || "作者正文";
}

function formatDateTime(value: string) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return "时间未知";
  }
  return time.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
