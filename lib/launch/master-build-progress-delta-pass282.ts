export const pass282PrivacyRedactionEnvelopeGateDelta = [
  {
    id: "K05",
    area: "Privacy redaction envelope",
    previous: 82,
    current: 88,
    change: 6,
    note: "Velvet Redaction Mirror blocks raw query, wallet/IP, analytics and export payload before customer copy or report routes.",
  },
  {
    id: "M05",
    area: "Redacted payload export",
    previous: 84,
    current: 86,
    change: 2,
    note: "Export manifests remain masked/operator-only until storage, retention and receipt replay prove redaction.",
  },
  {
    id: "K03",
    area: "Analytics event taxonomy",
    previous: 49,
    current: 52,
    change: 3,
    note: "Event lanes bind to aggregate/redacted privacy classes and raw analytics payload quarantine.",
  },
  {
    id: "K04",
    area: "Storage adapter contract",
    previous: 49,
    current: 51,
    change: 2,
    note: "Storage contract now feeds the redaction envelope so browser/localStorage previews cannot become proof.",
  },
  {
    id: "K06",
    area: "Operator cases",
    previous: 58,
    current: 60,
    change: 2,
    note: "Operator notes are kept private, redacted and retention-owned before any customer surface.",
  },
  {
    id: "M04",
    area: "Safe export wording",
    previous: 96,
    current: 97,
    change: 1,
    note: "Customer boundary forbids safety/profit/certificate/fraud-confirmation wording and regulated advice.",
  },
] as const;

export const pass282PrivacyRedactionEnvelopeGateTotalDelta = pass282PrivacyRedactionEnvelopeGateDelta.reduce(
  (sum, row) => sum + row.change,
  0,
);

export const pass282PrivacyRedactionEnvelopeGateSummary = {
  pass: "PASS282",
  title: "Privacy Redaction Envelope Gate",
  totalDelta: pass282PrivacyRedactionEnvelopeGateTotalDelta,
  trackerFromPass267: 264,
  innovation: "Velvet Redaction Mirror / Private Redaction Seal",
  primaryIds: ["K05", "M05", "K03", "K04", "K06", "M04"],
  customerExportReady: false,
  rawPayloadAllowed: false,
  publicCertificateAllowed: false,
} as const;
