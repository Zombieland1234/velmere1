import { JSON_CONTROL_PATTERN } from "../ascii-control-characters";

import crypto from "node:crypto";

import {
  VELMERE_SANS_BOLD_CFF_ZLIB_BASE64,
  VELMERE_SANS_REGULAR_CFF_ZLIB_BASE64,
} from "@/lib/security/pro-audit-pdf/embedded-font-data";

const PDF_ASCII_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  ä: "a", ö: "o", ü: "u", ß: "ss", Ä: "A", Ö: "O", Ü: "U",
  è: "e", é: "e", ê: "e", È: "E", É: "E", Ê: "E",
};

const POLISH_PDF_BYTES: Readonly<Record<string, number>> = Object.freeze({
  Ą: 129, Ć: 130, Ę: 131, Ł: 132, Ń: 133, Ó: 134, Ś: 135, Ź: 136, Ż: 137,
  ą: 138, ć: 139, ę: 140, ł: 141, ń: 142, ó: 143, ś: 144, ź: 145, ż: 146,
});

const POLISH_PDF_DIFFERENCES = [
  "Aogonek", "Cacute", "Eogonek", "Lslash", "Nacute", "Oacute", "Sacute", "Zacute", "Zdotaccent",
  "aogonek", "cacute", "eogonek", "lslash", "nacute", "oacute", "sacute", "zacute", "zdotaccent",
] as const;

// A custom Type1 encoding is required for Polish glyph names. Once an encoding
// differs from a Base-14 font's built-in encoding, readers are no longer
// required to infer the standard metrics. Poppler and some browser viewers then
// fall back to visibly incorrect, near-monospaced advances. Keep the existing
// Helvetica design, but make every glyph advance explicit.
const HELVETICA_ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
] as const;

const HELVETICA_BOLD_ASCII_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
] as const;

const POLISH_WIDTH_BASE_CHAR = [
  "A", "C", "E", "L", "N", "O", "S", "Z", "Z",
  "a", "c", "e", "l", "n", "o", "s", "z", "z",
] as const;

const CUSTOMER_UNSAFE_PATTERN = /\b(pass\d{3,}|debug|operator-only|private operator|raw payload|api key|seed phrase|exploit steps|session id|receipt token|private delivery pointer|operatorRows)\b/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EVM_ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/;
const PUBLIC_TARGET_ADDRESS_LINE = /^(target|contract(?: address)?|audited address):\s*0x[a-fA-F0-9]{40}$/i;
const PUBLIC_HISTORICAL_CHAIN_EVIDENCE_LINE = /^historicalDeployment=0x[a-fA-F0-9]{40}; snapshotBlock=\d+; attackBlock=\d+; attackTx=0x[a-fA-F0-9]{64}; proxy=EIP_1167_COMPATIBLE_MINIMAL_PROXY; implementation=0x[a-fA-F0-9]{40}; trustedForwarder=0x[a-fA-F0-9]{40}; upstreamReplay=PASS; profit=[0-9.]+ WBNB; independentVelmereReplay=false; currentExploitabilityProven=false$/;
const PUBLIC_CURRENT_DEPLOYMENT_QUORUM_LINE = /^currentDeployment=0x[a-fA-F0-9]{40}; snapshotBlock=\d+; blockHash=0x[a-fA-F0-9]{64}; stateRoot=0x[a-fA-F0-9]{64}; runtimeSha256=sha256:[a-f0-9]{64}; proxy=EIP_1167_COMPATIBLE_MINIMAL_PROXY; implementation=0x[a-fA-F0-9]{40}; implementationSha256=sha256:[a-f0-9]{64}; trustedForwarder=0x[a-fA-F0-9]{40}; trustedForwarderState=(?:ACTIVE|INACTIVE); negativeControl=INACTIVE; currentExploitabilityProven=false; independentReplay=false$/;

export const PASS4808_PDF_RENDER_CONTRACT_ID = "pass4808-deterministic-latin-extended-pagination-v1" as const;

export type CustomerSafePdfOptions = {
  title?: string;
  subtitle?: string;
  footer?: string;
  integrityLabel?: string;
  issuer?: string;
  generator?: string;
  maxLines?: number;
  documentId?: string;
  generatedAt?: string;
  locale?: "pl" | "en" | "de";
  classification?: "customer_private" | "customer_safe";
};

