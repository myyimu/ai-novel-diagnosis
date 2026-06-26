import { describe, expect, it } from "vitest";
import type { BookAnalysisResult } from "@/stores/workspace-store";
import { buildBookComprehensionMap, buildRelationshipReadingInsight } from "./book-comprehension";

const result = {
	mode: "book-asset-analysis",
	book: {
		title: "样本书",
		genre: "xuanhuan",
		chapterCountEstimate: 3,
		oneSentencePremise: "废柴主角被公开剥夺资格后寻找旧案证据。",
		coreAppeal: ["公开羞辱后反击", "旧案悬念", "导师试探"],
	},
	transferableStyleCard: {
		coreStyleTags: [],
		narrativeVoice: "",
		sentenceRhythm: "",
		paragraphPattern: "",
		dialoguePattern: "",
		sensoryFocus: [],
		pleasureMechanisms: ["地位反转"],
		hookPatterns: [],
		styleRules: [],
		antiPatterns: [],
	},
	worldbuilding: {
		worldRules: [],
		powerSystem: [],
		locations: [],
		factions: [],
		itemsAndTerms: [],
	},
	characters: [],
	relationships: {
		nodes: [
			{ id: "c1", label: "主角", type: "character", mainCharacter: true },
			{ id: "c2", label: "评审会", type: "faction" },
			{ id: "c3", label: "导师", type: "character" },
		],
		edges: [
			{
				source: "c1",
				target: "c2",
				label: "压迫",
				relation: ["压迫", "反击"],
				tension: "资格被剥夺",
				weight: 9,
				positivity: -0.8,
				evidence: ["评审会当众否定主角资格"],
				firstSeenChapter: 1,
				confidence: 0.92,
			},
			{
				source: "c1",
				target: "c3",
				label: "交易",
				relation: ["试探", "交易"],
				tension: "导师要求证据",
				weight: 6,
				positivity: 0.1,
				evidence: ["导师没有立刻帮忙"],
				firstSeenChapter: 2,
				confidence: 0.8,
			},
		],
	},
	plotlines: [
		{
			name: "反击线",
			type: "成长线",
			start: "资格被夺",
			turningPoints: ["找到旧案信物"],
			payoff: "公开证明被冤枉",
			reusablePattern: "先给主角明确损失，再给一个必须冒险争取的翻盘机会。",
		},
	],
	chronicle: [
		{ order: 1, event: "主角被否定", impact: "制造反击期待", storyFunction: "开局钩子" },
		{ order: 2, event: "旧案信物出现", impact: "推动调查", storyFunction: "悬念推进" },
	],
	historyBook: {
		ancientHistory: [],
		recentHistory: [],
		publicMyths: [],
		hiddenTruths: [],
	},
	writingSupport: {
		chapterFunctionTable: [
			{
				chapterOrder: 1,
				title: "第一章",
				function: "开局承诺",
				goal: "保住资格",
				conflict: "评审会公开剥夺资格",
				hook: "旧案信物出现",
			},
			{
				chapterOrder: 2,
				title: "第二章",
				function: "关系交易",
				goal: "说服导师",
				conflict: "导师要求主角拿出证据",
				hook: "匿名信威胁",
			},
		],
		foreshadowingLedger: [
			{
				setup: "旧案信物",
				setupChapter: 1,
				payoff: "引出主线秘密",
				status: "open",
				risk: "忘记会让旧案线断裂",
			},
		],
		emotionalBeatMap: [],
		pacingCurve: [],
		readerPromiseChecklist: [
			{
				promise: "公开羞辱后反击",
				evidence: "开局被否定",
				status: "pending",
				nextCheck: "前三章必须给第一次反击机会",
			},
		],
		conflictMatrix: [],
		continuationPack: {
			currentState: "主角拿到旧案信物",
			nextChapterGoal: "验证信物",
			openThreads: ["旧案真相"],
			oocGuards: [],
			settingGuards: [],
			styleConstraints: [],
			aiPrompt: "",
		},
		qualityDiagnosis: {
			strengths: ["压迫关系清楚"],
			weaknesses: [],
			priorityFixes: [],
		},
	},
	originalizationReport: {
		riskLevel: "medium",
		safeToLearn: [],
		mustTransform: [],
		fanFictionWarning: "",
		rewriteStrategy: [],
	},
	exportPackage: {
		tavernCharacterCards: [],
		worldBookEntries: [],
		writingConstraints: [],
		doNotCopyList: [],
	},
	usageRiskNotice: {
		summary: "",
		recommendedUse: [],
		higherRiskUse: [],
		userResponsibility: "",
	},
} as BookAnalysisResult;

