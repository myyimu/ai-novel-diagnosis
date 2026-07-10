"use client";

import { useMemo } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toQuickReviewErrorMessage } from "@/lib/quick-review-errors";

interface QuickDiagnosisStatusProps {
	loading: boolean;
	error: string | null;
	onRetry: () => void;
	onOpenModel: () => void;
	compact?: boolean;
}

function sanitizeQuickErrorMessage(error: string) {
	const normalized = error.trim();
	if (!normalized) return "快速点评失败，请稍后重试。";

	const hasHtml = /<\s*\/?\s*(html|body|script|style|iframe|svg|img|div|span|meta|link)\b/i.test(
		normalized,
	);
	if (hasHtml) {
		return "模型返回了无法直接展示的网页内容，请切换模型后重试。";
	}

	if (normalized.includes("<") && normalized.includes(">") && normalized.length > 120) {
		return "模型返回了不适合直接展示的内容，请切换模型后重试。";
	}

	return toQuickReviewErrorMessage(normalized);
}

export function QuickDiagnosisStatus({
	loading,
	error,
	onRetry,
	onOpenModel,
	compact = false,
}: QuickDiagnosisStatusProps) {
	const message = useMemo(() => (error ? sanitizeQuickErrorMessage(error) : null), [error]);

	if (loading) {
		return (
			<Card className="border-primary/30 bg-primary/5" role="status" aria-live="polite">
				<CardContent className="flex items-center gap-3 p-4">
					<Loader2 className="size-4 animate-spin text-primary" />
					<div className="min-w-0">
						<p className="text-sm font-medium text-foreground">正在生成改稿方案</p>
						<p className="text-xs leading-5 text-muted-foreground">
							按钮已禁用，结果返回后会自动显示。
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!message) return null;

	return (
		<Card
			className="border-warning-border bg-warning-surface"
			role="alert"
			aria-live="assertive"
		>
			<CardContent className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
				<div className="flex items-start gap-3">
					<TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold text-warning-foreground">诊断未完成</p>
						<p className="mt-1 text-sm leading-6 text-warning-foreground/90">
							{message}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button size="sm" onClick={onRetry}>
						重试
					</Button>
					<Button size="sm" variant="outline" onClick={onOpenModel}>
						切换模型
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
