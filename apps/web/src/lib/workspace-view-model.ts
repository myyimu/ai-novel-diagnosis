import {
	BookOpen,
	Download,
	FileText,
	GanttChart,
	History,
	Layers3,
	ListRestart,
	Network,
	Settings as SettingsIcon,
	Sparkles,
	Stethoscope,
	BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
	WorkspaceType,
	DiagnoseView,
	ProjectView,
	ResearchView,
	SettingsView,
	WorkspaceView,
} from "@/lib/workspace-routes";

export interface WorkspaceNavItem<TView extends string = string> {
	id: TView;
	label: string;
	icon: LucideIcon;
	title: string;
	description: string;
}

// 诊断工作区导航项
export const diagnoseNavItems: WorkspaceNavItem<DiagnoseView>[] = [
	{
		id: "quick",
		label: "快速诊断",
		icon: Stethoscope,
		title: "快速诊断",
		description: "快速诊断章节问题，获取改稿建议",
	},
	{
		id: "deep",
		label: "深度质检",
		icon: FileText,
		title: "深度质检",
		description: "基于评分标准的详细质量检查",
	},
	{
		id: "score",
		label: "评分报告",
		icon: BarChart3,
		title: "评分报告",
		description: "查看章节评分和改进建议",
	},
	{
		id: "evidence",
		label: "证据链",
		icon: ListRestart,
		title: "证据链",
		description: "查看诊断依据和证据",
	},
];

// 项目工作区导航项
export const projectNavItems: WorkspaceNavItem<ProjectView>[] = [
	{
		id: "current",
		label: "当前项目",
		icon: GanttChart,
		title: "当前项目",
		description: "查看和切换当前工作项目",
	},
	{
		id: "revisions",
		label: "复诊记录",
		icon: History,
		title: "复诊记录",
		description: "查看历史诊断和改稿记录",
	},
	{
		id: "methodology",
		label: "方法论库",
		icon: Layers3,
		title: "方法论库",
		description: "沉淀的诊断规则和改稿模板",
	},
	{
		id: "export",
		label: "导出资产",
		icon: Download,
		title: "导出资产",
		description: "导出项目资产和诊断报告",
	},
];

// 研究工作区导航项
export const researchNavItems: WorkspaceNavItem<ResearchView>[] = [
	{
		id: "book",
		label: "拆书图谱",
		icon: Network,
		title: "拆书图谱",
		description: "整书角色、关系和时间线分析",
	},
	{
		id: "compare",
		label: "样本对比",
		icon: BookOpen,
		title: "样本对比",
		description: "对比多个已拆解样本",
	},
	{
		id: "patterns",
		label: "套路库",
		icon: Sparkles,
		title: "套路库",
		description: "从样本提炼的开头套路",
	},
	{
		id: "materials",
		label: "研究资料",
		icon: FileText,
		title: "研究资料",
		description: "研究库资料管理",
	},
];

// 设置工作区导航项
export const settingsNavItems: WorkspaceNavItem<SettingsView>[] = [
	{
		id: "provider",
		label: "AI设置",
		icon: SettingsIcon,
		title: "AI设置",
		description: "配置AI模型服务",
	},
	{
		id: "dashboard",
		label: "诊断看板",
		icon: BarChart3,
		title: "诊断看板",
		description: "数据统计和质量趋势",
	},
	{
		id: "history",
		label: "历史任务",
		icon: History,
		title: "历史任务",
		description: "查看历史整书拆解任务",
	},
];

// 根据工作区获取导航项
export function getNavItemsByWorkspace(workspace: WorkspaceType): WorkspaceNavItem[] {
	switch (workspace) {
		case "diagnose":
			return diagnoseNavItems;
		case "project":
			return projectNavItems;
		case "research":
			return researchNavItems;
		case "settings":
			return settingsNavItems;
		default:
			return [];
	}
}

// 获取工作区元信息
export function getWorkspaceMeta(workspace: WorkspaceType) {
	const metas: Record<WorkspaceType, { label: string; description: string }> = {
		diagnose: {
			label: "诊断",
			description: "先诊断问题，再决定怎么改",
		},
		project: {
			label: "项目",
			description: "管理诊断项目和方法论",
		},
		research: {
			label: "研究",
			description: "拆解样本，提炼套路",
		},
		settings: {
			label: "设置",
			description: "配置和数据看板",
		},
	};
	return metas[workspace];
}

// 旧视图元信息（保持兼容性）
export interface WorkspaceViewMeta {
	id: string;
	label: string;
	title: string;
	description: string;
	icon: LucideIcon;
}

