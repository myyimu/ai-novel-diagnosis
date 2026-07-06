// e:\ai-novel-diagnosis\apps\web\src\components\workspace\ViewHeader.tsx
"use client";

import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

// Status meta data helper
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

// Status banner component
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

  // Success state: small hint
  if (meta.tone === "success") {
    return (
      <div className="flex items-center gap-2 text-xs text-success-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="break-words leading-5">{status}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-md border ${meta.className} ${compact ? "p-3 text-xs" : "p-4 text-sm"}`}>
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

// Main ViewHeader component
interface ViewHeaderProps {
  title: string;
  description?: string;
  status: string;
  loading: boolean;
}

export function ViewHeader({
  title,
  description,
  status,
  loading,
}: ViewHeaderProps) {
  return (
    <div className="space-y-4">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <StatusBanner status={status} loading={loading} compact />
    </div>
  );
}

export { StatusBanner };