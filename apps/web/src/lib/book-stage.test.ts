import { describe, expect, it } from "vitest";

import { deriveBookStage, type BookStageSession } from "./book-stage";

function session(overrides: Partial<BookStageSession> = {}): BookStageSession {
	return { id: `session-${Math.random().toString(36).slice(2, 8)}`, ...overrides };
}

describe("deriveBookStage", () => {
	it("should keep the fixed axis order premise-structure-triage-retest-distill", () => {
		const summary = deriveBookStage({ sessions: [], methodologyCardCount: 0 });

		expect(summary.stages.map((stage) => stage.key)).toEqual([
			"premise",
			"structure",
			"triage",
			"retest",
			"distill",
		]);
		expect(summary.stages.map((stage) => stage.index)).toEqual([1, 2, 3, 4, 5]);
	});

	it("should mark structure as unavailable and premise as unavailable while the feature is off", () => {
		const summary = deriveBookStage({ sessions: [], methodologyCardCount: 0 });

		const structure = summary.stages.find((stage) => stage.key === "structure");
		expect(structure?.available).toBe(false);
		expect(structure?.reached).toBe(false);

		const premise = summary.stages.find((stage) => stage.key === "premise");
		expect(premise?.available).toBe(false);
		// 未上线时不产生指向不存在路由的待办
		expect(summary.nextAction?.stageKey).not.toBe("premise");
	});

	it("should route an empty book to chapter triage as the next action", () => {
		const summary = deriveBookStage({ sessions: [], methodologyCardCount: 0 });

		expect(summary.nextAction).toEqual({
			stageKey: "triage",
			label: "贴第一章做初诊",
			href: "/diagnose/quick",
		});
		expect(summary.reachedCount).toBe(0);
	});

	it("should request a premise audit first when premise review is enabled but unconfirmed", () => {
		const summary = deriveBookStage({
			sessions: [session()],
			methodologyCardCount: 0,
			premiseReviewEnabled: true,
		});

		expect(summary.nextAction).toEqual({
			stageKey: "premise",
			label: "先审这个故事值不值得写",
			href: "/diagnose/idea",
		});
	});

	it("should light the premise milestone once the engine card is confirmed", () => {
		const summary = deriveBookStage({
			sessions: [],
			methodologyCardCount: 0,
			premiseReviewEnabled: true,
			engineCardStatus: "confirmed",
		});

		expect(summary.stages.find((stage) => stage.key === "premise")?.reached).toBe(true);
		expect(summary.nextAction?.stageKey).toBe("triage");
	});

	it("should flag a pending retest as the earliest blocking todo", () => {
		const summary = deriveBookStage({
			sessions: [session({ retestStatus: "pending" })],
			methodologyCardCount: 0,
		});

		const retest = summary.stages.find((stage) => stage.key === "retest");
		expect(retest?.pending).toBe(true);
		expect(retest?.reached).toBe(false);
		expect(summary.nextAction).toEqual({
			stageKey: "retest",
			label: "完成待复诊的版本对比",
			href: "/project/revisions",
		});
	});

	it("should ask for a saved V2 when sessions exist without any retest", () => {
		const summary = deriveBookStage({
			sessions: [session({ retestStatus: "not_requested" })],
			methodologyCardCount: 0,
		});

		expect(summary.nextAction).toEqual({
			stageKey: "retest",
			label: "改稿后保存 V2 触发复诊",
			href: "/project/revisions",
		});
	});

	it("should ask for methodology distillation after a completed retest", () => {
		const summary = deriveBookStage({
			sessions: [session({ retestStatus: "completed" })],
			methodologyCardCount: 0,
		});

		expect(summary.stages.find((stage) => stage.key === "retest")?.reached).toBe(true);
		expect(summary.nextAction).toEqual({
			stageKey: "distill",
			label: "沉淀方法论卡",
			href: "/project/methodology",
		});
	});

	it("should fall back to the chapter loop when every milestone is reached", () => {
		const summary = deriveBookStage({
			sessions: [session({ retestStatus: "completed" })],
			methodologyCardCount: 3,
		});

		expect(summary.reachedCount).toBe(3); // ③④⑤
		expect(summary.nextAction).toEqual({
			stageKey: "triage",
			label: "写下一章并初诊",
			href: "/diagnose/quick",
		});
	});
});
