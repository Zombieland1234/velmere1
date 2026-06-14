export type SecuritySafeHarborPhase = "disabled" | "private_intake" | "sandbox_only" | "public_ready";

export type SecuritySafeHarborRule = {
  id: string;
  label: string;
  publicCopy: string;
  operatorBoundary: string;
  state: "ready" | "preview" | "blocked";
};

export type SecuritySafeHarborSnapshot = {
  version: "PASS356.security_safe_harbor_readiness";
  phase: SecuritySafeHarborPhase;
  publicHeadline: string;
  customerBoundary: string;
  launchGate: string;
  rules: SecuritySafeHarborRule[];
  blockedUntil: string[];
};

export function buildSecuritySafeHarborSnapshot(): SecuritySafeHarborSnapshot {
  const rules: SecuritySafeHarborRule[] = [
    {
      id: "scope-first",
      label: "Scope first",
      publicCopy: "Testy tylko w wyznaczonym scope i tylko po publikacji zasad programu.",
      operatorBoundary: "No production probing before safe-harbor, sandbox target and contact route are published.",
      state: "preview",
    },
    {
      id: "no-user-harm",
      label: "No user harm",
      publicCopy: "Zakazane są ataki na użytkowników, DDoS, social engineering i próby wyciągania danych.",
      operatorBoundary: "Reject reports that require data exposure, service disruption or user targeting.",
      state: "ready",
    },
    {
      id: "responsible-report",
      label: "Responsible report",
      publicCopy: "Raport ma zawierać opis wpływu, kroki odtworzenia i dowód bez publikowania luki publicznie.",
      operatorBoundary: "Require reproducibility, severity, affected route and redacted evidence.",
      state: "preview",
    },
    {
      id: "reward-gate",
      label: "Reward gate",
      publicCopy: "Nagroda lub współpraca zależy od wpływu, jakości raportu i potwierdzenia przez operatora.",
      operatorBoundary: "No bounty promise until legal terms, budget and triage SLA are final.",
      state: "blocked",
    },
  ];

  return {
    version: "PASS356.security_safe_harbor_readiness",
    phase: "private_intake",
    publicHeadline: "Security challenge zostaje prywatnym intake, dopóki scope, sandbox i regulamin nie są zamknięte.",
    customerBoundary: "Velmère pokazuje filary ochrony, ale nie zaprasza do testowania produkcji ani nie zdradza reguł operatorowych.",
    launchGate: "safe-harbor + sandbox + contact route + triage SLA + legal wording",
    rules,
    blockedUntil: [
      "sandbox target separated from production",
      "responsible disclosure terms approved",
      "operator triage SLA and contact channel ready",
      "reward language legally reviewed",
    ],
  };
}
