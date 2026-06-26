import type { BookAnalysisResult } from "@/stores/workspace-store";

export interface BookComprehensionPhase {
	id: string;
	phase: string;
	chapterRange: string;
	trigger: string;
	escalation: string;
	choiceOrTurn: string;
	payoff: string;
	openHook: string;
	readerReasonToContinue: string;
	learnableMove: string;
}

export interface BookComprehensionRelationship {
	id: string;
	from: string;
	to: string;
	state: string;
	firstSeenChapter?: number;
	storyFunction: string;
	changeMoment: string;
	readerExpectation: string;
	learnableMove: string;
	evidence: string[];
}

export interface BookPromiseMapItem {
	id: string;
	promise: string;
	setup: string;
	progress: string;
	payoffOrRisk: string;
}

export interface BookBeginnerTakeaway {
	id: string;
	rule: string;
	why: string;
	howToUse: string;
	avoid: string;
}

export interface BookMindMapBranch {
	id: string;
	title: string;
	summary: string;
	items: string[];
}

export interface BookRelationshipStoryBeat {
	id: string;
	chapterLabel: string;
	title: string;
	storyEvent: string;
	readerQuestion: string;
	writingMove: string;
	evidence: string;
}

export interface BookComprehensionMap {
	headline: string;
	corePromise: string;
	whyItWorks: string[];
	mindMapBranches: BookMindMapBranch[];
	relationshipStoryline: BookRelationshipStoryBeat[];
	readingPath: BookComprehensionPhase[];
	keyRelationships: BookComprehensionRelationship[];
	promiseMap: BookPromiseMapItem[];
	beginnerTakeaways: BookBeginnerTakeaway[];
	applicationPrompt: string;
}

type ChapterFunction = NonNullable<
	BookAnalysisResult["writingSupport"]
>["chapterFunctionTable"][number];
type ChronicleEvent = BookAnalysisResult["chronicle"][number];
type RelationshipEdge = BookAnalysisResult["relationships"]["edges"][number];
type RelationshipInsightEdge = Pick<RelationshipEdge, "label" | "tension"> & {
	relation?: string[];
};

