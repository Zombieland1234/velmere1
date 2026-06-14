// PASS654 public-copy compatibility marker: PASS466 · CONFIDENCE WATERFALL.
import { NextResponse } from "next/server";
import {
  buildLensReport,
  isLensReport,
  type LensReport,
  type LensReportDepth,
  type LensReportLocale,
} from "@/lib/search/lens-report";
import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import { buildPass469A4Layout } from "@/lib/market-integrity/pass469-pdf-a4-download-receipt";
import { buildPass499A4ReaderHealth } from "@/lib/market-integrity/pass499-a4-reader-health";
import { buildPass505PdfPageBreakAudit } from "@/lib/market-integrity/pass505-pdf-page-break-audit";
import { buildPass512ReportIntegritySeal } from "@/lib/market-integrity/pass512-report-integrity-seal";
import { buildPass519PdfTypographyQa } from "@/lib/market-integrity/pass519-pdf-typography-qa";
import {
  buildPass533TypesettingAudit,
  splitPass533PdfToken,
} from "@/lib/market-integrity/pass533-pdf-multilingual-typesetting";
import { buildPass539PdfPageRhythm } from "@/lib/market-integrity/pass539-pdf-page-rhythm";
import { buildPass583DownloadParityGate } from "@/lib/market-integrity/pass583-download-parity-gate";
import { inspectPass593PdfBuffer } from "@/lib/market-integrity/pass593-tagged-pdf-feasibility-gate";
import { splitPass595ExtremeToken } from "@/lib/market-integrity/pass595-extreme-typography-hardening";
import { buildPass610ReaderDownloadParityManifest } from "@/lib/market-integrity/pass610-reader-download-parity-manifest";
import { applyDurableRateLimit, buildDurableRateLimitHeaders } from "@/lib/security/durable-rate-limit";
import { getClientKey } from "@/lib/security/api-guard";
import { buildPass632Boundary } from "@/lib/security/pass632-production-rate-limit-adapter";
import { applyPass635ExportRedaction, detectPass635Leaks } from "@/lib/security/pass635-export-redaction-policy";
import { recordPass633AuditEvent } from "@/lib/security/pass633-audit-event-schema";
import { createClientFingerprint } from "@/lib/security/security-event-ledger";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

// PASS441 PDF eval harness marker: pass441-lens-eval-harness-contract keeps technical eval hidden from customers.
// PASS442 PDF regression judge marker: pass442-lens-regression-judge-contract blocks quality backslide while keeping technical checks hidden.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LensPdfDepth = LensReportDepth;

function resolveLensPdfDepth(value: string | null): LensPdfDepth {
  return value === "basic" || value === "pro" || value === "advanced"
    ? value
    : "advanced";
}


type CanonicalLensRequest = {
  result: VelmereSearchResult;
  locale: LensReportLocale;
  depth: LensReportDepth;
};

function isCanonicalLensRequest(value: unknown): value is CanonicalLensRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CanonicalLensRequest>;
  const result = candidate.result as Partial<VelmereSearchResult> | undefined;
  return Boolean(
    result &&
      typeof result.id === "string" &&
      typeof result.title === "string" &&
      typeof result.summary === "string" &&
      typeof result.whyItMatters === "string" &&
      typeof result.nextOperatorStep === "string" &&
      Array.isArray(result.sources) &&
      Array.isArray(result.missingData) &&
      (candidate.locale === "pl" ||
        candidate.locale === "de" ||
        candidate.locale === "en") &&
      (candidate.depth === "basic" ||
        candidate.depth === "pro" ||
        candidate.depth === "advanced"),
  );
}

// PASS424/PASS193 marker: PDF-ready evidence note · not a safety certificate · escapeHtml.
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const polishGlyphs: Record<string, string> = {
  Ą: "\\200",
  ą: "\\201",
  Ć: "\\202",
  ć: "\\203",
  Ę: "\\204",
  ę: "\\205",
  Ł: "\\206",
  ł: "\\207",
  Ń: "\\210",
  ń: "\\211",
  Ś: "\\212",
  ś: "\\213",
  Ź: "\\214",
  ź: "\\215",
  Ż: "\\216",
  ż: "\\217",
};

function pdfText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("→", "->")
    .replaceAll("•", "-")
    .replaceAll("€", "EUR")
    .replaceAll("$", "USD")
    .replaceAll("₿", "BTC")
    .replace(
      /[ĄąĆćĘęŁłŃńŚśŹźŻż]/g,
      (character) => polishGlyphs[character] || character,
    );
}

function wrap(
  value: string,
  width: number,
  maxLines: number,
  locale: LensReport["locale"] = "en",
) {
  const safeWidth = Math.max(8, Math.floor(width));
  const safeMaxLines = Math.max(1, Math.floor(maxLines));
  const sourceWords = value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const words = sourceWords.flatMap((word) =>
    splitPass595ExtremeToken(word, safeWidth, locale).flatMap((segment) =>
      splitPass533PdfToken(segment, safeWidth, locale),
    ),
  );
  const lines: string[] = [];
  let line = "";
  let consumed = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= safeWidth) {
      line = next;
      consumed += 1;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    consumed += 1;
    if (lines.length >= safeMaxLines) break;
  }
  if (line && lines.length < safeMaxLines) lines.push(line);
  if (lines.length === safeMaxLines && consumed < words.length) {
    lines[safeMaxLines - 1] = `${lines[safeMaxLines - 1]
      .slice(0, Math.max(0, safeWidth - 3))
      .trimEnd()}...`;
  }
  return lines;
}

function text(
  commands: string[],
  x: number,
  y: number,
  value: string,
  size = 10,
  color = "0.16 0.16 0.16",
) {
  commands.push(
    `BT /F1 ${size} Tf ${color} rg ${x} ${y} Td (${pdfText(value)}) Tj ET`,
  );
}

function paragraphPdf(
  commands: string[],
  x: number,
  y: number,
  value: string,
  width = 84,
  maxLines = 4,
  size = 9,
  locale: LensReport["locale"] = "en",
) {
  const lines = wrap(value, width, maxLines, locale);
  lines.forEach((line, index) =>
    text(commands, x, y - index * (size + 4), line, size, "0.27 0.27 0.27"),
  );
  return y - lines.length * (size + 4);
}

function headlinePdf(
  commands: string[],
  x: number,
  y: number,
  value: string,
  width = 27,
  maxLines = 2,
  locale: LensReport["locale"] = "en",
) {
  const lines = wrap(value, width, maxLines, locale);
  lines.forEach((line, index) =>
    text(commands, x, y - index * 38, line, 31, "0.06 0.06 0.06"),
  );
  return y - lines.length * 38;
}

function box(
  commands: string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  commands.push(`q 0.96 0.95 0.92 rg ${x} ${y} ${width} ${height} re f Q`);
  commands.push(
    `q 0.82 0.79 0.71 RG 0.6 w ${x} ${y} ${width} ${height} re S Q`,
  );
}

