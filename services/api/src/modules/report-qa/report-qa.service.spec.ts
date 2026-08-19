import { Test } from "@nestjs/testing";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { ReportQaDto } from "./dto/report-qa.dto";
import { ReportQaService } from "./report-qa.service";

const reportText = [
	"## 立项审稿报告",
	"一句话判定：值得写，但先修这几处。",
	"核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。",
	"主角欲望：救妹妹，且不放弃复仇。",
	"俗套判定：复仇动机缺乏自我升级的对立面，冲突是一次性的。",
].join("\n");

const sourceText = "主角跪在病房外，攥着那张缴费单，指节发白。仇人的车停在楼下。";

const mockProvider: ProviderConfigDto = { kind: "mock" };
const realProvider: ProviderConfigDto = { kind: "openai-compatible" };

function modelAnswerJson(overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		answer:
			"报告判定冲突是一次性的，依据是复仇完成后没有持续施压的对立面。",
		citations: [
			{
				quote: "复仇动机缺乏自我升级的对立面，冲突是一次性的。",
				source: "report",
				locator: "俗套判定",
				note: "判定原文。",
			},
			{
				quote: "仇人的车停在楼下。",
				source: "source-text",
				locator: "第一章",
				note: "原文中对立面已经在场。",
			},
		],
		gaps: [],
		...overrides,
	});
}

describe("ReportQaService", () => {
	let service: ReportQaService;
	let chat: jest.Mock;

	beforeEach(async () => {
		chat = jest.fn();

		const module = await Test.createTestingModule({
			providers: [
				ReportQaService,
				{ provide: ModelProviderService, useValue: { chat } },
			],
		}).compile();

		service = module.get(ReportQaService);
	});

	function dto(overrides: Partial<ReportQaDto> = {}): ReportQaDto {
		return {
			question: "为什么说我的冲突是一次性的？",
			reportKind: "premise-review",
			report: reportText,
			sourceText,
			provider: mockProvider,
			...overrides,
		};
	}

	it("should return a self-labeled demo answer for mock providers", async () => {
		const result = await service.answer(dto());

		expect(result.mode).toBe("mock");
		expect(result.answer).toContain("演示模式");
		expect(result.reportKind).toBe("premise-review");
		// Demo citation quotes the report itself so the UI anchor path stays honest.
		for (const citation of result.citations) {
			expect(reportText).toContain(citation.quote);
			expect(citation.source).toBe("report");
		}
		expect(chat).not.toHaveBeenCalled();
	});

	it("should normalize and keep anchored citations for real providers", async () => {
		chat.mockResolvedValue(modelAnswerJson());

		const result = await service.answer(dto({ provider: realProvider }));

		expect(chat).toHaveBeenCalledTimes(1);
		expect(result.mode).toBe("model");
		expect(result.answer).toContain("一次性");
		expect(result.citations).toHaveLength(2);
		expect(result.citations[0]?.source).toBe("report");
		expect(result.citations[1]?.source).toBe("source-text");
		expect(result.gaps).toEqual([]);
	});

	it("should drop citations whose quotes cannot be located", async () => {
		chat.mockResolvedValue(
			modelAnswerJson({
				citations: [
					{
						quote: "这段话不存在于报告或原文中。",
						source: "report",
					},
				],
			}),
		);

		const result = await service.answer(dto({ provider: realProvider }));

		expect(result.citations).toEqual([]);
		expect(result.gaps).toHaveLength(1);
		expect(result.gaps[0]).toContain("无法定位");
	});

	it("should drop source-text citations when no source text was supplied", async () => {
		chat.mockResolvedValue(modelAnswerJson());

		const result = await service.answer({
			...dto({ provider: realProvider }),
			sourceText: undefined,
		});

		expect(result.citations).toHaveLength(1);
		expect(result.citations[0]?.source).toBe("report");
		expect(result.gaps.some((gap) => gap.includes("无法定位"))).toBe(true);
	});

	it("should coerce unknown citation sources to report before anchoring", async () => {
		chat.mockResolvedValue(
			modelAnswerJson({
				citations: [
					{
						quote: "核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。",
						source: "bogus-corpus",
					},
				],
			}),
		);

		const result = await service.answer(dto({ provider: realProvider }));

		expect(result.citations[0]?.source).toBe("report");
	});

	it("should return a disclosure fallback when model output is unparsable", async () => {
		chat.mockResolvedValue("完全不是 JSON 的一段话，连花括号都没有。");

		const result = await service.answer(dto({ provider: realProvider }));

		// First call + one repair attempt, both failing to yield JSON.
		expect(chat).toHaveBeenCalledTimes(2);
		expect(result.mode).toBe("model");
		expect(result.citations).toEqual([]);
		expect(result.answer).toContain("解析失败");
		expect(result.gaps[0]).toContain("格式异常");
	});

	it("should pass model-declared gaps through with the anchor gaps", async () => {
		chat.mockResolvedValue(
			modelAnswerJson({ gaps: ["报告没有提供大纲信息，无法回答节奏问题。"] }),
		);

		const result = await service.answer(dto({ provider: realProvider }));

		expect(result.gaps).toContain("报告没有提供大纲信息，无法回答节奏问题。");
	});

	it("should default to the shared provider when none is supplied", async () => {
		chat.mockResolvedValue(modelAnswerJson());

		await service.answer({
			question: "为什么说我的冲突是一次性的？",
			reportKind: "premise-review",
			report: reportText,
		});

		expect(chat).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "openai-compatible",
				preset: "shared-gpu",
			}),
			expect.anything(),
			expect.anything(),
		);
	});
});