function asArray<T>(value: T[] | null | undefined): T[] {
	return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isEnglishProse(value: string | null | undefined) {
	const text = value?.trim() ?? "";
	if (text.length < 16) {
		return false;
	}

	const cjkCount = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
	const latinWords = text.match(/[A-Za-z]{3,}/g) ?? [];
	const latinCount = latinWords.join("").length;

	return latinWords.length >= 3 && latinCount > Math.max(12, cjkCount * 2);
}

function readableChineseText(value: string | null | undefined, fallback: string) {
	const text = value?.trim() ?? "";
	if (!text || isEnglishProse(text)) {
		return fallback;
	}

	return text;
}

export function buildBookComprehensionMap(result: BookAnalysisResult): BookComprehensionMap {
	const chapterFunctions = asArray(result.writingSupport?.chapterFunctionTable);
	const chronicle = asArray(result.chronicle);
	const promises = asArray(result.writingSupport?.readerPromiseChecklist);
	const foreshadowing = asArray(result.writingSupport?.foreshadowingLedger);
	const quality = result.writingSupport?.qualityDiagnosis;
	const headline = buildHeadline(result);
	const corePromise = readableChineseText(
		firstMeaningful(
			promises[0]?.promise,
			result.book.coreAppeal?.join(" + "),
			result.book.oneSentencePremise,
		),
		"核心读者承诺待重新提炼",
	);
	const whyItWorks = uniqueTextList([
		...(result.book.coreAppeal ?? []),
		...(quality?.strengths ?? []),
		...(result.transferableStyleCard?.pleasureMechanisms ?? []),
	])
		.map((item, index) => readableChineseText(item, `吸引力 ${index + 1} 待重新提炼`))
		.slice(0, 5);
	const readingPath = buildReadingPath(chapterFunctions, chronicle, result);
	const keyRelationships = buildKeyRelationships(result);
	const promiseMap = buildPromiseMap(promises, foreshadowing);
	const beginnerTakeaways = buildBeginnerTakeaways(result);
	const relationshipStoryline = buildRelationshipStoryline(keyRelationships);
	const mindMapBranches = buildMindMapBranches({
		corePromise,
		readingPath,
		keyRelationships,
		promiseMap,
		beginnerTakeaways,
	});

	return {
		headline,
		corePromise,
		whyItWorks,
		mindMapBranches,
		relationshipStoryline,
		readingPath,
		keyRelationships,
		promiseMap,
		beginnerTakeaways,
		applicationPrompt: buildApplicationPrompt({
			headline,
			corePromise,
			whyItWorks,
			mindMapBranches,
			relationshipStoryline,
			readingPath,
			keyRelationships,
			promiseMap,
			beginnerTakeaways,
		}),
	};
}

function buildApplicationPrompt(input: Omit<BookComprehensionMap, "applicationPrompt">) {
	const phases = input.readingPath
		.slice(0, 4)
		.map(
			(item, index) =>
				`${index + 1}. ${item.phase}：触发=${item.trigger}；压力=${item.escalation}；钩子=${item.openHook}`,
		)
		.join("\n");
	const relationships = input.keyRelationships
		.slice(0, 3)
		.map(
			(item, index) =>
				`${index + 1}. ${item.from} / ${item.to}：${item.storyFunction}；${item.learnableMove}`,
		)
		.join("\n");
	const promises = input.promiseMap
		.slice(0, 3)
		.map((item, index) => `${index + 1}. ${item.promise}：${item.payoffOrRisk}`)
		.join("\n");
	const takeaways = input.beginnerTakeaways
		.slice(0, 3)
		.map((item, index) => `${index + 1}. ${item.rule}`)
		.join("\n");

	return [
		"你是网文开局策划编辑。请基于下面的拆书理解结果，设计一个全新的原创网文开局方案，不要复用原作姓名、专有名词、人物关系网、事件顺序或标志桥段。",
		"",
		`核心读者承诺：${input.corePromise || input.headline}`,
		`这本书能留住读者的原因：${input.whyItWorks.join("、") || "待补"}`,
		"",
		"可学习的故事阶段：",
		phases || "暂无阶段数据，请先补清开局压力、主角目标和章末钩子。",
		"",
		"可学习的关键关系功能：",
		relationships || "暂无关系数据，请至少设计一条压迫/交易/误解/情感拉扯关系。",
		"",
		"需要保留的读者期待机制：",
		promises || "暂无伏笔或承诺数据，请设计一个前三章必须兑现的期待。",
		"",
		"写作规则：",
		takeaways || "先写清主角损失、反击机会和章末未完成问题。",
		"",
		"请输出：",
		"1. 新书一句话卖点。",
		"2. 主角压力、目标、代价和翻盘机会。",
		"3. 前三章阶段安排，每章必须有冲突升级和章末钩子。",
		"4. 3 条关键人物关系，以及每条关系制造的读者期待。",
		"5. 不要照搬清单，说明哪些元素必须换掉。",
	].join("\n");
}

function buildMindMapBranches(
	input: Pick<
		BookComprehensionMap,
		"corePromise" | "readingPath" | "keyRelationships" | "promiseMap" | "beginnerTakeaways"
	>,
) {
	const firstPhase = input.readingPath[0];
	const firstRelationship = input.keyRelationships[0];
	const firstPromise = input.promiseMap[0];
	const firstTakeaway = input.beginnerTakeaways[0];
	const pressureItems = input.readingPath
		.slice(0, 3)
		.map((phase) => `${phase.chapterRange}：${phase.escalation || phase.trigger}`);
	const relationshipItems = input.keyRelationships
		.slice(0, 3)
		.map(
			(relationship) =>
				`${relationship.from} / ${relationship.to}：${relationship.readerExpectation}`,
		);
	const escalationItems = input.readingPath
		.slice(0, 4)
		.map((phase) => `${phase.phase}：${phase.openHook}`);
	const promiseItems = input.promiseMap
		.slice(0, 3)
		.map((promise) => `${promise.promise}：${promise.payoffOrRisk}`);
	const takeawayItems = input.beginnerTakeaways
		.slice(0, 3)
		.map((takeaway) => `${takeaway.rule}：${takeaway.howToUse}`);

	return [
		{
			id: "protagonist-pressure",
			title: "主角压力",
			summary: firstPhase
				? `先看主角被什么逼着行动：${firstPhase.escalation || firstPhase.trigger}`
				: "先补清主角的损失、目标和必须行动的理由。",
			items: pressureItems.length ? pressureItems : [input.corePromise || "核心压力待补"],
		},
		{
			id: "relationship-hooks",
			title: "关系钩子",
			summary: firstRelationship
				? `最重要的关系功能：${firstRelationship.storyFunction}`
				: "先找出一条能制造压力、交易、误解或情绪拉扯的关系。",
			items: relationshipItems.length ? relationshipItems : ["关键关系变化待补"],
		},
		{
			id: "conflict-escalation",
			title: "冲突升级",
			summary: firstPhase
				? `读者顺着阶段钩子往下追：${firstPhase.openHook}`
				: "按章节整理触发、升级、转折和阶段兑现。",
			items: escalationItems.length ? escalationItems : ["阶段钩子待补"],
		},
		{
			id: "reader-promises",
			title: "伏笔期待",
			summary: firstPromise
				? `读者最先等着兑现：${firstPromise.promise}`
				: "把读者还在等待的承诺、秘密和问题列出来。",
			items: promiseItems.length ? promiseItems : ["读者期待待补"],
		},
		{
			id: "learnable-moves",
			title: "可学写法",
			summary: firstTakeaway
				? `作者先学这一招：${firstTakeaway.rule}`
				: "把能迁移的结构动作和不能照搬的表面元素分开。",
			items: takeawayItems.length ? takeawayItems : ["可学习写法待补"],
		},
	] satisfies BookMindMapBranch[];
}

function buildRelationshipStoryline(
	relationships: BookComprehensionRelationship[],
): BookRelationshipStoryBeat[] {
	return [...relationships]
		.sort((left, right) => {
			const chapterDelta =
				(left.firstSeenChapter || 999999) - (right.firstSeenChapter || 999999);
			return chapterDelta || left.id.localeCompare(right.id);
		})
		.slice(0, 6)
		.map((relationship, index) => ({
			id: `relationship-beat-${index + 1}`,
			chapterLabel: relationship.firstSeenChapter
				? `第 ${relationship.firstSeenChapter} 章`
				: "章节待补",
			title: `${relationship.from} / ${relationship.to}`,
			storyEvent: relationship.storyFunction,
			readerQuestion: relationship.readerExpectation,
			writingMove: relationship.learnableMove,
			evidence: relationship.evidence[0] || relationship.changeMoment,
		}));
}

function buildHeadline(result: BookAnalysisResult) {
	const appeal = result.book.coreAppeal?.slice(0, 2).join(" + ");
	if (appeal) {
		return `这本书主要靠「${appeal}」留住读者。`;
	}
	return result.book.oneSentencePremise || "这本书的核心吸引力仍需要继续补证据。";
}

function buildReadingPath(
	chapterFunctions: ChapterFunction[],
	chronicle: ChronicleEvent[],
	result: BookAnalysisResult,
) {
	if (!chapterFunctions.length && !chronicle.length) {
		return [] as BookComprehensionPhase[];
	}
	const source = chapterFunctions.length
		? chapterFunctions
		: chronicle.map((item) => ({
				chapterOrder: item.order,
				title: `事件 ${item.order}`,
				function: item.storyFunction,
				goal: item.event,
				conflict: item.impact,
				hook: item.storyFunction,
			}));
	const groupSize = source.length <= 4 ? 1 : Math.ceil(source.length / 4);
	const phases: BookComprehensionPhase[] = [];
	for (let index = 0; index < source.length; index += groupSize) {
		const group = source.slice(index, index + groupSize);
		const first = group[0];
		const last = group[group.length - 1];
		if (!first || !last) {
			continue;
		}
		const relatedChronicle = chronicle.find(
			(item) => item.order >= first.chapterOrder && item.order <= last.chapterOrder,
		);
		const chapterRange =
			first.chapterOrder === last.chapterOrder
				? `第 ${first.chapterOrder} 章`
				: `第 ${first.chapterOrder}-${last.chapterOrder} 章`;
		const conflict = readableChineseText(
			firstMeaningful(
				group.map((item) => item.conflict).find(Boolean),
				relatedChronicle?.impact,
				"压力来源还需要继续补证据",
			),
			"压力来源还需要重新中文化提炼",
		);
		const hook = readableChineseText(
			firstMeaningful(
				last.hook,
				relatedChronicle?.storyFunction,
				result.writingSupport?.continuationPack?.openThreads?.[0],
				"阶段末尾钩子仍待补充",
			),
			"阶段末尾钩子需要重新提炼",
		);
		phases.push({
			id: `phase-${phases.length + 1}`,
			phase: buildPhaseName(
				readableChineseText(first.function, `阶段 ${phases.length + 1}`),
				phases.length,
			),
			chapterRange,
			trigger: readableChineseText(
				firstMeaningful(first.goal, relatedChronicle?.event, "阶段触发点待补"),
				"阶段触发点需要重新提炼",
			),
			escalation: conflict,
			choiceOrTurn: readableChineseText(
				firstMeaningful(
					readableChineseText(
						group.find((item) =>
							/转|反击|选择|决定|揭|破|变/.test(item.function + item.goal),
						)?.goal,
						"",
					),
					relatedChronicle?.event,
					last.goal,
				),
				"阶段转折需要重新提炼",
			),
			payoff: readableChineseText(
				firstMeaningful(relatedChronicle?.storyFunction, last.function, "阶段兑现待补"),
				"阶段兑现需要重新提炼",
			),
			openHook: hook,
			readerReasonToContinue: buildReaderReason(hook, conflict),
			learnableMove: buildPhaseLearnableMove(first.function, conflict, hook),
		});
	}
	return phases.slice(0, 6);
}

function buildKeyRelationships(result: BookAnalysisResult) {
	const nodesById = new Map(
		asArray(result.relationships?.nodes)
			.filter((node) => node?.id)
			.map((node) => [node.id, node.label || node.id]),
	);
	return asArray(result.relationships?.edges)
		.filter((edge) => edge?.source || edge?.target)
		.sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0))
		.slice(0, 6)
		.map((edge, index) => {
			const source = edge.source || `来源 ${index + 1}`;
			const target = edge.target || `目标 ${index + 1}`;
			const from = nodesById.get(source) || source;
			const to = nodesById.get(target) || target;
			const relation = readableChineseText(
				edge.relation?.join("、") || edge.label || edge.tension,
				"关系功能待重新提炼",
			);
			const insight = buildRelationshipReadingInsight(edge, from, to);
			return {
				id: `relationship-${index + 1}`,
				from,
				to,
				state: relation,
				firstSeenChapter: edge.firstSeenChapter,
				storyFunction: insight.storyFunction,
				changeMoment: edge.firstSeenChapter
					? `第 ${edge.firstSeenChapter} 章开始进入故事`
					: "首次变化章节待补",
				readerExpectation: insight.readerExpectation,
				learnableMove: insight.learnableMove,
				evidence: uniqueTextList(edge.evidence ?? [])
					.map((item, evidenceIndex) =>
						readableChineseText(item, `关系证据 ${evidenceIndex + 1} 需要重新提炼`),
					)
					.slice(0, 3),
			};
		});
}

