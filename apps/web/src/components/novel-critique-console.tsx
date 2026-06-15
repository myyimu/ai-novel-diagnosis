"use client";

import {
	BookOpenCheck,
	CheckCircle2,
	Download,
	FileText,
	History,
	KeyRound,
	LayoutDashboard,
	Loader2,
	Network,
	ScanText,
	Settings,
	ShieldAlert,
	Sparkles,
	TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProviderKind = "mock" | "openai-compatible";
type ProviderPresetId = "custom" | "deepseek" | "doubao" | "qwen" | "ollama";

interface ProviderForm {
	preset: ProviderPresetId;
	kind: ProviderKind;
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	jsonMode: boolean;
}

const providerPresets: Record<
	ProviderPresetId,
	{
		label: string;
		kind: ProviderKind;
		baseUrl: string;
		model: string;
		modelOptions?: string[];
		jsonMode: boolean;
		needsApiKey: boolean;
	}
> = {
	custom: {
		label: "自定义",
		kind: "openai-compatible",
		baseUrl: "",
		model: "",
		modelOptions: [],
		jsonMode: false,
		needsApiKey: true,
	},
	deepseek: {
		label: "DeepSeek",
		kind: "openai-compatible",
		baseUrl: "https://api.deepseek.com/v1",
		model: "deepseek-chat",
		modelOptions: ["deepseek-chat", "deepseek-reasoner"],
		jsonMode: false,
		needsApiKey: true,
	},
	doubao: {
		label: "豆包/火山方舟",
		kind: "openai-compatible",
		baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
		model: "doubao-seed-1-6",
		modelOptions: ["doubao-seed-1-6"],
		jsonMode: false,
		needsApiKey: true,
	},
	qwen: {
		label: "阿里云百炼/通义千问",
		kind: "openai-compatible",
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		model: "qwen-plus",
		modelOptions: [
			"qwen-plus",
			"qwen-plus-latest",
			"qwen3-max",
			"qwen3-max-preview",
			"qwen-max",
			"qwen-max-latest",
			"qwen-flash",
			"qwen-turbo",
			"qwen-turbo-latest",
			"qwen3.5-plus",
			"qwen3.5-flash",
			"qwen3-coder-plus",
			"qwen3-coder-flash",
			"qwq-plus",
		],
		jsonMode: false,
		needsApiKey: true,
	},
	ollama: {
		label: "Ollama 本地模型",
		kind: "openai-compatible",
		baseUrl: "http://localhost:11434/v1",
		model: "qwen2.5:7b",
		modelOptions: ["qwen2.5:7b", "qwen3:8b", "llama3.1:8b"],
		jsonMode: false,
		needsApiKey: false,
	},
};

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
	writingSupport?: {
		chapterFunctionTable: Array<{
			chapterOrder: number;
			title: string;
			function: string;
			goal: string;
			conflict: string;
			hook: string;
		}>;
		foreshadowingLedger: Array<{
			setup: string;
			setupChapter: number;
			payoff: string;
			status: string;
			risk: string;
		}>;
		emotionalBeatMap: Array<{
			chapterOrder: number;
			beats: string[];
			intensity: string;
			readerPromise: string;
		}>;
		pacingCurve: Array<{
			chapterOrder: number;
			informationDensity: string;
			conflictIntensity: string;
			hookStrength: string;
			risk: string;
		}>;
		readerPromiseChecklist: Array<{
			promise: string;
			evidence: string;
			status: string;
			nextCheck: string;
		}>;
		conflictMatrix: Array<{
			parties: string[];
			conflict: string;
			level: string;
			nextEscalation: string;
		}>;
		continuationPack: {
			currentState: string;
			nextChapterGoal: string;
			openThreads: string[];
			oocGuards: string[];
			settingGuards: string[];
			styleConstraints: string[];
			aiPrompt: string;
		};
		qualityDiagnosis: {
			strengths: string[];
			weaknesses: string[];
			priorityFixes: string[];
		};
	};
	generationAssets?: {
		worldBook: {
			entries: Array<{
				keys: string[];
				secondaryKeys: string[];
				category: string;
				content: string;
				insertionOrder: number;
				priority: number;
				constant: boolean;
				selective: boolean;
				sourceRisk: string;
				originalizationNote: string;
			}>;
			activationRules: string[];
			importNotes: string;
		};
		styleBible: {
			narrativePOV: string;
			toneKeywords: string[];
			proseRules: string[];
			dialogueRules: string[];
			tabooList: string[];
		};
		volumePlan: Array<{
			volume: string;
			goal: string;
			mainConflict: string;
			climax: string;
			endingHook: string;
		}>;
		sceneTemplates: Array<{
			name: string;
			useWhen: string;
			beats: string[];
			avoid: string[];
		}>;
		characterVoiceGuide: Array<{
			character: string;
			speechStyle: string;
			catchphrases: string[];
			forbiddenTone: string[];
		}>;
		antagonistPressurePlan: Array<{
			antagonist: string;
			pressureMethod: string;
			escalationSteps: string[];
			defeatCost: string;
		}>;
		titleSynopsisKeywordPack: {
			titleKeywords: string[];
			synopsisSellingPoints: string[];
			searchTags: string[];
			openingKeywords: string[];
		};
		consistencyChecklist: string[];
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
	preprocessing?: BookPreprocessingPreview;
	mapReduce?: {
		strategy: string;
		mapCount: number;
		chapterMaps: Array<{
			chapterId: string;
			order: number;
			title: string;
			summary: string;
			plotFunction: string;
			hook: string;
		}>;
		reducerNote: string;
	};
}

interface BookPreprocessingPreview {
	cleaning: {
		rawLength: number;
		cleanedLength: number;
		paragraphCount: number;
		removedNoise: string[];
	};
	chapters: Array<{
		id: string;
		order: number;
		title: string;
		charCount: number;
		wordCount: number;
		startOffset: number;
		endOffset: number;
		splitBy: "heading" | "auto-chunk";
	}>;
}

interface BookAnalysisJob {
	id: string;
	type: "book-map-reduce-analysis";
	status: "queued" | "running" | "succeeded" | "failed";
	inputSummary: {
		title: string;
		genre: string;
		textLength: number;
	};
	progress: {
		stage: "queued" | "preprocess" | "map" | "reduce" | "succeeded" | "failed";
		current: number;
		total: number;
		message: string;
	};
	preprocessing?: BookPreprocessingPreview;
	partialResult?: {
		partial: true;
		type: "book-map-reduce-partial";
		stage: "map" | "reduce" | "failed";
		savedAt: string;
		mapCount: number;
		totalChapters: number;
		artifactDir: string;
		chapterMaps: unknown[];
		notice: string;
	};
	result?: BookAnalysisResult;
	error?: string;
}

type BookExportFormat =
	| "markdown"
	| "json"
	| "tavern-card"
	| "world-book"
	| "sillytavern-world-info"
	| "continuation-pack"
	| "style-bible"
	| "outline"
	| "prompt-pack"
	| "do-not-copy";

type BookExportMode = "notes" | "originalized";

type WorkspaceView = "overview" | "provider" | "chapter" | "book" | "history" | "exports";
type LoadingState =
	| "provider"
	| "rubric"
	| "score"
	| "upload"
	| "book"
	| "history"
	| "export"
	| null;

interface BookUploadPreview {
	id: string;
	title: string;
	genre: string;
	originalFilename: string;
	rawLength: number;
	cleanedLength: number;
	chapterCount: number;
	preprocessing: BookPreprocessingPreview;
	createdAt: string;
	updatedAt: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

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

async function postForm<T>(path: string, body: FormData): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		method: "POST",
		body,
	});

	const payload = (await response.json()) as ApiEnvelope<T>;
	if (!response.ok || payload.code !== 0) {
		throw new Error(payload.message || `Request failed: ${response.status}`);
	}

	return payload.data;
}

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`);
	const payload = (await response.json()) as ApiEnvelope<T>;
	if (!response.ok || payload.code !== 0) {
		throw new Error(payload.message || `Request failed: ${response.status}`);
	}

	return payload.data;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function downloadText(filename: string, content: string, contentType: string) {
	const blob = new Blob([content], { type: contentType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function FieldHelp({ text }: { text: string }) {
	const [open, setOpen] = useState(false);

	return (
		<span className="relative ml-1 inline-flex align-middle">
			<button
				type="button"
				className="inline-flex size-4 items-center justify-center rounded-full border border-border bg-background text-[10px] leading-none text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				aria-label="查看说明"
				aria-expanded={open}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setOpen((current) => !current);
				}}
				onBlur={() => window.setTimeout(() => setOpen(false), 120)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						setOpen(false);
					}
				}}
			>
				?
			</button>
			{open ? (
				<span
					role="tooltip"
					data-field-help-panel="true"
					className="absolute right-0 top-6 z-50 w-64 rounded-md border border-border bg-popover p-3 text-left text-xs font-normal leading-5 text-popover-foreground shadow-lg sm:top-1/2 sm:left-6 sm:right-auto sm:-translate-y-1/2"
				>
					{text}
				</span>
			) : null}
		</span>
	);
}

function WorkflowGuide({ steps, note }: { steps: string[]; note: string }) {
	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-wrap gap-2">
				{steps.map((step, index) => (
					<div
						key={step}
						className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
					>
						<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
							{index + 1}
						</span>
						{step}
					</div>
				))}
			</div>
			<p className="mt-4 text-sm leading-6 text-muted-foreground">{note}</p>
		</section>
	);
}

function EmptyHint({
	show,
	title,
	description,
	actionLabel,
	onAction,
}: {
	show: boolean;
	title: string;
	description: string;
	actionLabel: string;
	onAction: () => void;
}) {
	if (!show) {
		return null;
	}

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<h2 className="text-lg font-semibold">{title}</h2>
			<p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
			<Button className="mt-4" variant="outline" onClick={onAction}>
				{actionLabel}
			</Button>
		</section>
	);
}

function getStatusMeta(status: string, loading: LoadingState) {
	if (loading) {
		return {
			title: "正在处理",
			icon: Loader2,
			className: "border-primary/30 bg-primary/10 text-primary",
			iconClassName: "animate-spin",
		};
	}

	if (
		status.includes("完成") ||
		status.includes("成功") ||
		status.includes("可用") ||
		status.includes("已生成") ||
		status.includes("已创建") ||
		status.includes("已加载") ||
		status.includes("已打开")
	) {
		return {
			title: "操作成功",
			icon: CheckCircle2,
			className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
			iconClassName: "",
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
			className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
			iconClassName: "",
		};
	}

	return {
		title: "状态",
		icon: ShieldAlert,
		className: "border-border bg-card text-muted-foreground",
		iconClassName: "",
	};
}

function StatusBanner({
	status,
	loading,
	compact = false,
}: {
	status: string;
	loading: LoadingState;
	compact?: boolean;
}) {
	const meta = getStatusMeta(status, loading);
	const Icon = meta.icon;

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

export function NovelCritiqueConsole() {
	const [activeView, setActiveView] = useState<WorkspaceView>("overview");
	const [provider, setProvider] = useState<ProviderForm>({
		preset: "deepseek",
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
	const [bookFile, setBookFile] = useState<File | null>(null);
	const [bookUpload, setBookUpload] = useState<BookUploadPreview | null>(null);
	const [bookHistory, setBookHistory] = useState<BookAnalysisJob[]>([]);
	const [uploadHistory, setUploadHistory] = useState<BookUploadPreview[]>([]);
	const [rubricResult, setRubricResult] = useState<RubricResult | null>(null);
	const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
	const [bookAnalysisResult, setBookAnalysisResult] = useState<BookAnalysisResult | null>(null);
	const [bookJob, setBookJob] = useState<BookAnalysisJob | null>(null);
	const [status, setStatus] = useState<string>("mock 模式可直接验证流程");
	const [loading, setLoading] = useState<LoadingState>(null);

	const navItems = [
		{
			id: "overview" as const,
			label: "工作台",
			icon: LayoutDashboard,
			title: "选择你现在要完成的任务",
			description: "先在这里选择单章质检或整书拆解，避免被所有功能同时打断。",
		},
		{
			id: "provider" as const,
			label: "模型配置",
			icon: Settings,
			title: "模型配置",
			description: "选择 mock、本地模型或用户自带 Key 的远程模型。Key 只随请求发送，不保存。",
		},
		{
			id: "chapter" as const,
			label: "单章点评",
			icon: FileText,
			title: "单章点评流程",
			description: "拆成熟章节生成 Rubric，再用同一套标准质检自己的章节并生成改文提示词。",
		},
		{
			id: "book" as const,
			label: "整书拆解",
			icon: Network,
			title: "整书拆解流程",
			description: "上传 TXT，先检查章节切分，再启动 Map-Reduce 拆解世界观、人物和故事线。",
		},
		{
			id: "history" as const,
			label: "历史任务",
			icon: History,
			title: "历史任务",
			description: "重新打开以前的上传记录和整书拆解结果，服务重启后也能查看已完成报告。",
		},
		{
			id: "exports" as const,
			label: "导出中心",
			icon: Download,
			title: "导出中心",
			description:
				"选择原作拆解笔记或原创化导出，再下载 Markdown、JSON、角色卡、世界书和避险清单。",
		},
	];
	const activeMeta = navItems.find((item) => item.id === activeView) ?? navItems[0];

	const providerPayload = useMemo(
		() => ({
			preset: provider.preset,
			kind: provider.kind,
			baseUrl: provider.baseUrl,
			apiKey: provider.apiKey,
			model: provider.model,
			temperature: provider.temperature,
			jsonMode: provider.jsonMode,
		}),
		[provider],
	);
	const selectedProviderPreset = providerPresets[provider.preset];
	const providerModelOptions = selectedProviderPreset.modelOptions ?? [];
	const selectedModelOption = providerModelOptions.includes(provider.model)
		? provider.model
		: "__custom__";

	async function testProvider() {
		setLoading("provider");
		setStatus("正在测试 Provider...");
		try {
			const result = await postJson<Record<string, unknown>>("/analysis/provider/test", {
				provider: providerPayload,
			});
			const providerName = providerPresets[provider.preset].label;
			const modelName =
				provider.kind === "mock"
					? "mock 模式"
					: provider.model || String(result.model || "未指定模型");
			setStatus(`连接成功：${providerName} · ${modelName}`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	function applyProviderPreset(presetId: ProviderPresetId) {
		const preset = providerPresets[presetId];
		setProvider((current) => ({
			...current,
			preset: presetId,
			kind: preset.kind,
			baseUrl: preset.baseUrl,
			model: preset.model,
			jsonMode: preset.jsonMode,
			apiKey: preset.needsApiKey ? current.apiKey : "",
		}));
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
		setBookAnalysisResult(null);
		setBookJob(null);
		setStatus("正在准备上传文本并创建整书异步拆解任务...");
		try {
			const upload = bookUpload ?? (await uploadBookForPreview(false));
			const createdUploadJob = await postJson<BookAnalysisJob>(
				`/analysis/book/uploads/${upload.id}/jobs`,
				{
					provider: providerPayload,
				},
			);
			setBookJob(createdUploadJob);
			setStatus(`任务已创建：${createdUploadJob.id}`);

			let latestJob = createdUploadJob;
			for (let attempt = 0; attempt < 120; attempt += 1) {
				await wait(1000);
				latestJob = await getJson<BookAnalysisJob>(
					`/analysis/book/jobs/${createdUploadJob.id}`,
				);
				setBookJob(latestJob);
				setStatus(latestJob.progress.message);

				if (latestJob.status === "succeeded") {
					if (latestJob.result) {
						setBookAnalysisResult(latestJob.result);
						setStatus(
							`整书拆解完成：${latestJob.result.characters.length} 张角色卡，${latestJob.result.mapReduce?.mapCount ?? 0} 个章节 map`,
						);
					}
					return;
				}

				if (latestJob.status === "failed") {
					throw new Error(latestJob.error || "整书拆解任务失败");
				}
			}

			throw new Error("整书拆解任务仍在运行，请稍后查询 job 状态。");
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function uploadBookForPreview(manageLoading = true) {
		if (manageLoading) {
			setLoading("upload");
		}
		setBookAnalysisResult(null);
		setBookJob(null);
		setStatus("正在上传 TXT 并生成章节预览...");
		try {
			const formData = new FormData();
			const file =
				bookFile ??
				new File([bookText], `${bookTitle || "novel"}.txt`, {
					type: "text/plain",
				});
			formData.append("file", file);
			formData.append("title", bookTitle);
			formData.append("genre", bookGenre);

			const upload = await postForm<BookUploadPreview>("/analysis/book/uploads", formData);
			setBookUpload(upload);
			setStatus(`章节预览完成：${upload.chapterCount} 个章节片段`);
			return upload;
		} catch (error) {
			setStatus((error as Error).message);
			throw error;
		} finally {
			if (manageLoading) {
				setLoading(null);
			}
		}
	}

	async function loadHistory() {
		setLoading("history");
		setStatus("正在加载历史任务...");
		try {
			const [jobs, uploads] = await Promise.all([
				getJson<BookAnalysisJob[]>("/analysis/book/jobs?limit=10"),
				getJson<BookUploadPreview[]>("/analysis/book/uploads?limit=10"),
			]);
			setBookHistory(jobs);
			setUploadHistory(uploads);
			setStatus(`历史已加载：${jobs.length} 个任务，${uploads.length} 个上传`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function openHistoryJob(jobId: string) {
		setLoading("history");
		setStatus("正在打开历史结果...");
		try {
			const job = await getJson<BookAnalysisJob>(`/analysis/book/jobs/${jobId}`);
			setBookJob(job);
			if (job.result) {
				setBookAnalysisResult(job.result);
			}
			setStatus(`已打开任务：${job.status}`);
		} catch (error) {
			setStatus((error as Error).message);
		} finally {
			setLoading(null);
		}
	}

	async function exportBookResult(format: BookExportFormat, mode: BookExportMode) {
		if (!bookJob?.id || bookJob.status !== "succeeded") {
			setStatus("请先打开一个已完成的整书拆解任务。");
			return;
		}

		setLoading("export");
		setStatus(mode === "originalized" ? "正在生成原创化导出文件..." : "正在生成导出文件...");
		try {
			const response = await fetch(
				`${apiBaseUrl}/analysis/book/jobs/${bookJob.id}/export?format=${format}&mode=${mode}`,
			);
			if (!response.ok) {
				const payload = (await response.json()) as ApiEnvelope<unknown>;
				throw new Error(payload.message || `Export failed: ${response.status}`);
			}
			const content = await response.text();
			const disposition = response.headers.get("content-disposition") || "";
			const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/);
			const filename = filenameMatch
				? decodeURIComponent(filenameMatch[1])
				: `book-analysis-${format}.txt`;
			downloadText(
				filename,
				content,
				response.headers.get("content-type") || "text/plain;charset=utf-8",
			);
			setStatus(`导出完成：${filename}`);
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
		setBookFile(file);
		setBookTitle(file.name.replace(/\.[^.]+$/, ""));
		setBookText(text);
		setBookUpload(null);
		setBookAnalysisResult(null);
		setBookJob(null);
	}

	return (
		<div className="min-h-screen bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
			<aside className="sticky top-0 z-20 border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:h-screen lg:border-b-0 lg:border-r">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:h-full lg:px-5 lg:py-6">
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
							<ScanText className="size-5" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">AI小说第一步</p>
							<p className="truncate text-xs text-muted-foreground">
								AI Novel First Step
							</p>
						</div>
					</div>

					<nav
						aria-label="主导航"
						className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
					>
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive = item.id === activeView;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => setActiveView(item.id)}
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
						})}
					</nav>

					<div className="hidden lg:mt-auto lg:block">
						<StatusBanner status={status} loading={loading} compact />
					</div>
				</div>
			</aside>

			<section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-sm text-muted-foreground">
							本地部署 · 用户自带 Key · 平台风格质检
						</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
							{activeMeta.title}
						</h1>
						<p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
							{activeMeta.description}
						</p>
					</div>
					<div className="rounded-md border border-border px-4 py-3 text-sm">
						<p className="font-semibold">
							{scoreResult ? `${scoreResult.totalScore}/10` : "未评分"}
						</p>
						<p className="text-xs text-muted-foreground">综合追读潜力</p>
					</div>
				</header>
				<StatusBanner status={status} loading={loading} />

				{activeView === "overview" ? (
					<section className="grid gap-4 md:grid-cols-2">
						<button
							type="button"
							onClick={() => setActiveView("chapter")}
							className="rounded-md border border-border bg-card p-5 text-left hover:bg-secondary/60"
						>
							<div className="flex items-center gap-2">
								<FileText className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">质检一章</h2>
							</div>
							<p className="mt-3 text-sm leading-6 text-muted-foreground">
								适合你已经有一章正文，想检查目标、冲突、爽点、关键词、平台风格和追读钩子。
							</p>
							<div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
								<span className="rounded-md border border-border px-2 py-1">
									生成 Rubric
								</span>
								<span className="rounded-md border border-border px-2 py-1">
									章节评分
								</span>
								<span className="rounded-md border border-border px-2 py-1">
									改文提示词
								</span>
							</div>
						</button>
						<button
							type="button"
							onClick={() => setActiveView("book")}
							className="rounded-md border border-border bg-card p-5 text-left hover:bg-secondary/60"
						>
							<div className="flex items-center gap-2">
								<Network className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">拆解整书</h2>
							</div>
							<p className="mt-3 text-sm leading-6 text-muted-foreground">
								适合你上传一本
								TXT，先看章节切分，再拆出世界观、人物、关系、时间线和导出包。
							</p>
							<div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
								<span className="rounded-md border border-border px-2 py-1">
									TXT 预览
								</span>
								<span className="rounded-md border border-border px-2 py-1">
									Map-Reduce
								</span>
								<span className="rounded-md border border-border px-2 py-1">
									素材导出
								</span>
							</div>
						</button>
					</section>
				) : null}

				{activeView === "provider" ? (
					<section className="rounded-md border border-border bg-card p-5">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<KeyRound className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">
									1. 模型配置
									<FieldHelp text="这里决定 AI 由谁来执行点评。mock 用于本地演示；真实模型需要用户自己的 Key，本工具不保存 Key。" />
								</h2>
							</div>
							<Button onClick={testProvider} disabled={loading !== null}>
								{loading === "provider" ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								测试连接
							</Button>
						</div>
						<p className="mt-3 text-sm leading-6 text-muted-foreground">
							先测试模型连接，可以确认 Base URL、Model 和 API Key 是否匹配。mock
							模式用于本地演示；真实模型只在本次请求中使用用户自己的 Key。
						</p>

						<div className="mt-5 grid gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<Label>模式</Label>
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
								<Label>供应商预设</Label>
								<select
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
									value={provider.preset}
									onChange={(event) =>
										applyProviderPreset(event.target.value as ProviderPresetId)
									}
								>
									{Object.entries(providerPresets).map(([id, preset]) => (
										<option key={id} value={id}>
											{preset.label}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<div className="flex items-center gap-1">
									<Label>Model ID</Label>
									<FieldHelp text="百炼/通义、DeepSeek、Ollama 都是同一个供应商下选择不同模型 ID。这里改模型不会把供应商预设切成自定义；只有改 Base URL 才代表你在接自定义平台。" />
								</div>
								{providerModelOptions.length ? (
									<select
										className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
										value={selectedModelOption}
										onChange={(event) => {
											if (event.target.value === "__custom__") {
												return;
											}
											setProvider((current) => ({
												...current,
												model: event.target.value,
											}));
										}}
									>
										{providerModelOptions.map((model) => (
											<option key={model} value={model}>
												{model}
											</option>
										))}
										<option value="__custom__">手动输入其他模型 ID</option>
									</select>
								) : null}
								<Input
									value={provider.model}
									onChange={(event) =>
										setProvider((current) => ({
											...current,
											model: event.target.value,
										}))
									}
									placeholder="例如 qwen-plus-latest"
								/>
							</div>
							<div className="space-y-2">
								<Label>Base URL</Label>
								<Input
									value={provider.baseUrl}
									onChange={(event) =>
										setProvider((current) => ({
											...current,
											preset: "custom",
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
									placeholder={
										providerPresets[provider.preset].needsApiKey
											? "用户自己的 API Key，不会保存"
											: "本地模型可留空"
									}
								/>
							</div>
						</div>
					</section>
				) : null}

				{activeView === "chapter" ? (
					<>
						<WorkflowGuide
							steps={[
								"校准平台和读者",
								"填写分类、主题和关键词",
								"拆成熟章节生成 Rubric",
								"质检自己的章节",
								"复制改文提示词",
							]}
							note="单章点评不是文学奖评分，而是检查目标读者是否愿意继续读。平台、分类和数据表现会影响 AI 的判断标准。"
						/>
						<section className="rounded-md border border-border bg-card p-5">
							<div className="flex items-center gap-2">
								<Sparkles className="size-5 text-primary" />
								<h2 className="text-lg font-semibold">
									2. 平台风格画像
									<FieldHelp text="不同平台读者接受的节奏、表达和钩子密度不同。这里用于让评分标准贴近目标平台。" />
								</h2>
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
								<h2 className="text-lg font-semibold">
									3. 市场定位画像
									<FieldHelp text="分类、主题、标签和关键词不是堆词，而是点击承诺。AI 会检查正文是否兑现这些期待。" />
								</h2>
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
										onChange={(event) =>
											setExplicitKeywords(event.target.value)
										}
										placeholder="标题/简介/正文可出现的词"
									/>
								</div>
								<div className="space-y-2">
									<Label>隐性期待</Label>
									<Input
										value={implicitExpectations}
										onChange={(event) =>
											setImplicitExpectations(event.target.value)
										}
										placeholder="被低估 / 反转 / 后悔 / 关系破裂"
									/>
								</div>
								<div className="space-y-2">
									<Label>标题/简介承诺</Label>
									<Input
										value={positioningPromise}
										onChange={(event) =>
											setPositioningPromise(event.target.value)
										}
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
												onChange={(event) =>
													setReferenceTitle(event.target.value)
												}
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
											onChange={(event) =>
												setChapterTitle(event.target.value)
											}
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
								<h2 className="text-lg font-semibold">
									6. 数据表现快照
									<FieldHelp text="展现、点击、30s、触底和追更用于辅助归因，不能直接等同于文本好坏。" />
								</h2>
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
										onChange={(event) =>
											setClickThroughRate(event.target.value)
										}
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
					</>
				) : null}

				{activeView === "book" ? (
					<>
						<WorkflowGuide
							steps={[
								"上传或粘贴 TXT",
								"预览章节切分",
								"启动整书拆解任务",
								"查看人物、世界观和时间线",
								"去导出中心下载素材",
							]}
							note="整书文本通常超过单次模型上下文。这里先切章，再逐章 Map，最后 Reduce 成整书资产。"
						/>
						<section className="rounded-md border border-border bg-card p-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-2">
									<Network className="size-5 text-primary" />
									<h2 className="text-lg font-semibold">
										整书 TXT 拆解
										<FieldHelp text="先上传并预览章节，确认切分合理后再启动整书拆解，避免错章影响人物和时间线。" />
									</h2>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										onClick={() =>
											void uploadBookForPreview().catch(() => undefined)
										}
										disabled={loading !== null}
									>
										{loading === "upload" ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : null}
										上传并预览章节
									</Button>
									<Button onClick={analyzeBook} disabled={loading !== null}>
										{loading === "book" ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : null}
										启动整书拆解
									</Button>
								</div>
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

						<BookUploadPreviewPanel upload={bookUpload} />
						<BookJobPanel job={bookJob} />
						<BookAnalysisPanel result={bookAnalysisResult} />
					</>
				) : null}

				{activeView === "history" ? (
					<>
						<BookHistoryPanel
							jobs={bookHistory}
							uploads={uploadHistory}
							loading={loading}
							onLoadHistory={loadHistory}
							onOpenJob={openHistoryJob}
						/>
						<BookJobPanel job={bookJob} />
						<BookAnalysisPanel result={bookAnalysisResult} />
					</>
				) : null}

				{activeView === "exports" ? (
					<>
						<ExportCenter job={bookJob} loading={loading} onExport={exportBookResult} />
						<EmptyHint
							show={!bookJob || bookJob.status !== "succeeded"}
							title="先打开一个已完成任务"
							description="导出中心依赖整书拆解结果。你可以先到历史任务打开一个 succeeded 任务，或在整书拆解页完成新任务。完成后可导出 Markdown、JSON、角色卡、世界书和 Do Not Copy 清单。"
							actionLabel="去历史任务"
							onAction={() => setActiveView("history")}
						/>
						<BookAnalysisPanel result={bookAnalysisResult} />
					</>
				) : null}
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
									{rubricResult.marketProfile.explicitKeywords.join("、") || "无"}
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
								<span>
									{scoreResult.performanceFit.hasData ? "已提供" : "无数据"}
								</span>
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
								<p className="mt-2 text-sm text-muted-foreground">{score.reason}</p>
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

function BookHistoryPanel({
	jobs,
	uploads,
	loading,
	onLoadHistory,
	onOpenJob,
}: {
	jobs: BookAnalysisJob[];
	uploads: BookUploadPreview[];
	loading: string | null;
	onLoadHistory: () => void;
	onOpenJob: (jobId: string) => void;
}) {
	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<BookOpenCheck className="size-5 text-primary" />
					<h2 className="text-lg font-semibold">
						历史任务
						<FieldHelp text="历史记录来自本地数据库。已完成任务可以重新打开结果，不需要重新跑模型。" />
					</h2>
				</div>
				<Button variant="outline" onClick={onLoadHistory} disabled={loading !== null}>
					{loading === "history" ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : null}
					刷新历史
				</Button>
			</div>
			<div className="mt-5 grid gap-4 xl:grid-cols-2">
				<div className="rounded-md border border-border bg-background p-4">
					<p className="font-medium">最近任务</p>
					<div className="mt-3 max-h-72 overflow-auto space-y-2 text-sm">
						{jobs.length ? (
							jobs.map((job) => (
								<button
									key={job.id}
									type="button"
									onClick={() => onOpenJob(job.id)}
									className="w-full rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-secondary"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-medium">
											{job.inputSummary.title}
										</span>
										<span>{job.status}</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">{job.id}</p>
								</button>
							))
						) : (
							<p className="text-muted-foreground">暂无历史任务。</p>
						)}
					</div>
				</div>
				<div className="rounded-md border border-border bg-background p-4">
					<p className="font-medium">最近上传</p>
					<div className="mt-3 max-h-72 overflow-auto space-y-2 text-sm">
						{uploads.length ? (
							uploads.map((upload) => (
								<div
									key={upload.id}
									className="rounded-md border border-border bg-card px-3 py-2"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-medium">{upload.title}</span>
										<span>{upload.chapterCount} 章</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{upload.originalFilename}
									</p>
								</div>
							))
						) : (
							<p className="text-muted-foreground">暂无上传记录。</p>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}

function BookUploadPreviewPanel({ upload }: { upload: BookUploadPreview | null }) {
	if (!upload) {
		return null;
	}

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<FileText className="size-5 text-primary" />
						<h2 className="text-lg font-semibold">
							TXT 上传与章节预览
							<FieldHelp text="章节预览用于检查标题识别和自动分块是否合理。长文本拆解质量很依赖这一步。" />
						</h2>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">{upload.id}</p>
				</div>
				<span className="rounded-md border border-border px-3 py-1 text-sm">
					{upload.chapterCount} 个章节片段
				</span>
			</div>
			<div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
				<div className="rounded-md border border-border bg-background p-3">
					<p className="text-muted-foreground">文件名</p>
					<p className="mt-1 truncate font-medium">{upload.originalFilename}</p>
				</div>
				<div className="rounded-md border border-border bg-background p-3">
					<p className="text-muted-foreground">原始字符</p>
					<p className="mt-1 text-lg font-semibold">{upload.rawLength}</p>
				</div>
				<div className="rounded-md border border-border bg-background p-3">
					<p className="text-muted-foreground">清洗后字符</p>
					<p className="mt-1 text-lg font-semibold">{upload.cleanedLength}</p>
				</div>
				<div className="rounded-md border border-border bg-background p-3">
					<p className="text-muted-foreground">段落</p>
					<p className="mt-1 text-lg font-semibold">
						{upload.preprocessing.cleaning.paragraphCount}
					</p>
				</div>
			</div>
			<div className="mt-4 max-h-72 overflow-auto rounded-md border border-border bg-background text-sm">
				{upload.preprocessing.chapters.map((chapter) => (
					<div
						key={chapter.id}
						className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
					>
						<span>
							{chapter.order}. {chapter.title}
						</span>
						<span className="text-xs text-muted-foreground">
							{chapter.charCount} 字符 · {chapter.splitBy}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}

function ExportCenter({
	job,
	loading,
	onExport,
}: {
	job: BookAnalysisJob | null;
	loading: string | null;
	onExport: (format: BookExportFormat, mode: BookExportMode) => void;
}) {
	const [mode, setMode] = useState<BookExportMode>("notes");

	if (!job || job.status !== "succeeded") {
		return null;
	}

	const formats: Array<{ id: BookExportFormat; label: string }> = [
		{ id: "markdown", label: "Markdown 报告" },
		{ id: "json", label: "JSON 资产包" },
		{ id: "tavern-card", label: "Tavern 角色卡" },
		{ id: "world-book", label: "World Book" },
		{ id: "sillytavern-world-info", label: "SillyTavern World Info" },
		{ id: "continuation-pack", label: "续写包 JSON" },
		{ id: "style-bible", label: "风格圣经" },
		{ id: "outline", label: "卷纲/大纲" },
		{ id: "prompt-pack", label: "提示词包" },
		{ id: "do-not-copy", label: "Do Not Copy 清单" },
	];
	const modes: Array<{
		id: BookExportMode;
		label: string;
		description: string;
	}> = [
		{
			id: "notes",
			label: "原作拆解笔记",
			description: "保留更多来源信息，适合学习、复盘、内部读书笔记。",
		},
		{
			id: "originalized",
			label: "原创化导出",
			description: "抽象结构功能，去标识化人物、世界书、提示词和角色卡。",
		},
	];
	const selectedMode = modes.find((item) => item.id === mode) || modes[0];

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex items-center gap-2">
				<FileText className="size-5 text-primary" />
				<h2 className="text-lg font-semibold">
					导出中心
					<FieldHelp text="先选择导出模式，再选择格式。原作拆解笔记适合学习复盘；原创化导出会尽量抽象、去标识化，适合继续生成新书素材。" />
				</h2>
			</div>
			<div className="mt-4 grid gap-3 md:grid-cols-2">
				{modes.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => setMode(item.id)}
						className={`rounded-md border p-4 text-left transition ${
							mode === item.id
								? "border-primary bg-primary/10 text-foreground"
								: "border-border bg-background text-muted-foreground hover:border-primary/60"
						}`}
					>
						<span className="block text-sm font-semibold text-foreground">
							{item.label}
						</span>
						<span className="mt-2 block text-xs leading-5">{item.description}</span>
					</button>
				))}
			</div>
			<p className="mt-3 text-xs text-muted-foreground">
				当前模式：{selectedMode.label}。{selectedMode.description}
			</p>
			<ExportRiskNotice mode={mode} />
			<div className="mt-4 flex flex-wrap gap-2">
				{formats.map((format) => (
					<Button
						key={format.id}
						variant="outline"
						onClick={() => onExport(format.id, mode)}
						disabled={loading !== null}
					>
						{loading === "export" ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						{format.label}
					</Button>
				))}
			</div>
		</section>
	);
}

function ExportRiskNotice({ mode }: { mode: BookExportMode }) {
	const isOriginalized = mode === "originalized";

	return (
		<div className="mt-4 rounded-md border border-border bg-background p-4">
			<div className="flex items-center gap-2">
				<ShieldAlert className="size-4 text-primary" />
				<p className="text-sm font-semibold">
					{isOriginalized ? "原创化导出前确认" : "原作拆解笔记提示"}
				</p>
			</div>
			<p className="mt-2 text-xs leading-5 text-muted-foreground">
				{isOriginalized
					? "系统会尽量抽象结构、去标识化人物和世界书，但仍需要你在使用前重写专有名词、关系链、关键事件和可识别桥段。"
					: "这个模式会保留更多来源信息，适合学习、复盘、授权整理或个人私用；不建议直接作为商业化新书素材。"}
			</p>
			<div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
				<p className="rounded-md border border-border bg-card p-3">
					推荐：读书笔记、结构学习、自己作品资产管理。
				</p>
				<p className="rounded-md border border-border bg-card p-3">
					需转换：姓名、地名、组织名、能力名、关系网和事件链。
				</p>
				<p className="rounded-md border border-border bg-card p-3">
					高风险：换皮复刻、未授权商业化、复制可识别设定组合。
				</p>
			</div>
		</div>
	);
}

function BookJobPanel({ job }: { job: BookAnalysisJob | null }) {
	if (!job) {
		return null;
	}

	const percent =
		job.progress.total > 0 ? Math.round((job.progress.current / job.progress.total) * 100) : 0;

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<Network className="size-5 text-primary" />
						<h2 className="text-lg font-semibold">整书拆解任务</h2>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">{job.id}</p>
				</div>
				<span className="rounded-md border border-border px-3 py-1 text-sm">
					{job.status}
				</span>
			</div>
			<div className="mt-5">
				<div className="h-2 overflow-hidden rounded-full bg-secondary">
					<div
						className="h-full bg-primary transition-all"
						style={{ width: `${Math.min(100, percent)}%` }}
					/>
				</div>
				<p className="mt-3 text-sm text-muted-foreground">{job.progress.message}</p>
			</div>
			{job.preprocessing ? (
				<div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
					<div className="rounded-md border border-border bg-background p-3">
						<p className="text-muted-foreground">清洗后字符</p>
						<p className="mt-1 text-lg font-semibold">
							{job.preprocessing.cleaning.cleanedLength}
						</p>
					</div>
					<div className="rounded-md border border-border bg-background p-3">
						<p className="text-muted-foreground">段落数</p>
						<p className="mt-1 text-lg font-semibold">
							{job.preprocessing.cleaning.paragraphCount}
						</p>
					</div>
					<div className="rounded-md border border-border bg-background p-3">
						<p className="text-muted-foreground">章节片段</p>
						<p className="mt-1 text-lg font-semibold">
							{job.preprocessing.chapters.length}
						</p>
					</div>
				</div>
			) : null}
			{job.partialResult ? (
				<div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="size-4 text-emerald-400" />
						<p className="font-semibold">已保存中间拆解结果</p>
					</div>
					<div className="mt-3 grid gap-3 md:grid-cols-3">
						<p>
							<span className="text-muted-foreground">已完成章节：</span>
							{job.partialResult.mapCount}/{job.partialResult.totalChapters}
						</p>
						<p>
							<span className="text-muted-foreground">保存时间：</span>
							{new Date(job.partialResult.savedAt).toLocaleString()}
						</p>
						<p className="break-all">
							<span className="text-muted-foreground">本地目录：</span>
							{job.partialResult.artifactDir}
						</p>
					</div>
					<p className="mt-3 text-xs leading-5 text-muted-foreground">
						{job.partialResult.notice}
					</p>
				</div>
			) : null}
		</section>
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
					拆解完成后，这里会展示世界观、人物卡、关系图谱、大事纪、写作支持包、世界书导出和原创化风险。
				</p>
			</section>
		);
	}

	const writingSupport = result.writingSupport;
	const generationAssets = result.generationAssets;

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
				{result.preprocessing ? (
					<div className="mt-5 rounded-md border border-border bg-background p-4 text-sm">
						<p className="font-semibold">文本清洗 + 章节切分</p>
						<div className="mt-3 grid gap-3 md:grid-cols-4">
							<p>
								<span className="text-muted-foreground">原始字符：</span>
								{result.preprocessing.cleaning.rawLength}
							</p>
							<p>
								<span className="text-muted-foreground">清洗后：</span>
								{result.preprocessing.cleaning.cleanedLength}
							</p>
							<p>
								<span className="text-muted-foreground">段落：</span>
								{result.preprocessing.cleaning.paragraphCount}
							</p>
							<p>
								<span className="text-muted-foreground">章节片段：</span>
								{result.preprocessing.chapters.length}
							</p>
						</div>
						<div className="mt-4 max-h-48 overflow-auto rounded-md border border-border bg-card">
							{result.preprocessing.chapters.map((chapter) => (
								<div
									key={chapter.id}
									className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
								>
									<span>
										{chapter.order}. {chapter.title}
									</span>
									<span className="text-xs text-muted-foreground">
										{chapter.charCount} 字符 · {chapter.splitBy}
									</span>
								</div>
							))}
						</div>
					</div>
				) : null}
				{result.mapReduce ? (
					<div className="mt-5 rounded-md border border-border bg-background p-4 text-sm">
						<div className="flex items-center justify-between gap-3">
							<p className="font-semibold">Map-Reduce 整书拆解</p>
							<span>{result.mapReduce.mapCount} 个 map</span>
						</div>
						<p className="mt-2 text-muted-foreground">{result.mapReduce.reducerNote}</p>
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							{result.mapReduce.chapterMaps.slice(0, 6).map((chapter) => (
								<div
									key={chapter.chapterId}
									className="rounded-md border border-border bg-card p-3"
								>
									<p className="font-medium">
										{chapter.order}. {chapter.title}
									</p>
									<p className="mt-2 text-muted-foreground">{chapter.summary}</p>
									<p className="mt-2">钩子：{chapter.hook}</p>
								</div>
							))}
						</div>
					</div>
				) : null}
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
								<p className="mt-1">
									避开：{character.originalCharacterCard.doNotCopy.join("、")}
								</p>
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
							<div
								key={line.name}
								className="rounded-md border border-border bg-background p-4"
							>
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

			{writingSupport ? (
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">写作支持包</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						给后续继续写、AI 续写和长篇校对使用，重点防止忘坑、跑偏、OOC 和节奏空转。
					</p>
					<div className="mt-5 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">章节功能表</h4>
							<div className="mt-3 space-y-3 text-sm">
								{writingSupport.chapterFunctionTable.map((item) => (
									<div
										key={`${item.chapterOrder}-${item.title}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">
											{item.chapterOrder}. {item.title}
										</p>
										<p className="mt-1 text-muted-foreground">
											{item.function}
										</p>
										<p className="mt-2">目标：{item.goal}</p>
										<p className="mt-1">冲突：{item.conflict}</p>
										<p className="mt-1">钩子：{item.hook}</p>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">伏笔与回收表</h4>
							<div className="mt-3 space-y-3 text-sm">
								{writingSupport.foreshadowingLedger.map((item) => (
									<div
										key={`${item.setupChapter}-${item.setup}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">
											第 {item.setupChapter} 章 · {item.status}
										</p>
										<p className="mt-2">伏笔：{item.setup}</p>
										<p className="mt-1">回收：{item.payoff}</p>
										<p className="mt-1 text-muted-foreground">
											风险：{item.risk}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">爽点/情绪点地图</h4>
							<div className="mt-3 space-y-3 text-sm">
								{writingSupport.emotionalBeatMap.map((item) => (
									<div
										key={`beat-${item.chapterOrder}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">
											第 {item.chapterOrder} 章 · {item.intensity}
										</p>
										<p className="mt-2">{item.beats.join("、")}</p>
										<p className="mt-1 text-muted-foreground">
											承诺：{item.readerPromise}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">节奏曲线</h4>
							<div className="mt-3 space-y-3 text-sm">
								{writingSupport.pacingCurve.map((item) => (
									<div
										key={`pace-${item.chapterOrder}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">第 {item.chapterOrder} 章</p>
										<p className="mt-2">
											信息 {item.informationDensity} · 冲突{" "}
											{item.conflictIntensity} · 钩子 {item.hookStrength}
										</p>
										<p className="mt-1 text-muted-foreground">
											风险：{item.risk}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">读者承诺与冲突矩阵</h4>
							<div className="mt-3 grid gap-3 text-sm">
								<ListBlock
									title="读者承诺"
									items={writingSupport.readerPromiseChecklist.map(
										(item) =>
											`${item.promise}：${item.status}；${item.nextCheck}`,
									)}
								/>
								<ListBlock
									title="冲突矩阵"
									items={writingSupport.conflictMatrix.map(
										(item) =>
											`${item.parties.join(" vs ")}：${item.conflict}；升级：${item.nextEscalation}`,
									)}
								/>
							</div>
						</div>

						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">续写约束包</h4>
							<div className="mt-3 space-y-3 text-sm">
								<p>
									<span className="text-muted-foreground">当前状态：</span>
									{writingSupport.continuationPack.currentState}
								</p>
								<p>
									<span className="text-muted-foreground">下一章目标：</span>
									{writingSupport.continuationPack.nextChapterGoal}
								</p>
								<ListBlock
									title="未解决线索"
									items={writingSupport.continuationPack.openThreads}
								/>
								<ListBlock
									title="人物不跑偏"
									items={writingSupport.continuationPack.oocGuards}
								/>
								<ListBlock
									title="设定不冲突"
									items={writingSupport.continuationPack.settingGuards}
								/>
								<ListBlock
									title="风格约束"
									items={writingSupport.continuationPack.styleConstraints}
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">质量诊断</h4>
							<div className="mt-3 grid gap-3 text-sm">
								<ListBlock
									title="强项"
									items={writingSupport.qualityDiagnosis.strengths}
								/>
								<ListBlock
									title="短板"
									items={writingSupport.qualityDiagnosis.weaknesses}
								/>
								<ListBlock
									title="优先修正"
									items={writingSupport.qualityDiagnosis.priorityFixes}
								/>
							</div>
						</div>
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">给写作 AI 的续写提示词</h4>
							<pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-3 text-xs leading-5">
								{writingSupport.continuationPack.aiPrompt}
							</pre>
						</div>
					</div>
				</div>
			) : null}

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

			{generationAssets ? (
				<div className="rounded-md border border-border bg-card p-5">
					<h3 className="font-semibold">世界书与生成资产</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						用于导入酒馆、AI
						写作软件或作为续写上下文。世界书条目默认做原创化处理，并标注触发关键词和复用风险。
					</p>
					<div className="mt-5 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">世界书条目</h4>
							<div className="mt-3 space-y-3 text-sm">
								{generationAssets.worldBook.entries.map((entry) => (
									<div
										key={`${entry.category}-${entry.keys.join("-")}`}
										className="rounded-md border border-border bg-card p-3"
									>
										<div className="flex flex-wrap items-center gap-2">
											<span className="rounded-md border border-border px-2 py-1 text-xs">
												{entry.category}
											</span>
											<span className="text-xs text-muted-foreground">
												priority {entry.priority} · risk {entry.sourceRisk}
											</span>
										</div>
										<p className="mt-2 font-medium">{entry.keys.join("、")}</p>
										<p className="mt-2 text-muted-foreground">
											{entry.content}
										</p>
										<p className="mt-2">
											辅助触发：{entry.secondaryKeys.join("、") || "无"}
										</p>
										<p className="mt-1 text-muted-foreground">
											原创化：{entry.originalizationNote}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="grid gap-4 text-sm">
							<ListBlock
								title="世界书触发规则"
								items={generationAssets.worldBook.activationRules}
							/>
							<div className="rounded-md border border-border bg-background p-4">
								<p className="font-medium">导入说明</p>
								<p className="mt-2 text-muted-foreground">
									{generationAssets.worldBook.importNotes}
								</p>
							</div>
							<ListBlock
								title="一致性检查"
								items={generationAssets.consistencyChecklist}
							/>
						</div>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4 text-sm">
							<h4 className="font-semibold">风格圣经</h4>
							<p className="mt-2">
								<span className="text-muted-foreground">视角：</span>
								{generationAssets.styleBible.narrativePOV}
							</p>
							<div className="mt-3 grid gap-3">
								<ListBlock
									title="语气关键词"
									items={generationAssets.styleBible.toneKeywords}
								/>
								<ListBlock
									title="文风规则"
									items={generationAssets.styleBible.proseRules}
								/>
								<ListBlock
									title="对话规则"
									items={generationAssets.styleBible.dialogueRules}
								/>
								<ListBlock
									title="禁忌"
									items={generationAssets.styleBible.tabooList}
								/>
							</div>
						</div>

						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">卷/阶段规划</h4>
							<div className="mt-3 space-y-3 text-sm">
								{generationAssets.volumePlan.map((volume) => (
									<div
										key={volume.volume}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">{volume.volume}</p>
										<p className="mt-2">目标：{volume.goal}</p>
										<p className="mt-1">冲突：{volume.mainConflict}</p>
										<p className="mt-1">高潮：{volume.climax}</p>
										<p className="mt-1 text-muted-foreground">
											卷末钩子：{volume.endingHook}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">场景模板</h4>
							<div className="mt-3 space-y-3 text-sm">
								{generationAssets.sceneTemplates.map((scene) => (
									<div
										key={scene.name}
										className="rounded-md border border-border bg-card p-3"
									>
										<p className="font-medium">{scene.name}</p>
										<p className="mt-2 text-muted-foreground">
											{scene.useWhen}
										</p>
										<p className="mt-2">节拍：{scene.beats.join(" -> ")}</p>
										<p className="mt-1">避开：{scene.avoid.join("、")}</p>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-md border border-border bg-background p-4">
							<h4 className="text-sm font-semibold">角色语气与反派压力</h4>
							<div className="mt-3 grid gap-3 text-sm">
								<ListBlock
									title="角色语气"
									items={generationAssets.characterVoiceGuide.map(
										(item) =>
											`${item.character}：${item.speechStyle}；禁忌：${item.forbiddenTone.join("、")}`,
									)}
								/>
								<ListBlock
									title="反派压力"
									items={generationAssets.antagonistPressurePlan.map(
										(item) =>
											`${item.antagonist}：${item.pressureMethod}；代价：${item.defeatCost}`,
									)}
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 rounded-md border border-border bg-background p-4 text-sm">
						<h4 className="font-semibold">标题/简介/关键词包</h4>
						<div className="mt-3 grid gap-3 md:grid-cols-2">
							<ListBlock
								title="标题关键词"
								items={generationAssets.titleSynopsisKeywordPack.titleKeywords}
							/>
							<ListBlock
								title="简介卖点"
								items={
									generationAssets.titleSynopsisKeywordPack.synopsisSellingPoints
								}
							/>
							<ListBlock
								title="搜索标签"
								items={generationAssets.titleSynopsisKeywordPack.searchTags}
							/>
							<ListBlock
								title="开局关键词"
								items={generationAssets.titleSynopsisKeywordPack.openingKeywords}
							/>
						</div>
					</div>
				</div>
			) : null}

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
					<ListBlock
						title="必须转换"
						items={result.originalizationReport.mustTransform}
					/>
					<ListBlock
						title="迁移策略"
						items={result.originalizationReport.rewriteStrategy}
					/>
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
						<ListBlock
							title="较高风险用途"
							items={result.usageRiskNotice.higherRiskUse}
						/>
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
