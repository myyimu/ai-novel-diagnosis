/**
 * Book journey stage derivation — the information-architecture contract
 * described in docs/information-architecture.md §4.
 *
 * Pure derivation over already-persisted workspace assets (revision sessions,
 * methodology cards, and — once premise review ships — the engine card).
 * No fabricated progress: every milestone comes from a data predicate, never
 * from an estimation formula. Stage ② (structure) is reserved and reported as
 * unavailable until its P1 landing.
 */

export type BookStageKey = "premise" | "structure" | "triage" | "retest" | "distill";

export interface BookStageSession {
	id: string;
	retestStatus?: "not_requested" | "pending" | "completed";
}

export interface BookStageInput {
	sessions: BookStageSession[];
	methodologyCardCount: number;
	/** 立项审稿（阶段①）上线后由发动机契约提供；缺省表示尚未立项。 */
	engineCardStatus?: "draft" | "confirmed";
	/** /diagnose/idea 上线前置 false；为 false 时阶段①不产生待办，避免指向不存在的路由。 */
	premiseReviewEnabled?: boolean;
}

export interface BookStageState {
	key: BookStageKey;
	/** 轴序 1-5，对应文档中的 ①-⑤。 */
	index: number;
	label: string;
	description: string;
	/** 里程碑已达成（来自数据判定，非估算）。 */
	reached: boolean;
	/** 有未清待办（当前仅④的 pending 复诊使用）。 */
	pending: boolean;
	/** 功能未上线（②恒为 false；①在开关关闭时 false），渲染为虚位。 */
	available: boolean;
}

export interface BookStageAction {
	stageKey: BookStageKey;
	label: string;
	href: string;
}

export interface BookStageSummary {
	/** 按轴序①→⑤排列。 */
	stages: BookStageState[];
	reachedCount: number;
	nextAction: BookStageAction | null;
}

interface StageDefinition {
	key: BookStageKey;
	label: string;
	description: string;
}

const STAGE_DEFINITIONS: StageDefinition[] = [
	{ key: "premise", label: "立项", description: "这本书值得写吗" },
	{ key: "structure", label: "结构", description: "怎么安排章节" },
	{ key: "triage", label: "初诊", description: "写得好不好" },
	{ key: "retest", label: "复诊", description: "改进了没有" },
	{ key: "distill", label: "沉淀", description: "学到什么可复用" },
];

export function deriveBookStage(input: BookStageInput): BookStageSummary {
	const { sessions, methodologyCardCount } = input;
	const premiseReviewEnabled = input.premiseReviewEnabled ?? false;

	const milestones = {
		premise: input.engineCardStatus === "confirmed",
		structure: false,
		triage: sessions.length > 0,
		retest: sessions.some((session) => session.retestStatus === "completed"),
		distill: methodologyCardCount > 0,
	};
	const pendingRetest = sessions.some((session) => session.retestStatus === "pending");

	const stages: BookStageState[] = STAGE_DEFINITIONS.map((definition, i) => ({
		key: definition.key,
		index: i + 1,
		label: definition.label,
		description: definition.description,
		reached: milestones[definition.key],
		pending: definition.key === "retest" && pendingRetest,
		available:
			definition.key === "structure"
				? false
				: definition.key !== "premise" || premiseReviewEnabled,
	}));

	const nextAction = resolveNextAction({
		premiseReviewEnabled,
		engineConfirmed: milestones.premise,
		hasSessions: milestones.triage,
		pendingRetest,
		hasCompletedRetest: milestones.retest,
		hasCards: milestones.distill,
	});

	return {
		stages,
		reachedCount: stages.filter((stage) => stage.reached).length,
		nextAction,
	};
}

interface NextActionInput {
	premiseReviewEnabled: boolean;
	engineConfirmed: boolean;
	hasSessions: boolean;
	pendingRetest: boolean;
	hasCompletedRetest: boolean;
	hasCards: boolean;
}

/**
 * 下一步动作阶梯：从最早的未清待办开始（docs/information-architecture.md §4）。
 * 全部达成时回落到章节循环——写下一章并初诊。
 */
function resolveNextAction(input: NextActionInput): BookStageAction | null {
	if (input.premiseReviewEnabled && !input.engineConfirmed) {
		return { stageKey: "premise", label: "先审这个故事值不值得写", href: "/diagnose/idea" };
	}
	if (input.pendingRetest) {
		return { stageKey: "retest", label: "完成待复诊的版本对比", href: "/project/revisions" };
	}
	if (!input.hasSessions) {
		return { stageKey: "triage", label: "贴第一章做初诊", href: "/diagnose/quick" };
	}
	if (!input.hasCompletedRetest) {
		return { stageKey: "retest", label: "改稿后保存 V2 触发复诊", href: "/project/revisions" };
	}
	if (!input.hasCards) {
		return { stageKey: "distill", label: "沉淀方法论卡", href: "/project/methodology" };
	}
	return { stageKey: "triage", label: "写下一章并初诊", href: "/diagnose/quick" };
}