describe("buildBookComprehensionMap", () => {
	it("turns book assets into a readable guide", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.headline).toContain("公开羞辱后反击");
		expect(map.corePromise).toBe("公开羞辱后反击");
		expect(map.whyItWorks).toContain("旧案悬念");
		expect(map.readingPath[0]).toMatchObject({
			phase: "开局承诺",
			chapterRange: "第 1 章",
			trigger: "保住资格",
			escalation: "评审会公开剥夺资格",
			openHook: "旧案信物出现",
		});
		expect(map.readingPath[0].readerReasonToContinue).toContain("旧案信物出现");
	});

	it("does not surface long English model prose in reader-facing cards", () => {
		const englishResult = JSON.parse(JSON.stringify(result)) as BookAnalysisResult;
		englishResult.book.coreAppeal = [
			"The humorous hook of a wife making her ex-husband get a check after divorce.",
		];
		const writingSupport = englishResult.writingSupport;
		if (!writingSupport) {
			throw new Error("Expected writingSupport fixture");
		}
		writingSupport.chapterFunctionTable[0].hook =
			"The CEO's mysterious arrangement creates suspense for future developments.";
		writingSupport.readerPromiseChecklist[0].promise =
			"The hidden truth behind the divorce creates a long-term question.";
		writingSupport.readerPromiseChecklist[0].nextCheck =
			"The following chapter should recover and escalate this setup.";

		const map = buildBookComprehensionMap(englishResult);

		expect(map.whyItWorks[0]).toBe("吸引力 1 待重新提炼");
		expect(map.readingPath[0].openHook).toBe("阶段末尾钩子需要重新提炼");
		expect(map.readingPath[0].readerReasonToContinue).not.toContain("CEO");
		expect(map.promiseMap[0]).toMatchObject({
			promise: "读者承诺 1 需要重新提炼",
			payoffOrRisk: "后续检查点待补",
		});
	});

	it("prioritizes strong relationships and explains their story function", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.keyRelationships[0]).toMatchObject({
			from: "主角",
			to: "评审会",
			state: "压迫、反击",
			firstSeenChapter: 1,
			changeMoment: "第 1 章开始进入故事",
		});
		expect(map.keyRelationships[0].storyFunction).toContain("必须行动");
		expect(map.keyRelationships[0].learnableMove).toContain("具体损失");
		expect(map.keyRelationships[0].evidence[0]).toContain("评审会");
	});

	it("skips empty relationship records from partial provider output", () => {
		const partialResult = {
			...result,
			relationships: {
				nodes: [null, undefined, { id: "", label: "无编号角色", type: "character" }],
				edges: [
					null,
					undefined,
					{
						source: "无编号角色",
						target: "",
						label: "试探",
						relation: ["试探"],
						tension: "信息不足",
						weight: 5,
					},
				],
			},
		} as unknown as BookAnalysisResult;

		const map = buildBookComprehensionMap(partialResult);

		expect(map.keyRelationships[0]).toEqual(
			expect.objectContaining({
				from: "无编号角色",
				to: "目标 1",
				state: "试探",
			}),
		);
	});

	it("builds a chapter-ordered relationship storyline", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.relationshipStoryline).toHaveLength(2);
		expect(map.relationshipStoryline[0]).toMatchObject({
			chapterLabel: "第 1 章",
			title: "主角 / 评审会",
			evidence: "评审会当众否定主角资格",
		});
		expect(map.relationshipStoryline[0].readerQuestion).toContain("主角 如何摆脱或反击 评审会");
		expect(map.relationshipStoryline[1]).toMatchObject({
			chapterLabel: "第 2 章",
			title: "主角 / 导师",
		});
		expect(map.relationshipStoryline[1].writingMove).toContain("导师关系");
	});

	it("combines reader promises and foreshadowing into promise map", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.promiseMap).toHaveLength(2);
		expect(map.promiseMap[0]).toMatchObject({
			promise: "公开羞辱后反击",
			setup: "开局被否定",
			progress: "待兑现",
		});
		expect(map.promiseMap[1].promise).toBe("旧案信物");
	});

	it("keeps beginner takeaways actionable", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.beginnerTakeaways[0].rule).toContain("明确损失");
		expect(map.beginnerTakeaways[0].howToUse).toContain("公开证明被冤枉");
		expect(map.beginnerTakeaways[0].avoid).toContain("不要照搬");
	});

	it("builds a mind-map style reading guide", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.mindMapBranches.map((branch) => branch.title)).toEqual([
			"主角压力",
			"关系钩子",
			"冲突升级",
			"伏笔期待",
			"可学写法",
		]);
		expect(map.mindMapBranches[0].summary).toContain("评审会公开剥夺资格");
		expect(map.mindMapBranches[1].items[0]).toContain("主角 / 评审会");
		expect(map.mindMapBranches[2].items[0]).toContain("旧案信物出现");
		expect(map.mindMapBranches[3].items[0]).toContain("前三章必须给第一次反击机会");
		expect(map.mindMapBranches[4].items[0]).toContain("先给主角明确损失");
	});

	it("builds a reusable prompt for original new-book planning", () => {
		const map = buildBookComprehensionMap(result);

		expect(map.applicationPrompt).toContain("全新的原创网文开局方案");
		expect(map.applicationPrompt).toContain("核心读者承诺：公开羞辱后反击");
		expect(map.applicationPrompt).toContain("前三章阶段安排");
		expect(map.applicationPrompt).toContain("关键人物关系");
		expect(map.applicationPrompt).toContain("不要复用原作姓名");
	});

	it("explains a selected relationship for graph readers", () => {
		const insight = buildRelationshipReadingInsight(
			{
				label: "压迫",
				tension: "资格被剥夺",
				relation: ["压迫", "反击"],
			},
			"主角",
			"评审会",
		);

		expect(insight.storyFunction).toContain("必须行动");
		expect(insight.readerExpectation).toContain("主角 如何摆脱或反击 评审会");
		expect(insight.learnableMove).toContain("具体损失");
	});
});
