/**
 * Heuristic token estimation for usage bookkeeping when the provider
 * response carries no `usage` block (e.g. the shared-gpu anonymous
 * fallback never reports token counts).
 *
 * Rules of thumb: CJK ideographs/full-width punctuation ≈ 1.1 tokens per
 * character, everything else ≈ 4 characters per token (roughly the BPE
 * average for English prose). Estimates only feed the `estimated=true`
 * usage rows — never billing or business logic.
 */

export interface EstimatedChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }

  let cjkCount = 0;
  let otherCount = 0;
  for (const char of text) {
    if (isCjkChar(char)) {
      cjkCount += 1;
    } else {
      otherCount += 1;
    }
  }

  return Math.max(1, Math.round(cjkCount * 1.1 + otherCount / 4));
}

export function estimateChatUsage(
  promptText: string,
  completionText: string,
): EstimatedChatUsage {
  const promptTokens = estimateTokenCount(promptText);
  const completionTokens = estimateTokenCount(completionText);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function isCjkChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x3000 && code <= 0x30ff) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}