export function buildRelationshipReadingInsight(
	edge: RelationshipInsightEdge,
	from: string,
	to: string,
) {
	return {
		storyFunction: buildRelationshipFunction(edge),
		readerExpectation: buildRelationshipExpectation(edge, from, to),
		learnableMove: buildRelationshipLearnableMove(edge),
	};
}

function buildPromiseMap(
	promises: NonNullable<BookAnalysisResult["writingSupport"]>["readerPromiseChecklist"],
	foreshadowing: NonNullable<BookAnalysisResult["writingSupport"]>["foreshadowingLedger"],
) {
	const promiseItems = promises.map((item, index) => ({
		id: `promise-${index + 1}`,
		promise: readableChineseText(item.promise, `读者承诺 ${index + 1} 需要重新提炼`),
		setup: readableChineseText(item.evidence, "承诺证据待补"),
		progress: formatPromiseStatus(item.status),
		payoffOrRisk: readableChineseText(item.nextCheck, "后续检查点待补"),
	}));
	const foreshadowingItems = foreshadowing.map((item, index) => ({
		id: `foreshadowing-${index + 1}`,
		promise: readableChineseText(item.setup, `伏笔 ${index + 1} 需要重新提炼`),
		setup: `第 ${item.setupChapter} 章埋下`,
		progress: formatPromiseStatus(item.status),
		payoffOrRisk: readableChineseText(item.payoff || item.risk, "回收方式待补"),
	}));
	return [...promiseItems, ...foreshadowingItems].slice(0, 8);
}

