import { describe, expect, it } from "vitest";
import { buildPromptAttribution, type PromptAttributionSession } from "./prompt-attribution";

const first: PromptAttributionSession = {
  id: "revision-1",
  chapterTitle: "第一版",
  quickScore: 5.6,
  gateDecision: "rebuild",
  issueTitles: ["章末钩子没有代价", "主角目标太晚"],
  nextPrompt: "请在前 300 字必须补出主角目标、失败代价和章末钩子，不要新增无关设定。",
};

describe("buildPromptAttribution", () => {
  it("explains effective prompt outcomes with confidence and signals", () => {
    const second: PromptAttributionSession = {
      id: "revision-2",
      chapterTitle: "第二版",
      quickScore: 6.8,
      gateDecision: "revise",
      issueTitles: ["章末钩子没有代价"],
      revisionNote: "这一版按 Prompt 补了主角目标和失败代价。",
    };

    const attribution = buildPromptAttribution([second, first]);

    expect(attribution.rate).toBe(100);
    expect(attribution.items[0]?.category).toBe("prompt_effective");
    expect(attribution.items[0]?.diagnosisReason).toContain("上一轮 Prompt");
    expect(attribution.items[0]?.confidence).toBeGreaterThan(0.7);
    expect(attribution.items[0]?.signalStrengths.map((signal) => signal.label)).toContain(
      "Prompt 约束密度",
    );
    expect(attribution.calibration.readiness).toBe("insufficient_data");
    expect(attribution.calibration.headline).toContain("Prompt 有效");
    expect(attribution.calibration.modelAssistedReviewPrompt).toContain("网文编辑");
  });

  it("separates execution gaps from prompt direction problems", () => {
    const second: PromptAttributionSession = {
      id: "revision-2",
      chapterTitle: "第二版",
      quickScore: 5.8,
      gateDecision: "rebuild",
      issueTitles: ["章末钩子没有代价", "主角目标太晚"],
      revisionNote: "这一版还没按 Prompt 补目标，只改了一点句子。",
    };

    const attribution = buildPromptAttribution([second, first]);

    expect(attribution.items[0]?.category).toBe("execution_gap");
    expect(attribution.items[0]?.evidence).toContain("人工备注显示执行不足");
    expect(attribution.items[0]?.missingData).toHaveLength(0);
  });

  it("marks weak evidence when notes and concrete prompt constraints are missing", () => {
    const weakFirst: PromptAttributionSession = {
      ...first,
      nextPrompt: "优化一下，让它更好看。",
    };
    const second: PromptAttributionSession = {
      id: "revision-2",
      chapterTitle: "第二版",
      quickScore: 5.7,
      gateDecision: "rebuild",
      issueTitles: ["章末钩子没有代价", "主角目标太晚"],
    };

    const attribution = buildPromptAttribution([second, weakFirst]);

    expect(attribution.items[0]?.category).toBe("idea_or_structure_blocker");
    expect(attribution.items[0]?.missingData).toContain(
      "本版没有人工备注，无法确认作者是否按上一轮 Prompt 执行。",
    );
    expect(attribution.items[0]?.confidence).toBeLessThan(0.7);
  });

  it("builds a stable project-level calibration summary from repeated signals", () => {
    const repeatedPrompt = "请在前 300 字必须补出主角目标、失败代价和章末钩子，不要新增无关设定。";
    const sessions: PromptAttributionSession[] = [
      {
        id: "revision-6",
        chapterTitle: "第六版",
        quickScore: 9,
        gateDecision: "continue",
        issueTitles: [],
        revisionNote: "按 Prompt 完成了目标、代价、章末钩子。",
      },
      {
        id: "revision-5",
        chapterTitle: "第五版",
        quickScore: 8.2,
        gateDecision: "revise",
        issueTitles: ["细节不足"],
        nextPrompt: repeatedPrompt,
        revisionNote: "按 Prompt 补了开头目标。",
      },
      {
        id: "revision-4",
        chapterTitle: "第四版",
        quickScore: 7.4,
        gateDecision: "revise",
        issueTitles: ["章末钩子没有代价", "细节不足"],
        nextPrompt: repeatedPrompt,
        revisionNote: "按 Prompt 补了失败代价。",
      },
      {
        id: "revision-3",
        chapterTitle: "第三版",
        quickScore: 6.6,
        gateDecision: "rebuild",
        issueTitles: ["主角目标太晚", "章末钩子没有代价", "细节不足"],
        nextPrompt: repeatedPrompt,
        revisionNote: "按 Prompt 改了前 300 字。",
      },
      {
        id: "revision-2",
        chapterTitle: "第二版",
        quickScore: 5.8,
        gateDecision: "rebuild",
        issueTitles: ["主角目标太晚", "章末钩子没有代价", "设定负担", "细节不足"],
        nextPrompt: repeatedPrompt,
        revisionNote: "按 Prompt 做了结构调整。",
      },
      {
        id: "revision-1",
        chapterTitle: "第一版",
        quickScore: 5,
        gateDecision: "discard",
        issueTitles: ["主角目标太晚", "章末钩子没有代价", "设定负担", "细节不足"],
        nextPrompt: repeatedPrompt,
      },
    ];

    const attribution = buildPromptAttribution(sessions);

    expect(attribution.calibration.readiness).toBe("stable_signal");
    expect(attribution.calibration.dominantCategory?.category).toBe("prompt_effective");
    expect(attribution.calibration.nextBestAction).toContain("方法论卡");
  });
});