export type CustomerSafePdfRenderRow = {
  text: string;
  sourceLine: number;
  wrapIndex: number;
  heading: boolean;
  blank: boolean;
  height: number;
};

export type CustomerSafePdfRenderPlan = {
  schemaVersion: typeof PASS4808_PDF_RENDER_CONTRACT_ID;
  title: string;
  subtitle: string;
  footer: string;
  issuerLine: string;
  integrityLine: string;
  contentDigest: string;
  documentId: string;
  generatedAt: string;
  locale: "pl" | "en" | "de";
  classification: "customer_private" | "customer_safe";
  pages: Array<{ pageNumber: number; rows: CustomerSafePdfRenderRow[]; usedHeight: number }>;
  sourceLineCount: number;
  renderedRowCount: number;
  unsupportedGlyphReplacements: number;
  planDigest: string;
};

export function cleanProAuditPdfInput(value: string | null, fallback = "", max = 180) {
  const text = String(value ?? fallback).replace(/[<>\r\n]/g, " ").trim();
  return text ? text.slice(0, max) : fallback;
}

/** Legacy transliteration retained only for replaying old PASS4807 snapshots/tests. */
export function toProAuditPdfAscii(value: string) {
  return value.replace(/[ąćęłńóśźżäöüßèéê]/gi, (char) => PDF_ASCII_MAP[char] ?? char).replace(/[^\x20-\x7E]/g, " ");
}

/** Legacy literal-string escaping retained for PASS4807 byte-identical replay. */
export function escapeProAuditPdfText(value: string) {
  return toProAuditPdfAscii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function isCustomerSafeProAuditPdfLine(value: string) {
  const trimmed = value.trim();
  const hasPublicTargetAddress = PUBLIC_TARGET_ADDRESS_LINE.test(trimmed);
  const hasClosedHistoricalChainEvidence = PUBLIC_HISTORICAL_CHAIN_EVIDENCE_LINE.test(trimmed);
  const hasClosedCurrentDeploymentQuorum = PUBLIC_CURRENT_DEPLOYMENT_QUORUM_LINE.test(trimmed);
  return !CUSTOMER_UNSAFE_PATTERN.test(value)
    && !EMAIL_PATTERN.test(value)
    && (!EVM_ADDRESS_PATTERN.test(value) || hasPublicTargetAddress || hasClosedHistoricalChainEvidence || hasClosedCurrentDeploymentQuorum);
}

function normalizeCustomerPdfText(value: string) {
  return value
    .normalize("NFC")
    .replace(JSON_CONTROL_PATTERN, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2022\u2023\u2043]/g, "*")
    .replace(/\u2026/g, "...")
    .replace(/[\u2192\u21d2]/g, "->")
    .replace(/[\u2190\u21d0]/g, "<-")
    .replace(/\s+/g, " ")
    .trimEnd();
}

function encodeCustomerPdfBytes(value: string) {
  const normalized = normalizeCustomerPdfText(value);
  const bytes: number[] = [];
  let unsupported = 0;
  for (const char of normalized) {
    const polishByte = POLISH_PDF_BYTES[char];
    if (polishByte !== undefined) {
      bytes.push(polishByte);
      continue;
    }
    const code = char.codePointAt(0) ?? 32;
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    if (code === 0x20ac) {
      bytes.push(128); // Euro in WinAnsiEncoding.
      continue;
    }
    if (code >= 0x00a1 && code <= 0x00ff) {
      bytes.push(code);
      continue;
    }
    bytes.push(63);
    unsupported += 1;
  }
  return { bytes: Uint8Array.from(bytes), unsupported };
}

export function encodeProAuditPdfHexText(value: string) {
  const { bytes } = encodeCustomerPdfBytes(value);
  return `<${Buffer.from(bytes).toString("hex").toUpperCase()}>`;
}

function asciiGlyphWidth(char: string, bold: boolean) {
  const code = char.codePointAt(0) ?? 32;
  if (code < 32 || code > 126) return 556;
  return (bold ? HELVETICA_BOLD_ASCII_WIDTHS : HELVETICA_ASCII_WIDTHS)[code - 32] ?? 556;
}