function buildBeginnerTakeaways(result: BookAnalysisResult) {
	const plotlineRules = result.plotlines
		.filter((line) => line.reusablePattern)
		.slice(0, 2)
		.map((line, index) => ({
			id: `plotline-${index + 1}`,
			rule: line.reusablePattern,
			why: `${line.name} 通过「${line.type}」承接读者期待。`,
			howToUse: line.payoff
				? `写同类故事时，先设计阶段兑现：${line.payoff}`
				: "写同类故事时，先明确这一条线最后要兑现什么。",
			avoid: "不要照搬原作事件顺序、专有名词和标志场景。",
		}));
	const qualityRules = (result.writingSupport?.qualityDiagnosis?.strengths ?? [])
		.slice(0, 2)
		.map((strength, index) => ({
			id: `strength-${index + 1}`,
			rule: strength,
			why: "这是拆书结果里已经成立的结构强项。",
			howToUse: "写新书时，把它改写成自己的开局承诺、冲突或关系钩子。",
			avoid: "不要只学表面设定，要改人物目标、代价和关系功能。",
		}));
	const fallback = [
		{
			id: "fallback-promise",
			rule: "先学读者承诺，不要先学设定名词。",
			why: "设定只是材料，读者留下来通常是因为期待还没兑现。",
			howToUse: "写新书前先写清楚：读者下一章想看到什么被证明、揭开或改变。",
			avoid: "不要把拆书结果直接变成设定清单。",
		},
	];
	return [...plotlineRules, ...qualityRules, ...fallback].slice(0, 4);
}

