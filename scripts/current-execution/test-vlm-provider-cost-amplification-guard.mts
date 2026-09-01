import fs from "node:fs";

type CostDecision = {
  allowed: boolean;
  reason?: string;
  estimatedPromptTokens: number;
  maxOutputTokens: number;
};

type CostGovernorInput = {
  namespace: string;
  prompt: string;
  requestedOutputTokens: number;
};

type CostGovernorModule = {
  checkVlmCostGovernor(input: CostGovernorInput): CostDecision;
  resetVlmCostGovernorForTests?: () => void;
  withVlmProviderCostGovernor?: <T>(
    input: CostGovernorInput,
    dispatch: (decision: CostDecision) => Promise<T>,
  ) => Promise<T>;
};

type Check = { name: string; passed: boolean; detail?: unknown };

const environmentKeys = [
  "NODE_ENV",
  "GEMINI_API_KEY",
  "VELMERE_GEMINI_MODEL",
  "VELMERE_GEMINI_FALLBACK_MODELS",
  "VELMERE_GEMINI_MAX_OUTPUT_TOKENS",
  "VELMERE_GEMINI_MAX_PROMPT_TOKENS",
  "VELMERE_GEMINI_MAX_REQUESTS_PER_MINUTE",
  "VELMERE_GEMINI_MAX_TOKENS_PER_MINUTE",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof environmentKeys)[number], string | undefined>;
const originalFetch = globalThis.fetch;
const checks: Check[] = [];

