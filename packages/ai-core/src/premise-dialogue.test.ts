import { describe, expect, it } from "vitest";

import type { PremiseLayerAssessment } from "./premise-review";
import {
  PREMISE_DIALOGUE_MAX_ROUNDS,
  anchorPremiseAskOutput,
  anchorPremiseContractReviewOutput,
  anchorPremiseJudgeOutput,
  buildPremiseDialogueAskPrompt,
  buildPremiseDialogueContractReviewPrompt,
  buildPremiseDialogueJudgePrompt,
  parsePremiseDialogueAskOutput,
  parsePremiseDialogueContractReviewOutput,
  parsePremiseDialogueJudgeOutput,
  premiseContractLineForLayer,
  premiseEndsWithQuestionMark,
  selectPremiseDialogueLayer,
  selectPremiseDialogueLayerForSession,
} from "./premise-dialogue";

const PREMISE_TEXT =
  "《重生之学霸笔记》：林晓高考落榜、被亲戚嘲笑的那晚，意外重生回高一开学第一天。她带着前世的记忆和全部遗憾，决心这一次好好学习，考上重点大学，让爸妈过上好日子。";

const AUTHOR_ANSWER =
  "阻止她的是班主任陈老师：他认定林晓是靠作弊才突然进步的，当众撕过她的笔记本，还叫了家长。到了高三，陈老师为了保住班级的平均分，想把她调去平行班。";

const EDITOR_CONTRACT = {
  coreConflict: "重生学霸要用这一次的机会考上重点大学，但没有人真正阻止她",
  protagonistDesire: "考上重点大学，让爸妈过上好日子",
  opposingForce: "阻力缺席：只有自我要求，没有会反击的人",
  irreducibilityTest: "把重生换成学霸系统故事仍然成立，设定未形成独特冲突",
  readerHookQuestion: "没有对手的重考爽文，读者第五章还追什么？",
};

const AUTHOR_CONTRACT = {
  coreConflict: "她要好好学习和各种阻力作斗争",
  protagonistDesire: "考上重点大学让爸妈骄傲",
  opposingForce: "主要是她自己不够努力，还有班主任和亲戚",
  irreducibilityTest: "换成职场也差不多，都是逆袭",
  readerHookQuestion: "重生读者想看她怎么打脸",
};

function assessment(
  layer: PremiseLayerAssessment["layer"],
  status: PremiseLayerAssessment["status"],
  confidence: number,
): PremiseLayerAssessment {
  return { layer, status, statement: `${layer} 现状`, confidence };
}

