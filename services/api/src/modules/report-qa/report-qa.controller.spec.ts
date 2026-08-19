import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ReportQaController } from "./report-qa.controller";
import { ReportQaService } from "./report-qa.service";

describe("ReportQaController", () => {
	let app: INestApplication;
	let reportQa: { answer: jest.Mock };

	beforeEach(async () => {
		reportQa = {
			answer: jest.fn().mockResolvedValue({
				mode: "mock",
				reportKind: "premise-review",
				question: "为什么说我的冲突是一次性的？",
				answer: "演示模式。",
				citations: [],
				gaps: [],
			}),
		};

		const module = await Test.createTestingModule({
			controllers: [ReportQaController],
			providers: [{ provide: ReportQaService, useValue: reportQa }],
		}).compile();

		app = module.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({ transform: true, whitelist: true }),
		);
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it("should return an answer for a well-formed question", async () => {
		const body = {
			question: "为什么说我的冲突是一次性的？",
			reportKind: "premise-review",
			report:
				"## 立项审稿报告\n一句话判定：值得写，但先修这几处。\n核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。\n俗套判定：复仇动机缺乏自我升级的对立面，冲突是一次性的。",
		};

		const response = await request(app.getHttpServer())
			.post("/analysis/report-qa")
			.send(body)
			.expect(200);

		expect(response.body.mode).toBe("mock");
		expect(reportQa.answer).toHaveBeenCalledTimes(1);
	});

	it("should reject a question shorter than 10 chars", async () => {
		await request(app.getHttpServer())
			.post("/analysis/report-qa")
			.send({
				question: "为什么",
				reportKind: "premise-review",
				report: "一份足够长的报告内文，用来通过最小长度校验。",
			})
			.expect(400);

		expect(reportQa.answer).not.toHaveBeenCalled();
	});

	it("should reject an unknown report kind", async () => {
		await request(app.getHttpServer())
			.post("/analysis/report-qa")
			.send({
				question: "为什么说我的冲突是一次性的？",
				reportKind: "mystery-review",
				report: "一份足够长的报告内文，用来通过最小长度校验。",
			})
			.expect(400);
	});

	it("should reject a report shorter than 50 chars", async () => {
		await request(app.getHttpServer())
			.post("/analysis/report-qa")
			.send({
				question: "为什么说我的冲突是一次性的？",
				reportKind: "premise-review",
				report: "太短的报告。",
			})
			.expect(400);
	});
});
