export const pass284RetentionPolicyGateDelta = [
  {
    id: "K07",
    area: "Retention policy",
    previous: 20,
    current: 34,
    change: 14,
    note: "Quiet Vault Clock adds explicit TTL/delete/export retention lanes so evidence is bounded instead of retained as raw payload forever.",
  },
  {
    id: "K04",
    area: "Storage adapter contract",
    previous: 53,
    current: 55,
    change: 2,
    note: "Retention policy now depends on server storage proof and refuses to treat browser previews as durable deletion proof.",
  },
  {
    id: "K05",
    area: "Privacy redaction envelope",
    previous: 90,
    current: 92,
    change: 2,
    note: "Wallet/IP, raw search query and raw analytics payload are explicitly excluded from retention and export surfaces.",
  },
  {
    id: "K06",
    area: "Operator cases",
    previous: 68,
    current: 71,
    change: 3,
    note: "Case SLA now inherits retention/delete ownership before customer summary or export can advance.",
  },
  {
    id: "M05",
    area: "Redacted payload export",
    previous: 87,
    current: 89,
    change: 2,
    note: "Export manifest now requires a retention TTL boundary, delete owner and redacted evidence class.",
  },
  {
    id: "M04",
    area: "Safe export wording",
    previous: 98,
    current: 99,
    change: 1,
    note: "Customer boundary keeps retention status as a review limitation, not a safety certificate or action prompt.",
  },
] as const;

export const pass284RetentionPolicyGateTotalDelta = pass284RetentionPolicyGateDelta.reduce(
  (sum, row) => sum + row.change,
  0,
);

export const pass284RetentionPolicyGateSummary = {
  pass: "PASS284",
  title: "Retention Policy Gate",
  totalDelta: pass284RetentionPolicyGateTotalDelta,
  trackerFromPass267: 303,
  innovation: "Quiet Vault Clock / Velvet TTL Seal",
  primaryIds: ["K07", "K04", "K05", "K06", "M05", "M04"],
  customerExportReady: false,
  rawPayloadAllowed: false,
  walletIpRetentionAllowed: false,
  publicCertificateAllowed: false,
} as const;
