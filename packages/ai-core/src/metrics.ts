import type { RubricMetric } from "./types";
import { STORY_CRAFT_RUBRIC_METRICS } from "./story-craft";

export const DEFAULT_RUBRIC_METRICS: RubricMetric[] = [
  {
    id: "chapter-goal",
    name: "主角目标清晰度",
    description: "读者是否能快速知道主角这一章想得到什么或避免什么。",
    scale: {
      low: "主角只是被事件推着走，目标不清。",
      medium: "目标存在，但压力和结果不够具体。",
      high: "目标、代价、完成标志都很明确。",
    },
  },
  {
    id: "conflict-pressure",
    name: "冲突压力",
    description: "阻碍是否具体，是否会造成损失、羞辱、危机或机会流失。",
    scale: {
      low: "只有态度冲突，没有实际后果。",
      medium: "有阻碍，但压迫对象或损失不够尖锐。",
      high: "阻碍具体且会逼迫主角立刻行动。",
    },
  },
  {
    id: "emotion-debt",
    name: "情绪债",
    description: "章节是否让读者积累愤怒、期待、心疼、好奇等待兑现情绪。",
    scale: {
      low: "读者没有明显情绪等待释放。",
      medium: "有情绪，但铺垫或延迟不足。",
      high: "情绪债清晰，读者期待主角反击或真相揭开。",
    },
  },
  {
    id: "hook",
    name: "追读钩子",
    description: "结尾是否留下下一章不可延迟的危机、奖励、秘密或反转。",
    scale: {
      low: "自然收尾，没有新期待。",
      medium: "留下问题，但不够紧迫。",
      high: "结尾制造明确升级，读者想立刻进入下一章。",
    },
  },
  ...STORY_CRAFT_RUBRIC_METRICS,
];
