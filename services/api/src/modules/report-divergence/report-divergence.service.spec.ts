import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";
import { ModelProviderService } from "@/modules/ai-provider/model-provider.service";
import { ReportDivergenceService } from "./report-divergence.service";
import type { ReportDivergenceDto } from "./dto/report-divergence.dto";

const quickReviewReport = `【章节初诊报告】
章节：第三章 对峙
急诊分：7/10
主要问题：对话推进有效，节奏紧凑，没有明显拖沓。`;

const storyAuditReport = `【故事体检报告】
候选问题（共 1 条）：
1. 第三章节奏拖沓（类别 pacing，严重度高）
   证据：chapter-3 第 3 章：连续四段没有推进新信息`;

const mockProvider: ProviderConfigDto = { kind: "mock" };
const realProvider: ProviderConfigDto = { kind: "openai-compatible" };

function makeDto(overrides: Partial<ReportDivergenceDto> = {}): ReportDivergenceDto {
	return {
		chapterTitle: "第三章 对峙",
		quickReviewReport,
		storyAuditReport,
		...overrides,
	} as ReportDivergenceDto;
}

function divergenceJson(overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		divergences: [
			{
				id: "divergence-1",
				topic: "节奏",
				quickReviewQuote: "节奏紧凑，没有明显拖沓",
				storyAuditQuote: "第三章节奏拖沓",
				explanation: "快诊认为本章节奏紧凑，体检认为本章节奏拖沓。",
				questionForAuthor: "这章连续四段没有新信息，你自己读起来拖吗？",
			},
			{
				id: "divergence-miss",
				topic: "人物",
				quickReviewQuote: "这句引文不在快诊报告里",
				storyAuditQuote: "第三章节奏拖沓",
				explanation: "未锚定的点应被丢弃。",
				questionForAuthor: "会被丢弃吗？",
			},
		],
		agreementNote: "",
		...overrides,
	});
}

describe("ReportDivergenceService", () => {
	let service: ReportDivergenceService;
	let chat: jest.Mock;

	beforeEach(async () => {
		chat = jest.fn();
		const module = await Test.createTestingModule({
			providers: [
				ReportDivergenceService,
				{ provide: ModelProviderService, useValue: { chat } },
			],
		}).compile();
		service = module.get(ReportDivergenceService);
	});

	it("should return a demo-anchored divergence when provider is mock", async () => {
		const result = await service.detect(makeDto({ provider: mockProvider }));

		expect(result.mode).toBe("mock");
		expect(result.divergences).toHaveLength(1);
		expect(result.divergences[0]!.quickReviewQuote).toBe(quickReviewReport.slice(0, 24));
		expect(result.divergences[0]!.storyAuditQuote).toBe(storyAuditReport.slice(0, 24));
		expect(result.agreementNote).toContain("演示模式");
		expect(chat).not.toHaveBeenCalled();
	});

	it("should anchor both quotes and drop unanchored points with a disclosed count", async () => {
		chat.mockResolvedValue(divergenceJson());

		const result = await service.detect(makeDto({ provider: realProvider }));

		expect(result.mode).toBe("model");
		expect(result.divergences).toHaveLength(1);
		expect(result.divergences[0]!.topic).toBe("节奏");
		expect(result.droppedPointCount).toBe(1);
		expect(result.agreementNote).toBeUndefined();

		const [, messages, options] = chat.mock.calls[0] as unknown as [
			ProviderConfigDto,
			Array<{ role: string; content: string }>,
			{ jsonSchema: { name: string }; usageMeta: { stage: string } },
		];
		expect(messages[0]!.content).toContain("会诊编辑");
		expect(messages[1]!.content).toContain("第三章 对峙");
		expect(options.jsonSchema.name).toBe("report_divergence_result");
		expect(options.usageMeta.stage).toBe("report-divergence");
	});

	it("should keep an explicit empty array as an honest no-conflict finding", async () => {
		chat.mockResolvedValue(
			divergenceJson({ divergences: [], agreementNote: "两份报告在可比点上方向一致。" }),
		);

		const result = await service.detect(makeDto({ provider: realProvider }));

		expect(result.divergences).toEqual([]);
		expect(result.droppedPointCount).toBe(0);
		expect(result.agreementNote).toBe("两份报告在可比点上方向一致。");
	});

	it("should throw BadRequest when the payload has no divergences array", async () => {
		chat.mockResolvedValue(JSON.stringify({ agreementNote: "形状不对" }));

		await expect(service.detect(makeDto({ provider: realProvider }))).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it("should throw BadRequest when both raw and repaired outputs stay unparseable", async () => {
		chat.mockResolvedValue("这不是 JSON");

		await expect(service.detect(makeDto({ provider: realProvider }))).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(chat).toHaveBeenCalledTimes(2);
	});

	it("should default to the shared-gpu provider when none is passed", async () => {
		chat.mockResolvedValue(divergenceJson());

		await service.detect(makeDto());

		expect(chat.mock.calls[0][0]).toEqual({
			preset: "shared-gpu",
			kind: "openai-compatible",
		});
	});
});
