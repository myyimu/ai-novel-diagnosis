import { describe, expect, it } from "vitest";
import {
  buildRevisionComparison,
  createRevisionVersion,
  findPreviousRevisionVersion,
  findRevisionVersionForDraft,
  hasComparableQuickScore,
  hashRevisionText,
  normalizeRevisionChapterTitle,
} from "./revision-iteration";
import type { RevisionComparisonSession } from "./revision-iteration";

function session(overrides: Partial<RevisionComparisonSession>): RevisionComparisonSession {
  return {
    quickScore: 6.4,
    gateDecision: "revise",
    issueTitles: ["章末钩子没有代价"],
    mainProblem: "章末钩子没有代价",
    nextPrompt: "请补强章末代价。",
    ...overrides,
  };
}

describe("hashRevisionText / normalizeRevisionChapterTitle", () => {
  it("hashes identical text identically and different text differently", () => {
    expect(hashRevisionText("版本一正文")).toBe(hashRevisionText("版本一正文"));
    expect(hashRevisionText("版本一正文")).not.toBe(hashRevisionText("版本二正文"));
    expect(hashRevisionText("")).toBe("0");
  });

  it("collapses whitespace in chapter titles and falls back for empty titles", () => {
    expect(normalizeRevisionChapterTitle("  第一章　退婚 ")).toBe("第一章 退婚");
    expect(normalizeRevisionChapterTitle("   ")).toBe("未命名章节");
  });
});

describe("createRevisionVersion", () => {
  it("creates stable deterministic version ids and increasing labels", () => {
    const first = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本一正文",
      existingVersions: [],
      now: "2026-06-24T00:00:00.000Z",
    });
    const second = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本二正文",
      previousVersion: first,
      existingVersions: [first],
      now: "2026-06-24T01:00:00.000Z",
    });
    const recomputed = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本一正文",
      existingVersions: [],
      now: "2026-06-24T09:00:00.000Z",
    });

    expect(first.versionLabel).toBe("V1");
    expect(second.versionLabel).toBe("V2");
    expect(second.previousVersionId).toBe(first.id);
    expect(first.id).toBe(recomputed.id);
    expect(first.textLength).toBe("版本一正文".length);
    expect(first.text).toBe("版本一正文");
  });

  it("treats titles equal after normalization as the same chapter", () => {
    const first = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章　退婚",
      chapterText: "正文",
      existingVersions: [],
    });
    const second = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "  第一章 退婚 ",
      chapterText: "新正文",
      previousVersion: first,
      existingVersions: [first],
    });

    expect(second.versionLabel).toBe("V2");
  });

  it("isolates version numbering per project and defaults project", () => {
    const first = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "正文",
      existingVersions: [],
    });
    const otherProject = createRevisionVersion({
      projectId: "project-b",
      chapterTitle: "第一章",
      chapterText: "新正文",
      existingVersions: [first],
    });
    const noProject = createRevisionVersion({
      chapterTitle: "第一章",
      chapterText: "再一版",
      existingVersions: [{ ...first, projectId: undefined }],
    });

    expect(otherProject.versionLabel).toBe("V1");
    expect(noProject.versionLabel).toBe("V2");
    expect(noProject.projectId).toBe("default-project");
  });
});

describe("findRevisionVersionForDraft / findPreviousRevisionVersion", () => {
  it("finds the identical draft version and the latest different version", () => {
    const first = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本一正文",
      existingVersions: [],
      now: "2026-06-24T00:00:00.000Z",
    });
    const second = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本二正文",
      previousVersion: first,
      existingVersions: [first],
      now: "2026-06-24T01:00:00.000Z",
    });
    const versions = [second, first];

    expect(
      findRevisionVersionForDraft({
        versions,
        projectId: "project-a",
        chapterTitle: "第一章",
        chapterText: "版本一正文",
      })?.id,
    ).toBe(first.id);
    expect(
      findPreviousRevisionVersion({
        versions,
        projectId: "project-a",
        chapterTitle: "第一章",
        chapterText: "版本三正文",
      })?.id,
    ).toBe(second.id);
  });

  it("ignores versions from other projects or other chapters", () => {
    const first = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第一章",
      chapterText: "版本一正文",
      existingVersions: [],
    });
    const otherChapter = createRevisionVersion({
      projectId: "project-a",
      chapterTitle: "第二章",
      chapterText: "别的章节",
      existingVersions: [],
    });

    expect(
      findPreviousRevisionVersion({
        versions: [otherChapter, first],
        projectId: "project-b",
        chapterTitle: "第一章",
        chapterText: "版本二正文",
      }),
    ).toBeUndefined();
    expect(
      findPreviousRevisionVersion({
        versions: [otherChapter, first],
        projectId: "project-a",
        chapterTitle: "第一章",
        chapterText: "版本二正文",
      })?.id,
    ).toBe(first.id);
  });
});

describe("buildRevisionComparison", () => {
  it("returns null when either quick score is not comparable", () => {
    expect(
      buildRevisionComparison({
        current: session({ quickScore: null }),
        previous: session({ quickScore: 5.4 }),
      }),
    ).toBeNull();
    expect(hasComparableQuickScore(null)).toBe(false);
  });

  it("reports effective prompt outcome for resolved issues with score gain", () => {
    const comparison = buildRevisionComparison({
      current: session({
        quickScore: 6.6,
        gateDecision: "revise",
        issueTitles: ["新章末钩子还不够具体"],
        mainProblem: "新章末钩子还不够具体",
      }),
      previous: session({
        quickScore: 5.4,
        gateDecision: "rebuild",
      }),
    });

    expect(comparison?.scoreDelta).toBe(1.2);
    expect(comparison?.gateChangeLabel).toBe("Gate 改善");
    expect(comparison?.promptOutcome.status).toBe("effective");
    expect(comparison?.resolvedIssues).toContain("章末钩子没有代价");
    expect(comparison?.newIssues).toContain("新章末钩子还不够具体");
    expect(comparison?.nextAction).toContain("方法论卡");
  });

  it("flags repeated issues as partial outcome", () => {
    const comparison = buildRevisionComparison({
      current: session({ quickScore: 6.4, nextPrompt: "请继续补强。" }),
      previous: session({ quickScore: 6.3 }),
    });

    expect(comparison?.promptOutcome.status).toBe("partial");
    expect(comparison?.repeatedIssues).toContain("章末钩子没有代价");
    expect(comparison?.gateChangeLabel).toBe("Gate 持平");
  });

  it("falls back to the main problem when issue titles are empty", () => {
    const comparison = buildRevisionComparison({
      current: session({ issueTitles: [], mainProblem: "当前主问题" }),
      previous: session({ issueTitles: [], mainProblem: "旧主问题" }),
    });

    expect(comparison?.newIssues).toEqual(["当前主问题"]);
    expect(comparison?.resolvedIssues).toEqual(["旧主问题"]);
  });

  it("marks unknown outcome when the previous session kept no prompt", () => {
    const comparison = buildRevisionComparison({
      current: session({ quickScore: 6.6 }),
      previous: session({ quickScore: 5.4, nextPrompt: undefined }),
    });

    expect(comparison?.promptOutcome.status).toBe("unknown");
  });
});
