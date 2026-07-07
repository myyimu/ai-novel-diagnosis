"use client";

import { useState } from "react";
import {
	BookOpen,
	BarChart3,
	FileText,
	Settings,
	Upload,
	History,
	Library,
	Download,
} from "lucide-react";
import {
	ThreeColumnWorkspaceShell,
	type WorkspaceNavItem,
} from "@/components/workspace/ThreeColumnWorkspaceShell";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { diagnosisExampleOptions } from "@/lib/diagnosis-examples";

const navItems: WorkspaceNavItem<string>[] = [
	{
		id: "overview",
		label: "总览",
		title: "总览",
		description: "项目概览和快速诊断入口",
		icon: BookOpen,
	},
	{
		id: "diagnosis-dashboard",
		label: "诊断仪表盘",
		title: "诊断仪表盘",
		description: "查看诊断数据统计和趋势",
		icon: BarChart3,
	},
	{
		id: "chapter-critique",
		label: "章节诊断",
		title: "章节诊断",
		description: "对单个章节进行详细诊断",
		icon: FileText,
	},
	{
		id: "book-analysis",
		label: "全书分析",
		title: "全书分析",
		description: "对整本书进行 Map-Reduce 拆解",
		icon: Upload,
	},
	{
		id: "library",
		label: "研究库",
		title: "研究库",
		description: "浏览研究样本和参考资料",
		icon: Library,
	},
];

const advancedNavItems: WorkspaceNavItem<string>[] = [
	{
		id: "model-settings",
		label: "AI 提供商",
		title: "AI 提供商设置",
		description: "配置 AI 模型和 API",
		icon: Settings,
	},
	{
		id: "history",
		label: "任务历史",
		title: "任务历史",
		description: "查看历史任务记录",
		icon: History,
	},
	{
		id: "exports",
		label: "导出",
		title: "导出",
		description: "导出分析结果和报告",
		icon: Download,
	},
];

export default function TestLayoutPage() {
	const [activeView, setActiveView] = useState<string>("overview");
	const [loading, _setLoading] = useState(false);
	const [status, setStatus] = useState("系统就绪");

	// 从 store 获取数据
	const chapterText = useWorkspaceStore((s) => s.chapterText);
	const chapterTitle = useWorkspaceStore((s) => s.chapterTitle);
	const quickReviewResult = useWorkspaceStore((s) => s.quickReviewResult);
	const quickReviewGenre = useWorkspaceStore((s) => s.quickReviewGenre);
	const quickReviewInputKind = useWorkspaceStore((s) => s.quickReviewInputKind);
	const revisionSessions = useWorkspaceStore((s) => s.revisionSessions);
	const methodologyCards = useWorkspaceStore((s) => s.methodologyCards);
	const provider = useWorkspaceStore((s) => s.provider);
	const setChapterText = useWorkspaceStore((s) => s.setChapterText);
	const setQuickReviewGenre = useWorkspaceStore((s) => s.setQuickReviewGenre);
	const setQuickReviewInputKind = useWorkspaceStore((s) => s.setQuickReviewInputKind);

	const activeMeta =
		[...navItems, ...advancedNavItems].find((item) => item.id === activeView) || navItems[0];

	const handleOpenView = (view: string) => {
		setActiveView(view);
		setStatus(`已切换到 ${view}`);
	};

	// 构造简化版 handlers
	const workspaceHandlers = {
		/* provider state */
		providerKind: provider.kind,
		providerLabel: provider.kind === "mock" ? "本地演示" : "AI 模型",
		providerModel: provider.model || "",

		/* quick review state */
		quickLoading: loading,
		quickElapsedSeconds: 0,
		quickReviewResult,
		quickReviewError: null,
		previousQuickReviewResult: null,
		quickReviewGenre,
		quickReviewInputKind,
		quickReviewPreviousPrompt: "",
		quickReviewCoreSellingPoint: "",
		quickReviewMustKeepMechanisms: "",
		quickReviewTargetReaderPleasures: "",

		/* chapter state */
		chapterText,
		chapterTitle,

		/* project state */
		revisionSessions,
		methodologyCards,

		/* book state */
		bookTitle: "",
		bookGenre: "",
		bookText: "",
		bookFile: null,
		bookUpload: null,

		/* cache */
		hasQuickReviewCache: false,

		/* handlers */
		handleChapterTextChange: setChapterText,
		onQuickReviewGenreChange: setQuickReviewGenre,
		onQuickReviewInputKindChange: setQuickReviewInputKind,
		onQuickReviewPreviousPromptChange: () => {},
		onQuickReviewCoreSellingPointChange: () => {},
		onQuickReviewMustKeepMechanismsChange: () => {},
		onQuickReviewTargetReaderPleasuresChange: () => {},
		onRunQuickExperience: () => setStatus("快速诊断需要完整功能支持"),
		onRerunQuickExperience: () => setStatus("快速诊断需要完整功能支持"),

		/* examples */
		diagnosisExamples: diagnosisExampleOptions,
		onUseExampleChapter: () => {},

		/* navigation */
		onOpenModel: () => setActiveView("model-settings"),
		onOpenCritique: () => setActiveView("chapter-critique"),
		onOpenBook: () => setActiveView("book-analysis"),
	};

	return (
		<ThreeColumnWorkspaceShell
			activeView={activeView}
			activeMeta={activeMeta}
			navItems={navItems}
			advancedNavItems={advancedNavItems}
			status={status}
			loading={loading}
			onOpenView={handleOpenView}
			workspaceHandlers={workspaceHandlers}
		/>
	);
}
