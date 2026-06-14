export const pass285CustomerSafeRiskBriefGateDelta = [
  {
    id: "M01",
    area: "Velmère Shield Report",
    previous: 72,
    current: 78,
    change: 6,
    note: "Customer-safe risk brief now has a Proof Compass that turns evidence, source TTL, redaction, storage and retention into a bounded customer summary gate.",
  },
  {
    id: "M02",
    area: "Lens report preview",
    previous: 78,
    current: 80,
    change: 2,
    note: "Report preview inherits source appendix and missing-data boundaries before any future binary PDF route.",
  },
  {
    id: "M04",
    area: "Safe export wording",
    previous: 99,
    current: 100,
    change: 1,
    note: "Brief copy explicitly blocks guarantees, accusations, buy/sell pressure and safety-certificate wording.",
  },
  {
    id: "M05",
    area: "Redacted payload export",
    previous: 89,
    current: 91,
    change: 2,
    note: "Customer brief requires the redaction boundary and raw-payload quarantine to pass before public copy can be upgraded.",
  },
  {
    id: "K02",
    area: "Source freshness registry",
    previous: 69,
    current: 71,
    change: 2,
    note: "Customer summary now reads chart/depth/source TTL decay as a report blocker instead of hiding stale evidence.",
  },
  {
    id: "K05",
    area: "Privacy redaction envelope",
    previous: 92,
    current: 93,
    change: 1,
    note: "Private payloads remain masked before brief/export routing can become customer-visible.",
  },
  {
    id: "K07",
    area: "Retention policy",
    previous: 34,
    current: 36,
    change: 2,
    note: "Retention/delete owner and TTL policy now feed directly into customer-copy readiness.",
  },
] as const;

export const pass285CustomerSafeRiskBriefGateTotalDelta = pass285CustomerSafeRiskBriefGateDelta.reduce(
  (sum, row) => sum + row.change,
  0,
);

export const pass285CustomerSafeRiskBriefGateSummary = {
  pass: "PASS285",
  title: "Customer-Safe Risk Brief Gate",
  totalDelta: pass285CustomerSafeRiskBriefGateTotalDelta,
  trackerFromPass267: 319,
  innovation: "Proof Compass / Velvet Brief Seal",
  primaryIds: ["M01", "M02", "M04", "M05", "K02", "K05", "K07"],
  customerExportReady: false,
  rawPayloadAllowed: false,
  publicCertificateAllowed: false,
  tradeInstructionAllowed: false,
} as const;
