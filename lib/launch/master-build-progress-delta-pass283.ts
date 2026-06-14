export const pass283OperatorCaseSlaOrchestratorGateDelta = [
  {
    id: "K06",
    area: "Operator cases",
    previous: 60,
    current: 68,
    change: 8,
    note: "Concierge Escalation Rail turns source, storage, redaction and owner gaps into a private SLA timeline before customer copy.",
  },
  {
    id: "M07",
    area: "Operator-only report fields",
    previous: 95,
    current: 96,
    change: 1,
    note: "Case stages keep owner notes, P0 queues and reopen triggers operator-only until review proof exists.",
  },
  {
    id: "K04",
    area: "Storage adapter contract",
    previous: 51,
    current: 53,
    change: 2,
    note: "Operator case SLA explicitly blocks durable handoff when server case storage is missing.",
  },
  {
    id: "K05",
    area: "Privacy redaction envelope",
    previous: 88,
    current: 90,
    change: 2,
    note: "Case ownership inherits raw payload quarantine and redaction review before any public summary.",
  },
  {
    id: "M05",
    area: "Redacted payload export",
    previous: 86,
    current: 87,
    change: 1,
    note: "Case export stays frozen until operator owner, storage write, source replay and redaction stages are closed.",
  },
  {
    id: "M04",
    area: "Safe export wording",
    previous: 97,
    current: 98,
    change: 1,
    note: "Customer boundary forbids safety certificate, profit claim, raw payload and buy/sell instruction wording.",
  },
] as const;

export const pass283OperatorCaseSlaOrchestratorGateTotalDelta = pass283OperatorCaseSlaOrchestratorGateDelta.reduce(
  (sum, row) => sum + row.change,
  0,
);

export const pass283OperatorCaseSlaOrchestratorGateSummary = {
  pass: "PASS283",
  title: "Operator Case SLA Orchestrator Gate",
  totalDelta: pass283OperatorCaseSlaOrchestratorGateTotalDelta,
  trackerFromPass267: 279,
  innovation: "Concierge Escalation Rail / Private Concierge Case",
  primaryIds: ["K06", "M07", "K04", "K05", "M05", "M04"],
  customerExportReady: false,
  rawPayloadAllowed: false,
  publicCertificateAllowed: false,
} as const;
