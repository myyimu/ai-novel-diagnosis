import { TextPreprocessorService } from "./text-preprocessor.service";

describe("TextPreprocessorService", () => {
  const service = new TextPreprocessorService();

  it("should omit a standalone book title when an episode heading follows", () => {
    const result = service.preprocess(
      "# 《测试喜剧》\n\n## 第一集：审判\n\n### 一、开场\n人物：台词。\n\n### 二、转折\n【切黑】",
    );
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe("第一集：审判");
    expect(result.chapters[0].text).toContain("### 二、转折");
    expect(result.chapters[0].text).toContain("【切黑】");
  });

  it("should preserve actual prelude text when it precedes the first chapter", () => {
    const result = service.preprocess(
      "他一直没有回答。\n\n第一章 开场\n门开了。",
    );
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].text).toBe("他一直没有回答。");
  });

  it("cleans TXT noise and splits heading-based chapters", () => {
    const result = service.preprocess(
      "\uFEFF第一章 开局\r\n主角被取消资格。\r\n\r\n第二章 旧案\r\n主角发现玉牌线索。\r\n",
    );

    expect(result.cleaning.cleanedLength).toBeLessThan(
      result.cleaning.rawLength,
    );
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toMatchObject({
      id: "ch-0001",
      order: 1,
      title: "第一章 开局",
      text: "主角被取消资格。",
      splitBy: "heading",
    });
    expect(result.chapters[1].title).toBe("第二章 旧案");
  });

  it("falls back to auto chunks when headings are absent", () => {
    const result = service.preprocess(
      "第一段没有章节标题。\n\n第二段继续推进剧情。",
    );

    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe("自动分段");
    expect(result.chapters[0].splitBy).toBe("auto-chunk");
  });

  it("splits markdown and numbered Chinese chapter headings", () => {
    const result = service.preprocess(
      [
        "# 第一章 开局",
        "主角被取消资格。",
        "",
        "第 2 章 旧案",
        "主角发现玉牌线索。",
        "",
        "章节3 风雨来",
        "敌人登门。",
      ].join("\n"),
    );

    expect(result.chapters).toHaveLength(3);
    expect(result.chapters.map((chapter) => chapter.title)).toEqual([
      "第一章 开局",
      "第 2 章 旧案",
      "章节3 风雨来",
    ]);
    expect(
      result.chapters.every((chapter) => chapter.splitBy === "heading"),
    ).toBe(true);
  });
});