describe("selectPremiseDialogueLayer", () => {
  it("prefers missing over weak and skips asked and established layers", () => {
    const layers = [
      assessment("engine", "established", 0.9),
      assessment("desire", "established", 0.8),
      assessment("conflict", "weak", 0.4),
      assessment("irreducibility", "missing", 0.2),
    ];
    const selection = selectPremiseDialogueLayer(layers, [], 0);
    expect(selection.phase).toBe("ask");
    expect(selection.layer).toBe("irreducibility");
  });

  it("orders weak layers by ascending confidence", () => {
    const layers = [
      assessment("engine", "established", 0.9),
      assessment("desire", "established", 0.8),
      assessment("conflict", "weak", 0.7),
      assessment("irreducibility", "weak", 0.3),
    ];
    const selection = selectPremiseDialogueLayer(layers, [], 0);
    expect(selection.phase).toBe("ask");
    expect(selection.layer).toBe("irreducibility");
  });

  it("breaks confidence ties by the canonical layer axis order", () => {
    const layers = [assessment("conflict", "weak", 0.5), assessment("engine", "weak", 0.5)];
    const selection = selectPremiseDialogueLayer(layers, [], 0);
    expect(selection.layer).toBe("engine");
  });

  it("never re-asks a layer already asked", () => {
    const layers = [assessment("conflict", "weak", 0.5), assessment("engine", "weak", 0.6)];
    const selection = selectPremiseDialogueLayer(layers, ["engine"], 1);
    expect(selection.layer).toBe("conflict");
  });

  it("collects when the hard round cap is reached even if layers remain", () => {
    const layers = [assessment("conflict", "weak", 0.5), assessment("engine", "weak", 0.6)];
    const selection = selectPremiseDialogueLayer(layers, [], PREMISE_DIALOGUE_MAX_ROUNDS);
    expect(selection.phase).toBe("collect");
    expect(selection.reason).toContain("硬上限");
  });

  it("collects when every askable layer has been asked or is established", () => {
    const layers = [assessment("engine", "established", 0.9), assessment("conflict", "weak", 0.5)];
    const selection = selectPremiseDialogueLayer(layers, ["conflict"], 1);
    expect(selection.phase).toBe("collect");
  });

  it("honors a custom maxRounds", () => {
    const layers = [assessment("conflict", "weak", 0.5)];
    expect(selectPremiseDialogueLayer(layers, [], 1, { maxRounds: 1 }).phase).toBe("collect");
    expect(selectPremiseDialogueLayer(layers, [], 0, { maxRounds: 1 }).phase).toBe("ask");
  });

  it("derives asked layers and round count from the session turns", () => {
    const layers = [
      assessment("engine", "established", 0.9),
      assessment("desire", "established", 0.8),
      assessment("conflict", "weak", 0.5),
    ];
    const session = {
      turns: [
        {
          round: 1,
          layer: "conflict" as const,
          ask: {
            question: "谁在阻止她？",
            whyThisQuestion: "理由",
            hintQuote: "",
            hintQuoteStatus: "empty" as const,
          },
        },
      ],
    };
    const selection = selectPremiseDialogueLayerForSession(layers, session);
    expect(selection.phase).toBe("collect");
  });
});

describe("premiseEndsWithQuestionMark", () => {
  it("accepts full-width and ASCII question marks", () => {
    expect(premiseEndsWithQuestionMark("谁在阻止她？")).toBe(true);
    expect(premiseEndsWithQuestionMark("who stops her?")).toBe(true);
    expect(premiseEndsWithQuestionMark("谁在阻止她？ ")).toBe(true);
  });

  it("rejects statements and inner-only question marks", () => {
    expect(premiseEndsWithQuestionMark("她会努力")).toBe(false);
    expect(premiseEndsWithQuestionMark("谁在阻止她？我不知道")).toBe(false);
    expect(premiseEndsWithQuestionMark("")).toBe(false);
  });
});

describe("anchorPremiseAskOutput", () => {
  it("keeps a hintQuote that hits the premise verbatim", () => {
    const result = anchorPremiseAskOutput(
      {
        focusedLayer: "conflict",
        question: "谁在阻止她？",
        whyThisQuestion: "理由",
        hintQuote: "决心这一次好好学习，考上重点大学",
      },
      PREMISE_TEXT,
    );
    expect(result.hintQuoteStatus).toBe("anchored");
    expect(result.ask.hintQuote).toBe("决心这一次好好学习，考上重点大学");
    expect(result.questionUsable).toBe(true);
  });

  it("treats an empty hintQuote as the honest default", () => {
    const result = anchorPremiseAskOutput(
      {
        focusedLayer: "conflict",
        question: "谁在阻止她？",
        whyThisQuestion: "理由",
        hintQuote: "",
      },
      PREMISE_TEXT,
    );
    expect(result.hintQuoteStatus).toBe("empty");
    expect(result.ask.hintQuote).toBe("");
  });

  it("drops a hintQuote that cannot be located", () => {
    const result = anchorPremiseAskOutput(
      {
        focusedLayer: "conflict",
        question: "她的班级排名从后十跃至前十，谁会眼红？",
        whyThisQuestion: "理由",
        hintQuote: "原文里不存在的片段",
      },
      PREMISE_TEXT,
    );
    expect(result.hintQuoteStatus).toBe("miss");
    expect(result.ask.hintQuote).toBe("");
    expect(result.questionUsable).toBe(true);
  });

  it("flags a question that does not end with a question mark as unusable", () => {
    const result = anchorPremiseAskOutput(
      {
        focusedLayer: "conflict",
        question: "请谈谈你的写作态度。",
        whyThisQuestion: "理由",
        hintQuote: "",
      },
      PREMISE_TEXT,
    );
    expect(result.questionUsable).toBe(false);
  });
});

