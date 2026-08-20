import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { PremiseConsultDto } from "./dto/premise-consult.dto";
import { PremiseConsultController } from "./premise-consult.controller";
import { PremiseConsultService } from "./premise-consult.service";

const validBody = {
  premiseText: "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流。",
  trigger: "author-disagrees",
  original: {
    verdict: "not-worth-writing",
    oneLineVerdict: "欲望空泛，冲突缺位。",
    layers: [
      { layer: "engine", status: "missing", statement: "欲望空泛。", confidence: 0.3 },
      { layer: "desire", status: "weak", statement: "避开所有遗憾。", confidence: 0.8 },
      { layer: "conflict", status: "missing", statement: "", confidence: 0.2 },
      {
        layer: "irreducibility",
        status: "established",
        statement: "两难独立于设定。",
        confidence: 0.75,
      },
    ],
  },
};

describe("PremiseConsultController", () => {
  let app: INestApplication;
  let premiseConsult: { consult: jest.Mock };

  beforeEach(async () => {
    premiseConsult = {
      consult: jest.fn().mockResolvedValue({
        schemaVersion: "premise-consult.v1",
        comparison: { verdictRelation: "opposite" },
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [PremiseConsultController],
      providers: [{ provide: PremiseConsultService, useValue: premiseConsult }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return the consultation for a well-formed request", async () => {
    const response = await request(app.getHttpServer())
      .post("/analysis/premise-consult")
      .send(validBody)
      .expect(200);

    expect(response.body.comparison.verdictRelation).toBe("opposite");
    expect(premiseConsult.consult).toHaveBeenCalledTimes(1);
    const dto = premiseConsult.consult.mock.calls[0][0] as PremiseConsultDto;
    expect(dto.trigger).toBe("author-disagrees");
    expect(dto.original.verdict).toBe("not-worth-writing");
    expect(dto.original.layers).toHaveLength(4);
  });

  it("should reject an unknown trigger value", async () => {
    await request(app.getHttpServer())
      .post("/analysis/premise-consult")
      .send({ ...validBody, trigger: "probably-wrong" })
      .expect(400);

    expect(premiseConsult.consult).not.toHaveBeenCalled();
  });

  it("should reject an original snapshot without four layers", async () => {
    await request(app.getHttpServer())
      .post("/analysis/premise-consult")
      .send({
        ...validBody,
        original: { ...validBody.original, layers: validBody.original.layers.slice(0, 3) },
      })
      .expect(400);

    expect(premiseConsult.consult).not.toHaveBeenCalled();
  });

  it("should reject a premise shorter than 20 chars", async () => {
    await request(app.getHttpServer())
      .post("/analysis/premise-consult")
      .send({ ...validBody, premiseText: "太短的灵感。" })
      .expect(400);
  });
});