function pdfGlyphWidth(code: number, bold: boolean) {
  if (code >= 32 && code <= 126) return asciiGlyphWidth(String.fromCharCode(code), bold);
  if (code >= 129 && code <= 146) return asciiGlyphWidth(POLISH_WIDTH_BASE_CHAR[code - 129] ?? "?", bold);
  if (code === 128) return 556; // Euro.
  if (code === 223) return 611; // germandbls.
  if (code >= 192 && code <= 255) {
    const normalizedBase = String.fromCharCode(code).normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0];
    if (normalizedBase && /^[A-Za-z]$/.test(normalizedBase)) return asciiGlyphWidth(normalizedBase, bold);
  }
  return 556;
}

function pdfFontWidths(bold: boolean) {
  return Array.from({ length: 224 }, (_, index) => pdfGlyphWidth(index + 32, bold)).join(" ");
}

function encodePdfMetadataText(value: string) {
  const normalized = normalizeCustomerPdfText(value);
  const body = Buffer.from(normalized, "utf16le");
  body.swap16();
  return `<FEFF${body.toString("hex").toUpperCase()}>`;
}

function estimateTextWidthPoints(value: string, fontSize: number, bold = false) {
  const { bytes } = encodeCustomerPdfBytes(value);
  return bytes.reduce((sum, code) => sum + pdfGlyphWidth(code, bold), 0) * fontSize / 1_000;
}

function wrapCustomerPdfLine(value: string, maxWidthPoints: number, fontSize: number, bold = false) {
  const clean = normalizeCustomerPdfText(value);
  if (!clean) return [""];
  const words = clean.split(" ").filter(Boolean);
  const rows: string[] = [];
  let current = "";
  const pushLongToken = (token: string) => {
    let segment = "";
    for (const char of token) {
      const candidate = `${segment}${char}`;
      if (segment && estimateTextWidthPoints(candidate, fontSize, bold) > maxWidthPoints) {
        rows.push(segment);
        segment = char;
      } else {
        segment = candidate;
      }
    }
    current = segment;
  };
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidthPoints(candidate, fontSize, bold) <= maxWidthPoints) {
      current = candidate;
      continue;
    }
    if (current) rows.push(current);
    if (estimateTextWidthPoints(word, fontSize, bold) > maxWidthPoints) pushLongToken(word);
    else current = word;
  }
  if (current || rows.length === 0) rows.push(current);
  return rows;
}

function pdfDate(value: string) {
  const date = new Date(value);
  const safe = Number.isFinite(date.getTime()) ? date : new Date(0);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `D:${safe.getUTCFullYear()}${pad(safe.getUTCMonth() + 1)}${pad(safe.getUTCDate())}${pad(safe.getUTCHours())}${pad(safe.getUTCMinutes())}${pad(safe.getUTCSeconds())}Z`;
}

function heading(line: string) {
  const trimmed = line.trim();
  return trimmed.endsWith(":") || (/^[A-Z0-9ĄĆĘŁŃÓŚŹŻÄÖÜ /&-]{5,}$/.test(trimmed) && trimmed.length <= 72);
}