const viewMetaMap: Record<string, WorkspaceViewMeta> = {
	overview: {
		id: "overview",
		label: "快速诊断",
		title: "快速诊断",
		description: "快速诊断章节问题",
		icon: Stethoscope,
	},
	chapter: {
		id: "chapter",
		label: "深度质检",
		title: "深度质检",
		description: "基于评分标准的详细质量检查",
		icon: FileText,
	},
	book: {
		id: "book",
		label: "拆书图谱",
		title: "拆书图谱",
		description: "整书角色、关系和时间线分析",
		icon: Network,
	},
	library: {
		id: "library",
		label: "样本对比",
		title: "样本对比",
		description: "对比多个已拆解样本",
		icon: BookOpen,
	},
	starter: {
		id: "starter",
		label: "套路库",
		title: "套路库",
		description: "从样本提炼的开头套路",
		icon: Sparkles,
	},
	revisions: {
		id: "revisions",
		label: "复诊记录",
		title: "复诊记录",
		description: "查看历史诊断和改稿记录",
		icon: History,
	},
	methodology: {
		id: "methodology",
		label: "方法论库",
		title: "方法论库",
		description: "沉淀的诊断规则和改稿模板",
		icon: Layers3,
	},
	exports: {
		id: "exports",
		label: "导出资产",
		title: "导出资产",
		description: "导出项目资产和诊断报告",
		icon: Download,
	},
	provider: {
		id: "provider",
		label: "AI设置",
		title: "AI设置",
		description: "配置AI模型服务",
		icon: SettingsIcon,
	},
	dashboard: {
		id: "dashboard",
		label: "诊断看板",
		title: "诊断看板",
		description: "数据统计和质量趋势",
		icon: BarChart3,
	},
	history: {
		id: "history",
		label: "历史任务",
		title: "历史任务",
		description: "查看历史整书拆解任务",
		icon: History,
	},
	materials: {
		id: "materials",
		label: "研究资料",
		title: "研究资料",
		description: "研究库资料管理",
		icon: FileText,
	},
};

export function getWorkspaceViewMeta(view: string): WorkspaceNavItem<WorkspaceView> {
	const meta = viewMetaMap[view as keyof typeof viewMetaMap] || viewMetaMap.overview;
	return meta as WorkspaceNavItem<WorkspaceView>;
}

// 获取工作区导航项（旧API，保持兼容性）
export function getWorkspaceNavItems(): WorkspaceNavItem<WorkspaceView>[] {
	return diagnoseNavItems as unknown as WorkspaceNavItem<WorkspaceView>[];
}

// 获取高级导航项（旧API，保持兼容性）
export function getAdvancedWorkspaceNavItems(): WorkspaceNavItem<WorkspaceView>[] {
	return [
		...projectNavItems,
		...researchNavItems,
		...settingsNavItems,
	] as unknown as WorkspaceNavItem<WorkspaceView>[];
}

// 性能快照说明
export function getPerformanceSnapshotNote(options: { isShortFormReading?: boolean; isLongSerialization?: boolean }) {
	const { isShortFormReading, isLongSerialization } = options;
	if (isShortFormReading) {
		return "短篇付费阅读：重点看前3分钟和付费转化率";
	}
	if (isLongSerialization) {
		return "长篇连载：重点看追读率和留存曲线";
	}
	return "标准章节：重点看读完率和下一章点击率";
}

// 章节工作区摘要
export interface OverviewStep {
	label: string;
	done: boolean;
	detail: string;
}