describe("anchorPremiseJudgeOutput", () => {
  it("keeps an anchored judgment and sanitizes a non-question followUp", () => {
    const result = anchorPremiseJudgeOutput(
      {
        verdict: "strengthened",
        quoteAuthor: "当众撕过她的笔记本，还叫了家长",
        reason: "理由",
        layerStatusSuggestion: "established",
        followUp: "下一步：给陈老师一个具体的损失。",
        disagreementNote: "",
      },
      AUTHOR_ANSWER,
    );
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.judge.followUp).toBe("");
      expect(result.judge.quoteAuthor).toBe("当众撕过她的笔记本，还叫了家长");
    }
  });

  it("rejects the whole judgment when quoteAuthor misses the author answer", () => {
    const result = anchorPremiseJudgeOutput(
      {
        verdict: "not-yet",
        quoteAuthor: "我会努力把冲突写得更好",
        reason: "理由",
        layerStatusSuggestion: "weak",
        followUp: "谁会阻止她？",
        disagreementNote: "",
      },
      AUTHOR_ANSWER,
    );
    expect(result).toEqual({ status: "rejected", reason: "quote-not-found" });
  });

  it("rejects an empty quoteAuthor", () => {
    const result = anchorPremiseJudgeOutput(
      {
        verdict: "not-yet",
        quoteAuthor: "",
        reason: "理由",
        layerStatusSuggestion: "weak",
        followUp: "",
        disagreementNote: "",
      },
      AUTHOR_ANSWER,
    );
    expect(result.status).toBe("rejected");
  });
});

describe("anchorPremiseContractReviewOutput", () => {
  it("keeps anchored points and counts dropped ones", () => {
    const result = anchorPremiseContractReviewOutput(
      {
        divergencePoints: [
          {
            field: "opposingForce",
            authorView: "主要是她自己不够努力，还有班主任和亲戚",
            editorView: "阻力缺席",
            questionToAuthor: "班主任和亲戚里，谁会主动出手阻止她？",
          },
          {
            field: "irreducibilityTest",
            authorView: "原文里没有这句话",
            editorView: "设定未形成独特冲突",
            questionToAuthor: "哪一次危机只有重生者才会遇到？",
          },
          {
            field: "readerHookQuestion",
            authorView: "重生读者想看她怎么打脸",
            editorView: "读者第五章还追什么",
            questionToAuthor: "打脸之后谁把冲突推向下一场？",
          },
        ],
        feynmanVerdict: "partial",
        quoteAuthor: "她要好好学习和各种阻力作斗争",
        reason: "理由",
      },
      AUTHOR_CONTRACT,
    );
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.review.divergencePoints).toHaveLength(2);
      expect(result.droppedPointCount).toBe(1);
    }
  });

  it("drops a point whose questionToAuthor is not a question", () => {
    const result = anchorPremiseContractReviewOutput(
      {
        divergencePoints: [
          {
            field: "opposingForce",
            authorView: "主要是她自己不够努力，还有班主任和亲戚",
            editorView: "阻力缺席",
            questionToAuthor: "建议把对手写成班主任。",
          },
        ],
        feynmanVerdict: "partial",
        quoteAuthor: "她要好好学习和各种阻力作斗争",
        reason: "理由",
      },
      AUTHOR_CONTRACT,
    );
    expect(result.status === "anchored" && result.droppedPointCount).toBe(1);
  });

  it("rejects a quoteAuthor stitched from two contract fields (v0.3.0 hardening)", () => {
    const result = anchorPremiseContractReviewOutput(
      {
        divergencePoints: [],
        feynmanVerdict: "partial",
        quoteAuthor: "主要是她自己不够努力，还有班主任和亲戚；换成职场也差不多，都是逆袭",
        reason: "理由",
      },
      AUTHOR_CONTRACT,
    );
    expect(result).toEqual({ status: "rejected", reason: "quote-not-found" });
  });

  it("rejects a quoteAuthor that appears in no field", () => {
    const result = anchorPremiseContractReviewOutput(
      {
        divergencePoints: [],
        feynmanVerdict: "clear",
        quoteAuthor: "编辑自己的话",
        reason: "理由",
      },
      AUTHOR_CONTRACT,
    );
    expect(result.status).toBe("rejected");
  });
});