function digestJson(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function fitTextToWidth(value: string, maxWidthPoints: number, fontSize: number, bold = false) {
  const normalized = normalizeCustomerPdfText(value);
  if (estimateTextWidthPoints(normalized, fontSize, bold) <= maxWidthPoints) return normalized;
  const suffix = "...";
  let output = "";
  for (const char of normalized) {
    const candidate = `${output}${char}${suffix}`;
    if (estimateTextWidthPoints(candidate, fontSize, bold) > maxWidthPoints) break;
    output += char;
  }
  return `${output.trimEnd()}${suffix}`;
}

function normalizedPdfOptions(options: CustomerSafePdfOptions) {
  const title = fitTextToWidth(options.title || "VELMERE AUDIT REPORT", 507, 18, true);
  const subtitle = fitTextToWidth(options.subtitle || "Evidence-bound customer report", 507, 9);
  const footer = fitTextToWidth(
    options.footer || "Automated informational analysis | Not manually QA-checked, independently certified or guaranteed safe",
    500,
    7,
  );
  const integrityLabel = fitTextToWidth(options.integrityLabel || "Document integrity verified by Velmère", 330, 7);
  const issuer = fitTextToWidth(options.issuer || "Issued by Velmère Security", 240, 7, true);
  const generator = fitTextToWidth(options.generator || "Generated automatically by Velmère Security Engine", 250, 7);
  const issuerLine = fitTextToWidth(`${issuer} | ${generator}`, 500, 7);
  const maxLines = Math.max(40, Math.min(720, Math.trunc(options.maxLines || 480)));
  const documentId = cleanProAuditPdfInput(options.documentId ?? "velmere-audit", "velmere-audit", 120);
  const generatedAt = Number.isFinite(new Date(options.generatedAt ?? "").getTime()) ? new Date(String(options.generatedAt)).toISOString() : new Date(0).toISOString();
  const locale = options.locale ?? "en";
  const classification = options.classification ?? "customer_safe";
  return { title, subtitle, footer, integrityLabel, issuerLine, maxLines, documentId, generatedAt, locale, classification } as const;
}

export function planCustomerSafePdf(lines: string[], options: CustomerSafePdfOptions = {}): CustomerSafePdfRenderPlan {
  const normalized = normalizedPdfOptions(options);
  const groups: Array<{ sourceLine: number; heading: boolean; rows: CustomerSafePdfRenderRow[] }> = [];
  let unsupportedGlyphReplacements = [normalized.title, normalized.subtitle, normalized.footer, normalized.integrityLabel, normalized.issuerLine]
    .reduce((sum, value) => sum + encodeCustomerPdfBytes(value).unsupported, 0);
  const safeSourceLines = lines
    .map((line, sourceLine) => ({ line, sourceLine }))
    .filter(({ line }) => isCustomerSafeProAuditPdfLine(line))
    .slice(0, normalized.maxLines);
  for (const entry of safeSourceLines) {
    const sourceLine = entry.sourceLine;
    const source = normalizeCustomerPdfText(entry.line ?? "");
    unsupportedGlyphReplacements += encodeCustomerPdfBytes(source).unsupported;
    const isHeading = heading(source);
    const wrapped = wrapCustomerPdfLine(source, 500, isHeading ? 10 : 9, isHeading);
    groups.push({
      sourceLine,
      heading: isHeading,
      rows: wrapped.map((text, wrapIndex) => ({
        text,
        sourceLine,
        wrapIndex,
        heading: isHeading,
        blank: text.length === 0,
        height: text.length === 0 ? 8 : isHeading ? 18 : 14,
      })),
    });
  }
  if (groups.length === 0) {
    groups.push({
      sourceLine: 0,
      heading: false,
      rows: [{ text: "No customer-safe report content was available.", sourceLine: 0, wrapIndex: 0, heading: false, blank: false, height: 14 }],
    });
  }

  const pageHeight = 692;
  const pages: Array<{ pageNumber: number; rows: CustomerSafePdfRenderRow[]; usedHeight: number }> = [];
  let currentRows: CustomerSafePdfRenderRow[] = [];
  let usedHeight = 0;
  const flush = () => {
    if (!currentRows.length) return;
    pages.push({ pageNumber: pages.length + 1, rows: currentRows, usedHeight });
    currentRows = [];
    usedHeight = 0;
  };

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const groupHeight = group.rows.reduce((sum, row) => sum + row.height, 0);
    const nextHeight = groups[index + 1]?.rows.reduce((sum, row) => sum + row.height, 0) ?? 0;
    const keepWithNextHeight = group.heading ? groupHeight + Math.min(nextHeight, 42) : groupHeight;
    if (currentRows.length && keepWithNextHeight > pageHeight - usedHeight) flush();
    if (groupHeight <= pageHeight) {
      currentRows.push(...group.rows);
      usedHeight += groupHeight;
      continue;
    }
    for (const row of group.rows) {
      if (currentRows.length && row.height > pageHeight - usedHeight) flush();
      currentRows.push(row);
      usedHeight += row.height;
    }
  }
  flush();

  const contentCore = {
    schemaVersion: PASS4808_PDF_RENDER_CONTRACT_ID,
    title: normalized.title,
    subtitle: normalized.subtitle,
    footer: normalized.footer,
    issuerLine: normalized.issuerLine,
    documentId: normalized.documentId,
    generatedAt: normalized.generatedAt,
    locale: normalized.locale,
    classification: normalized.classification,
    pages,
    sourceLineCount: safeSourceLines.length,
    renderedRowCount: pages.reduce((sum, page) => sum + page.rows.length, 0),
  };
  const contentDigest = digestJson(contentCore);
  const integrityLine = fitTextToWidth(
    `${normalized.integrityLabel} | Ref ${normalized.documentId} / ${contentDigest.slice("sha256:".length, "sha256:".length + 16)}`,
    500,
    7,
  );
  unsupportedGlyphReplacements += encodeCustomerPdfBytes(integrityLine).unsupported;
  const unsigned = {
    ...contentCore,
    integrityLine,
    contentDigest,
    unsupportedGlyphReplacements,
  };
  return { ...unsigned, planDigest: digestJson(unsigned) };
}

