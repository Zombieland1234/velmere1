type CostWindow = { startedAt: number; requests: number; estimatedTokens: number };
const windows = new Map<string, CostWindow>();
const WINDOW_MS = 60_000;

export type VlmCostDecision = {
  allowed: boolean;
  reason?: string;
  estimatedPromptTokens: number;
  maxOutputTokens: number;
};

function positiveNumber(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function estimateVlmTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function checkVlmCostGovernor(input: {
  namespace: string;
  prompt: string;
  requestedOutputTokens: number;
}): VlmCostDecision {
  const now = Date.now();
  const maxPromptTokens = positiveNumber(process.env.VELMERE_GEMINI_MAX_PROMPT_TOKENS, 8_000);
  const maxOutputTokens = Math.min(4_000, positiveNumber(process.env.VELMERE_GEMINI_MAX_OUTPUT_TOKENS, 3_600));
  const maxRequestsPerMinute = positiveNumber(process.env.VELMERE_GEMINI_MAX_REQUESTS_PER_MINUTE, 90);
  const maxTokensPerMinute = positiveNumber(process.env.VELMERE_GEMINI_MAX_TOKENS_PER_MINUTE, 600_000);
  const estimatedPromptTokens = estimateVlmTokens(input.prompt);
  const outputTokens = Math.min(input.requestedOutputTokens, maxOutputTokens);

  if (estimatedPromptTokens > maxPromptTokens) {
    return { allowed: false, reason: "Prompt token limit exceeded", estimatedPromptTokens, maxOutputTokens: outputTokens };
  }

  const current = windows.get(input.namespace);
  const window = !current || now - current.startedAt >= WINDOW_MS
    ? { startedAt: now, requests: 0, estimatedTokens: 0 }
    : current;
  if (window.requests >= maxRequestsPerMinute) {
    return { allowed: false, reason: "Provider request budget exceeded", estimatedPromptTokens, maxOutputTokens: outputTokens };
  }
  if (window.estimatedTokens + estimatedPromptTokens + outputTokens > maxTokensPerMinute) {
    return { allowed: false, reason: "Provider token budget exceeded", estimatedPromptTokens, maxOutputTokens: outputTokens };
  }

  window.requests += 1;
  window.estimatedTokens += estimatedPromptTokens + outputTokens;
  windows.set(input.namespace, window);
  return { allowed: true, estimatedPromptTokens, maxOutputTokens: outputTokens };
}

export function getVlmCostGovernorStats() {
  const now = Date.now();
  for (const [key, value] of windows) if (now - value.startedAt >= WINDOW_MS) windows.delete(key);
  return Array.from(windows.entries()).map(([namespace, value]) => ({ namespace, ...value }));
}
