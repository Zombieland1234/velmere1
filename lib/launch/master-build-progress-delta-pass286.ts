export const pass286LensReportPreviewGateDelta = [
  {
    id: "M02",
    area: "Lens report preview",
    previous: 80,
    current: 86,
    change: 6,
    note: "Lens report preview now has a Proof Passport Scroll that stitches cover, brief, source appendix, redaction boundary and export footer into one gated preview shell.",
  },
  {
    id: "M01",
    area: "Velmère Shield Report",
    previous: 78,
    current: 80,
    change: 2,
    note: "The preview shell reuses the customer-safe brief instead of inventing separate report copy.",
  },
  {
    id: "M03",
    area: "Evidence Note",
    previous: 62,
    current: 65,
    change: 3,
    note: "Missing evidence, source freshness and redaction notes are rendered as bounded evidence notes inside the preview rather than marketing claims.",
  },
  {
    id: "M05",
    area: "Redacted payload export",
    previous: 91,
    current: 93,
    change: 2,
    note: "Preview sections are blocked when raw wallet/IP, raw query, analytics payload or operator notes would leak into customer copy.",
  },
  {
    id: "K02",
    area: "Source freshness registry",
    previous: 71,
    current: 73,
    change: 2,
    note: "Source TTL state now controls the Lens report appendix and blocks stale/missing source preview confidence.",
  },
  {
    id: "K04",
    area: "Storage adapter contract",
    previous: 55,
    current: 56,
    change: 1,
    note: "Browser preview is explicitly separated from durable storage and cannot become proof or download readiness.",
  },
  {
    id: "K05",
    area: "Privacy redaction envelope",
    previous: 93,
    current: 94,
    change: 1,
    note: "Private fields stay masked before report preview sections become customer-visible.",
  },
  {
    id: "K07",
    area: "Retention policy",
    previous: 36,
    current: 38,
    change: 2,
    note: "Retention/delete owner remains a hard gate for report preview and future PDF export.",
  },
] as const;

export const pass286LensReportPreviewGateTotalDelta = pass286LensReportPreviewGateDelta.reduce(
  (sum, row) => sum + row.change,
  0,
);

export const pass286LensReportPreviewGateSummary = {
  pass: "PASS286",
  title: "Lens Report Preview Gate",
  totalDelta: pass286LensReportPreviewGateTotalDelta,
  trackerFromPass267: 338,
  innovation: "Proof Passport Scroll / Velvet Preview Seal",
  primaryIds: ["M02", "M01", "M03", "M05", "K02", "K04", "K05", "K07"],
  customerExportReady: false,
  binaryPdfReady: false,
  rawPayloadAllowed: false,
  tradeInstructionAllowed: false,
} as const;