function fontEncodingObject() {
  return `<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [129 ${POLISH_PDF_DIFFERENCES.map((name) => `/${name}`).join(" ")}] >>`;
}

function embeddedCffStream(base64: string, uncompressedLength: number) {
  const compressed = Buffer.from(base64, "base64");
  const encoded = `${compressed.toString("hex").toUpperCase()}>`;
  return `<< /Length ${Buffer.byteLength(encoded, "ascii")} /Length1 ${uncompressedLength} /Filter [/ASCIIHexDecode /FlateDecode] /Subtype /Type1C >>\nstream\n${encoded}\nendstream`;
}

function toUnicodeCmap() {
  const polishCodePoints = [
    0x0104, 0x0106, 0x0118, 0x0141, 0x0143, 0x00d3, 0x015a, 0x0179, 0x017b,
    0x0105, 0x0107, 0x0119, 0x0142, 0x0144, 0x00f3, 0x015b, 0x017a, 0x017c,
  ];
  const mappings = [
    ...Array.from({ length: 95 }, (_, index) => [index + 32, index + 32]),
    [128, 0x20ac],
    ...polishCodePoints.map((codePoint, index) => [index + 129, codePoint]),
    ...Array.from({ length: 95 }, (_, index) => [index + 161, index + 161]),
  ];
  const chunks = [];
  for (let index = 0; index < mappings.length; index += 100) {
    const entries = mappings.slice(index, index + 100);
    chunks.push(
      `${entries.length} beginbfchar`,
      ...entries.map(([source, target]) => `<${source.toString(16).padStart(2, "0").toUpperCase()}> <${target.toString(16).padStart(4, "0").toUpperCase()}>`),
      "endbfchar",
    );
  }
  return [
    "/CIDInit /ProcSet findresource begin", "12 dict begin", "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /VelmereLatinUnicode def", "/CMapType 2 def",
    "1 begincodespacerange", "<00> <FF>", "endcodespacerange",
    ...chunks,
    "endcmap", "CMapName currentdict /CMap defineresource pop", "end", "end",
  ].join("\n");
}