function check(name: string, condition: unknown, detail?: unknown) {
  checks.push({ name, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
}

function restoreEnvironment() {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function main() {
  process.env.NODE_ENV = "test";
  delete process.env.GEMINI_API_KEY;
  process.env.VELMERE_GEMINI_MODEL = "gemini-current-execution-primary";
  process.env.VELMERE_GEMINI_FALLBACK_MODELS = Array.from(
    { length: 10_000 },
    (_, index) => `gemini-adversarial-fallback-${index}`,
  ).join(",");

  let physicalNetworkCalls = 0;
  globalThis.fetch = (async () => {
    physicalNetworkCalls += 1;
    throw new Error("physical_network_call_forbidden");
  }) as typeof fetch;

  const fallbackModule = await import("../../lib/ai/vlm-provider-fallback-policy.ts");
  const providerRegistry = await import("../../lib/ai/vlm-provider-registry.ts");
  const costGovernor = await import("../../lib/ai/vlm-cost-governor.ts") as CostGovernorModule;
  const maxCandidates = Number(
    (fallbackModule as typeof fallbackModule & { VLM_MAX_MODEL_CANDIDATES?: number })
      .VLM_MAX_MODEL_CANDIDATES,
  );
  check("fallback_candidate_limit_is_explicit", maxCandidates === 4, { maxCandidates });

  const directCandidates = fallbackModule.buildVlmModelCandidates(
    "gemini-current-execution-primary",
    Array.from({ length: 10_000 }, (_, index) => `gemini-direct-fallback-${index}`),
  );
  check("fallback_candidates_are_strictly_bounded", directCandidates.length === 4, {
    count: directCandidates.length,
    head: directCandidates.slice(0, 8),
  });
  check(
    "fallback_candidates_are_unique_and_primary_first",
    new Set(directCandidates).size === directCandidates.length
      && directCandidates[0] === "gemini-current-execution-primary",
    directCandidates,
  );

  const status = providerRegistry.getVlmProviderStatus();
  check("environment_fallback_expansion_is_bounded", status.fallbackModels.length <= 3, {
    fallbackModels: status.fallbackModels,
  });

  process.env.VELMERE_GEMINI_MAX_REQUESTS_PER_MINUTE = "2";
  process.env.VELMERE_GEMINI_MAX_TOKENS_PER_MINUTE = "100000";
  process.env.VELMERE_GEMINI_MAX_PROMPT_TOKENS = "1000";
  process.env.VELMERE_GEMINI_MAX_OUTPUT_TOKENS = "1000";
  costGovernor.resetVlmCostGovernorForTests?.();
  const firstModelReservation = costGovernor.checkVlmCostGovernor({
    namespace: "structured:model-a",
    prompt: "first",
    requestedOutputTokens: 10,
  });
  const secondModelReservation = costGovernor.checkVlmCostGovernor({
    namespace: "structured:model-a",
    prompt: "second",
    requestedOutputTokens: 10,
  });
  const fallbackModelReservation = costGovernor.checkVlmCostGovernor({
    namespace: "structured:model-b",
    prompt: "fallback",
    requestedOutputTokens: 10,
  });
  check(
    "fallback_model_cannot_reset_shared_request_budget",
    firstModelReservation.allowed
      && secondModelReservation.allowed
      && !fallbackModelReservation.allowed,
    { firstModelReservation, secondModelReservation, fallbackModelReservation },
  );

  const guardedDispatch = costGovernor.withVlmProviderCostGovernor;
  check("shared_pre_network_guard_is_exported", typeof guardedDispatch === "function");
  if (guardedDispatch) {
    costGovernor.resetVlmCostGovernorForTests?.();
    let requestDispatches = 0;
    const dispatch = async (decision: CostDecision) => {
      requestDispatches += 1;
      return decision.maxOutputTokens;
    };
    const first = await guardedDispatch({
      namespace: "structured:planner",
      prompt: "bounded planner prompt",
      requestedOutputTokens: 40,
    }, dispatch);
    const second = await guardedDispatch({
      namespace: "structured:synthesis",
      prompt: "bounded synthesis prompt",
      requestedOutputTokens: 60,
    }, dispatch);
    let requestExhaustion: unknown = null;
    try {
      await guardedDispatch({
        namespace: "shadow",
        prompt: "must be rejected before dispatch",
        requestedOutputTokens: 20,
      }, dispatch);
    } catch (error) {
      requestExhaustion = error;
    }
    check(
      "request_exhaustion_fails_before_dispatch",
      first === 40
        && second === 60
        && requestDispatches === 2
        && requestExhaustion instanceof Error
        && /cost budget/iu.test(requestExhaustion.message),
      { first, second, requestDispatches, error: String(requestExhaustion) },
    );

    costGovernor.resetVlmCostGovernorForTests?.();
    process.env.VELMERE_GEMINI_MAX_REQUESTS_PER_MINUTE = "10";
    process.env.VELMERE_GEMINI_MAX_TOKENS_PER_MINUTE = "5";
    let tokenDispatches = 0;
    const tokenDispatch = async () => {
      tokenDispatches += 1;
      return "dispatched";
    };
    await guardedDispatch({
      namespace: "text:angel",
      prompt: "abcd",
      requestedOutputTokens: 2,
    }, tokenDispatch);
    let tokenExhaustion: unknown = null;
    try {
      await guardedDispatch({
        namespace: "shadow",
        prompt: "abcd",
        requestedOutputTokens: 2,
      }, tokenDispatch);
    } catch (error) {
      tokenExhaustion = error;
    }
    check(
      "token_exhaustion_fails_before_dispatch",
      tokenDispatches === 1
        && tokenExhaustion instanceof Error
        && /cost budget/iu.test(tokenExhaustion.message),
      { tokenDispatches, error: String(tokenExhaustion) },
    );

    costGovernor.resetVlmCostGovernorForTests?.();
    process.env.VELMERE_GEMINI_MAX_TOKENS_PER_MINUTE = "1000";
    process.env.VELMERE_GEMINI_MAX_PROMPT_TOKENS = "2";
    let oversizedDispatches = 0;
    let oversizedError: unknown = null;
    try {
      await guardedDispatch({
        namespace: "structured:planner",
        prompt: "this prompt exceeds two estimated tokens",
        requestedOutputTokens: 1,
      }, async () => {
        oversizedDispatches += 1;
        return "unexpected";
      });
    } catch (error) {
      oversizedError = error;
    }
    check(
      "oversized_prompt_fails_before_dispatch",
      oversizedDispatches === 0
        && oversizedError instanceof Error
        && /cost budget/iu.test(oversizedError.message),
      { oversizedDispatches, error: String(oversizedError) },
    );
  }

  const registrySource = fs.readFileSync(
    new URL("../../lib/ai/vlm-provider-registry.ts", import.meta.url),
    "utf8",
  );
  const directProviderDispatches = registrySource.match(
    /(?:ai|client|transport\.client)\.models\.generateContent\(/gu,
  ) ?? [];
  const governedCallSites = registrySource.match(/generateCostGovernedContent\(/gu) ?? [];
  check("one_physical_generate_content_dispatch_boundary", directProviderDispatches.length === 1, {
    count: directProviderDispatches.length,
  });
  check("all_four_call_classes_use_the_shared_boundary", governedCallSites.length === 5, {
    count: governedCallSites.length,
  });
  for (const namespace of ["structured:planner", "structured:synthesis", "shadow", "text:"]) {
    check(`shared_boundary_namespace_${namespace}`, registrySource.includes(namespace));
  }
  check("zero_live_network", physicalNetworkCalls === 0, { physicalNetworkCalls });

  const failures = checks.filter((row) => !row.passed);
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "velmere.current-execution.vlm-provider-cost-amplification-guard.v1",
    status: failures.length === 0 ? "PASS_BOUNDED_ZERO_NETWORK" : "FAIL",
    assertions: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    failures,
    maxCandidates,
    physicalNetworkCalls,
    liveProviderCredit: false,
    productionCostCredit: false,
  }, null, 2)}\n`);
  if (failures.length > 0) throw new Error(`vlm_provider_cost_amplification_guard_failed:${failures.length}`);
}

main()
  .finally(() => {
    globalThis.fetch = originalFetch;
    restoreEnvironment();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
