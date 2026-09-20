/** Writing-oriented guidance choices shared by the conversation UI and API. */
export const chapterGuidanceModes = {
  auto: {
    label: "自动选择",
    description: "根据你的卡点选择提问、澄清或建议；方向明确时直接推进。",
    example: "先帮我判断这一章是否需要改。",
  },
  socratic: {
    label: "追问发现 · 苏格拉底式",
    description: "一次追问一个关键假设，让你自己发现情节或判断中的矛盾。",
    example: "先别给改法，用问题帮我检查人物动机。",
  },
  empathic: {
    label: "共情澄清 · 罗杰斯式",
    description: "复述你表达的顾虑和意图，帮助说清想保留什么、为什么犹豫。",
    example: "我觉得这段不够吸引人，但又舍不得它的日常感。",
  },
  evidence: {
    label: "证据检验 · 借鉴 CBT",
    description: "分清原文事实、阅读推测和审美偏好，检查支持与反对的证据。",
    example: "我觉得慢节奏一定留不住读者，原文真的支持这个判断吗？",
  },
  solution: {
    label: "聚焦下一步 · 借鉴 SFBT",
    description: "描述想达到的阅读效果，寻找已经奏效的段落，确定一个小行动。",
    example: "如果只改善一处，哪里最接近我想要的效果？",
  },
  scaffold: {
    label: "逐步提示 · 支架式",
    description: "从观察位置到检查方法逐步给线索，必要时再给最小示例。",
    example: "我看不出人物动机哪里薄弱，先给我一点提示。",
  },
  metaphor: {
    label: "换个视角 · 隐喻叙事式",
    description: "用一个贴合文本的比喻或角色视角理解卡点，再回到具体段落。",
    example: "换个比喻，帮我理解这章为什么读起来发散。",
  },
  confrontation: {
    label: "温和面质 · 直接点明矛盾",
    description: "直接指出创作目标与文本表现之间可能的冲突，并请你核实。",
    example: "如果我的目标和写出来的效果矛盾，请直接指出依据。",
  },
} as const;

/** Requested guidance behavior for one exchange; old conversations default to auto. */
export type ChapterGuidanceMode = keyof typeof chapterGuidanceModes;