export function buildChapterWorkspaceSummary(options: {
	platformLabel: string;
	audienceLabel: string;
	readingModeLabel: string;
	referenceText: string;
	referenceFileName: string;
	chapterText: string;
	quickReviewResult: unknown;
	referenceProfileApplied: boolean;
	category: string;
	theme: string;
	rubricResult: unknown;
	scoreResult: unknown;
	performanceValues: (string | number)[];
	performanceSnapshotNote: string;
}) {
	const hasReference = Boolean(options.referenceText.trim() || options.referenceFileName);
	const hasChapter = Boolean(options.chapterText.trim());
	const hasQuickReview = Boolean(options.quickReviewResult);
	const hasRubric = Boolean(options.rubricResult);
	const hasScore = Boolean(options.scoreResult);
	const hasValidPerformance = options.performanceValues.some((v) => Number(v) > 0);

	const steps: OverviewStep[] = [];
	if (hasReference) steps.push({ label: "参考章节", done: true, detail: "已导入" });
	else steps.push({ label: "参考章节", done: false, detail: "未导入" });

	if (hasChapter) steps.push({ label: "待诊正文", done: true, detail: "已粘贴" });
	else steps.push({ label: "待诊正文", done: false, detail: "未粘贴" });

	if (hasQuickReview) steps.push({ label: "快速点评", done: true, detail: "已完成" });
	else steps.push({ label: "快速点评", done: false, detail: "未运行" });

	if (hasRubric) steps.push({ label: "评分标准", done: true, detail: "已生成" });
	else steps.push({ label: "评分标准", done: false, detail: "未生成" });

	if (hasScore) steps.push({ label: "章节评分", done: true, detail: "已完成" });
	else steps.push({ label: "章节评分", done: false, detail: "未评分" });

	if (hasValidPerformance) steps.push({ label: "流量数据", done: true, detail: "已填写" });
	else steps.push({ label: "流量数据", done: false, detail: "未填写" });

	let completion = 0;
	if (hasReference) completion += 20;
	if (hasChapter) completion += 20;
	if (hasQuickReview) completion += 20;
	if (hasRubric) completion += 15;
	if (hasScore) completion += 15;
	if (hasValidPerformance) completion += 10;

	let nextChapterAction = "开始诊断";
	if (!hasReference) nextChapterAction = "导入参考章节";
	else if (!hasChapter) nextChapterAction = "粘贴待诊正文";
	else if (!hasQuickReview) nextChapterAction = "运行快速点评";
	else if (!hasRubric) nextChapterAction = "生成评分标准";
	else if (!hasScore) nextChapterAction = "对章节评分";
	else if (!hasValidPerformance) nextChapterAction = "填写流量数据";

	return {
		chapterProjectSteps: steps,
		chapterCompletion: completion,
		nextChapterAction,
	};
}

// 拆书工作区摘要
export function buildBookWorkspaceSummary(options: {
	bookJob: { status?: string } | null;
	bookUpload: { chapterCount?: number } | null;
}) {
	const { bookJob, bookUpload } = options;
	let bookStatusText = "未开始";
	let bookCompletion = 0;

	if (bookUpload) {
		bookStatusText = `章节预览完成：${bookUpload.chapterCount} 个章节片段`;
		bookCompletion = 30;
	}

	if (bookJob?.status === "queued") {
		bookStatusText = "任务已排队，等待处理";
		bookCompletion = 40;
	} else if (bookJob?.status === "running") {
		bookStatusText = "正在拆解整书...";
		bookCompletion = 60;
	} else if (bookJob?.status === "succeeded") {
		bookStatusText = "整书拆解完成";
		bookCompletion = 100;
	} else if (bookJob?.status === "failed") {
		bookStatusText = "拆解失败，请重试";
		bookCompletion = 50;
	}

	return { bookStatusText, bookCompletion };
}

// 研究工作区摘要
export interface ResearchSource {
	name: string;
	status: string;
	detail: string;
}

export function buildResearchWorkspaceSummary(options: {
	referenceText: string;
	chapterText: string;
	chapterTitle: string;
	referenceFileName: string;
	bookUpload: unknown;
	bookAnalysisResult: unknown;
	scoreResult: unknown;
	graphNodeCount: number;
	graphEdgeCount: number;
	evidenceScoreCount: number;
	comparableBookCount: number;
}) {
	const hasReference = Boolean(options.referenceText.trim());
	const hasChapter = Boolean(options.chapterText.trim());
	const hasBookUpload = Boolean(options.bookUpload);
	const hasBookResult = Boolean(options.bookAnalysisResult);
	const hasScore = Boolean(options.scoreResult);

	let researchSourceCount = 0;
	const researchSources: ResearchSource[] = [];

	if (hasReference) {
		researchSourceCount++;
		researchSources.push({ name: "参考章节", status: "ready", detail: "已导入" });
	}
	if (hasChapter) {
		researchSourceCount++;
		researchSources.push({ name: "待诊正文", status: "ready", detail: "已粘贴" });
	}
	if (hasBookUpload || hasBookResult) {
		researchSourceCount++;
		researchSources.push({ name: "整书样本", status: "ready", detail: "已拆解" });
	}
	if (hasScore && options.evidenceScoreCount > 0) {
		researchSourceCount++;
		researchSources.push({ name: "评分证据", status: "ready", detail: `${options.evidenceScoreCount} 条` });
	}

	// researchReadiness is a number (0-100) based on source count
	let researchReadiness = 0;
	if (researchSourceCount >= 3) {
		researchReadiness = 100;
	} else if (researchSourceCount >= 2) {
		researchReadiness = 60;
	} else if (researchSourceCount >= 1) {
		researchReadiness = 30;
	}

	return {
		researchSourceCount,
		researchReadiness,
		researchSources,
	};
}