export function buildCustomerSafeMinimalPdf(lines: string[], options: CustomerSafePdfOptions = {}) {
  const plan = planCustomerSafePdf(lines, options);
  const catalogId = 1, pagesId = 2, regularFontId = 3, boldFontId = 4, encodingId = 5;
  const regularDescriptorId = 6, boldDescriptorId = 7, regularFontFileId = 8, boldFontFileId = 9;
  const toUnicodeId = 10, infoId = 11;
  const pageObjectIds = plan.pages.map((_, index) => 12 + index * 2);
  const contentObjectIds = plan.pages.map((_, index) => 13 + index * 2);
  const objects = new Map<number, string>();
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects.set(pagesId, `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
  objects.set(regularFontId, `<< /Type /Font /Subtype /Type1 /BaseFont /VLMREG+NimbusSans-Regular /FirstChar 32 /LastChar 255 /Widths [${pdfFontWidths(false)}] /FontDescriptor ${regularDescriptorId} 0 R /Encoding ${encodingId} 0 R /ToUnicode ${toUnicodeId} 0 R >>`);
  objects.set(boldFontId, `<< /Type /Font /Subtype /Type1 /BaseFont /VLMBLD+NimbusSans-Bold /FirstChar 32 /LastChar 255 /Widths [${pdfFontWidths(true)}] /FontDescriptor ${boldDescriptorId} 0 R /Encoding ${encodingId} 0 R /ToUnicode ${toUnicodeId} 0 R >>`);
  objects.set(encodingId, fontEncodingObject());
  objects.set(regularDescriptorId, `<< /Type /FontDescriptor /FontName /VLMREG+NimbusSans-Regular /FontFamily (Nimbus Sans) /Flags 32 /FontBBox [-210 -299 1032 1075] /ItalicAngle 0 /Ascent 729 /Descent -271 /CapHeight 729 /StemV 80 /FontFile3 ${regularFontFileId} 0 R >>`);
  objects.set(boldDescriptorId, `<< /Type /FontDescriptor /FontName /VLMBLD+NimbusSans-Bold /FontFamily (Nimbus Sans) /Flags 32 /FontBBox [-188 -307 1069 1070] /ItalicAngle 0 /Ascent 729 /Descent -271 /CapHeight 729 /StemV 120 /FontFile3 ${boldFontFileId} 0 R >>`);
  objects.set(regularFontFileId, embeddedCffStream(VELMERE_SANS_REGULAR_CFF_ZLIB_BASE64, 15_263));
  objects.set(boldFontFileId, embeddedCffStream(VELMERE_SANS_BOLD_CFF_ZLIB_BASE64, 15_654));
  const cmap = toUnicodeCmap();
  objects.set(toUnicodeId, `<< /Length ${Buffer.byteLength(cmap, "ascii")} >>\nstream\n${cmap}\nendstream`);
  objects.set(infoId, `<< /Title ${encodePdfMetadataText(plan.title)} /Subject ${encodePdfMetadataText(`${plan.subtitle} | ${plan.documentId}`)} /Creator ${encodePdfMetadataText("Velmere Security")} /Producer ${encodePdfMetadataText(`Velmere deterministic PDF 1.7 | ${PASS4808_PDF_RENDER_CONTRACT_ID}`)} /CreationDate (${pdfDate(plan.generatedAt)}) /ModDate (${pdfDate(plan.generatedAt)}) /Keywords ${encodePdfMetadataText(`${plan.classification};${plan.locale};${plan.documentId};${plan.planDigest}`)} >>`);

  plan.pages.forEach((page, index) => {
    const pageId = pageObjectIds[index], contentId = contentObjectIds[index];
    const commands = [
      "BT", "/F2 18 Tf", "44 800 Td", `${encodeProAuditPdfHexText(plan.title)} Tj`, "ET",
      "BT", "/F1 9 Tf", "44 776 Td", `${encodeProAuditPdfHexText(plan.subtitle)} Tj`, "ET",
    ];
    let y = 744;
    for (const row of page.rows) {
      if (!row.blank) commands.push("BT", `${row.heading ? "/F2 10 Tf" : "/F1 9 Tf"}`, `44 ${y} Td`, `${encodeProAuditPdfHexText(row.text)} Tj`, "ET");
      y -= row.height;
    }
    commands.push(
      "BT", "/F1 7 Tf", "44 34 Td", `${encodeProAuditPdfHexText(fitTextToWidth(`${plan.issuerLine} | Page ${index + 1}/${plan.pages.length}`, 500, 7))} Tj`, "ET",
      "BT", "/F1 7 Tf", "44 23 Td", `${encodeProAuditPdfHexText(plan.footer)} Tj`, "ET",
      "BT", "/F1 7 Tf", "44 12 Td", `${encodeProAuditPdfHexText(plan.integrityLine)} Tj`, "ET",
    );
    const content = commands.join("\n");
    objects.set(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`);
  });

  const trailerId = plan.planDigest.slice("sha256:".length, "sha256:".length + 32);
  const objectCount = Math.max(...objects.keys());
  let pdf = "%PDF-1.7\n%Velmere\n";
  const offsets = Array.from({ length: objectCount + 1 }, () => 0);
  for (let id = 1; id <= objectCount; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error(`pdf_object_missing:${id}`);
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R /ID [<${trailerId}><${trailerId}>] >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

/** Byte-identical legacy renderer for snapshots produced before PASS4808. */
export function buildCustomerSafeMinimalPdfLegacyV1(lines: string[], options: CustomerSafePdfOptions = {}) {
  const title = toProAuditPdfAscii(options.title || "VELMERE AUDIT REPORT").slice(0, 72);
  const subtitle = toProAuditPdfAscii(options.subtitle || "Evidence-bound customer report").slice(0, 96);
  const footer = toProAuditPdfAscii(options.footer || "Velmere | Passive public-source review | Not a guarantee of safety").slice(0, 108);
  const maxLines = Math.max(40, Math.min(720, Math.trunc(options.maxLines || 480)));
  const documentId = cleanProAuditPdfInput(options.documentId ?? "velmere-audit", "velmere-audit", 120);
  const generatedAt = Number.isFinite(new Date(options.generatedAt ?? "").getTime()) ? String(options.generatedAt) : new Date().toISOString();
  const locale = options.locale ?? "en";
  const classification = options.classification ?? "customer_safe";
  const safeLines = lines.filter(isCustomerSafeProAuditPdfLine).flatMap((line) => {
    const clean = toProAuditPdfAscii(line).replace(/\s+/g, " ").trimEnd();
    if (!clean) return [""];
    const rows: string[] = [];
    let remaining = clean;
    while (remaining.length > 92) {
      const cut = Math.max(1, remaining.lastIndexOf(" ", 92));
      rows.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trimStart();
    }
    rows.push(remaining);
    return rows;
  }).slice(0, maxLines);
  const maximumLinesPerPage = 38;
  const plannedPageCount = Math.max(1, Math.ceil(safeLines.length / maximumLinesPerPage));
  const balancedLinesPerPage = Math.max(1, Math.min(maximumLinesPerPage, Math.ceil(safeLines.length / plannedPageCount)));
  const pageChunks: string[][] = [];
  for (let index = 0; index < safeLines.length; index += balancedLinesPerPage) pageChunks.push(safeLines.slice(index, index + balancedLinesPerPage));
  if (pageChunks.length === 0) pageChunks.push(["No customer-safe report content was available."]);

  const catalogId = 1, pagesId = 2, regularFontId = 3, boldFontId = 4, infoId = 5;
  const pageObjectIds = pageChunks.map((_, index) => 6 + index * 2);
  const contentObjectIds = pageChunks.map((_, index) => 7 + index * 2);
  const objects = new Map<number, string>();
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects.set(pagesId, `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
  objects.set(regularFontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(boldFontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.set(infoId, `<< /Title (${escapeProAuditPdfText(title)}) /Subject (${escapeProAuditPdfText(`${subtitle} | ${documentId}`)}) /Creator (Velmere Security) /Producer (Velmere deterministic PDF 1.7) /CreationDate (${pdfDate(generatedAt)}) /ModDate (${pdfDate(generatedAt)}) /Keywords (${escapeProAuditPdfText(`${classification};${locale};${documentId}`)}) >>`);

  pageChunks.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index], contentId = contentObjectIds[index];
    const commands = ["BT", "/F2 18 Tf", "44 800 Td", `(${escapeProAuditPdfText(title)}) Tj`, "ET", "BT", "/F1 9 Tf", "44 776 Td", `(${escapeProAuditPdfText(subtitle)}) Tj`, "ET"];
    let y = 744;
    for (const line of pageLines) {
      const useBold = heading(line);
      commands.push("BT", `${useBold ? "/F2 10 Tf" : "/F1 9 Tf"}`, `44 ${y} Td`, `(${escapeProAuditPdfText(line)}) Tj`, "ET");
      y -= useBold ? 18 : 16;
    }
    commands.push("BT", "/F1 8 Tf", "44 28 Td", `(${escapeProAuditPdfText(`${footer} | Page ${index + 1}/${pageChunks.length}`)}) Tj`, "ET");
    const content = commands.join("\n");
    objects.set(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
  });

  const digestSeed = JSON.stringify({ title, subtitle, footer, documentId, generatedAt, locale, classification, safeLines });
  const documentDigest = crypto.createHash("sha256").update(digestSeed).digest("hex");
  const trailerId = documentDigest.slice(0, 32);
  const objectCount = Math.max(...objects.keys());
  let pdf = "%PDF-1.7\n%Velmere\n";
  const offsets = Array.from({ length: objectCount + 1 }, () => 0);
  for (let id = 1; id <= objectCount; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error(`pdf_object_missing:${id}`);
    offsets[id] = Buffer.byteLength(pdf, "utf8");
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R /ID [<${trailerId}><${trailerId}>] >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
