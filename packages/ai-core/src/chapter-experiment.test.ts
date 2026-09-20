import { describe, expect, it } from "vitest";
import { chapterExperimentText, nextChapterRevision, type ChapterExperiment } from "./index";

const experiment: ChapterExperiment = {
  id: "trial",
  projectId: "book",
  chapterTitle: "第一章",
  originalText: "原文",
  goal: "保留悬念",
  preserve: "父子关系",
  context: "",
  revision: 0,
  createdAt: "now",
  turns: [],
  plan: null,
  writerFingerprint: null,
  versions: [],
  decisions: [],
};

describe("chapter revision lineage", () => {
  it("should start both routes from the same original when no versions exist", () => {
    expect(nextChapterRevision(experiment, "baseline")).toEqual(
      nextChapterRevision(experiment, "guided"),
    );
    expect(chapterExperimentText(experiment, "missing")).toBeUndefined();
  });
  it("should retain independent parents and stop after two rounds when versions exist", () => {
    const first = {
      id: "b1",
      route: "baseline" as const,
      round: 1,
      parentId: "original",
      text: "普通修改",
      elapsedMs: 20,
      createdAt: "now",
      modelLabel: "model",
    };
    const trial = { ...experiment, versions: [first] };
    expect(nextChapterRevision(trial, "guided")?.text).toBe("原文");
    expect(nextChapterRevision(trial, "baseline")?.parentId).toBe("b1");
    expect(chapterExperimentText(trial, "b1")).toBe("普通修改");
    trial.versions.push({ ...first, id: "b2", round: 2, parentId: "b1" });
    expect(nextChapterRevision(trial, "baseline")).toBeNull();
    expect(chapterExperimentText(trial, "original")).toBe("原文");
  });
});
