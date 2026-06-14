import type { LensReport } from "@/lib/search/lens-report";
import type { Pass499A4ReaderHealth } from "./pass499-a4-reader-health";
import type { Pass505PdfPageBreakAudit } from "./pass505-pdf-page-break-audit";
import type { Pass519PdfTypographyQa } from "./pass519-pdf-typography-qa";

export type Pass512ReportIntegritySeal = {
  version: "pass512-report-integrity-seal";
  state: "sealed" | "review" | "blocked";
  checksum: string;
  parityKey: string;
  passed: number;
  total: number;
  readiness: number;
  checks: Array<{ id: string; label: string; passed: boolean; detail: string }>;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `seal-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildPass512ReportIntegritySeal(
  report: LensReport,
  health: Pass499A4ReaderHealth,
  pageAudit: Pass505PdfPageBreakAudit,
  typography?: Pass519PdfTypographyQa,
): Pass512ReportIntegritySeal {
  const checks = [
    { id: "parity", label: "Reader/PDF parity", passed: health.parity, detail: report.pass488.parityKey },
    { id: "pages", label: "A4 page density", passed: pageAudit.status === "ready", detail: `${pageAudit.pages.filter((page) => page.status === "ready").length}/${pageAudit.pages.length}` },
    { id: "sources", label: "Source ledger", passed: health.sourceCount > 0, detail: String(health.sourceCount) },
    { id: "confidence", label: "Confidence boundary", passed: report.sourceConfidence > 0, detail: `${report.sourceConfidence}%` },
    { id: "unknowns", label: "Missing data disclosed", passed: Boolean(report.pass450.unknownPolicy), detail: String(report.missingData.length) },
    { id: "depth", label: "Depth contract", passed: report.pass477.selectedDepth === report.selectedDepth, detail: report.selectedDepth },
    { id: "typography", label: "Typography QA", passed: Boolean(typography && typography.state !== "blocked"), detail: typography ? `${typography.state}:${typography.score}` : "missing" },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const readiness = Math.round((passed / checks.length) * 100);
  const state = passed <= checks.length - 2 || health.status === "blocked"
    ? "blocked"
    : passed < checks.length || pageAudit.status === "review"
      ? "review"
      : "sealed";
  return {
    version: "pass512-report-integrity-seal",
    state,
    checksum: stableHash([
      report.brain.checksum,
      report.pass488.parityKey,
      report.selectedDepth,
      String(report.sourceConfidence),
      String(report.sources.length),
      String(report.missingData.length),
    ].join("|")),
    parityKey: report.pass488.parityKey,
    passed,
    total: checks.length,
    readiness,
    checks,
  };
}
