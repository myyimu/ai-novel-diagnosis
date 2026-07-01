import { BookExportService } from "./book-export.service";

describe("BookExportService", () => {
  it("exports a readable book disassembly report", () => {
    const service = new BookExportService();

    const exported = service.export(
      {
        book: {
          title: "样本书",
          genre: "xuanhuan",
          oneSentencePremise: "废柴主角被公开剥夺资格后寻找旧案证据。",
          coreAppeal: ["公开羞辱后反击", "旧案悬念"],
        },
        relationships: {
          nodes: [
            { id: "c1", label: "主角" },
            { id: "c2", label: "评审会" },
          ],
          edges: [
            {
              source: "c1",
              target: "c2",
              label: "压迫",
              relation: ["压迫", "反击"],
              tension: "资格被剥夺",
              weight: 9,
              evidence: ["评审会当众否定主角资格"],
              firstSeenChapter: 1,
            },
          ],
        },
        plotlines: [
          {
            reusablePattern:
              "先给主角明确损失，再给一个必须冒险争取的翻盘机会。",
          },
        ],
        chronicle: [],
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
          ],
          readerPromiseChecklist: [
            {
              promise: "公开羞辱后反击",
              status: "pending",
              nextCheck: "前三章必须给第一次反击机会",
            },
          ],
          foreshadowingLedger: [
            {
              setup: "旧案信物",
              setupChapter: 1,
              payoff: "引出主线秘密",
              risk: "忘记会让旧案线断裂",
            },
          ],
          qualityDiagnosis: {
            strengths: ["压迫关系清楚"],
          },
        },
        exportPackage: {
          doNotCopyList: ["不要复用原作关系网"],
        },
        originalizationReport: {
          safeToLearn: ["开局压力前置"],
          mustTransform: ["角色姓名必须重写"],
        },
      },
      "reading-report",
    );

    expect(exported.filename).toBe("样本书.reading-report.md");
    expect(exported.contentType).toContain("text/markdown");
    expect(exported.content).toContain("# 样本书 拆书阅读报告");
    expect(exported.content).toContain("## 理解版思维导图");
    expect(exported.content).toContain("中心承诺：公开羞辱后反击");
    expect(exported.content).toContain("关系钩子：主角 / 评审会");
    expect(exported.content).toContain("## 故事阶段时间轴");
    expect(exported.content).toContain("第 1 章：开局承诺");
    expect(exported.content).toContain("## 关键关系故事线");
    expect(exported.content).toContain("第 1 章：主角 / 评审会");
    expect(exported.content).toContain("读者会期待 主角 如何摆脱或反击 评审会");
    expect(exported.content).toContain("压迫关系要绑定具体损失和反击机会");
    expect(exported.content).toContain("主角 -> 评审会：压迫、反击");
    expect(exported.content).toContain("不要复用原作关系网");
  });

  it("builds a BookSkillSource with metadata for L3 aggregation", () => {
    const service = new BookExportService();

    const result = {
      transferableStyleCard: {
        styleRules: ["规则 A", "规则 B"],
      },
      generationAssets: {
        styleBible: {
          narrativePOV: "第三人称限制",
          proseRules: ["短句为主"],
        },
      },
      referenceBoundaryCheck: {
        doNotReuse: ["角色名 A"],
      },
      usageRiskNotice: {
        summary: "仅供学习",
      },
    };

    const source = service.buildSkillSource(result, {
      jobId: "job-1",
      generatedAt: "2026-06-27T00:00:00Z",
      metadata: {
        author: "作者 A",
        platform: "起点",
        publishedYear: 2020,
      },
    });

    expect(source.jobId).toBe("job-1");
    expect(source.metadata?.author).toBe("作者 A");
    expect(source.metadata?.platform).toBe("起点");
    expect(source.metadata?.publishedYear).toBe(2020);
    expect(source.styleCard?.styleRules).toEqual(["规则 A", "规则 B"]);
    expect(source.styleBible?.narrativePOV).toBe("第三人称限制");
    expect(source.boundary?.doNotReuse).toEqual(["角色名 A"]);
    expect(source.riskNotice?.summary).toBe("仅供学习");
  });

  it("distills multiple BookSkillSources into aggregated skill", () => {
    const service = new BookExportService();

    const source1 = {
      jobId: "job-1",
      title: "书 1",
      genre: "xuanhuan",
      generatedAt: "2026-06-27T00:00:00Z",
      metadata: { author: "作者 A" },
      styleCard: {
        styleRules: ["规则 A", "规则 B"],
      },
      styleBible: {},
      boundary: {},
      riskNotice: {},
    };

    const source2 = {
      jobId: "job-2",
      title: "书 2",
      genre: "xuanhuan",
      generatedAt: "2026-06-27T00:00:00Z",
      metadata: { author: "作者 A" },
      styleCard: {
        styleRules: ["规则 A", "规则 C"],
      },
      styleBible: {},
      boundary: {},
      riskNotice: {},
    };

    const result = service.distillSkill([source1, source2], {
      groupBy: "author",
      groupValue: "作者 A",
      generatedAt: "2026-06-27T00:00:00Z",
    });

    expect(result.filename).toContain("author-method");
    expect(result.contentType).toBe("text/markdown; charset=utf-8");
    expect(result.sampleSize).toBe(2);
    expect(result.confidence).toBe("medium-low");
    expect(result.content).toContain("规则 A"); // High confidence (both have it)
    expect(result.content).toContain("规则 B"); // Low confidence (only one has it)
    expect(result.content).toContain("规则 C"); // Low confidence (only one has it)
  });

  it("distills multiple BookSkillSources into a directory-style skill package", () => {
    const service = new BookExportService();

    const source1 = {
      jobId: "job-1",
      title: "书 1",
      genre: "xuanhuan",
      generatedAt: "2026-06-27T00:00:00Z",
      metadata: { author: "作者 A" },
      styleCard: {
        styleRules: ["规则 A", "规则 B"],
        pleasureMechanisms: ["爽点 A"],
      },
      styleBible: {},
      boundary: {
        doNotReuse: ["角色名 A"],
      },
      riskNotice: {},
    };

    const source2 = {
      jobId: "job-2",
      title: "书 2",
      genre: "xuanhuan",
      generatedAt: "2026-06-27T00:00:00Z",
      metadata: { author: "作者 A" },
      styleCard: {
        styleRules: ["规则 A", "规则 C"],
        pleasureMechanisms: ["爽点 A"],
      },
      styleBible: {},
      boundary: {},
      riskNotice: {},
    };

    const result = service.distillSkill([source1, source2], {
      groupBy: "author",
      groupValue: "作者 A",
      generatedAt: "2026-06-27T00:00:00Z",
      format: "skill-package",
    });

    expect(result.filename).toBe("author-method-作者-A.skill-package.json");
    expect(result.contentType).toBe("application/json; charset=utf-8");
    expect(result.files?.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "author-method-作者-A/SKILL.md",
        "author-method-作者-A/references/style-dna.md",
        "author-method-作者-A/scripts/check-degeneration.js",
      ]),
    );
    expect(result.content).toContain("codex-skill-package");
    expect(result.sampleSize).toBe(2);
    expect(result.confidence).toBe("medium-low");
  });

  it("threads metadata through export() for skill-md format", () => {
    const service = new BookExportService();

    const result = {
      book: { title: "测试书", genre: "xuanhuan" },
      transferableStyleCard: {
        styleRules: ["规则"],
      },
      generationAssets: {
        styleBible: {},
      },
    };

    const exported = service.export(result, "skill-md", "notes", {
      author: "作者 A",
      platform: "起点",
      publishedYear: 2020,
    });

    expect(exported.filename).toContain("测试书");
    expect(exported.contentType).toBe("text/markdown; charset=utf-8");
    expect(exported.content).toContain("规则");
    // Metadata should be embedded in the skill frontmatter
    expect(exported.content).toContain("作者 A");
    expect(exported.content).toContain("起点");
    expect(exported.content).toContain("2020");
  });

  it("exports a directory-style skill package from a single book result", () => {
    const service = new BookExportService();

    const exported = service.export(
      {
        book: { title: "测试书", genre: "xuanhuan" },
        transferableStyleCard: {
          styleRules: ["规则"],
          pleasureMechanisms: ["爽点"],
        },
        referenceBoundaryCheck: {
          doNotReuse: ["专名"],
        },
        generationAssets: {
          styleBible: {
            proseRules: ["短句推进"],
          },
        },
      },
      "skill-package",
    );

    expect(exported.filename).toBe("book-structure-测试书.skill-package.json");
    expect(exported.contentType).toBe("application/json; charset=utf-8");
    expect(typeof exported.content).toBe("string");
    const payload = JSON.parse(exported.content as string) as {
      type: string;
      files: Array<{ path: string; content: string }>;
    };
    expect(payload.type).toBe("codex-skill-package");
    expect(payload.files.map((file) => file.path)).toContain(
      "book-structure-测试书/references/boundary.md",
    );
    expect(
      payload.files.find((file) =>
        file.path.endsWith("references/style-dna.md"),
      )?.content,
    ).toContain("短句推进");
  });

  it("exports a zipped skill package from a single book result", () => {
    const service = new BookExportService();

    const exported = service.export(
      {
        book: { title: "测试书", genre: "xuanhuan" },
        transferableStyleCard: {
          styleRules: ["规则"],
        },
        generationAssets: {
          styleBible: {},
        },
      },
      "skill-zip",
    );

    expect(exported.filename).toBe("book-structure-测试书.zip");
    expect(exported.contentType).toBe("application/zip");
    expect(Buffer.isBuffer(exported.content)).toBe(true);
    const zip = exported.content as Buffer;
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.includes(Buffer.from("book-structure-测试书/SKILL.md"))).toBe(
      true,
    );
  });
});
