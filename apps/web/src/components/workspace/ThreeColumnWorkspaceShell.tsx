"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  ScanText,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { WorkspaceLayout } from "./WorkspaceLayout";
import { MainAreaTabType, type RightPanelTab, type MainAreaTab } from "./types";

import { DiagnosisHistoryPanel } from "./panels/DiagnosisHistoryPanel";
import { ReferenceContextPanel } from "./panels/ReferenceContextPanel";
import { ProjectScopePanel } from "./panels/ProjectScopePanel";
import { AISettingsPanel } from "./panels/AISettingsPanel";
import { HistoryTasksPanel } from "./panels/HistoryTasksPanel";
import { HelpPanel } from "./panels/HelpPanel";

import { InputTab } from "./tabs/InputTab";
import { DiagnosisTab } from "./tabs/DiagnosisTab";
import { ResultsTab } from "./tabs/ResultsTab";
import { AnalysisTab } from "./tabs/AnalysisTab";

import { type QuickReviewInputKind, type QuickReviewResult, type RevisionSession, type ProjectMethodologyCard, type BookUploadPreview } from "@/stores/workspace-store";

export interface WorkspaceNavItem<TView extends string = string> {
  id: TView;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

function getStatusMeta(status: string, loading: boolean) {
  if (loading) {
    return {
      title: "处理中",
      icon: Loader2,
      className: "border-primary/30 bg-primary/10 text-primary",
      iconClassName: "animate-spin",
      tone: "loading" as const,
    };
  }

  if (
    status.includes("完成") ||
    status.includes("已") ||
    status.includes("connected") ||
    status.includes("ready")
  ) {
    return {
      title: "状态",
      icon: CheckCircle2,
      className: "border-success-border bg-success-surface text-success-foreground",
      iconClassName: "",
      tone: "success" as const,
    };
  }

  if (
    status.includes("请先") ||
    status.includes("失败") ||
    status.includes("failed") ||
    status.includes("Error") ||
    status.includes("requires") ||
    status.includes("Unsupported")
  ) {
    return {
      title: "需要处理",
      icon: TriangleAlert,
      className: "border-warning-border bg-warning-surface text-warning-foreground",
      iconClassName: "",
      tone: "warning" as const,
    };
  }

  return {
    title: "状态",
    icon: ShieldAlert,
    className: "border-border bg-card text-muted-foreground",
    iconClassName: "",
    tone: "neutral" as const,
  };
}

function StatusBanner({
  status,
  loading,
  compact = false,
}: {
  status: string;
  loading: boolean;
  compact?: boolean;
}) {
  const meta = getStatusMeta(status, loading);
  const Icon = meta.icon;

  if (meta.tone === "success") {
    return (
      <div className="flex items-center gap-2 text-xs text-success-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="break-words leading-5">{status}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border ${meta.className} ${
        compact ? "p-3 text-xs" : "p-4 text-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${meta.iconClassName}`} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{meta.title}</p>
          <p className="mt-1 break-words leading-5">{status}</p>
        </div>
      </div>
    </div>
  );
}

interface SidebarNavProps<TView extends string> {
  navItems: Array<WorkspaceNavItem<TView>>;
  advancedNavItems?: Array<WorkspaceNavItem<TView>>;
  activeView: TView;
  onOpenView: (view: TView) => void;
}

function SidebarNav<TView extends string>({
  navItems,
  advancedNavItems,
  activeView,
  onOpenView,
}: SidebarNavProps<TView>) {
  const hasAdvanced = Boolean(advancedNavItems && advancedNavItems.length > 0);
  const activeIsAdvanced = Boolean(advancedNavItems?.some((item) => item.id === activeView));
  const [advancedOpen, setAdvancedOpen] = useState(activeIsAdvanced);

  const renderNavButton = (item: WorkspaceNavItem<TView>) => {
    const Icon = item.icon;
    const isActive = item.id === activeView;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onOpenView(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left transition-colors lg:w-full ${
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ScanText className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">AI网文诊断台</p>
          <p className="truncate text-xs text-muted-foreground">
            本地小说诊断与 AI 拆书
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2 space-y-1">
        <nav aria-label="主导航" className="space-y-1 text-sm">
          {navItems.map(renderNavButton)}
        </nav>

        {hasAdvanced ? (
          <div className="border-t border-sidebar-border pt-3 mt-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            >
              <span>高级功能</span>
              <ChevronDown
                className={`size-3.5 transition-transform ${
                  advancedOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {advancedOpen ? (
              <nav aria-label="高级功能" className="mt-1 space-y-1 text-sm">
                {advancedNavItems!.map(renderNavButton)}
              </nav>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ThreeColumnWorkspaceShell<TView extends string>({
  activeView,
  activeMeta,
  navItems,
  advancedNavItems,
  status,
  loading,
  onOpenView,
  children,
  mainTabContent = null,
  workspaceHandlers,
}: {
  activeView: TView;
  activeMeta: WorkspaceNavItem<TView>;
  navItems: Array<WorkspaceNavItem<TView>>;
  advancedNavItems?: Array<WorkspaceNavItem<TView>>;
  status: string;
  loading: boolean;
  onOpenView: (view: TView) => void;
  children?: ReactNode;
  mainTabContent?: ReactNode;
  workspaceHandlers?: {
    /* InputTab */
    providerKind?: string;
    providerLabel?: string;
    providerModel?: string;
    loading?: string | null;
    quickLoading?: boolean;
    quickElapsedSeconds?: number;
    quickReviewResult?: any;
    quickReviewError?: string | null;
    previousQuickReviewResult?: any;
    quickReviewGenre?: string;
    quickReviewInputKind?: string;
    quickReviewPreviousPrompt?: string;
    quickReviewCoreSellingPoint?: string;
    quickReviewMustKeepMechanisms?: string;
    quickReviewTargetReaderPleasures?: string;
    chapterText?: string;
    chapterTitle?: string;
    revisionSessions?: any[];
    methodologyCards?: any[];
    bookTitle?: string;
    bookGenre?: string;
    bookText?: string;
    bookFile?: File | null;
    bookUpload?: any;
    hasQuickReviewCache?: boolean;
    handleChapterTextChange?: (value: string) => void;
    onQuickReviewGenreChange?: (value: string) => void;
    onQuickReviewInputKindChange?: (value: any) => void;
    onQuickReviewPreviousPromptChange?: (value: string) => void;
    onQuickReviewCoreSellingPointChange?: (value: string) => void;
    onQuickReviewMustKeepMechanismsChange?: (value: string) => void;
    onQuickReviewTargetReaderPleasuresChange?: (value: string) => void;
    onRunQuickExperience?: () => void;
    onRerunQuickExperience?: () => void;
    diagnosisExamples?: any[];
    onUseExampleChapter?: (id: string) => void;
    onOpenModel?: () => void;
    onOpenCritique?: () => void;
    onOpenBook?: () => void;

    /* DiagnosisTab */
    rubricResult?: any;
    scoreResult?: any;
    onBuildRubric?: () => void;
    onScoreChapter?: () => void;
    diagnosisLoading?: boolean;
    hasRubricCache?: boolean;
    hasScoreCache?: boolean;
    onRebuildRubric?: () => void;
    onRescoreChapter?: () => void;
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
    chapterProjectSteps?: Array<{ label: string; done: boolean; detail: string }>;
    onOpenPlatformStrategy?: () => void;
    onOpenChapterDraft?: () => void;

    /* ResultsTab */
    bookStatus?: string;
    bookCompletion?: number;
    onOpenMethodology?: () => void;
    onOpenHistory?: () => void;
    onOpenDashboard?: () => void;
    onExportProject?: () => void;
    onSaveRevisionNote?: (sessionId: string, note: string) => void;

    /* AnalysisTab */
    bookJob?: any;
    bookAnalysisResult?: any;
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

    /* Right panel extensions */
    providerPreset?: string;
    isBackendFreeProvider?: boolean;
    historyTasks?: any[];
    onTestConnection?: () => void;
    onOpenFullSettings?: () => void;
    onOpenHistoryView?: () => void;
    beginnerLearningDigest?: any;
  };
}) {
  const sidebar = <SidebarNav navItems={navItems} advancedNavItems={advancedNavItems} activeView={activeView} onOpenView={onOpenView} />;

  const rightPanelTabs: RightPanelTab[] = [
    {
      id: "history",
      label: "诊断历史",
      content: <DiagnosisHistoryPanel />,
    },
    {
      id: "reference",
      label: "参考资料",
      content: <ReferenceContextPanel />,
    },
    {
      id: "project",
      label: "项目范围",
      content: <ProjectScopePanel />,
    },
    {
      id: "ai-settings",
      label: "AI 设置",
      content: (
        <AISettingsPanel
          providerPreset={workspaceHandlers?.providerPreset}
          providerLabel={workspaceHandlers?.providerLabel}
          providerModel={workspaceHandlers?.providerModel}
          isBackendFreeProvider={workspaceHandlers?.isBackendFreeProvider}
          isLoading={workspaceHandlers?.loading === "provider"}
          onTestConnection={workspaceHandlers?.onTestConnection}
          onOpenFullSettings={workspaceHandlers?.onOpenFullSettings}
        />
      ),
    },
    {
      id: "history-tasks",
      label: "历史任务",
      content: (
        <HistoryTasksPanel
          tasks={workspaceHandlers?.historyTasks}
          onOpenHistory={workspaceHandlers?.onOpenHistoryView}
        />
      ),
    },
    {
      id: "help",
      label: "新手引导",
      content: (
        <HelpPanel
          digest={workspaceHandlers?.beginnerLearningDigest}
          onOpenView={onOpenView}
        />
      ),
    },
  ];

  const getDefaultMainTab = (): MainAreaTabType => {
    if (mainTabContent) return "input";
    switch (activeView) {
      case "overview":
      case "chapter-critique":
        return "input";
      case "diagnosis-dashboard":
        return "results";
      case "book-analysis":
      case "library":
      case "export":
        return "analysis";
      default:
        return "input";
    }
  };

  const mainTabs: MainAreaTab[] = [
    {
      id: "input",
      label: "输入",
      content: mainTabContent || <InputTab handlers={workspaceHandlers as any} />,
    },
    {
      id: "diagnosis",
      label: "诊断",
      content: (
        <DiagnosisTab
          quickReviewResult={workspaceHandlers?.quickReviewResult}
          rubricResult={workspaceHandlers?.rubricResult}
          scoreResult={workspaceHandlers?.scoreResult}
          quickScore={workspaceHandlers?.quickReviewResult?.quickScore}
          onOpenFullDiagnosis={workspaceHandlers?.onOpenCritique}
          onBuildRubric={workspaceHandlers?.onBuildRubric}
          onScoreChapter={workspaceHandlers?.onScoreChapter}
          loading={workspaceHandlers?.quickLoading}
          hasRubricCache={workspaceHandlers?.hasRubricCache}
          hasScoreCache={workspaceHandlers?.hasScoreCache}
          onRebuildRubric={workspaceHandlers?.onRebuildRubric}
          onRescoreChapter={workspaceHandlers?.onRescoreChapter}
          referenceText={workspaceHandlers?.referenceText}
          onReferenceTextChange={workspaceHandlers?.onReferenceTextChange}
          onImportReferenceFile={workspaceHandlers?.onImportReferenceFile}
          platformLabel={workspaceHandlers?.platformLabel}
          readingModeLabel={workspaceHandlers?.readingModeLabel}
          competitionLevelLabel={workspaceHandlers?.competitionLevelLabel}
          pushStageLabel={workspaceHandlers?.pushStageLabel}
          competitionNotes={workspaceHandlers?.competitionNotes}
          chapterCompletion={workspaceHandlers?.chapterCompletion}
          nextChapterAction={workspaceHandlers?.nextChapterAction}
          chapterProjectSteps={workspaceHandlers?.chapterProjectSteps}
          onOpenPlatformStrategy={workspaceHandlers?.onOpenPlatformStrategy}
          onOpenChapterDraft={workspaceHandlers?.onOpenChapterDraft}
        />
      ),
    },
    {
      id: "results",
      label: "结果",
      content: (
        <ResultsTab
          revisionSessions={workspaceHandlers?.revisionSessions}
          methodologyCards={workspaceHandlers?.methodologyCards}
          bookStatus={workspaceHandlers?.bookStatus}
          bookCompletion={workspaceHandlers?.bookCompletion}
          onOpenMethodology={workspaceHandlers?.onOpenMethodology}
          onOpenHistory={workspaceHandlers?.onOpenHistory}
          onOpenDashboard={workspaceHandlers?.onOpenDashboard}
          onExportProject={workspaceHandlers?.onExportProject}
          onSaveRevisionNote={workspaceHandlers?.onSaveRevisionNote}
        />
      ),
    },
    {
      id: "analysis",
      label: "分析",
      content: (
        <AnalysisTab
          bookJob={workspaceHandlers?.bookJob}
          bookAnalysisResult={workspaceHandlers?.bookAnalysisResult}
          bookText={workspaceHandlers?.bookText}
          bookTitle={workspaceHandlers?.bookTitle}
          researchReadiness={workspaceHandlers?.researchReadiness}
          graphNodeCount={workspaceHandlers?.graphNodeCount}
          graphEdgeCount={workspaceHandlers?.graphEdgeCount}
          foreshadowingCount={workspaceHandlers?.foreshadowingCount}
          evidenceScoreCount={workspaceHandlers?.evidenceScoreCount}
          comparableBookCount={workspaceHandlers?.comparableBookCount}
          persistedResearchLibrary={workspaceHandlers?.persistedResearchLibrary}
          onOpenBookAnalysis={workspaceHandlers?.onOpenBookAnalysis}
          onOpenLibrary={workspaceHandlers?.onOpenLibrary}
          onOpenExport={workspaceHandlers?.onOpenExport}
        />
      ),
    },
  ];

  const headerContent = (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {activeMeta.title}
        </h1>
        {activeMeta.description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            {activeMeta.description}
          </p>
        ) : null}
      </div>
      <StatusBanner status={status} loading={loading} compact />
    </div>
  );

  const mainContent = children ? (
    <div className="space-y-4">{headerContent}{children}</div>
  ) : (
    <div className="space-y-4">{headerContent}</div>
  );

  mainTabs[0].content = mainContent;

  return (
    <WorkspaceLayout
      sidebar={sidebar}
      mainTabs={mainTabs}
      rightPanelTabs={rightPanelTabs}
      defaultMainTab={getDefaultMainTab()}
      defaultRightPanelTab="history"
      showRightPanel={true}
    />
  );
}
