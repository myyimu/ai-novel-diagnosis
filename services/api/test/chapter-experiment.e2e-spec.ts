import { Test } from "@nestjs/testing";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { ChapterExperimentsRepository } from "../src/dao/repositories/chapter-experiments.repository";
import { DrizzleService } from "../src/service/drizzle/drizzle.service";
import * as schema from "../src/service/drizzle/schema";
import { createIndexSql, createTableSql } from "../src/service/drizzle/ddl";
import type { ChapterExperiment } from "@ai-novel-diagnosis/ai-core";

describe("Chapter experiments persistence", () => {
  it("should restore text and enforce optimistic writes when repositories share a database", async () => {
    const client = new PGlite();
    try {
      await client.exec(createTableSql(schema.chapterExperiments));
      for (const sql of createIndexSql(schema.chapterExperiments))
        await client.exec(sql);
      const module = await Test.createTestingModule({
        providers: [
          ChapterExperimentsRepository,
          {
            provide: DrizzleService,
            useValue: { db: drizzle(client, { schema }) },
          },
        ],
      }).compile();
      const repository = module.get(ChapterExperimentsRepository);
      const experiment: ChapterExperiment = {
        id: "trial",
        projectId: "book",
        chapterTitle: "第一章",
        originalText: "原稿不变",
        goal: "保持风格",
        preserve: "人物关系",
        context: "前情",
        revision: 0,
        createdAt: new Date().toISOString(),
        turns: [],
        plan: null,
        writerFingerprint: null,
        versions: [],
        decisions: [],
      };
      await repository.create(experiment);
      expect(await repository.find(experiment.id)).toEqual(experiment);
      expect(await repository.list("another-book")).toEqual([]);
      expect(await repository.list("book")).toHaveLength(1);
      expect(
        await repository.save(
          { ...experiment, revision: 1, plan: "最小修改" },
          0,
        ),
      ).toBe(true);
      expect(
        await repository.save(
          { ...experiment, revision: 1, plan: "错误覆盖" },
          0,
        ),
      ).toBe(false);
      expect((await repository.find(experiment.id))?.plan).toBe("最小修改");
      expect((await repository.find(experiment.id))?.originalText).toBe(
        "原稿不变",
      );
      await module.close();
    } finally {
      await client.close();
    }
  });
});