function buildPhaseName(functionLabel: string, index: number) {
	const fallback = ["开局承诺", "压力升级", "关系转折", "阶段兑现"];
	if (!functionLabel) {
		return fallback[index] || `阶段 ${index + 1}`;
	}
	if (/铺|开局|立|引/.test(functionLabel)) {
		return "开局承诺";
	}
	if (/冲突|升级|压力|危机/.test(functionLabel)) {
		return "压力升级";
	}
	if (/反击|释放|爽|兑现|打脸/.test(functionLabel)) {
		return "阶段兑现";
	}
	if (/关系|情感|误会|交易/.test(functionLabel)) {
		return "关系转折";
	}
	return functionLabel;
}

function buildReaderReason(hook: string, conflict: string) {
	if (hook && hook !== "阶段末尾钩子仍待补充") {
		return `读者会想看「${hook}」接下来怎么兑现。`;
	}
	if (conflict && conflict !== "压力来源还需要继续补证据") {
		return `读者会想看主角如何处理「${conflict}」。`;
	}
	return "这一阶段的追读理由还需要补更明确的钩子。";
}

function buildPhaseLearnableMove(functionLabel: string, conflict: string, hook: string) {
	if (/铺|开局|立|引/.test(functionLabel)) {
		return "开局不要只交代设定，要同时给主角压力、目标和未完成期待。";
	}
	if (/反击|释放|爽|兑现|打脸/.test(functionLabel)) {
		return "爽点兑现后要立刻留下新问题，否则读者容易在阶段结束时离开。";
	}
	if (hook && hook !== "阶段末尾钩子仍待补充") {
		return "每个阶段末尾都要留下一个读者能复述的下一步问题。";
	}
	if (conflict) {
		return "把冲突写成必须行动的压力，不要只写背景矛盾。";
	}
	return "这一阶段需要补清楚目标、压力和钩子。";
}

