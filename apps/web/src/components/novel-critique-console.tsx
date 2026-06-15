"use client";

import {
	BookOpenCheck,
	CheckCircle2,
	FileText,
	KeyRound,
	Loader2,
	Network,
	ScanText,
	Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProviderKind = "mock" | "openai-compatible";

interface ProviderForm {
	kind: ProviderKind;
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	jsonMode: boolean;
}

interface ApiEnvelope<T> {
	code: number;
	message: string;
	data: T;
}

interface RubricMetric {
	id: string;
	name: string;
	description: string;
	scale: {
		low: string;
		medium: string;
		high: string;
	};
	referencePrincipleId?: string;
}

interface RubricResult {
	mode: string;
	reference: {
		title: string;
		genre: string;
		platform: string;
		audience: string;
		readingMode: string;
		oneSentenceSummary: string;
	};
	styleProfile?: {
		platform: string;
		audience: string;
		readingMode: string;
		pace: string;
		emotion: string;
		hookDensity: string;
		language: string;
		setupTolerance: string;
	};
	marketProfile?: {
		category: string;
		theme: string;
		tags: string[];
		explicitKeywords: string[];
		implicitExpectations: string[];
		positioningPromise: string;
		readerExpectationModel: string[];
	};
	principles: Array<{
		id: string;
		title: string;
		sourceObservation: string;
		reusableRule: string;
		migrationQuestion: string;
	}>;
	rubric: {
		id: string;
		genre: string;
		platform?: string;
		audience?: string;
		readingMode?: string;
		styleProfile?: Record<string, string>;
		category?: string;
		theme?: string;
		marketProfile?: Record<string, unknown>;
		metrics: RubricMetric[];
	};
	editorNote: string;
}

interface ScoreResult {
	mode: string;
	chapterTitle: string;
	totalScore: number;
	scores: Array<{
		metricId: string;
		name: string;
		score: number;
		reason: string;
		evidence: string;
		fix: string;
		referencePrincipleId?: string;
	}>;
	strongestPoint: string;
	weakestPoint: string;
	styleFit?: {
		score: number;
		platformRisk: string;
		audienceRisk: string;
		readingModeRisk: string;
	};
	marketFit?: {
		score: number;
		categoryRisk: string;
		themeRisk: string;
		keywordRisk: string;
		frontloadRisk: string;
	};
	performanceFit?: {
		hasData: boolean;
		funnelSummary: string;
		impressionDiagnosis: string;
		clickDiagnosis: string;
		read30sDiagnosis: string;
		read60sDiagnosis: string;
		bottomDiagnosis: string;
		followDiagnosis: string;
		priority: string;
	};
	nextRevisionMove: string;
	rewriteBrief?: {
		target: string;
		strategy: string;
	};
	revisionPrompt?: {
		title: string;
		prompt: string;
	};
}

interface BookAnalysisResult {
	mode: string;
	book: {
		title: string;
		genre: string;
		chapterCountEstimate: number;
		oneSentencePremise: string;
		coreAppeal: string[];
	};
	worldbuilding: {
		worldRules: string[];
		powerSystem: string[];
		locations: Array<{ name: string; function: string; originalizationNote: string }>;
		factions: Array<{
			name: string;
			goal: string;
			conflictRole: string;
			originalizationNote: string;
		}>;
		itemsAndTerms: Array<{ name: string; function: string; risk: string }>;
	};
	characters: Array<{
		sourceName: string;
		role: string;
		archetype: string;
		personalityCore: string[];
		desire: string;
		fearOrWound: string;
		capability: string;
		relationshipFunction: string;
		originalCharacterCard: {
			namePlaceholder: string;
			summary: string;
			personality: string;
			scenario: string;
			firstMessage: string;
			doNotCopy: string[];
		};
	}>;
	relationships: {
		nodes: Array<{ id: string; label: string; type: string }>;
		edges: Array<{ source: string; target: string; label: string; tension: string }>;
	};
	plotlines: Array<{
		name: string;
		type: string;
		start: string;
		turningPoints: string[];
		payoff: string;
		reusablePattern: string;
	}>;
	chronicle: Array<{
		order: number;
		event: string;
		impact: string;
		storyFunction: string;
	}>;
	historyBook: {
		ancientHistory: string[];
		recentHistory: string[];
		publicMyths: string[];
		hiddenTruths: string[];
	};
	sourceAssetArchive?: {
		usageNotice: string;
		sourceCharacterNotes: Array<{
			name: string;
			role: string;
			recognizableTraits: string[];
			relationshipNotes: string[];
			plotFunction: string;
		}>;
		sourceWorldNotes: string[];
		sourceTimelineNotes: string[];
		sourceRelationshipNotes: string[];
		sourceTermNotes: string[];
	};
	exportPackage: {
		tavernCharacterCards: Array<{
			name: string;
			description: string;
			personality: string;
			scenario: string;
			first_mes: string;
			creator_notes: string;
		}>;
		worldBookEntries: Array<{
			keys: string[];
			content: string;
			insertion_order: number;
		}>;
		writingConstraints: string[];
		doNotCopyList: string[];
	};
	originalizationReport: {
		riskLevel: string;
		safeToLearn: string[];
		mustTransform: string[];
		fanFictionWarning: string;
		rewriteStrategy: string[];
	};
	usageRiskNotice?: {
		summary: string;
		recommendedUse: string[];
		higherRiskUse: string[];
		userResponsibility: string;
	};
}

const apiBaseUrl =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

const defaultReferenceText =
	"少年站在家族演武场中央，长老当众宣布取消他的试炼资格。围观的人群低声讥笑，未婚妻也转身站到他的对手身边。少年没有辩解，只是盯着石碑上即将熄灭的名字。他知道，一旦名字彻底暗下去，母亲留下的药田也会被收回。就在长老准备落印时，石碑深处忽然亮起第二道从未出现过的金纹。";

const defaultUserText =
	"主角进入考场，发现大家都看不起他。他想证明自己，于是准备参加测试。考官宣布规则后，主角走到队伍最后，等待自己的名字被叫到。就在这时，他看见考官腰间挂着三年前害死师父的玉牌，意识到这场测试背后还有更大的阴谋。";

const defaultBookText = `${defaultReferenceText}

第二章 旧案信物
主角回到住处后，发现那枚玉牌与师父留下的残图纹路一致。他没有立刻声张，而是查阅旧卷，确认三年前的事故并非意外。与此同时，评审机构内部有人开始追查他的身份。

第三章 初次反击
第二轮测试中，主角被安排到最差的位置。对手以为他毫无还手之力，却没想到他用一枚普通银针改变了局势。围观者第一次意识到，这个被取消资格的人并不简单。

第四章 暗线浮出
考核结束后，主角没有接受旁人的道歉。他把玉牌、残图和考场名单放在一起，发现所有线索都指向同一个失踪多年的评审长。夜里，有人潜入他的住处，想要取走残图。主角故意放走对方，只在对方衣角留下银针记号。

第五章 更大危机
第二天，主角收到一封匿名信。信里没有解释旧案，只写着一句话：如果你继续查下去，三年前没死的人都会死。主角这才明白，自己面对的不是一次考核不公，而是一张隐藏在整个城市背后的关系网。`;

function parseList(value: string): string[] {
	return value
		.split(/[,，\n]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseOptionalNumber(value: string): number | undefined {
	if (!value.trim()) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const payload = (await response.json()) as ApiEnvelope<T>;
	if (!response.ok || payload.code !== 0) {
		throw new Error(payload.message || `Request failed: ${response.status}`);
	}

	return payload.data;
}

export function NovelCritiqueConsole() {
	const [provider, setProvider] = useState<ProviderForm>({
		kind: "mock",
		baseUrl: "https://api.deepseek.com/v1",
		apiKey: "",
		model: "deepseek-chat",
		temperature: 0.2,
		jsonMode: false,
	});
	const [referenceTitle, setReferenceTitle] = useState("第一章 少年被逐");
	const [genre, setGenre] = useState("xuanhuan");
	const [platform, setPlatform] = useState("fanqie");
	const [audience, setAudience] = useState("male-fast-paced");
	const [readingMode, setReadingMode] = useState("mobile-fragmented");
	const [category, setCategory] = useState("都市神医");
	const [theme, setTheme] = useState("逆袭打脸");
	const [tags, setTags] = useState("神医，退婚，豪门，隐藏身份");
	const [explicitKeywords, setExplicitKeywords] = useState("退婚，银针，豪门千金");
	const [implicitExpectations, setImplicitExpectations] = useState(
		"被低估，公开羞辱，医术反转，身份揭露",
	);
	const [positioningPromise, setPositioningPromise] = useState(
		"退婚当天，我用九根银针救下豪门千金",
	);
	const [impressions, setImpressions] = useState("12000");
	const [clickThroughRate, setClickThroughRate] = useState("7.5");
	const [read30sRate, setRead30sRate] = useState("58");
	const [read60sRate, setRead60sRate] = useState("31");
	const [bottomRate, setBottomRate] = useState("42");
	const [followRate, setFollowRate] = useState("12");
	const [referenceText, setReferenceText] = useState(defaultReferenceText);
	const [chapterTitle, setChapterTitle] = useState("第一章 考场重逢");
	const [chapterText, setChapterText] = useState(defaultUserText);
	const [bookTitle, setBookTitle] = useState("示例长篇小说");
	const [bookGenre, setBookGenre] = useState("xuanhuan");
	const [bookText, setBookText] = useState(defaultBookText);
	const [rubricResult, setRubricResult] = useState<RubricResult | null>(null);
	const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
	const [bookAnalysisResult, setBookAnalysisResult] =
		useState<BookAnalysisResult | null>(null);
	const [status, setStatus] = useState<string>("mock 模式可直接验证流程");
	const [loading, setLoading] = useState<
		"provider" | "rubric" | "score" | "book" | null
	>(null);

	const providerPayload = useMemo(
		() => ({
			kind: provider.kind,
			baseUrl: provider.baseUrl,
			apiKey: provider.apiKey,
			model: provider.model,
			temperature: provider.temperature,
			jsonMode: provider.jsonMode,
		}),
		[provider],
	);

	async function testProvider() {
		setLoading("provider");
		setStatus("正在测试 Provider...");
		try {
			const result = await postJson<Record<string, unknown>>("/analysis/provider/test", {
				provider: providerPayload,
			});
			setStatus(`Provider 可用：${JSON.stringify(result)}`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function buildRubric() {
		setLoading("rubric");
		setScoreResult(null);
		setStatus("正在拆解参考章节并生成 Rubric...");
		try {
			const result = await postJson<RubricResult>("/analysis/rubric", {
				provider: providerPayload,
				referenceTitle,
				genre,
				platform,
				audience,
				readingMode,
				category,
				theme,
				tags: parseList(tags),
				explicitKeywords: parseList(explicitKeywords),
				implicitExpectations: parseList(implicitExpectations),
				positioningPromise,
				referenceText,
			});
			setRubricResult(result);
			setStatus(`Rubric 已生成：${result.rubric.metrics.length} 个指标`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function scoreChapter() {
		if (!rubricResult) {
			setStatus("请先生成 Rubric。");
			return;
		}

		setLoading("score");
		setStatus("正在按 Rubric 质检你的章节...");
		try {
			const result = await postJson<ScoreResult>("/analysis/score", {
				provider: providerPayload,
				rubric: rubricResult.rubric,
				platform,
				audience,
				readingMode,
				category,
				theme,
				tags: parseList(tags),
				explicitKeywords: parseList(explicitKeywords),
				implicitExpectations: parseList(implicitExpectations),
				positioningPromise,
				chapterTitle,
				chapterText,
				performanceSnapshot: {
					impressions: parseOptionalNumber(impressions),
					clickThroughRate: parseOptionalNumber(clickThroughRate),
					read30sRate: parseOptionalNumber(read30sRate),
					read60sRate: parseOptionalNumber(read60sRate),
					bottomRate: parseOptionalNumber(bottomRate),
					followRate: parseOptionalNumber(followRate),
				},
			});
			setScoreResult(result);
			setStatus(`评分完成：${result.totalScore}/10`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function analyzeBook() {
		setLoading("book");
		setStatus("正在拆解整本小说资产...");
		try {
			const result = await postJson<BookAnalysisResult>("/analysis/book", {
				provider: providerPayload,
				title: bookTitle,
				genre: bookGenre,
				text: bookText,
			});
			setBookAnalysisResult(result);
			setStatus(`整书拆解完成：${result.characters.length} 张角色卡`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function readBookFile(file: File | undefined) {
		if (!file) {
			return;
		}

		const text = await file.text();
		setBookTitle(file.name.replace(/\.[^.]+$/, ""));
		setBookText(text);
	}

	return (
		<div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
			<aside className="border-border lg:min-h-[calc(100vh-48px)] lg:border-r lg:pr-6">
				<div className="flex items-center gap-3 py-2">
					<div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<ScanText className="size-5" />
					</div>
					<div>
						<p className="text-sm font-semibold">新手AI小说第一步</p>
						<p className="text-xs text-muted-foreground">AI网文点评官</p>
					</div>
				</div>

				<nav className="mt-8 space-y-1 text-sm">
					<div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 font-medium">
						<KeyRound className="size-4" />
						模型配置
					</div>
					<div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
						<BookOpenCheck className="size-4" />
						拆书生成 Rubric
					</div>
					<div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
						<FileText className="size-4" />
						章节评分
					</div>
					<div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
						<Network className="size-4" />
						整书拆解
					</div>
				</nav>

				<div className="mt-8 rounded-md border border-border bg-card p-4 text-sm">
					<p className="font-medium">状态</p>
					<p className="mt-2 text-muted-foreground">{status}</p>
				</div>
			</aside>

			<section className="space-y-6">
				<header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-sm text-muted-foreground">
							本地部署 · 用户自带 Key · 平台风格质检
						</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
							拆爆款优点，再质检自己的章节
						</h1>
					</div>
					<div className="rounded-md border border-border px-4 py-3 text-sm">
						<p className="font-semibold">
							{scoreResult ? `${scoreResult.totalScore}/10` : "未评分"}
						</p>
						<p className="text-xs text-muted-foreground">综合追读潜力</p>
					</div>
				</header>

				<section className="rounded-md border border-border bg-card p-5">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<KeyRound className="size-5 text-primary" />
							<h2 className="text-lg font-semibold">1. 模型配置</h2>
						</div>
						<Button onClick={testProvider} disabled={loading !== null}>
							{loading === "provider" ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							测试连接
						</Button>
					</div>

					<div className="mt-5 grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label>Provider</Label>
							<select
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={provider.kind}
								onChange={(event) =>
									setProvider((current) => ({
										...current,
										kind: event.target.value as ProviderKind,
									}))
								}
							>
								<option value="mock">mock</option>
								<option value="openai-compatible">openai-compatible</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label>Model</Label>
							<Input
								value={provider.model}
								onChange={(event) =>
									setProvider((current) => ({
										...current,
										model: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Base URL</Label>
							<Input
								value={provider.baseUrl}
								onChange={(event) =>
									setProvider((current) => ({
										...current,
										baseUrl: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>API Key</Label>
							<Input
								type="password"
								value={provider.apiKey}
								onChange={(event) =>
									setProvider((current) => ({
										...current,
										apiKey: event.target.value,
									}))
								}
								placeholder="mock 模式可留空"
							/>
						</div>
					</div>
				</section>

				<section className="rounded-md border border-border bg-card p-5">
					<div className="flex items-center gap-2">
						<Sparkles className="size-5 text-primary" />
						<h2 className="text-lg font-semibold">2. 平台风格画像</h2>
					</div>
					<div className="mt-5 grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label>目标平台</Label>
							<select
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={platform}
								onChange={(event) => setPlatform(event.target.value)}
							>
								<option value="qidian">起点</option>
								<option value="fanqie">番茄</option>
								<option value="jinjiang">晋江</option>
								<option value="qimao">七猫</option>
								<option value="wechat-short">微信短篇/小程序文</option>
								<option value="other">其他</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label>目标读者</Label>
							<select
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={audience}
								onChange={(event) => setAudience(event.target.value)}
							>
								<option value="male-fast-paced">男频快节奏爽文</option>
								<option value="female-emotional">女频情绪流</option>
								<option value="setting-heavy">设定党/世界观</option>
								<option value="light-reader">快节奏小白文</option>
								<option value="suspense-brainstorm">悬疑脑洞</option>
								<option value="other">其他</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label>阅读场景</Label>
							<select
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={readingMode}
								onChange={(event) => setReadingMode(event.target.value)}
							>
								<option value="long-serialization">长篇追更</option>
								<option value="mobile-fragmented">移动端碎片阅读</option>
								<option value="short-paid">短篇付费</option>
								<option value="other">其他</option>
							</select>
						</div>
					</div>
				</section>

				<section className="rounded-md border border-border bg-card p-5">
					<div className="flex items-center gap-2">
						<Sparkles className="size-5 text-primary" />
						<h2 className="text-lg font-semibold">3. 市场定位画像</h2>
					</div>
					<div className="mt-5 grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label>细分分类</Label>
							<Input
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								placeholder="都市神医 / 追妻火葬场 / 赘婿逆袭"
							/>
						</div>
						<div className="space-y-2">
							<Label>主题承诺</Label>
							<Input
								value={theme}
								onChange={(event) => setTheme(event.target.value)}
								placeholder="逆袭打脸 / 救赎 / 破镜重圆"
							/>
						</div>
						<div className="space-y-2">
							<Label>标签</Label>
							<Input
								value={tags}
								onChange={(event) => setTags(event.target.value)}
								placeholder="用逗号分隔"
							/>
						</div>
						<div className="space-y-2">
							<Label>显性关键词</Label>
							<Input
								value={explicitKeywords}
								onChange={(event) => setExplicitKeywords(event.target.value)}
								placeholder="标题/简介/正文可出现的词"
							/>
						</div>
						<div className="space-y-2">
							<Label>隐性期待</Label>
							<Input
								value={implicitExpectations}
								onChange={(event) => setImplicitExpectations(event.target.value)}
								placeholder="被低估 / 反转 / 后悔 / 关系破裂"
							/>
						</div>
						<div className="space-y-2">
							<Label>标题/简介承诺</Label>
							<Input
								value={positioningPromise}
								onChange={(event) => setPositioningPromise(event.target.value)}
								placeholder="用于检查正文是否兑现点击承诺"
							/>
						</div>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-2">
					<div className="rounded-md border border-border bg-card p-5">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<BookOpenCheck className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">4. 拆成熟章节</h2>
							</div>
							<Button onClick={buildRubric} disabled={loading !== null}>
								{loading === "rubric" ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								生成 Rubric
							</Button>
						</div>

						<div className="mt-5 grid gap-4">
							<div className="grid gap-4 md:grid-cols-[1fr_160px]">
								<div className="space-y-2">
									<Label>参考章节标题</Label>
									<Input
										value={referenceTitle}
										onChange={(event) => setReferenceTitle(event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>题材</Label>
									<select
										className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
										value={genre}
										onChange={(event) => setGenre(event.target.value)}
									>
										<option value="xuanhuan">玄幻</option>
										<option value="urban">都市</option>
										<option value="romance">言情</option>
										<option value="suspense">悬疑</option>
										<option value="infinite-flow">无限流</option>
										<option value="other">其他</option>
									</select>
								</div>
							</div>
							<textarea
								className="min-h-48 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6"
								value={referenceText}
								onChange={(event) => setReferenceText(event.target.value)}
							/>
						</div>
					</div>

					<div className="rounded-md border border-border bg-card p-5">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<FileText className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">5. 质检我的章节</h2>
							</div>
							<Button
								onClick={scoreChapter}
								disabled={loading !== null || !rubricResult}
							>
								{loading === "score" ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								开始评分
							</Button>
						</div>

						<div className="mt-5 grid gap-4">
							<div className="space-y-2">
								<Label>我的章节标题</Label>
								<Input
									value={chapterTitle}
									onChange={(event) => setChapterTitle(event.target.value)}
								/>
							</div>
							<textarea
								className="min-h-48 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6"
								value={chapterText}
								onChange={(event) => setChapterText(event.target.value)}
							/>
						</div>
					</div>
				</section>

				<section className="rounded-md border border-border bg-card p-5">
					<div className="flex items-center gap-2">
						<Sparkles className="size-5 text-primary" />
						<h2 className="text-lg font-semibold">6. 数据表现快照</h2>
					</div>
					<div className="mt-5 grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label>展现量</Label>
							<Input
								inputMode="numeric"
								value={impressions}
								onChange={(event) => setImpressions(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>点击率 %</Label>
							<Input
								inputMode="decimal"
								value={clickThroughRate}
								onChange={(event) => setClickThroughRate(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>阅读30s %</Label>
							<Input
								inputMode="decimal"
								value={read30sRate}
								onChange={(event) => setRead30sRate(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>阅读60s %</Label>
							<Input
								inputMode="decimal"
								value={read60sRate}
								onChange={(event) => setRead60sRate(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>触底率 %</Label>
							<Input
								inputMode="decimal"
								value={bottomRate}
								onChange={(event) => setBottomRate(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>追更率 %</Label>
							<Input
								inputMode="decimal"
								value={followRate}
								onChange={(event) => setFollowRate(event.target.value)}
							/>
						</div>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-2">
					<RubricPanel rubricResult={rubricResult} />
					<ScorePanel scoreResult={scoreResult} />
				</section>

				<section className="rounded-md border border-border bg-card p-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<Network className="size-5 text-primary" />
							<h2 className="text-lg font-semibold">7. 整书 TXT 拆解</h2>
						</div>
						<Button onClick={analyzeBook} disabled={loading !== null}>
							{loading === "book" ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							拆解整书
						</Button>
					</div>
					<div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
						<div className="space-y-2">
							<Label>书名</Label>
							<Input
								value={bookTitle}
								onChange={(event) => setBookTitle(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>题材</Label>
							<select
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={bookGenre}
								onChange={(event) => setBookGenre(event.target.value)}
							>
								<option value="xuanhuan">玄幻</option>
								<option value="urban">都市</option>
								<option value="romance">言情</option>
								<option value="suspense">悬疑</option>
								<option value="infinite-flow">无限流</option>
								<option value="other">其他</option>
							</select>
						</div>
					</div>
					<div className="mt-4 space-y-2">
						<Label>上传 TXT</Label>
						<Input
							type="file"
							accept=".txt,text/plain"
							onChange={(event) => readBookFile(event.target.files?.[0])}
						/>
					</div>
					<textarea
						className="mt-4 min-h-56 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6"
						value={bookText}
						onChange={(event) => setBookText(event.target.value)}
					/>
				</section>

				<BookAnalysisPanel result={bookAnalysisResult} />
			</section>
		</div>
	);
}

function RubricPanel({ rubricResult }: { rubricResult: RubricResult | null }) {
	return (
		<div className="rounded-md border border-border bg-card p-5">
			<div className="flex items-center gap-2">
				<Sparkles className="size-5 text-primary" />
				<h2 className="text-lg font-semibold">Rubric 结果</h2>
			</div>
			{rubricResult ? (
				<div className="mt-5 space-y-5">
					<p className="text-sm text-muted-foreground">
						{rubricResult.reference.oneSentenceSummary}
					</p>
					{rubricResult.styleProfile ? (
						<div className="grid gap-2 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
							<p>
								<span className="text-muted-foreground">平台：</span>
								{rubricResult.styleProfile.platform}
							</p>
							<p>
								<span className="text-muted-foreground">读者：</span>
								{rubricResult.styleProfile.audience}
							</p>
							<p>
								<span className="text-muted-foreground">节奏：</span>
								{rubricResult.styleProfile.pace}
							</p>
							<p>
								<span className="text-muted-foreground">钩子密度：</span>
								{rubricResult.styleProfile.hookDensity}
							</p>
						</div>
					) : null}
					{rubricResult.marketProfile ? (
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<div className="grid gap-2 sm:grid-cols-2">
								<p>
									<span className="text-muted-foreground">分类：</span>
									{rubricResult.marketProfile.category}
								</p>
								<p>
									<span className="text-muted-foreground">主题：</span>
									{rubricResult.marketProfile.theme}
								</p>
								<p>
									<span className="text-muted-foreground">标签：</span>
									{rubricResult.marketProfile.tags.join("、") || "无"}
								</p>
								<p>
									<span className="text-muted-foreground">关键词：</span>
									{rubricResult.marketProfile.explicitKeywords.join("、") ||
										"无"}
								</p>
							</div>
							<div className="mt-3 border-t border-border pt-3">
								<p className="font-medium">读者期待模型</p>
								<ul className="mt-2 space-y-1 text-muted-foreground">
									{rubricResult.marketProfile.readerExpectationModel.map(
										(item) => (
											<li key={item}>{item}</li>
										),
									)}
								</ul>
							</div>
						</div>
					) : null}
					<div className="space-y-3">
						{rubricResult.principles.map((principle) => (
							<div
								key={principle.id}
								className="rounded-md border border-border bg-background p-4"
							>
								<h3 className="font-semibold">{principle.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									{principle.reusableRule}
								</p>
								<p className="mt-2 text-sm">{principle.migrationQuestion}</p>
							</div>
						))}
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						{rubricResult.rubric.metrics.map((metric) => (
							<div
								key={metric.id}
								className="rounded-md border border-border bg-background px-3 py-2"
							>
								<p className="text-sm font-medium">{metric.name}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{metric.description}
								</p>
							</div>
						))}
					</div>
				</div>
			) : (
				<p className="mt-5 text-sm text-muted-foreground">
					生成 Rubric 后，这里会展示可迁移原则和评分指标。
				</p>
			)}
		</div>
	);
}

function ScorePanel({ scoreResult }: { scoreResult: ScoreResult | null }) {
	return (
		<div className="rounded-md border border-border bg-card p-5">
			<div className="flex items-center gap-2">
				<CheckCircle2 className="size-5 text-primary" />
				<h2 className="text-lg font-semibold">评分报告</h2>
			</div>
			{scoreResult ? (
				<div className="mt-5 space-y-5">
					<div className="rounded-md border border-border bg-background p-4">
						<p className="text-3xl font-semibold">{scoreResult.totalScore}/10</p>
						<p className="mt-2 text-sm text-muted-foreground">
							{scoreResult.nextRevisionMove}
						</p>
					</div>
					{scoreResult.styleFit ? (
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<div className="flex items-center justify-between gap-3">
								<p className="font-semibold">平台风格匹配</p>
								<span>{scoreResult.styleFit.score}/10</span>
							</div>
							<p className="mt-2 text-muted-foreground">
								平台风险：{scoreResult.styleFit.platformRisk}
							</p>
							<p className="mt-1 text-muted-foreground">
								读者风险：{scoreResult.styleFit.audienceRisk}
							</p>
							<p className="mt-1 text-muted-foreground">
								场景风险：{scoreResult.styleFit.readingModeRisk}
							</p>
						</div>
					) : null}
					{scoreResult.marketFit ? (
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<div className="flex items-center justify-between gap-3">
								<p className="font-semibold">市场定位匹配</p>
								<span>{scoreResult.marketFit.score}/10</span>
							</div>
							<p className="mt-2 text-muted-foreground">
								分类风险：{scoreResult.marketFit.categoryRisk}
							</p>
							<p className="mt-1 text-muted-foreground">
								主题风险：{scoreResult.marketFit.themeRisk}
							</p>
							<p className="mt-1 text-muted-foreground">
								关键词风险：{scoreResult.marketFit.keywordRisk}
							</p>
							<p className="mt-1 text-muted-foreground">
								前置风险：{scoreResult.marketFit.frontloadRisk}
							</p>
						</div>
					) : null}
					{scoreResult.performanceFit ? (
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<div className="flex items-center justify-between gap-3">
								<p className="font-semibold">数据漏斗归因</p>
								<span>{scoreResult.performanceFit.hasData ? "已提供" : "无数据"}</span>
							</div>
							<p className="mt-2 text-muted-foreground">
								{scoreResult.performanceFit.funnelSummary}
							</p>
							<div className="mt-3 space-y-1 text-muted-foreground">
								<p>展现：{scoreResult.performanceFit.impressionDiagnosis}</p>
								<p>点击：{scoreResult.performanceFit.clickDiagnosis}</p>
								<p>30s：{scoreResult.performanceFit.read30sDiagnosis}</p>
								<p>60s：{scoreResult.performanceFit.read60sDiagnosis}</p>
								<p>触底：{scoreResult.performanceFit.bottomDiagnosis}</p>
								<p>追更：{scoreResult.performanceFit.followDiagnosis}</p>
							</div>
							<p className="mt-3 font-medium">
								优先级：{scoreResult.performanceFit.priority}
							</p>
						</div>
					) : null}
					{scoreResult.revisionPrompt ? (
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<p className="font-semibold">{scoreResult.revisionPrompt.title}</p>
							<pre className="mt-3 max-h-96 overflow-auto rounded-md border border-border bg-card p-3 text-xs leading-5 whitespace-pre-wrap">
								{scoreResult.revisionPrompt.prompt}
							</pre>
						</div>
					) : null}
					<div className="space-y-3">
						{scoreResult.scores.map((score) => (
							<div
								key={score.metricId}
								className="rounded-md border border-border bg-background p-4"
							>
								<div className="flex items-center justify-between gap-3">
									<h3 className="font-semibold">{score.name}</h3>
									<span className="text-sm font-medium">{score.score}/10</span>
								</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{score.reason}
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									证据：{score.evidence}
								</p>
								<p className="mt-2 text-sm">改法：{score.fix}</p>
							</div>
						))}
					</div>
				</div>
			) : (
				<p className="mt-5 text-sm text-muted-foreground">
					评分完成后，这里会显示各指标分数、证据和修改建议。
				</p>
			)}
		</div>
	);
}

function BookAnalysisPanel({ result }: { result: BookAnalysisResult | null }) {
	if (!result) {
		return (
			<section className="rounded-md border border-border bg-card p-5">
				<div className="flex items-center gap-2">
					<Network className="size-5 text-primary" />
					<h2 className="text-lg font-semibold">整书拆解结果</h2>
				</div>
				<p className="mt-5 text-sm text-muted-foreground">
					拆解完成后，这里会展示世界观、人物卡、关系图谱、大事纪、世界书导出和原创化风险。
				</p>
			</section>
		);
	}

	return (
		<section className="space-y-6">
			<div className="rounded-md border border-border bg-card p-5">
				<div className="flex items-center gap-2">
					<Network className="size-5 text-primary" />
					<h2 className="text-lg font-semibold">整书拆解结果</h2>
				</div>
				<div className="mt-5 grid gap-4 md:grid-cols-3">
					<div className="rounded-md border border-border bg-background p-4">
						<p className="text-sm text-muted-foreground">一句话设定</p>
						<p className="mt-2 text-sm">{result.book.oneSentencePremise}</p>
					</div>
					<div className="rounded-md border border-border bg-background p-4">
						<p className="text-sm text-muted-foreground">估算章节</p>
						<p className="mt-2 text-2xl font-semibold">
							{result.book.chapterCountEstimate}
						</p>
					</div>
					<div className="rounded-md border border-border bg-background p-4">
						<p className="text-sm text-muted-foreground">原创化风险</p>
						<p className="mt-2 text-2xl font-semibold">
							{result.originalizationReport.riskLevel}
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-2">
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">世界观设计</h3>
					<div className="mt-4 space-y-4 text-sm">
						<ListBlock title="世界规则" items={result.worldbuilding.worldRules} />
						<ListBlock title="能力体系" items={result.worldbuilding.powerSystem} />
						<ListBlock
							title="专有名词避险"
							items={result.worldbuilding.itemsAndTerms.map(
								(item) => `${item.name}：${item.function}（${item.risk}）`,
							)}
						/>
					</div>
				</div>

				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">人物卡</h3>
					<div className="mt-4 space-y-3">
						{result.characters.map((character) => (
							<div
								key={`${character.sourceName}-${character.role}`}
								className="rounded-md border border-border bg-background p-4 text-sm"
							>
								<p className="font-medium">
									{character.sourceName} · {character.archetype}
								</p>
								<p className="mt-2 text-muted-foreground">
									{character.originalCharacterCard.summary}
								</p>
								<p className="mt-2">欲望：{character.desire}</p>
								<p className="mt-1">避开：{character.originalCharacterCard.doNotCopy.join("、")}</p>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-2">
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">故事线与大事纪</h3>
					<div className="mt-4 space-y-3 text-sm">
						{result.plotlines.map((line) => (
							<div key={line.name} className="rounded-md border border-border bg-background p-4">
								<p className="font-medium">{line.name}</p>
								<p className="mt-2 text-muted-foreground">{line.reusablePattern}</p>
								<p className="mt-2">兑现：{line.payoff}</p>
							</div>
						))}
						<ListBlock
							title="大事纪"
							items={result.chronicle.map(
								(item) => `${item.order}. ${item.event} - ${item.storyFunction}`,
							)}
						/>
					</div>
				</div>

				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">人物关系图谱</h3>
					<div className="mt-4 space-y-2 text-sm">
						{result.relationships.edges.map((edge) => (
							<div
								key={`${edge.source}-${edge.target}-${edge.label}`}
								className="rounded-md border border-border bg-background px-3 py-2"
							>
								{`${edge.source} -> ${edge.target}：${edge.label}（${edge.tension}）`}
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-2">
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">世界历史书</h3>
					<div className="mt-4 grid gap-3 text-sm">
						<ListBlock title="远古史" items={result.historyBook.ancientHistory} />
						<ListBlock title="近代事件" items={result.historyBook.recentHistory} />
						<ListBlock title="公开传说" items={result.historyBook.publicMyths} />
						<ListBlock title="隐藏真相" items={result.historyBook.hiddenTruths} />
					</div>
				</div>

				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">酒馆/AI 写作软件导出包</h3>
					<pre className="mt-4 max-h-96 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 whitespace-pre-wrap">
						{JSON.stringify(result.exportPackage, null, 2)}
					</pre>
				</div>
			</div>

			{result.sourceAssetArchive ? (
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">原作拆解笔记</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{result.sourceAssetArchive.usageNotice}
					</p>
					<div className="mt-4 grid gap-4 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<p className="font-medium">原作人物笔记</p>
							<div className="mt-3 space-y-3">
								{result.sourceAssetArchive.sourceCharacterNotes.map((item) => (
									<div key={`${item.name}-${item.role}`}>
										<p className="font-medium">
											{item.name} · {item.role}
										</p>
										<p className="mt-1 text-muted-foreground">
											{item.plotFunction}
										</p>
										<p className="mt-1">
											可识别特征：{item.recognizableTraits.join("、")}
										</p>
									</div>
								))}
							</div>
						</div>
						<div className="grid gap-3 text-sm">
							<ListBlock
								title="原作世界观笔记"
								items={result.sourceAssetArchive.sourceWorldNotes}
							/>
							<ListBlock
								title="原作时间线笔记"
								items={result.sourceAssetArchive.sourceTimelineNotes}
							/>
							<ListBlock
								title="原作关系网笔记"
								items={result.sourceAssetArchive.sourceRelationshipNotes}
							/>
							<ListBlock
								title="原作专有名词笔记"
								items={result.sourceAssetArchive.sourceTermNotes}
							/>
						</div>
					</div>
				</div>
			) : null}

			<div className="rounded-md border border-border bg-card p-5">
				<h3 className="font-semibold">原创化避险报告</h3>
				<div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
					<ListBlock title="可学习" items={result.originalizationReport.safeToLearn} />
					<ListBlock title="必须转换" items={result.originalizationReport.mustTransform} />
					<ListBlock title="迁移策略" items={result.originalizationReport.rewriteStrategy} />
				</div>
				<p className="mt-4 text-sm text-muted-foreground">
					{result.originalizationReport.fanFictionWarning}
				</p>
			</div>

			{result.usageRiskNotice ? (
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">使用风险提示</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{result.usageRiskNotice.summary}
					</p>
					<div className="mt-4 grid gap-4 md:grid-cols-3">
						<ListBlock title="推荐用途" items={result.usageRiskNotice.recommendedUse} />
						<ListBlock title="较高风险用途" items={result.usageRiskNotice.higherRiskUse} />
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<p className="font-medium">用户责任</p>
							<p className="mt-2 text-muted-foreground">
								{result.usageRiskNotice.userResponsibility}
							</p>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
	return (
		<div className="rounded-md border border-border bg-background p-4">
			<p className="font-medium">{title}</p>
			<ul className="mt-2 space-y-1 text-muted-foreground">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</div>
	);
}