describe("parsePremiseDialogue outputs", () => {
  it("parses a valid ask output and rejects bad enums or shapes", () => {
    expect(
      parsePremiseDialogueAskOutput({
        focusedLayer: "conflict",
        question: "谁在阻止她？",
        whyThisQuestion: "理由",
        hintQuote: "",
      }),
    ).toEqual({
      focusedLayer: "conflict",
      question: "谁在阻止她？",
      whyThisQuestion: "理由",
      hintQuote: "",
    });
    expect(
      parsePremiseDialogueAskOutput({
        focusedLayer: "pacing",
        question: "?",
        whyThisQuestion: "",
        hintQuote: "",
      }),
    ).toBeNull();
    expect(parsePremiseDialogueAskOutput("不是对象")).toBeNull();
    expect(
      parsePremiseDialogueAskOutput({
        focusedLayer: "conflict",
        question: 1,
        whyThisQuestion: "",
        hintQuote: "",
      }),
    ).toBeNull();
  });

  it("parses a valid judge output and rejects bad verdict enums", () => {
    const judge = {
      verdict: "not-yet",
      quoteAuthor: "我会努力",
      reason: "理由",
      layerStatusSuggestion: "weak",
      followUp: "谁会阻止她？",
      disagreementNote: "",
    };
    expect(parsePremiseDialogueJudgeOutput(judge)).toEqual(judge);
    expect(parsePremiseDialogueJudgeOutput({ ...judge, verdict: "great" })).toBeNull();
    expect(
      parsePremiseDialogueJudgeOutput({ ...judge, layerStatusSuggestion: "solid" }),
    ).toBeNull();
    expect(parsePremiseDialogueJudgeOutput({ ...judge, followUp: undefined })).toBeNull();
  });

  it("parses a contract review and silently drops malformed divergence points", () => {
    const parsed = parsePremiseDialogueContractReviewOutput({
      divergencePoints: [
        {
          field: "opposingForce",
          authorView: "主要是她自己不够努力",
          editorView: "阻力缺席",
          questionToAuthor: "谁会出手？",
        },
        { field: "premiseSummary", authorView: "x", editorView: "y", questionToAuthor: "z？" },
        { field: "readerHookQuestion", authorView: "x", editorView: 1, questionToAuthor: "z？" },
        "垃圾条目",
      ],
      feynmanVerdict: "partial",
      quoteAuthor: "她要好好学习和各种阻力作斗争",
      reason: "理由",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.divergencePoints).toHaveLength(1);
    expect(
      parsePremiseDialogueContractReviewOutput({
        divergencePoints: [],
        feynmanVerdict: "maybe",
        quoteAuthor: "x",
        reason: "y",
      }),
    ).toBeNull();
    expect(parsePremiseDialogueContractReviewOutput(null)).toBeNull();
  });
});

describe("premise dialogue prompt pack (v0.3.0 validated)", () => {
  it("asks with the single-question and no-fabrication hard constraints", () => {
    const bundle = buildPremiseDialogueAskPrompt({
      genre: "都市·重生校园",
      premiseText: PREMISE_TEXT,
      layer: "conflict",
      layerStatus: "weak",
      layerStatement: "没有任何会反击她的对手",
      layerComment: "冲突没有升级路径",
      contractLine: premiseContractLineForLayer("conflict", EDITOR_CONTRACT),
    });
    expect(bundle.id).toBe("premise-dialogue-ask.v1");
    const user = bundle.messages[1]?.content ?? "";
    expect(user).toContain("只出现一个问号、且以问号结尾");
    expect(user).toContain("不得虚构灵感原文里不存在的具体事件、数据或人名");
    expect(user).toContain('focusedLayer 只能是 "conflict"');
    expect(user).toContain("没有任何会反击她的对手");
    expect(user).toContain("阻力缺席：只有自我要求，没有会反击的人");
    expect(user).toContain(PREMISE_TEXT);
    expect(bundle.messages[0]?.role).toBe("system");
  });

  it("omits the comment line when no layerComment is provided", () => {
    const user = buildPremiseDialogueAskPrompt({
      genre: "都市",
      premiseText: PREMISE_TEXT,
      layer: "conflict",
      layerStatus: "weak",
      layerStatement: "判定",
      contractLine: "契约行",
    }).messages[1]?.content;
    expect(user).toContain("判定\n\n编辑重述的契约中与本层最相关的一行");
  });

  it("judges with quoteAuthor anchoring and disagreement rules, embedding both texts", () => {
    const bundle = buildPremiseDialogueJudgePrompt({
      layer: "conflict",
      layerStatus: "weak",
      layerStatement: "没有任何会反击她的对手",
      question: "谁会用行动持续阻止她？",
      authorAnswer: AUTHOR_ANSWER,
    });
    expect(bundle.id).toBe("premise-dialogue-judge.v1");
    const user = bundle.messages[1]?.content ?? "";
    expect(bundle.messages[0]?.content).toContain("不要顺从也不要固执");
    expect(user).toContain("quoteAuthor 逐字摘录作者回答中最能支撑你判定的连续片段");
    expect(user).toContain("谁会用行动持续阻止她？");
    expect(user).toContain(AUTHOR_ANSWER);
    expect(user).toContain("weak——没有任何会反击她的对手");
  });

  it("reviews contracts with the single-field quoteAuthor hardening", () => {
    const bundle = buildPremiseDialogueContractReviewPrompt({
      premiseText: PREMISE_TEXT,
      editorContract: EDITOR_CONTRACT,
      authorContract: AUTHOR_CONTRACT,
    });
    expect(bundle.id).toBe("premise-dialogue-contract.v1");
    const user = bundle.messages[1]?.content ?? "";
    expect(bundle.messages[0]?.content).toContain("费曼测试");
    expect(user).toContain("quoteAuthor 必须逐字摘自作者版契约同一个字段内部的连续片段");
    expect(user).toContain("不得把两个不同字段的原话拼接在一起");
    expect(user).toContain(AUTHOR_CONTRACT.opposingForce);
    expect(user).toContain(EDITOR_CONTRACT.coreConflict);
  });

  it("maps each layer to its most relevant contract line", () => {
    expect(premiseContractLineForLayer("engine", EDITOR_CONTRACT)).toBe(
      EDITOR_CONTRACT.coreConflict,
    );
    expect(premiseContractLineForLayer("desire", EDITOR_CONTRACT)).toBe(
      EDITOR_CONTRACT.protagonistDesire,
    );
    expect(premiseContractLineForLayer("conflict", EDITOR_CONTRACT)).toBe(
      EDITOR_CONTRACT.opposingForce,
    );
    expect(premiseContractLineForLayer("irreducibility", EDITOR_CONTRACT)).toBe(
      EDITOR_CONTRACT.irreducibilityTest,
    );
  });
});