function buildRelationshipFunction(edge: RelationshipInsightEdge) {
	const text = `${edge.label} ${edge.tension} ${(edge.relation ?? []).join(" ")}`;
	if (/敌|压|仇|威胁|对抗|剥夺|打压/.test(text)) {
		return "制造压力，让主角必须行动或反击。";
	}
	if (/师|导师|教|传承|保护|引导/.test(text)) {
		return "提供门槛和帮助，但不能替主角免费解决问题。";
	}
	if (/交易|利用|试探|信息/.test(text)) {
		return "制造利益交换，让读者期待双方什么时候互相信任或翻脸。";
	}
	if (/暧昧|爱|婚|亲密|羁绊/.test(text)) {
		return "制造关系拉扯，让情绪期待跟随剧情推进。";
	}
	return "推动人物互动，帮助读者理解阵营、压力和选择。";
}

function buildRelationshipExpectation(edge: RelationshipInsightEdge, from: string, to: string) {
	const text = `${edge.label} ${edge.tension}`;
	if (/敌|压|仇|威胁|对抗|剥夺|打压/.test(text)) {
		return `读者会期待 ${from} 如何摆脱或反击 ${to}。`;
	}
	if (/交易|利用|试探/.test(text)) {
		return `读者会期待 ${from} 和 ${to} 的合作会不会变成背叛。`;
	}
	if (/暧昧|爱|婚|亲密|羁绊/.test(text)) {
		return `读者会期待 ${from} 和 ${to} 的关系何时推进或破裂。`;
	}
	return `读者会期待 ${from} 和 ${to} 的关系下一步怎么变化。`;
}

function buildRelationshipLearnableMove(edge: RelationshipInsightEdge) {
	const text = `${edge.label} ${edge.tension} ${(edge.relation ?? []).join(" ")}`;
	if (/敌|压|仇|威胁|对抗|剥夺|打压/.test(text)) {
		return "压迫关系要绑定具体损失和反击机会，不能只写谁讨厌谁。";
	}
	if (/师|导师|教|传承|保护|引导/.test(text)) {
		return "导师关系要先设门槛，再给有限帮助，避免直接送答案。";
	}
	if (/交易|利用|试探|信息/.test(text)) {
		return "交易关系要写清双方各自想要什么，以及不信任会带来什么风险。";
	}
	if (/暧昧|爱|婚|亲密|羁绊/.test(text)) {
		return "情感关系要让误解、选择和代价推动，而不是只靠标签。";
	}
	return "关系卡要写清故事功能：它提供压力、资源、误解、诱惑还是阻碍。";
}

function formatPromiseStatus(status: string) {
	const value = status.toLowerCase();
	if (value.includes("delivered") || value.includes("paid")) {
		return "已兑现";
	}
	if (value.includes("partial")) {
		return "部分推进";
	}
	if (value.includes("broken")) {
		return "有断裂风险";
	}
	return "待兑现";
}

function firstMeaningful(...values: Array<string | undefined>) {
	return values.find((value) => value?.trim())?.trim() || "";
}

function uniqueTextList(values: Array<string | undefined>) {
	const seen = new Set<string>();
	const result: string[] = [];
	values.forEach((value) => {
		const text = value?.trim();
		if (!text || seen.has(text)) {
			return;
		}
		seen.add(text);
		result.push(text);
	});
	return result;
}
