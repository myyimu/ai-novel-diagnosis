import type { QuickReviewPromptMode, RubricMetric } from "./types";

export interface StoryCraftDimension {
  id: string;
  label: string;
  diagnosticQuestion: string;
  failSignal: string;
}

export interface StoryCraftHeuristic {
  id: string;
  label: string;
  promptRule: string;
}

export interface StoryCraftCriterion {
  id: string;
  label: string;
  rule: string;
}

export const STORY_CRAFT_RUBRIC_DIMENSIONS: StoryCraftDimension[] = [
  {
    id: "core-selling-point",
    label: "核心卖点",
    diagnosticQuestion: "本章是否围绕一个明确卖点推进，读者知道为什么继续看？",
    failSignal: "看不出本章服务什么卖点，或卖点被支线、设定、闲聊稀释。",
  },
  {
    id: "minimum-plot-loop",
    label: "最小剧情循环",
    diagnosticQuestion: "目标、阻碍、行动、代价/反馈、新期待是否闭合？",
    failSignal: "只有解释或状态展示，局势没有发生可感知变化。",
  },
  {
    id: "payoff-loop",
    label: "爽点循环",
    diagnosticQuestion: "压迫/期待、延迟、释放、反应层、余波是否完整？",
    failSignal: "直接给结果，缺少前置压迫、反应层或下一轮期待。",
  },
  {
    id: "emotion-engine",
    label: "情绪引擎",
    diagnosticQuestion: "情绪是否经历铺垫、升温、释放或反转？",
    failSignal: "情绪平直、突兀转向，或只用情绪词替代场景行动。",
  },
  {
    id: "hook-recovery",
    label: "钩子与回收",
    diagnosticQuestion:
      "开头/结尾钩子属于悬念、危机、反转、期待、情感或揭示中的哪类，下一章前段如何回收？",
    failSignal: "自然收尾、空喊预告，或有钩子但没有可执行回收路径。",
  },
  {
    id: "character-motivation",
    label: "角色动机",
    diagnosticQuestion: "角色行为是否符合目标、性格、处境和关系压力？",
    failSignal: "角色为推动剧情突然信任、突然亲密、突然敌对或突然降智。",
  },
  {
    id: "dialogue-control",
    label: "对话信息控制",
    diagnosticQuestion: "对话是否有潜台词、立场差异和信息控制，而不是说明书？",
    failSignal: "人人同腔、问答式解释设定，或高压场景插科打诨出戏。",
  },
  {
    id: "continuity-ledger",
    label: "设定/伏笔一致性",
    diagnosticQuestion: "时间线、能力边界、角色状态、伏笔埋设和回收是否可追踪？",
    failSignal: "前后事实冲突、能力无代价解决问题、开放伏笔长期悬空。",
  },
  {
    id: "prose-naturalness",
    label: "文本自然度",
    diagnosticQuestion: "文字是否具体、可感，由动作和场景承载信息？",
    failSignal: "模板化升华、章末总结体、解释腔、上帝视角、空泛排比。",
  },
  {
    id: "short-form-density",
    label: "短篇密度",
    diagnosticQuestion: "短篇是否有清晰故事核、爆点、反转/认知变化和共鸣层次？",
    failSignal: "节点稀疏、爆点后置、共鸣只停留在口号或控诉。",
  },
  {
    id: "long-form-learning-asset",
    label: "长篇拆解资产",
    diagnosticQuestion: "整书拆解是否沉淀节奏、情绪模块、角色状态、时间线和伏笔表？",
    failSignal: "只有摘要，没有可复用的节奏索引、情绪模块或续写约束。",
  },
];

export const STORY_CRAFT_HEURISTICS: StoryCraftHeuristic[] = [
  {
    id: "judge-mechanism-before-style",
    label: "先判机制，再判 AI 味",
    promptRule:
      "遇到系统面板、倒计时、弹幕、论坛体、热梗、重复句式、主角拒绝行动等内容，先判断它是否服务卖点和读者期待；机制成立时优先小说化呈现、降频、补反馈，而不是删除。",
  },
  {
    id: "avoid-summary-ending",
    label: "章尾避免总结升华",
    promptRule:
      "章尾用动作、对话、危机、秘密、奖励或反转收束，不用感悟、哲理、命运式预告或作者替读者下结论。",
  },
  {
    id: "show-emotion-through-action",
    label: "情绪由动作承载",
    promptRule:
      "不要只写紧张、愤怒、伤心、震惊；用身体反应、场景后果、选择代价、旁人反应和对话落点让情绪发生。",
  },
  {
    id: "rotate-pleasure-types",
    label: "爽点类型轮换",
    promptRule:
      "连续同类打脸、掉马、隐藏实力或围观惊呼会疲劳；用代价、关系变化、信息增量和更高层阻碍轮换强度。",
  },
  {
    id: "track-open-promises",
    label: "追踪开放承诺",
    promptRule:
      "每个伏笔、未解线索、章末钩子、能力代价都要能说明埋设章、预计回收点、当前状态和断线风险。",
  },
  {
    id: "separate-learnable-from-protected",
    label: "学结构，不搬内容",
    promptRule:
      "拆书和样本研究只迁移读者需求、情绪链、节奏、功能位和写作手法；人物名、专有名词、关系网、事件链和标志性台词必须替换或重构。",
  },
];

