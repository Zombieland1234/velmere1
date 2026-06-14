export const PASS315_CUSTOMER_SURFACE_TRIM_GATE = "PASS315_CUSTOMER_SURFACE_TRIM_GATE" as const;

type CustomerSurfaceTrimInput = {
  surface: "vlm-browser" | "shield-map" | "square" | "research-lab" | "security" | "market-table";
  publicAction: string;
  hiddenOperatorPanels: number;
  sourceFreshnessSeconds?: number;
  dppTraceability?: "none" | "partial" | "ready";
};

type CustomerSurfaceTrimResult = {
  marker: typeof PASS315_CUSTOMER_SURFACE_TRIM_GATE;
  surface: CustomerSurfaceTrimInput["surface"];
  publicMode: "clean_customer_surface" | "guided_preview";
  publicBrief: string;
  hiddenOperatorPanels: number;
  microSteps: string[];
  antiFomoBoundary: string;
  premiumStatusRule: string;
};

export function buildCustomerSurfaceTrimGate(input: CustomerSurfaceTrimInput): CustomerSurfaceTrimResult {
  const liveWindow = input.sourceFreshnessSeconds !== undefined && input.sourceFreshnessSeconds <= 86_400;
  const dppReady = input.dppTraceability === "ready";
  const publicMode = liveWindow || dppReady ? "clean_customer_surface" : "guided_preview";

  return {
    marker: PASS315_CUSTOMER_SURFACE_TRIM_GATE,
    surface: input.surface,
    publicMode,
    publicBrief: `${input.surface} shows one calm action: ${input.publicAction}. Operator diagnostics stay hidden until review mode is enabled.`,
    hiddenOperatorPanels: Math.max(0, input.hiddenOperatorPanels),
    microSteps: ["search", "short capsule", "source boundary", "signed preview"],
    antiFomoBoundary: "No countdowns, no buy/sell command, no fake scarcity; weaker evidence hides status instead of increasing pressure.",
    premiumStatusRule: "Premium wording unlocks only when freshness, traceability and review boundaries are visible.",
  };
}