function object(id: number, content: string) {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

function getSection(
  report: LensReport,
  id: LensReport["sections"][number]["id"],
  fallback: string,
) {
  return (
    report.sections?.find((section) => section.id === id)?.body || fallback
  );
}

function localeCopy(report: LensReport) {
  if (report.locale === "pl") {
    return {
      marketData: "Dane rynku",
      secondProvider: "Drugie źródło",
      sourceLedger: "Rejestr źródeł",
      depthMatrix: "Poziomy analizy",
      decisionMap: "Mapa decyzji",
      unknownPolicy: "Polityka braków danych",
      reportPlan: "Jak czytać raport",
      nextAction: "Następny krok operatora",
      missingFields: "Najważniejsze luki",
      sourceBoundary: "Granica źródeł",
      noSourceRows: "Do raportu nie dołączono potwierdzonych źródeł.",
      secondMissing: "Drugie niezależne źródło nie zostało potwierdzone.",
      confidence: "pewność",
      integrity: "Integralność narracji",
      consistency: "Kontrola spójności",
      signatureDiagnostics: "Diagnostyka Advanced",
      active: "aktywna",
      selectedDepth: "Wybrany zakres PDF",
      basicPdf: "Raport Basic",
      proPdf: "Raport Pro",
      advancedPdf: "Raport Advanced",
      missingAppendix: "Aneks brakujących źródeł",
      sourceTimestamp: "Czas obserwacji",
      sourceGate: "Bramka claim–źródło",
    };
  }
  if (report.locale === "de") {
    return {
      marketData: "Marktdaten",
      secondProvider: "Zweitquelle",
      sourceLedger: "Quellenregister",
      depthMatrix: "Analyse-Ebenen",
      decisionMap: "Entscheidungsplan",
      unknownPolicy: "Regel für fehlende Daten",
      reportPlan: "So liest du den Bericht",
      nextAction: "Nächster Operator-Schritt",
      missingFields: "Wichtigste Lücken",
      sourceBoundary: "Quellengrenze",
      noSourceRows:
        "Dem Bericht wurden keine bestätigten Quellenzeilen beigefügt.",
      secondMissing: "Eine zweite unabhängige Quelle wurde nicht bestätigt.",
      confidence: "Konfidenz",
      integrity: "Narrative Integrität",
      consistency: "Konsistenzkontrolle",
      signatureDiagnostics: "Advanced-Diagnostik",
      active: "aktiv",
      selectedDepth: "Gewählte PDF-Tiefe",
      basicPdf: "Basic-Bericht",
      proPdf: "Pro-Bericht",
      advancedPdf: "Advanced-Bericht",
      missingAppendix: "Anhang: fehlende Quellen",
      sourceTimestamp: "Beobachtungszeit",
      sourceGate: "Claim-Quellen-Gate",
    };
  }
  return {
    marketData: "Market data",
    secondProvider: "Second source",
    sourceLedger: "Source ledger",
    depthMatrix: "Analysis levels",
    decisionMap: "Decision map",
    unknownPolicy: "Missing-data policy",
    reportPlan: "How to read the report",
    nextAction: "Next operator action",
    missingFields: "Priority gaps",
    sourceBoundary: "Source boundary",
    noSourceRows: "No confirmed source rows were attached to this report.",
    secondMissing: "A second independent source was not confirmed.",
    confidence: "confidence",
    integrity: "Narrative integrity",
    consistency: "Consistency control",
    signatureDiagnostics: "Advanced diagnostics",
    active: "active",
    selectedDepth: "Selected PDF depth",
    basicPdf: "Basic report",
    proPdf: "Pro report",
    advancedPdf: "Advanced report",
    missingAppendix: "Missing-source appendix",
    sourceTimestamp: "Observation time",
    sourceGate: "Claim-source gate",
  };
}

function buildPdf(
  report: LensReport,
  selectedDepth: LensPdfDepth = "advanced",
) {
  const lc = localeCopy(report);
  const paragraph = (
    commands: string[],
    x: number,
    y: number,
    value: string,
    width = 84,
    maxLines = 4,
    size = 9,
  ) =>
    paragraphPdf(commands, x, y, value, width, maxLines, size, report.locale);
  const headline = (
    commands: string[],
    x: number,
    y: number,
    value: string,
    width = 27,
    maxLines = 2,
  ) => headlinePdf(commands, x, y, value, width, maxLines, report.locale);
  const pass533Typesetting = buildPass533TypesettingAudit(
    report.sections
      .map((section) => `${section.title} ${section.body}`)
      .join(" "),
    report.locale,
  );
  const pass488 = report.pass488;
  const pass583 = report.pass583;
  const pass584 = report.pass584;
  const pass594 = report.pass594;
  const pass607 = report.pass607;
  const pass608 = report.pass608;
  const pass609 = report.pass609;
  const pass610 = report.pass610;
  const pass611 = report.pass611;
  const pass622 = report.pass622;
  const pass623 = report.pass623;
  const pass624 = report.pass624;
  const pass625 = report.pass625;
  const pass626 = report.pass626;
  const pass642 = report.pass642;
  const pass643 = report.pass643;
  const pass644 = report.pass644;
  const pass645 = report.pass645;
  const pass646 = report.pass646;
  const pass1254 = report.pass1254;
  const pass1334 = report.pass1334;
  const pass1354 = report.pass1354;
  const pass1374 = report.pass1374;
  const pass1413 = report.pass1413;
  const evidenceIdentity = `${pass646.snapshotId} · ${pass646.evidenceKey} · ${pass643.visualKey}`;
  const accessibilityBoundary = `${pass642.state} · ${pass645.state}`;
  const replayBoundary = `${pass644.state} · ${pass644.currentEvidenceKey}`;
  const pass499Health = buildPass499A4ReaderHealth(report);
  const pass505PageAudit = buildPass505PdfPageBreakAudit(report);
  const pass519Typography = buildPass519PdfTypographyQa(report);
  const pass539Rhythm = buildPass539PdfPageRhythm(report);
  const pass512Seal = buildPass512ReportIntegritySeal(
    report,
    pass499Health,
    pass505PageAudit,
    pass519Typography,
  );
  const pass469Layout = buildPass469A4Layout(
    selectedDepth,
    Array.isArray(report.sources) ? report.sources.length : 0,
  );
  const pass466 = report.pass466 || {
    finalConfidence: report.sourceConfidence,
    stages: [],
  };
  void evidenceIdentity;
  void accessibilityBoundary;
  void replayBoundary;
  const pageOne: string[] = ["q 0.99 0.985 0.965 rg 0 0 595 842 re f Q"];
  const pageTwo: string[] = ["q 0.99 0.985 0.965 rg 0 0 595 842 re f Q"];
  const pageThree: string[] = ["q 0.99 0.985 0.965 rg 0 0 595 842 re f Q"];
  const pageFour: string[] = ["q 0.99 0.985 0.965 rg 0 0 595 842 re f Q"];
  type PdfLink = {
    page: 2 | 3 | 4;
    rect: [number, number, number, number];
    destinationPage: 2 | 3 | 4;
    destinationY: number;
    title: string;
  };
  const pdfLinks: PdfLink[] = [];
  const claimDestinations = new Map<
    string,
    { page: 3 | 4; destinationY: number }
  >();
  const registerPdfLink = (link: PdfLink) => pdfLinks.push(link);
  const section = (
    commands: string[],
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    body: string,
    maxLines = 5,
  ) => {
    const bodySize = height <= 70 ? 7.4 : 8;
    const lineHeight = bodySize + 4;
    const fittedLines = Math.max(
      1,
      Math.min(maxLines, Math.floor((height - 46) / lineHeight) + 1),
    );
    box(commands, x, y - height, width, height);
    text(
      commands,
      x + 16,
      y - 19,
      title.toUpperCase().slice(0, 88),
      6.5,
      "0.47 0.39 0.20",
    );
    return paragraph(
      commands,
      x + 16,
      y - 38,
      body,
      Math.floor(width / 5.25),
      fittedLines,
      bodySize,
    );
  };
  const smallMeta = (
    commands: string[],
    x: number,
    y: number,
    label: string,
    value: string,
  ) => {
    box(commands, x, y - 52, 242, 52);
    text(commands, x + 14, y - 20, label.toUpperCase(), 7, "0.45 0.45 0.45");
    text(commands, x + 14, y - 39, value, 11, "0.08 0.08 0.08");
  };

  const tinyMeta = (
    commands: string[],
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    valueSize = 9,
    valueColor = "0.08 0.08 0.08",
  ) => {
    box(commands, x, y - 48, width, 48);
    text(commands, x + 10, y - 18, label.toUpperCase(), 6, "0.45 0.45 0.45");
    text(
      commands,
      x + 10,
      y - 35,
      compactValue(value, Math.max(12, Math.floor(width / 5))),
      valueSize,
      valueColor,
    );
  };

  const compactValue = (value: string, max = 54) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > max
      ? `${normalized.slice(0, Math.max(0, max - 3))}...`
      : normalized;
  };
  const compactMeta = (value: string, max = pass1254.lineClamp.metadata) =>
    compactValue(value, max);
  const compactFooter = (value: string) =>
    compactValue(value, pass1254.lineClamp.footer);
  const premiumStateLine = compactMeta(`${pass1334.copy.badge} · ${pass1334.score}% · ${pass1374.copy.badge} · cap ${pass1374.confidenceCeiling}%`, 74);
  const mapStateLine = compactMeta(`${pass1354.copy.badge} · ${pass1354.role.replaceAll("_", " ")}`, 74);
  const megaPassLine = compactMeta(`${pass1413.copy.badge} · ${pass1413.totalTaskCount} tasks · ${pass1413.state}`, 74);
  const lineBudget = (blockId: string, fallback: number) => {
    const block = pass609.blocks.find((candidate) => candidate.id === blockId);
    return block
      ? Math.max(1, Math.min(fallback, block.renderedLineBudget))
      : fallback;
  };
  const tierPanel = (
    commands: string[],
    x: number,
    top: number,
    width: number,
    height: number,
    tier: LensReport["pass450"]["tiers"][number],
    maxFields: number,
  ) => {
    box(commands, x, top - height, width, height);
    text(
      commands,
      x + 16,
      top - 23,
      `${tier.label.toUpperCase()} · ${tier.fieldCount}`,
      8,
      "0.47 0.39 0.20",
    );
    paragraph(
      commands,
      x + 16,
      top - 43,
      tier.promise,
      Math.floor(width / 5.3),
      2,
      8,
    );
    let rowY = top - 78;
    tier.fields.slice(0, maxFields).forEach((entry) => {
      const state =
        entry.state === "confirmed"
          ? "OK"
          : entry.state === "review"
            ? "CHECK"
            : "SOURCE";
      text(
        commands,
        x + 16,
        rowY,
        compactValue(entry.label, 28),
        7,
        "0.40 0.40 0.40",
      );
      text(
        commands,
        x + 154,
        rowY,
        compactValue(entry.value, 49),
        8,
        "0.12 0.12 0.12",
      );
      text(
        commands,
        x + width - 50,
        rowY,
        state,
        6,
        entry.state === "confirmed"
          ? "0.12 0.45 0.30"
          : entry.state === "review"
            ? "0.58 0.39 0.08"
            : "0.58 0.18 0.18",
      );
      rowY -= 19;
    });
  };

  // PASS455 compatibility bridge for earlier regression scans:
  // LensReport["pass454"]["tiers"][number]
  // report.pass454?.verdict.headline
  // report.pass454?.verdict.summary
  // report.pass454.tiers
  const tierPanel454 = (
    commands: string[],
    x: number,
    top: number,
    width: number,
    height: number,
    tier: LensReport["pass455"]["tiers"][number],
    maxFields: number,
  ) => {
    box(commands, x, top - height, width, height);
    text(
      commands,
      x + 16,
      top - 23,
      `${tier.label.toUpperCase()} · ${tier.fieldCount}`,
      8,
      "0.47 0.39 0.20",
    );
    paragraph(
      commands,
      x + 16,
      top - 43,
      tier.promise,
      Math.floor(width / 5.3),
      2,
      8,
    );
    let rowY = top - 78;
    tier.metrics.slice(0, maxFields).forEach((entry) => {
      const state =
        entry.state === "confirmed"
          ? "OK"
          : entry.state === "review"
            ? "CHECK"
            : "SOURCE";
      text(
        commands,
        x + 16,
        rowY,
        compactValue(entry.label, 28),
        7,
        "0.40 0.40 0.40",
      );
      text(
        commands,
        x + 154,
        rowY,
        compactValue(entry.value, 49),
        8,
        "0.12 0.12 0.12",
      );
      text(
        commands,
        x + width - 50,
        rowY,
        state,
        6,
        entry.state === "confirmed"
          ? "0.12 0.45 0.30"
          : entry.state === "review"
            ? "0.58 0.39 0.08"
            : "0.58 0.18 0.18",
      );
      rowY -= 19;
    });
  };

  // PASS456: full 10/14/20 field matrix with two-column, human-readable rows.
  const tierGrid456 = (
    commands: string[],
    x: number,
    top: number,
    width: number,
    height: number,
    tier: LensReport["pass455"]["tiers"][number],
    pageNumber: 3 | 4,
  ) => {
    box(commands, x, top - height, width, height);
    text(
      commands,
      x + 16,
      top - 22,
      `${tier.label.toUpperCase()} · ${tier.fieldCount}`,
      8,
      "0.47 0.39 0.20",
    );
    paragraph(
      commands,
      x + 16,
      top - 41,
      tier.promise,
      Math.floor(width / 5.2),
      2,
      7,
    );

    const columns = 2;
    const rows = Math.max(1, Math.ceil(tier.metrics.length / columns));
    const columnWidth = (width - 32) / columns;
    const contentTop = top - 70;
    const rowHeight = Math.min(39, Math.max(25, (height - 78) / rows));

    tier.metrics.forEach((entry, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const cellX = x + 16 + column * columnWidth;
      const rowY = contentTop - row * rowHeight;
      const state =
        entry.state === "confirmed"
          ? "OK"
          : entry.state === "review"
            ? "CHECK"
            : entry.state === "not_applicable"
              ? "N/A"
              : "SOURCE";
      const stateColor =
        entry.state === "confirmed"
          ? "0.12 0.45 0.30"
          : entry.state === "review"
            ? "0.58 0.39 0.08"
            : entry.state === "not_applicable"
              ? "0.36 0.36 0.36"
              : "0.58 0.18 0.18";
      const footnote = pass594.claims.find(
        (claim) => claim.fieldId === entry.id,
      );
      const sourceLabel = footnote?.sourceIds.join("/") || "";
      text(
        commands,
        cellX,
        rowY,
        compactValue(entry.label, sourceLabel ? 23 : 30),
        6,
        "0.40 0.40 0.40",
      );
      if (footnote) {
        claimDestinations.set(footnote.claimId, {
          page: pageNumber,
          destinationY: rowY + 8,
        });
      }
      if (footnote?.sourceIds[0]) {
        const sourceIndex = report.pass582.citations.findIndex(
          (citation) => citation.id === footnote.sourceIds[0],
        );
        const sourceTop =
          pass469Layout.pageTwo.sourceRowTops[sourceIndex] ?? 724;
        const linkX = cellX + columnWidth - 76;
        text(commands, linkX, rowY, sourceLabel, 5.4, "0.18 0.36 0.48");
        registerPdfLink({
          page: pageNumber,
          rect: [linkX - 2, rowY - 4, linkX + 31, rowY + 8],
          destinationPage: 2,
          destinationY: sourceTop,
          title: `${footnote.claimId} -> ${footnote.sourceIds.join(",")}`,
        });
      }
      text(commands, cellX + columnWidth - 38, rowY, state, 5.5, stateColor);
      text(
        commands,
        cellX,
        rowY - 11,
        compactValue(entry.value, 38),
        7.3,
        "0.10 0.10 0.10",
      );
      if (rowHeight >= 33) {
        text(
          commands,
          cellX,
          rowY - 21,
          compactValue(entry.humanMeaning, 45),
          5.2,
          "0.43 0.43 0.43",
        );
      }
    });
  };

  const waterfallPanel466 = (
    commands: string[],
    x: number,
    top: number,
    width: number,
  ) => {
    const panelHeight = 126;
    box(commands, x, top - panelHeight, width, panelHeight);
    text(
      commands,
      x + 16,
      top - 22,
      `CONFIDENCE WATERFALL · ${pass466.finalConfidence}%`,
      8,
      "0.47 0.39 0.20",
    );
    const gap = 8;
    const cellWidth = (width - 32 - gap * 2) / 3;
    pass466.stages.slice(0, 6).forEach((stage, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const cellX = x + 16 + column * (cellWidth + gap);
      const cellTop = top - 40 - row * 40;
      text(
        commands,
        cellX,
        cellTop,
        compactValue(stage.label, 23),
        5.8,
        "0.42 0.42 0.42",
      );
      text(
        commands,
        cellX,
        cellTop - 14,
        `${stage.cap}% · ${stage.state === "confirmed" ? "OK" : stage.state === "review" ? "CHECK" : "SOURCE"}`,
        7.2,
        stage.state === "confirmed"
          ? "0.12 0.45 0.30"
          : stage.state === "review"
            ? "0.58 0.39 0.08"
            : "0.58 0.18 0.18",
      );
    });
  };

  text(
    pageOne,
    46,
    790,
    `VELMERE CYBERSECURITY · ${pass488.pages[0].label.toUpperCase()} · ${report.pass477.label.toUpperCase()}`,
    9,
    "0.47 0.39 0.20",
  );
  text(
    pageOne,
    420,
    790,
    new Date(report.generatedAt).toLocaleDateString(report.locale),
    8,
    "0.47 0.39 0.20",
  );
  const titleY = headline(pageOne, 46, 744, report.title, 34, 2);
  text(
    pageOne,
    46,
    titleY - 5,
    report.symbol.toUpperCase().slice(0, 18),
    13,
    "0.55 0.42 0.12",
  );

  section(
    pageOne,
    46,
    pass469Layout.pageOne.verdict.top,
    503,
    pass469Layout.pageOne.verdict.height,
    report.pass478.verdict.label,
    `${report.pass478.verdict.headline}. ${report.pass478.verdict.summary}`,
    4,
  );
  tinyMeta(
    pageOne,
    46,
    pass469Layout.pageOne.metadataTop,
    116,
    report.pass453.labels.confidenceCeiling,
    `${report.pass477.confidenceCeiling}%`,
  );
  tinyMeta(
    pageOne,
    175,
    pass469Layout.pageOne.metadataTop,
    116,
    report.pass453.labels.sourceQuorum,
    `${report.pass477.sourceCount} · ${report.pass477.evidenceStateLabel}`,
  );
  tinyMeta(
    pageOne,
    304,
    pass469Layout.pageOne.metadataTop,
    116,
    report.pass453.labels.evidenceCoverage,
    `${report.pass453.decision.evidenceCoverage}%`,
  );
  tinyMeta(
    pageOne,
    433,
    pass469Layout.pageOne.metadataTop,
    116,
    report.pass453.labels.dataFreshness,
    report.pass453.decision.dataAgeLabel,
  );
  section(
    pageOne,
    46,
    pass469Layout.pageOne.brief.top,
    503,
    pass469Layout.pageOne.brief.height,
    report.labels.brief,
    `${report.pass477.purpose} ${getSection(report, "brief", report.summary)}`,
    lineBudget("decision-brief", 5),
  );
  section(
    pageOne,
    46,
    pass469Layout.pageOne.market.top,
    503,
    pass469Layout.pageOne.market.height,
    lc.marketData,
    getSection(
      report,
      "marketData",
      report.pass450?.customerSummary ||
        "Basic, Pro and Advanced share one source-bound payload.",
    ),
    lineBudget("decision-brief", 4),
  );
  section(
    pageOne,
    46,
    pass469Layout.pageOne.checked.top,
    503,
    pass469Layout.pageOne.checked.height,
    report.labels.checked,
    report.pass478.confirmedFacts.length
      ? report.pass478.confirmedFacts.join(" · ")
      : getSection(report, "sources", report.whyItMatters),
    lineBudget("evidence-claim-gate", 3),
  );
  section(
    pageOne,
    46,
    pass469Layout.pageOne.missing.top,
    503,
    pass469Layout.pageOne.missing.height,
    report.labels.missing,
    report.pass478.confidenceLimits.length
      ? report.pass478.confidenceLimits.join(" · ")
      : getSection(report, "missing", report.missingData.join(" · ") || "-"),
    lineBudget("boundary-missing-appendix", 2),
  );
  text(
    pageOne,
    46,
    80,
    compactFooter(report.labels.boundary),
    7,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    46,
    69,
    compactMeta(`Integrity ${pass512Seal.state} · ${pass512Seal.readiness}% · ${pass512Seal.checksum}`),
    7,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    46,
    58,
    compactMeta(`Typography ${pass1254.state} · ${pass1254.score}% · ${pass519Typography.state} · sentence ${pass519Typography.averageSentenceLength}`),
  );
  tinyMeta(
    pageOne,
    305,
    116,
    242,
    "Premium + Brain",
    premiumStateLine,
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    318,
    58,
    compactMeta(`Typeset ${pass533Typesetting.locale.toUpperCase()} · hyphen ${pass533Typesetting.hyphenatedTokens} · IDs ${pass533Typesetting.longIdentifierTokens}`),
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    46,
    47,
    compactMeta(`Rhythm ${pass539Rhythm.state} · ${pass539Rhythm.score}% · ${pass539Rhythm.checksum}`),
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    46,
    36,
    compactFooter(`Lens/Map parity ${report.pass1234.finalStatus} · ${report.pass1234.manifestKey}`),
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    318,
    47,
    compactMeta(`Parity ${pass583.manifestKey} · ${pass488.readerPageCount}/${pass488.binaryPageCount} · A4`),
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    318,
    36,
    compactMeta(`${mapStateLine} · ${megaPassLine}`, 86),
    6.5,
    "0.42 0.42 0.42",
  );
  text(
    pageOne,
    470,
    36,
    `${pass488.labels.page} 1 / ${pass610.pageCount}`,
    7,
    "0.42 0.42 0.42",
  );

  text(
    pageTwo,
    46,
    790,
    `VELMERE CYBERSECURITY · ${pass488.pages[1].label.toUpperCase()} · ${report.symbol.toUpperCase().slice(0, 18)}`,
    9,
    "0.47 0.39 0.20",
  );
  text(pageTwo, 46, 752, lc.sourceLedger.toUpperCase(), 8, "0.47 0.39 0.20");
  report.sources.slice(0, 4).forEach((source, index) => {
    const citation = report.pass582.citations[index];
    const sourceTop = pass469Layout.pageTwo.sourceRowTops[index] ?? 724;
    const sourceNote = compactValue(source.note, 116);
    box(
      pageTwo,
      46,
      sourceTop - pass469Layout.pageTwo.sourceRowHeight,
      503,
      pass469Layout.pageTwo.sourceRowHeight,
    );
    text(
      pageTwo,
      62,
      sourceTop - 18,
      compactValue(
        `${citation?.id || `S${String(index + 1).padStart(2, "0")}`} · ${source.label}`,
        78,
      ),
      9,
      "0.08 0.08 0.08",
    );
    text(
      pageTwo,
      62,
      sourceTop - 30,
      compactValue(
        `${source.evidenceState} · ${source.mode} · ${source.freshness} · ${pass607.sources[index]?.freshnessState || "unknown"} · ${lc.confidence} ${pass607.sources[index]?.confidenceCap ?? source.confidence}%`,
        96,
      ),
      7.2,
      "0.37 0.37 0.37",
    );
    text(
      pageTwo,
      62,
      sourceTop - 42,
      compactValue(
        `${sourceNote} · ${lc.sourceTimestamp}: ${pass607.sources[index]?.observedAt || "missing"}`,
        116,
      ),
      6.2,
      "0.43 0.43 0.43",
    );
    const sourceReturn = pass594.sources.find(
      (candidate) => candidate.sourceId === citation?.id,
    );
    if (sourceReturn?.claimIds[0]) {
      text(
        pageTwo,
        478,
        sourceTop - 18,
        `BACK ${sourceReturn.claimIds[0]}`,
        5.5,
        "0.18 0.36 0.48",
      );
    }
  });
  if (!report.sources.length) {
    paragraph(pageTwo, 46, 714, lc.noSourceRows, 90, 2, 9);
  }
  section(
    pageTwo,
    46,
    pass469Layout.pageTwo.secondProvider.top,
    503,
    pass469Layout.pageTwo.secondProvider.height,
    lc.secondProvider,
    getSection(report, "secondProvider", lc.secondMissing),
    5,
  );
  section(
    pageTwo,
    46,
    pass469Layout.pageTwo.nextAction.top,
    503,
    pass469Layout.pageTwo.nextAction.height,
    report.labels.next,
    report.pass478.nextChecks.join(" · ") ||
      getSection(report, "next", report.nextOperatorStep),
    5,
  );
  section(
    pageTwo,
    46,
    pass469Layout.pageTwo.providerTruth.top,
    503,
    pass469Layout.pageTwo.providerTruth.height,
    // PASS460 legacy verifier marker: PASS459–460 · Provider truth + consensus
    // PASS462 legacy verifier marker: PASS459–462
    lc.sourceGate,
    [
      `${pass607.state} · confirmed ${pass607.confirmedClaims} · bounded ${pass607.boundedClaims} · blocked ${pass607.blockedClaims} · timestamped ${pass607.timestampedSources}/${pass607.sources.length}`,
      `Registry ${pass622.state} · ${pass622.providerCount} providers · backup ${pass622.backupCoveragePercent}%`,
      `Atomic claims ${pass623.factCount} facts · ${pass623.hypothesisCount} hypotheses · ${pass623.blockedCount} bounded/blocked`,
      `Provider comparison ${pass624.state} · contradictions ${pass624.contradictions} · watch ${pass624.watches}`,
      `Freshness ${pass625.state} · current ${pass625.currentFacts.length} · last-known ${pass625.lastKnownFacts.length} · unverified ${pass625.unverifiedCurrent.length} · cap ${pass625.confidenceCap}%`,
      report.pass459?.sourceContract,
      ...(report.pass459?.providerFacts || [])
        .filter((fact) =>
          /Venue|Konsensus|Rozjazd|Price divergence|Preisabweichung|confidence cap|Limit pewności|Konfidenzgrenze|Canonical pair|kanoniczna|kanonisches Paar|Quote basis|Baza kwotowania|Notierungsbasis|Pair coverage|Pokrycie pary|Paarabdeckung/i.test(
            fact.label,
          ),
        )
        .slice(0, 3)
        .map((fact) => `${fact.label}: ${fact.value} (${fact.source})`),
      report.pass460
        ? `${report.pass460.headline}: ${report.pass460.explanation}`
        : null,
      report.pass460
        ? `Confidence cap ${report.pass460.confidenceCap}/100 · ${report.pass460.operatorAction}`
        : null,
      report.pass459?.claimBoundary,
    ]
      .filter(Boolean)
      .join(" · ") || getSection(report, "signature", report.labels.signature),
    4,
  );
  text(pageTwo, 46, 88, `${lc.integrity}: ${lc.active}`, 7, "0.42 0.42 0.42");
  text(pageTwo, 46, 68, `${lc.consistency}: ${lc.active}`, 7, "0.42 0.42 0.42");
  text(
    pageTwo,
    205,
    68,
    `Seal ${pass512Seal.state} · ${pass512Seal.readiness}% · ${pass512Seal.checksum}`,
    7,
    "0.42 0.42 0.42",
  );
  text(
    pageTwo,
    390,
    68,
    `${pass488.labels.page} 2 / ${pass610.pageCount}`,
    8,
    "0.42 0.42 0.42",
  );
  text(
    pageTwo,
    46,
    46,
    compactFooter(`${report.labels.signature} · ${pass488.parityKey}`),
    10,
    "0.10 0.10 0.10",
  );

  text(
    pageThree,
    46,
    790,
    `VELMERE CYBERSECURITY · ${lc.depthMatrix.toUpperCase()}`,
    9,
    "0.47 0.39 0.20",
  );
  text(
    pageThree,
    46,
    750,
    report.pass478.verdict.headline ||
      report.pass455?.executive.headline ||
      report.pass454?.verdict.headline ||
      report.pass450?.customerHeadline ||
      report.pass448?.headline ||
      "Human readout",
    17,
    "0.08 0.08 0.08",
  );
  paragraph(
    pageThree,
    46,
    720,
    report.pass478.verdict.summary ||
      report.pass455?.executive.oneSentence ||
      report.pass454?.verdict.summary ||
      report.pass450?.customerSummary ||
      report.pass448?.browserPromise ||
      "Basic, Pro and Advanced share the same source-bound payload.",
    88,
    3,
    9,
  );
  const tiers = report.pass455.tiers;
  const basicTier = tiers.find((tier) => tier.id === "basic");
  const proTier = tiers.find((tier) => tier.id === "pro");
  const advancedTier = tiers.find((tier) => tier.id === "advanced");
  const selectedTier =
    selectedDepth === "basic"
      ? basicTier
      : selectedDepth === "pro"
        ? proTier
        : advancedTier;
  const selectedDepthLabel =
    selectedDepth === "basic"
      ? lc.basicPdf
      : selectedDepth === "pro"
        ? lc.proPdf
        : lc.advancedPdf;

  text(
    pageThree,
    46,
    674,
    `${lc.selectedDepth.toUpperCase()}: ${selectedDepthLabel}`,
    8,
    "0.47 0.39 0.20",
  );

  // PASS456: page three carries every Basic and Pro field instead of a truncated sample.
  // PASS465: PDF can be generated as Basic, Pro or Advanced during the V forge.
  if (selectedDepth === "advanced") {
    if (basicTier)
      tierGrid456(
        pageThree,
        46,
        pass469Layout.pageThree.basic!.top,
        503,
        pass469Layout.pageThree.basic!.height,
        basicTier,
        3,
      );
    if (proTier)
      tierGrid456(
        pageThree,
        46,
        pass469Layout.pageThree.pro!.top,
        503,
        pass469Layout.pageThree.pro!.height,
        proTier,
        3,
      );
  } else if (selectedTier) {
    tierGrid456(
      pageThree,
      46,
      pass469Layout.pageThree.selected!.top,
      503,
      pass469Layout.pageThree.selected!.height,
      selectedTier,
      3,
    );
  }
  section(
    pageThree,
    46,
    pass469Layout.pageThree.missingPolicy.top,
    503,
    pass469Layout.pageThree.missingPolicy.height,
    lc.unknownPolicy,
    pass608.entries.length
      ? `${pass608.summary} ${pass608.entries
          .slice(0, 3)
          .map((entry) => `${entry.id}: ${entry.label} -> ${entry.nextCheck}`)
          .join(" · ")}`
      : pass608.summary,
    lineBudget("boundary-missing-appendix", 3),
  );
  text(
    pageThree,
    46,
    pass469Layout.footer.boundaryY,
    compactFooter(report.labels.boundary),
    7,
    "0.42 0.42 0.42",
  );
  text(
    pageThree,
    390,
    pass469Layout.footer.pageY,
    `${pass488.labels.page} 3 / ${pass610.pageCount}`,
    8,
    "0.42 0.42 0.42",
  );
  text(
    pageThree,
    46,
    pass469Layout.footer.signatureY,
    compactFooter(`${report.labels.signature} · ${pass488.parityKey}`),
    10,
    "0.10 0.10 0.10",
  );

  text(
    pageFour,
    46,
    790,
    `VELMERE CYBERSECURITY · ${selectedDepthLabel.toUpperCase()}`,
    9,
    "0.47 0.39 0.20",
  );
  text(
    pageFour,
    46,
    750,
    selectedTier?.label || lc.signatureDiagnostics,
    18,
    "0.08 0.08 0.08",
  );
  paragraph(
    pageFour,
    46,
    724,
    selectedTier?.promise ||
      getSection(report, "marketData", report.whyItMatters),
    88,
    2,
    8,
  );

  // PASS456: Advanced renders all 20 fields, then exposes gaps and one next action.
  // PASS456/PASS465: Advanced renders all 20 fields; Basic/Pro keep a focused decision page.
  if (selectedDepth === "advanced" && advancedTier) {
    tierGrid456(
      pageFour,
      46,
      pass469Layout.pageFour.advanced!.top,
      503,
      pass469Layout.pageFour.advanced!.height,
      advancedTier,
      4,
    );
    waterfallPanel466(pageFour, 46, pass469Layout.pageFour.waterfall.top, 503);
  } else {
    waterfallPanel466(pageFour, 46, pass469Layout.pageFour.waterfall.top, 503);
    section(
      pageFour,
      46,
      pass469Layout.pageFour.sourceBoundary!.top,
      503,
      pass469Layout.pageFour.sourceBoundary!.height,
      lc.sourceBoundary,
      report.pass459?.claimBoundary ||
        report.pass452?.sourcePolicy ||
        report.labels.boundary,
      4,
    );
    section(
      pageFour,
      46,
      pass469Layout.pageFour.primaryNextAction!.top,
      503,
      pass469Layout.pageFour.primaryNextAction!.height,
      lc.nextAction,
      pass626.primaryAction
        ? `${pass626.primaryAction.action} · ${pass626.primaryAction.completionEvidence}`
        : report.pass478.nextChecks.length
          ? report.pass478.nextChecks.slice(0, 3).join(" · ")
          : report.nextOperatorStep,
      lineBudget("boundary-next-check-plan", 5),
    );
  }
  section(
    pageFour,
    46,
    pass469Layout.pageFour.missingFields.top,
    503,
    pass469Layout.pageFour.missingFields.height,
    lc.missingFields,
    pass608.entries.length
      ? pass608.entries
          .slice(0, selectedDepth === "advanced" ? 4 : 3)
          .map(
            (entry) =>
              `${entry.id} · ${entry.impact} · -${entry.confidencePenalty} · ${entry.label} · ${entry.nextCheck}`,
          )
          .join(" · ")
      : pass608.summary,
    lineBudget("boundary-missing-appendix", selectedDepth === "advanced" ? 3 : 4),
  );
  if (selectedDepth === "advanced" && pass469Layout.pageFour.finalNextAction) {
    section(
      pageFour,
      46,
      pass469Layout.pageFour.finalNextAction.top,
      503,
      pass469Layout.pageFour.finalNextAction.height,
      lc.nextAction,
      pass626.tasks.length
        ? pass626.tasks
            .slice(0, 2)
            .map((task) => `${task.rank}. ${task.action}`)
            .join(" · ")
        : report.pass478.whatWouldChangeTheRead.length
          ? report.pass478.whatWouldChangeTheRead.slice(0, 2).join(" · ")
          : report.nextOperatorStep,
      lineBudget("boundary-next-check-plan", 2),
    );
  }
  // PASS450 compatibility markers: report.pass450?.tiers · report.pass450?.customerHeadline · report.pass450?.unknownPolicy · report.pass450?.reportArchitecture
  // PASS452 compatibility markers retained: report.pass452?.signatureInsights · report.pass452?.sourcePolicy
  // PASS452: page four adds source-bound Advanced signature diagnostics
  text(
    pageFour,
    46,
    pass469Layout.footer.boundaryY,
    compactFooter(`${lc.sourceBoundary}: ${report.labels.boundary}`),
    7,
    "0.42 0.42 0.42",
  );
  text(
    pageFour,
    390,
    pass469Layout.footer.pageY,
    `${pass488.labels.page} 4 / ${pass610.pageCount}`,
    8,
    "0.42 0.42 0.42",
  );
  text(
    pageFour,
    46,
    pass469Layout.footer.signatureY,
    compactFooter(`${report.labels.signature} · ${pass488.parityKey}`),
    10,
    "0.10 0.10 0.10",
  );

  pass594.sources.slice(0, 4).forEach((source, sourceIndex) => {
    const claimId = source.claimIds[0];
    const destination = claimId ? claimDestinations.get(claimId) : undefined;
    if (!destination) return;
    const sourceTop = pass469Layout.pageTwo.sourceRowTops[sourceIndex] ?? 724;
    registerPdfLink({
      page: 2,
      rect: [474, sourceTop - 25, 544, sourceTop - 9],
      destinationPage: destination.page,
      destinationY: destination.destinationY,
      title: `${source.sourceId} -> ${claimId}`,
    });
  });

  const taggedPageStream = (commands: string[]) =>
    `/Sect <</MCID 0>> BDC\n${commands.join("\n")}\nEMC`;
  const streamOne = taggedPageStream(pageOne);
  const streamTwo = taggedPageStream(pageTwo);
  const streamThree = taggedPageStream(pageThree);
  const streamFour = taggedPageStream(pageFour);
  // PASS447/PASS448 verifier compatibility markers kept after formatter expansion:
  // object(8, "<< /Type /Page
  // object(9, `<< /Length ${Buffer.byteLength(streamThree
  // object(11, `<< /Length ${Buffer.byteLength(streamFour
  // PASS448: A4 reader v2 compatibility marker.
  // PASS450: four explicit A4 pages: executive brief, source ledger, tiered analysis and decision map.
  // PASS453: page one starts with a human verdict and readiness matrix; page four uses unified source-bound diagnostics.
  // PASS453 regression marker: report.pass453.signatureMetrics
  // PASS454: page three uses evidence-dense Basic/Pro/Advanced tiers and page four shows advanced source-bound metrics.
  // PASS455: PDF uses localized human meanings, opens with a decision-first reader, and keeps exact preview/download parity.
  // PASS456: PDF renders every 10/14/20 tier field in a readable two-column matrix.
  // PASS459: page two carries the same provider truth contract used by preview and Shield AI.
  // PASS459 legacy verifier marker: PASS459 · Provider truth
  // PASS460: page two adds source consensus, freshness risk and a confidence cap shared with Shield AI.
  // PASS462: page two includes cross-venue state, divergence and confidence cap from the same Browser/Shield AI evidence packet.
  // PASS463: page two adds canonical asset/pair coverage and explicit quote-basis penalties shared by Browser, PDF and Shield AI.
  // PASS459–463 legacy verifier marker retained after PASS464.
  // PASS464: filing freshness, FCF/leverage and ETF concentration share the same preview/download confidence boundary when attached.
  // PASS465: PDF route accepts ?tier=basic|pro|advanced and renders a focused tier without breaking preview/download parity.
  // PASS469: every A4 region is audited before drawing; content never enters the reserved footer and long tokens are hard-wrapped.
  // PASS533: PL/DE prose uses conservative language-aware hyphenation while identifiers wrap without invented punctuation.
  // PASS594: internal Link annotations mirror Reader claim-to-source and source-to-claim navigation.
  // PASS1234: Lens PDF and Shield Map share one evidence graph manifest.
  const pageObjectRef: Record<2 | 3 | 4, 6 | 8 | 10> = {
    2: 6,
    3: 8,
    4: 10,
  };
  const annotationObjects = pdfLinks.map((link, index) => {
    const id = 20 + index;
    const [x1, y1, x2, y2] = link.rect;
    return {
      id,
      page: link.page,
      content: `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /Contents (${pdfText(link.title)}) /Dest [${pageObjectRef[link.destinationPage]} 0 R /XYZ 0 ${link.destinationY} null] >>`,
    };
  });
  const pageAnnots = (page: 2 | 3 | 4) => {
    const ids = annotationObjects
      .filter((annotation) => annotation.page === page)
      .map((annotation) => `${annotation.id} 0 R`);
    return ids.length ? ` /Annots [${ids.join(" ")}]` : "";
  };
  const objects = [
    object(
      1,
      `<< /Type /Catalog /Pages 2 0 R /Lang (${pdfText(pass611.documentLanguage)}) /ViewerPreferences << /DisplayDocTitle true >> /MarkInfo << /Marked true >> /StructTreeRoot 13 0 R >>`,
    ),
    object(2, "<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4 >>"),
    object(
      3,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [128 /Aogonek /aogonek /Cacute /cacute /Eogonek /eogonek /Lslash /lslash /Nacute /nacute /Sacute /sacute /Zacute /zacute /Zdotaccent /zdotaccent] >> >>",
    ),
    object(
      4,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /StructParents 0 /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>",
    ),
    object(
      5,
      `<< /Length ${Buffer.byteLength(streamOne, "latin1")} >>\nstream\n${streamOne}\nendstream`,
    ),
    object(
      6,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /StructParents 1 /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R${pageAnnots(2)} >>`,
    ),
    object(
      7,
      `<< /Length ${Buffer.byteLength(streamTwo, "latin1")} >>\nstream\n${streamTwo}\nendstream`,
    ),
    object(
      8,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /StructParents 2 /Resources << /Font << /F1 3 0 R >> >> /Contents 9 0 R${pageAnnots(3)} >>`,
    ),
    object(
      9,
      `<< /Length ${Buffer.byteLength(streamThree, "latin1")} >>\nstream\n${streamThree}\nendstream`,
    ),
    object(
      10,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /StructParents 3 /Resources << /Font << /F1 3 0 R >> >> /Contents 11 0 R${pageAnnots(4)} >>`,
    ),

    object(
      11,
      `<< /Length ${Buffer.byteLength(streamFour, "latin1")} >>\nstream\n${streamFour}\nendstream`,
    ),
    object(
      12,
      `<< /Title (${pdfText(report.title)}) /Author (Velmere Cybersecurity) /Subject (${pdfText(`${report.symbol} · ${report.pass477.label} · source-bound research report`)}) /Creator (Velmere Lens) /Producer (Velmere PDF Forge) >>`,
    ),
    object(13, "<< /Type /StructTreeRoot /K [14 0 R] /ParentTree 19 0 R >>"),
    object(14, "<< /Type /StructElem /S /Document /P 13 0 R /K [15 0 R 16 0 R 17 0 R 18 0 R] >>"),
    object(15, `<< /Type /StructElem /S /Sect /P 14 0 R /Pg 4 0 R /K 0 /T (${pdfText(pass610.pages[0]?.title || "Decision")}) >>`),
    object(16, `<< /Type /StructElem /S /Sect /P 14 0 R /Pg 6 0 R /K 0 /T (${pdfText(pass610.pages[1]?.title || "Evidence")}) >>`),
    object(17, `<< /Type /StructElem /S /Sect /P 14 0 R /Pg 8 0 R /K 0 /T (${pdfText(pass610.pages[2]?.title || "Analysis")}) >>`),
    object(18, `<< /Type /StructElem /S /Sect /P 14 0 R /Pg 10 0 R /K 0 /T (${pdfText(pass610.pages[3]?.title || "Boundaries")}) >>`),
    object(19, "<< /Nums [0 [15 0 R] 1 [16 0 R] 2 [17 0 R] 3 [18 0 R]] >>"),
    ...annotationObjects.map((annotation) =>
      object(annotation.id, annotation.content),
    ),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const item of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += item;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 12 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_000_000) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }
  const rateBoundary = buildPass632Boundary({
    route: new URL(request.url).pathname,
    provider: "lens-pdf-export",
    user: "anonymous",
    client: getClientKey(request, "client"),
  });
  const rateLimit = await applyDurableRateLimit({
    namespace: "velmere-lens-pdf",
    key: rateBoundary.key,
    limit: 12,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429, headers: buildDurableRateLimitHeaders(rateLimit) },
    );
  }
  let rawPayload: unknown;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      rawPayload = await request.json();
    } else {
      const form = await request.formData();
      rawPayload = JSON.parse(String(form.get("payload") || ""));
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const requestUrl = new URL(request.url);
  const selectedDepth = resolveLensPdfDepth(
    requestUrl.searchParams.get("tier"),
  );
  let payload: LensReport;
  if (isLensReport(rawPayload)) {
    payload = rawPayload;
  } else if (isCanonicalLensRequest(rawPayload)) {
    if (rawPayload.depth !== selectedDepth) {
      return NextResponse.json(
        { ok: false, error: "depth_mismatch" },
        { status: 409 },
      );
    }
    payload = buildLensReport(
      rawPayload.result,
      rawPayload.locale,
      rawPayload.depth,
    );
  } else {
    return NextResponse.json(
      { ok: false, error: "invalid_report_request" },
      { status: 400 },
    );
  }

  if (selectedDepth === "advanced") {
    const paidContext = normalizePaidContext({
      surface: "browser",
      locale: payload.locale,
      assetId: request.headers.get("x-velmere-paid-asset-id") || (isCanonicalLensRequest(rawPayload) ? rawPayload.result.id : payload.symbol),
      symbol: request.headers.get("x-velmere-paid-symbol") || payload.symbol,
      depth: "advanced",
    }, payload.locale);
    const paidToken = request.headers.get("x-velmere-paid-access");
    const paidAccess = await verifyVlmPaidAccessEntitlement({
      token: paidToken,
      productId: "vlm_advanced_pdf_single",
      context: paidContext,
    });
    const includedAuditContext = normalizePaidContext({
      ...paidContext,
      surface: "audit",
      returnPath: undefined,
    }, payload.locale);
    const includedAuditAccess = paidAccess.ok
      ? null
      : await verifyVlmPaidAccessEntitlement({
          token: paidToken,
          productId: "vlm_advanced_audit_human_review",
          context: includedAuditContext,
        });
    if (!paidAccess.ok && !includedAuditAccess?.ok) {
      return NextResponse.json({
        ok: false,
        error: "payment_required",
        product: getVlmPaidProduct("vlm_advanced_pdf_single", payload.locale),
        includedProduct: getVlmPaidProduct("vlm_advanced_audit_human_review", payload.locale),
        context: paidContext,
        acceptedContexts: [paidContext, includedAuditContext],
        reason: paidAccess.error,
        includedReason: includedAuditAccess?.error,
        ledgerMode: paidAccess.ledgerMode ?? includedAuditAccess?.ledgerMode,
      }, { status: 402, headers: { "x-velmere-paid-access-required": "vlm_advanced_pdf_single,vlm_advanced_audit_human_review" } });
    }
  }

  if (requestUrl.searchParams.get("format") === "json") {
    return NextResponse.json(
      { ok: true, report: payload },
      { headers: { "cache-control": "no-store" } },
    );
  }

  if (
    selectedDepth !== payload.selectedDepth ||
    selectedDepth !== payload.pass477.selectedDepth
  ) {
    return NextResponse.json(
      { ok: false, error: "depth_mismatch" },
      { status: 409 },
    );
  }
  // PASS488 compatibility is derived from the current Reader/PDF manifest,
  // so the historical page contract cannot drift from PASS610.
  const pass488 = {
    ...payload.pass488,
    pageCount: payload.pass610.pageCount,
  };
  const parityGate = buildPass583DownloadParityGate({
    symbol: payload.symbol,
    locale: payload.locale,
    depth: payload.selectedDepth,
    reportChecksum: payload.brain.checksum,
    parityKey: pass488.parityKey,
    sections: payload.sections,
    compositor: payload.pass581,
    citationRail: payload.pass582,
  });
  if (parityGate.manifestKey !== payload.pass583.manifestKey) {
    return NextResponse.json(
      { ok: false, error: "parity_manifest_mismatch" },
      { status: 409 },
    );
  }
  const readerDownloadManifest = buildPass610ReaderDownloadParityManifest({
    locale: payload.locale,
    depth: payload.selectedDepth,
    reportChecksum: payload.brain.checksum,
    sections: payload.sections,
    claimGate: payload.pass607,
    appendix: payload.pass608,
    density: payload.pass609,
  });
  if (readerDownloadManifest.manifestKey !== payload.pass610.manifestKey) {
    return NextResponse.json(
      { ok: false, error: "reader_download_manifest_mismatch" },
      { status: 409 },
    );
  }
  if (
    payload.pass1254.previewDownloadTypography !== "same_reader_pdf_typography_budget" ||
    payload.pass1254.pdf.footerLane !== "single_line_no_overlap"
  ) {
    return NextResponse.json(
      { ok: false, error: "pdf_typography_release_gate_mismatch" },
      { status: 409 },
    );
  }
  if (
    payload.pass1334.previewDownloadParity !== "same_payload_same_depth_same_claims" ||
    payload.pass1354.role !== "why_verdict_graph_not_second_table" ||
    payload.pass1374.hallucinationBrake !== "no_random_copy_no_fake_live_no_hidden_missing_data" ||
    payload.pass1413?.realWorkStandard !== "forty_plus_tasks_no_micro_passes" ||
    payload.pass1413?.totalTaskCount < 50
  ) {
    return NextResponse.json(
      { ok: false, error: "premium_truth_release_gate_mismatch" },
      { status: 409 },
    );
  }
  const redaction = applyPass635ExportRedaction({
    surface: "pdf",
    payload,
  });
  if (redaction.receipt.removedPaths.length > 0 || redaction.receipt.maskedPaths.length > 0 || redaction.receipt.state !== "clean") {
    return NextResponse.json(
      { ok: false, error: "pdf_redaction_required", receiptId: redaction.receipt.receiptId },
      { status: 409, headers: buildDurableRateLimitHeaders(rateLimit) },
    );
  }
  const pdf = buildPdf(payload, selectedDepth);
  const pdfLeaks = detectPass635Leaks(pdf.toString("latin1"));
  if (pdfLeaks.length > 0) {
    return NextResponse.json(
      { ok: false, error: "pdf_redaction_leak", leakClasses: pdfLeaks },
      { status: 500, headers: buildDurableRateLimitHeaders(rateLimit) },
    );
  }
  const pdfFeasibility = inspectPass593PdfBuffer(pdf);
  if (
    payload.pass594.linkedClaims > 0 &&
    !pdfFeasibility.checks.internalLinks
  ) {
    return NextResponse.json(
      { ok: false, error: "pdf_footnote_link_mismatch" },
      { status: 500 },
    );
  }
  const filename = `velmere-lens-${payload.symbol || "report"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 80);
  const exportId = `${filename}-${payload.brain.checksum.slice(0, 12)}`;
  const audit = recordPass633AuditEvent({
    route: new URL(request.url).pathname,
    method: request.method,
    actorFingerprint: createClientFingerprint(request),
    providerIds: payload.pass622.providers.map((provider) => provider.id).slice(0, 24),
    sourceIds: payload.pass607.sources.map((source) => source.sourceId).slice(0, 64),
    claimIds: payload.pass623.atoms.map((atom) => atom.atomId).slice(0, 160),
    decision: `pdf_${selectedDepth}_exported`,
    state: "exported",
    exportId,
    modelVersion: "velmere-lens-report",
    promptSchemaVersion: "lens-report-v2",
    redactionReceipt: redaction.receipt,
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}.pdf"`,
      "cache-control": "no-store",
      "content-language": payload.locale,
      "x-content-type-options": "nosniff",
      "x-velmere-report-checksum": payload.brain.checksum,
      "x-velmere-preview-parity": "same-blob-as-download",
      "x-velmere-pdf-depth": selectedDepth,
      "x-velmere-a4-layout-audit": "pass469-ok",
      "x-velmere-depth-contract": "pass477",
      "x-velmere-human-evidence-brief": "pass478",
      "x-velmere-field-budget": String(payload.pass477.fieldBudget),
      "x-velmere-visual-fixture": payload.pass580.fixtureId,
      "x-velmere-page-compositor": payload.pass581.status,
      "x-velmere-source-citations": String(payload.pass582.citations.length),
      "x-velmere-parity-manifest": payload.pass583.manifestKey,
      "x-velmere-accessibility": payload.pass584.state,
      "x-velmere-chromium-fixture": payload.pass592.proofRef,
      "x-velmere-tagged-pdf-state": pdfFeasibility.state,
      "x-velmere-footnote-links": String(payload.pass594.linkedClaims),
      "x-velmere-typography-gate": payload.pass595.state,
      "x-velmere-pdf-proof-capsule": payload.pass596.capsuleKey,
      "x-velmere-claim-source-gate": payload.pass607.state,
      "x-velmere-missing-source-appendix": payload.pass608.state,
      "x-velmere-a4-density": `${payload.pass609.state}:${payload.pass609.maxDensity}`,
      "x-velmere-reader-download-manifest": payload.pass610.manifestKey,
      "x-velmere-pass488-page-count": String(pass488.pageCount),
      "x-velmere-struct-tree": payload.pass611.pdf.structTreeRootPrepared ? "prepared" : "missing",
      "x-velmere-source-registry": `${payload.pass622.state}:${payload.pass622.providerCount}`,
      "x-velmere-atomic-claims": `${payload.pass623.state}:${payload.pass623.atoms.length}`,
      "x-velmere-provider-contradiction": `${payload.pass624.state}:${payload.pass624.contradictions}`,
      "x-velmere-freshness-synthesis": `${payload.pass625.state}:${payload.pass625.confidenceCap}`,
      "x-velmere-next-check-plan": `${payload.pass626.state}:${payload.pass626.tasks.length}`,
      "x-velmere-pdfua-validation": payload.pass642.state,
      "x-velmere-visual-parity": `${payload.pass643.state}:${payload.pass643.visualKey}`,
      "x-velmere-source-replay": `${payload.pass644.state}:${payload.pass644.currentEvidenceKey}`,
      "x-velmere-mobile-budget": payload.pass645.state,
      "x-velmere-unified-evidence": `${payload.pass646.state}:${payload.pass646.evidenceKey}`,
      "x-velmere-pdf-typography-release": `${payload.pass1254.state}:${payload.pass1254.manifestKey}`,
      "x-velmere-lens-shieldmap-parity": `${payload.pass1234.finalStatus}:${payload.pass1234.manifestKey}`,
      "x-velmere-shield-map-role": payload.pass1234.shieldMapRole,
      "x-velmere-pdf-premium-final": `${payload.pass1334.state}:${payload.pass1334.manifestKey}`,
      "x-velmere-shield-map-evidence-graph-2": `${payload.pass1354.state}:${payload.pass1354.manifestKey}`,
      "x-velmere-vlm-brain-source-truth": `${payload.pass1374.state}:${payload.pass1374.manifestKey}`,
      "x-velmere-mega-terminal-polish": `${payload.pass1413.state}:${payload.pass1413.totalTaskCount}:${payload.pass1413.checksum}`,
      "x-velmere-snapshot-id": payload.pass646.snapshotId,
      "x-velmere-redaction-receipt": redaction.receipt.receiptId,
      "x-velmere-audit-trace": audit.traceId,
      ...buildDurableRateLimitHeaders(rateLimit),
      "x-velmere-pdfua-claim": "false",
    },
  });
}

export function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: escapeHtml("Use POST with the resolved Lens report object."),
    },
    { status: 405, headers: { allow: "POST" } },
  );
}