export const STORY_CRAFT_RUBRIC_METRICS: RubricMetric[] = [
  {
    id: "minimum-plot-loop",
    name: "最小剧情循环完整度",
    description: "章节是否完成目标、阻碍、行动、代价/反馈和新期待的基本循环。",
    scale: {
      low: "0-3：无明确目标、阻碍或反馈，删掉本章也不影响局势。",
      medium: "4-6：循环存在但缺一环，推进感或反馈偏弱。",
      high: "7-10：本章改变了局势、关系、信息或情绪，并立起下一步期待。",
    },
  },
  {
    id: "emotion-engine",
    name: "情绪引擎",
    description: "章节是否制造情绪缺口，并通过铺垫、升温、释放或反转让读者获得回报。",
    scale: {
      low: "0-3：情绪只停留在标签或旁白判断，读者没有等待兑现的感受。",
      medium: "4-6：有情绪变化，但触发点、释放点或余波不够清楚。",
      high: "7-10：情绪链清楚，读者知道自己在等什么、为什么爽或为什么心疼。",
    },
  },
  {
    id: "dialogue-control",
    name: "对话信息控制",
    description: "对话是否体现角色差异、潜台词、立场和信息差，而不是解释设定。",
    scale: {
      low: "0-3：对话像说明书，人物声音同质，冲突场景仍在科普。",
      medium: "4-6：对话可读，但信息堆叠或人物声音区分不足。",
      high: "7-10：对话能推进冲突、隐藏信息、暴露关系，并保留人物声线。",
    },
  },
  {
    id: "continuity-ledger",
    name: "设定与伏笔可追踪性",
    description: "角色状态、时间线、能力边界、伏笔和章末承诺是否能被追踪和回收。",
    scale: {
      low: "0-3：事实冲突、能力无边界、伏笔断线或开放承诺无人负责。",
      medium: "4-6：基本不冲突，但状态、代价或回收路径不够明确。",
      high: "7-10：开放项状态清楚，能力和设定会制造新选择或新代价。",
    },
  },
];

export function formatStoryCraftPromptBrief(): string {
  const dimensions = STORY_CRAFT_RUBRIC_DIMENSIONS.map(
    (item, index) =>
      `${index + 1}. ${item.label}：${item.diagnosticQuestion} 失败信号：${item.failSignal}`,
  ).join("\n");
  const heuristics = STORY_CRAFT_HEURISTICS.map(
    (item, index) => `${index + 1}. ${item.label}：${item.promptRule}`,
  ).join("\n");

  return ["吸纳的网文工艺诊断标准：", dimensions, "", "诊断执行规则：", heuristics].join("\n");
}

/** Selects a compact rule set for quick diagnosis prompt modes.
 *
 * @example
 * selectStoryCraftCriteria("first-chapter").map((item) => item.label);
 */
export function selectStoryCraftCriteria(mode: QuickReviewPromptMode): StoryCraftCriterion[] {
  const dimensionMap = new Map(
    STORY_CRAFT_RUBRIC_DIMENSIONS.map((item) => [
      item.id,
      {
        id: item.id,
        label: item.label,
        rule: `${item.diagnosticQuestion} 失败信号：${item.failSignal}`,
      },
    ]),
  );
  const heuristicMap = new Map(
    STORY_CRAFT_HEURISTICS.map((item) => [
      item.id,
      {
        id: item.id,
        label: item.label,
        rule: item.promptRule,
      },
    ]),
  );
  const idsByMode: Record<QuickReviewPromptMode, string[]> = {
    "first-chapter": [
      "core-selling-point",
      "minimum-plot-loop",
      "emotion-engine",
      "hook-recovery",
      "character-motivation",
      "judge-mechanism-before-style",
      "show-emotion-through-action",
    ],
    "early-chapter": [
      "core-selling-point",
      "minimum-plot-loop",
      "payoff-loop",
      "hook-recovery",
      "character-motivation",
      "judge-mechanism-before-style",
      "avoid-summary-ending",
    ],
    "chapter-progress": [
      "minimum-plot-loop",
      "payoff-loop",
      "emotion-engine",
      "character-motivation",
      "continuity-ledger",
      "judge-mechanism-before-style",
    ],
    "generic-draft": [
      "core-selling-point",
      "minimum-plot-loop",
      "emotion-engine",
      "hook-recovery",
      "prose-naturalness",
      "judge-mechanism-before-style",
    ],
    "outline-review": [
      "core-selling-point",
      "minimum-plot-loop",
      "payoff-loop",
      "character-motivation",
      "continuity-ledger",
      "track-open-promises",
    ],
    "idea-review": [
      "core-selling-point",
      "emotion-engine",
      "character-motivation",
      "payoff-loop",
      "judge-mechanism-before-style",
    ],
    "prompt-review": [
      "core-selling-point",
      "minimum-plot-loop",
      "hook-recovery",
      "character-motivation",
      "judge-mechanism-before-style",
      "show-emotion-through-action",
    ],
  };

  return idsByMode[mode]
    .map((id) => dimensionMap.get(id) || heuristicMap.get(id))
    .filter((item): item is StoryCraftCriterion => Boolean(item));
}
