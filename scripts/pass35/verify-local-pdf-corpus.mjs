import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "../..");
const qualityRoot = path.join(repoRoot, "artifacts/pass35/local-product-quality");
const manifestPath = path.join(qualityRoot, "PASS35_LOCAL_PDF_CORPUS_MANIFEST.json");
const receiptPath = path.join(qualityRoot, "PASS35_LOCAL_PDF_QA_RECEIPT.json");
const expectedPages = Object.freeze({ Basic: 2, Pro: 4, Advanced: 8 });
const requiredMarkers = Object.freeze(["SYNTHETIC QA", "OFFLINE", "NOT LIVE", "NOT FOR SALE"]);
const truncationMarkers = Object.freeze(["[skr.]", "[gek.]", "[cut]"]);
const directionalLanguage = /\b(?:buy|sell)\b|worth[\s-]*buying|\b(?:kup|kupno|kupowac|kupować|sprzedaj|sprzedaz|sprzedaż)\b/i;
const manropeWidths = (
  "200 282 342 913 563 902 640 182 408 408 418 580 240 420 220 357 578 358 553 534 577 572 620 481 559 620 270 280 599 750 599 504 897 609 601 700 652 560 490 687 660 202 439 558 495 831 662 706 581 706 611 589 590 690 579 909 573 519 581 396 357 396 662 660 457 542 576 539 576 573 339 576 573 202 225 468 202 814 573 574 576 576 335 514 379 573 478 744 509 506 527 400 222 400 626 0 609 542 700 539 560 573 495 361 662 573 589 514 581 527 581 527 581 527 0 0 0 0 0 0 0 0 0 0 0 0 0 0 200 282 539 571 622 519 222 514 480 748 312 502 600 420 605 480 450 600 392 380 457 583 581 200 386 306 340 502 932 881 947 504 609 609 609 609 609 609 905 700 560 560 560 560 202 202 202 202 641 662 706 706 706 706 706 475 706 690 690 690 690 519 571 575 542 542 542 542 542 542 946 539 573 573 573 573 202 202 202 202 573 573 574 574 574 574 574 540 574 573 573 573 573 506 576 506"
).split(" ").map(Number);

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function occurrenceCount(source, token) {
  let count = 0;
  let cursor = 0;
  while ((cursor = source.indexOf(token, cursor)) !== -1) {
    count += 1;
    cursor += token.length;
  }
  return count;
}

function objectBody(source, objectId) {
  const match = source.match(new RegExp(`(?:^|\\n)${objectId} 0 obj\\n([\\s\\S]*?)\\nendobj(?:\\n|$)`));
  return match?.[1] ?? "";
}

function pdfLiteralCodes(value) {
  const codes = [];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") {
      codes.push(value.charCodeAt(index) & 0xff);
      continue;
    }
    const octal = value.slice(index + 1).match(/^[0-7]{1,3}/)?.[0];
    if (octal) {
      codes.push(Number.parseInt(octal, 8));
      index += octal.length;
      continue;
    }
    index += 1;
    const escaped = value[index] ?? "";
    codes.push(
      escaped === "n"
        ? 10
        : escaped === "r"
          ? 13
          : escaped === "t"
            ? 9
            : escaped.charCodeAt(0) & 0xff,
    );
  }
  return codes;
}

function pdfTextWidth(value, size) {
  const units = pdfLiteralCodes(value).reduce(
    (sum, code) => sum + (manropeWidths[code - 32] ?? 600),
    0,
  );
  return (units / 1000) * size;
}

function pageTwoFooterOverlap(source) {
  const stream = objectBody(source, 7);
  const rows = [...stream.matchAll(
    /BT\s+\/F1\s+([0-9]+(?:\.[0-9]+)?)\s+Tf\s+[0-9. ]+\s+rg\s+([0-9.]+)\s+68\s+Td\s+\(((?:\\.|[^\\)])*)\)\s+Tj\s+ET/g,
  )].map((match) => ({
    size: Number(match[1]),
    x: Number(match[2]),
    value: match[3],
    width: pdfTextWidth(match[3], Number(match[1])),
  })).sort((left, right) => left.x - right.x);
  let maximumOverlap = 0;
  for (let index = 1; index < rows.length; index += 1) {
    maximumOverlap = Math.max(
      maximumOverlap,
      rows[index - 1].x + rows[index - 1].width - rows[index].x,
    );
  }
  return {
    rowCount: rows.length,
    maximumOverlap: Number(Math.max(0, maximumOverlap).toFixed(3)),
    safe: rows.length === 3 && maximumOverlap <= 0,
  };
}

function decodeUtf16BeHex(value) {
  if (!/^feff(?:[a-f0-9]{4})*$/i.test(value)) return null;
  const bytes = Buffer.from(value.slice(4), "hex");
  for (let index = 0; index < bytes.length; index += 2) {
    const first = bytes[index];
    bytes[index] = bytes[index + 1];
    bytes[index + 1] = first;
  }
  return bytes.toString("utf16le");
}

function pdfSubject(source) {
  const match = source.match(/\/Subject\s+<([a-f0-9]+)>/i);
  return match ? decodeUtf16BeHex(match[1]) : null;
}

function visiblePdfStrings(source) {
  const values = [];
  const patterns = [
    /\(((?:\\.|[^\\)])*)\)\s*Tj\b/g,
    /\/T\s+\(((?:\\.|[^\\)])*)\)/g,
    /\/Contents\s+\(((?:\\.|[^\\)])*)\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      values.push(match[1].replace(/\\([\\()])/g, "$1"));
    }
  }
  return values;
}

const residualLocaleLeak =
  /\b(?:source|evidence|confidence|freshness|provider|claim|payload|seal|review|missing|blocked|partial|fallback|unknown|lineage|re-check|check|proof)\b/i;

export function inspectPdfBytes(bytes, expected = {}) {
  const source = Buffer.from(bytes).toString("latin1");
  const pageCount = (source.match(/\/Type\s*\/Page\b/g) ?? []).length;
  const a4PageCount = (source.match(/\/MediaBox\s*\[0\s+0\s+595\s+842\]/g) ?? []).length;
  const markerOccurrences = Object.fromEntries(requiredMarkers.map((marker) => [marker, occurrenceCount(source, marker)]));
  const truncationMarkerOccurrences = Object.fromEntries(
    truncationMarkers.map((marker) => [marker, occurrenceCount(source, marker)]),
  );
  const truncationMarkerCount = Object.values(truncationMarkerOccurrences)
    .reduce((sum, count) => sum + count, 0);
  const fontEmbedded = /\/Subtype\s*\/TrueType\b[\s\S]*\/FontFile2\s+\d+\s+0\s+R\b/.test(source);
  const unicodeMapPresent = /\/ToUnicode\s+\d+\s+0\s+R\b/.test(source)
    && /\/CMapName\s*\/VelmereManrope-UCS\b/.test(source);
  const fontSizes = [...source.matchAll(/\/F1\s+([0-9]+(?:\.[0-9]+)?)\s+Tf\b/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const minimumFontSize = fontSizes.length ? Math.min(...fontSizes) : null;
  const visibleStrings = visiblePdfStrings(source);
  const duplicatePeriodCount = visibleStrings.reduce(
    (sum, value) => sum + (value.match(/\.\./g)?.length ?? 0),
    0,
  );
  const footer = pageTwoFooterOverlap(source);
  const subject = pdfSubject(source);
  const expectedSubjectPhrase =
    expected.locale === "pl"
      ? "raport badawczy powiązany ze źródłami"
      : expected.locale === "de"
        ? "quellengebundener Forschungsbericht"
        : "source-bound research report";
  const subjectUnicodeValid =
    typeof subject === "string"
    && subject.includes(expectedSubjectPhrase)
    && (!expected.symbol || subject.includes(expected.symbol));
  const localeLeaks =
    expected.locale === "pl" || expected.locale === "de"
      ? [...new Set(
          visibleStrings
            .map((value) => value
              .replaceAll("SYNTHETIC QA", "")
              .replaceAll("OFFLINE", "")
              .replaceAll("NOT LIVE", "")
              .replaceAll("NOT FOR SALE", ""))
            .flatMap((value) => value.match(residualLocaleLeak)?.[0] ?? [])
            .filter(Boolean),
        )].sort()
      : [];
  const advancedPageFiveBody = expected.pageCount === 8 ? objectBody(source, 13) : "";
  const advancedPageSevenBody = expected.pageCount === 8 ? objectBody(source, 17) : "";
  const advancedPageFiveCardCount =
    expected.pageCount === 8
      ? occurrenceCount(advancedPageFiveBody, "q 0.96 0.95 0.92 rg ")
      : null;
  const advancedPageSevenCardCount =
    expected.pageCount === 8
      ? occurrenceCount(advancedPageSevenBody, "q 0.96 0.95 0.92 rg ")
      : null;
  const advancedPageFiveTextCount =
    expected.pageCount === 8 ? occurrenceCount(advancedPageFiveBody, ") Tj ET") : null;
  const advancedPageSevenTextCount =
    expected.pageCount === 8 ? occurrenceCount(advancedPageSevenBody, ") Tj ET") : null;
  const reasons = [];
  if (!source.startsWith("%PDF-1.4")) reasons.push("pdf_header_invalid");
  if (!source.trimEnd().endsWith("%%EOF")) reasons.push("pdf_eof_invalid");
  if (!/\bxref\b[\s\S]*\bstartxref\b/.test(source)) reasons.push("pdf_xref_missing");
  if (pageCount !== expected.pageCount) reasons.push(`pdf_page_count:${pageCount}/${expected.pageCount}`);
  if (a4PageCount !== pageCount) reasons.push(`pdf_a4_page_count:${a4PageCount}/${pageCount}`);
  if (requiredMarkers.some((marker) => markerOccurrences[marker] < pageCount)) reasons.push("synthetic_markers_missing");
  if (truncationMarkerCount > 0) reasons.push(`visible_text_truncated:${truncationMarkerCount}`);
  if (duplicatePeriodCount > 0) reasons.push(`visible_text_double_period:${duplicatePeriodCount}`);
  if (!fontEmbedded) reasons.push("embedded_font_missing");
  if (!unicodeMapPresent) reasons.push("unicode_map_missing");
  if (minimumFontSize === null) reasons.push("font_size_missing");
  else if (minimumFontSize < 7) reasons.push(`font_size_below_minimum:${minimumFontSize}`);
  if (!footer.safe) reasons.push(`page_two_footer_overlap:${footer.maximumOverlap}`);
  if (!subjectUnicodeValid) reasons.push("pdf_subject_unicode_invalid");
  if (localeLeaks.length) reasons.push(`pdf_locale_leak:${localeLeaks.join(",")}`);
  if (expected.pageCount === 8 && advancedPageFiveCardCount !== 6) {
    reasons.push(`advanced_page_five_card_count:${advancedPageFiveCardCount}/6`);
  }
  if (expected.pageCount === 8 && advancedPageSevenCardCount !== 6) {
    reasons.push(`advanced_page_seven_card_count:${advancedPageSevenCardCount}/6`);
  }
  if (expected.pageCount === 8 && Number(advancedPageFiveTextCount) < 16) {
    reasons.push(`advanced_page_five_text_count:${advancedPageFiveTextCount}/16`);
  }
  if (expected.pageCount === 8 && Number(advancedPageSevenTextCount) < 16) {
    reasons.push(`advanced_page_seven_text_count:${advancedPageSevenTextCount}/16`);
  }
  if (directionalLanguage.test(source)) reasons.push("banned_directional_language");
  if (/\bvlm_(?:rpt|receipt)_[a-z0-9_-]+\b/i.test(source) || /\bserver:[a-f0-9]{18,64}\b/i.test(source)) {
    reasons.push("production_access_binding_present");
  }
  if (expected.symbol && !source.includes(expected.symbol)) reasons.push("asset_symbol_missing");
  return {
    status: reasons.length ? "FAIL" : "PASS",
    reasons,
    pageCount,
    a4PageCount,
    markerOccurrences,
    truncationMarkerOccurrences,
    truncationMarkerCount,
    duplicatePeriodCount,
    fontEmbedded,
    unicodeMapPresent,
    minimumFontSize,
    pageTwoFooterSafe: footer.safe,
    pageTwoFooterMaximumOverlap: footer.maximumOverlap,
    subjectUnicodeValid,
    subject,
    localeLeakCount: localeLeaks.length,
    localeLeaks,
    advancedPageFiveCardCount,
    advancedPageSevenCardCount,
    advancedPageFiveTextCount,
    advancedPageSevenTextCount,
    syntheticMarkersPresent: requiredMarkers.every((marker) => markerOccurrences[marker] >= pageCount),
    bannedDirectionalLanguageAbsent: !directionalLanguage.test(source),
  };
}

function sortedSet(values) {
  return [...new Set(values)].sort();
}

function sameStringSet(left, right) {
  return JSON.stringify(sortedSet(left)) === JSON.stringify(sortedSet(right));
}

function safeRelativePdfPath(value) {
  if (typeof value !== "string" || !value.endsWith(".pdf")) return null;
  const absolute = path.resolve(repoRoot, value);
  const corpusRoot = path.join(qualityRoot, "pdf-corpus");
  if (absolute !== corpusRoot && !absolute.startsWith(`${corpusRoot}${path.sep}`)) return null;
  return absolute;
}

export async function verifyLocalPdfCorpus({ writeReceipt = true } = {}) {
  const failures = [];
  const pdfs = [];
  let manifest = null;
  let manifestBytes = null;
  try {
    manifestBytes = await fs.readFile(manifestPath);
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch (error) {
    failures.push(`manifest_unreadable:${error instanceof Error ? error.message : "unknown"}`);
  }

  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  if (manifest?.schemaVersion !== "velmere.pass35.local-pdf-corpus-manifest.v1") failures.push("manifest_schema_invalid");
  if (manifest?.mode !== "synthetic_offline_renderer_qa") failures.push("manifest_mode_invalid");
  if (entries.length !== 150) failures.push(`manifest_pdf_count:${entries.length}/150`);
  if (manifest?.renderer?.routeUsed !== false || manifest?.renderer?.entitlementUsed !== false || manifest?.renderer?.accountUsed !== false) {
    failures.push("manifest_is_not_isolated_from_production_access");
  }
  const boundary = manifest?.boundaries ?? {};
  if (boundary.synthetic !== true || boundary.offline !== true || boundary.notLive !== true || boundary.notForSale !== true) {
    failures.push("manifest_synthetic_boundary_invalid");
  }
  if (boundary.commercialUseAllowed !== false || boundary.investmentRecommendation !== false || boundary.productionEntitlementBypassed !== false) {
    failures.push("manifest_commercial_boundary_invalid");
  }

  const entriesByTier = Object.fromEntries(Object.keys(expectedPages).map((tier) => [tier, entries.filter((entry) => entry.tier === tier)]));
  const assetSets = Object.fromEntries(Object.entries(entriesByTier).map(([tier, tierEntries]) => [tier, tierEntries.map((entry) => entry.assetId)]));
  for (const tier of Object.keys(expectedPages)) {
    if (entriesByTier[tier].length !== 50) failures.push(`tier_pdf_count:${tier}:${entriesByTier[tier].length}/50`);
    if (new Set(assetSets[tier]).size !== 50) failures.push(`tier_unique_assets:${tier}:${new Set(assetSets[tier]).size}/50`);
  }
  if (!sameStringSet(assetSets.Basic, assetSets.Pro) || !sameStringSet(assetSets.Basic, assetSets.Advanced)) {
    failures.push("tier_asset_sets_differ");
  }

  for (const entry of entries) {
    const reasons = [];
    const expectedPageCount = expectedPages[entry.tier];
    const absolutePath = safeRelativePdfPath(entry.path);
    let bytes = null;
    if (!absolutePath) reasons.push("pdf_path_invalid");
    else {
      try {
        bytes = await fs.readFile(absolutePath);
      } catch {
        reasons.push("pdf_unreadable");
      }
    }
    const inspection = bytes
      ? inspectPdfBytes(bytes, {
          pageCount: expectedPageCount,
          symbol: entry.symbol,
          locale: entry.locale,
          tier: entry.tier,
        })
      : {
          status: "FAIL",
          reasons: [],
          pageCount: 0,
          a4PageCount: 0,
          markerOccurrences: {},
          truncationMarkerOccurrences: {},
          truncationMarkerCount: 0,
          duplicatePeriodCount: 0,
          fontEmbedded: false,
          unicodeMapPresent: false,
          minimumFontSize: null,
          pageTwoFooterSafe: false,
          pageTwoFooterMaximumOverlap: null,
          subjectUnicodeValid: false,
          subject: null,
          localeLeakCount: 0,
          localeLeaks: [],
          advancedPageFiveCardCount: null,
          advancedPageSevenCardCount: null,
          advancedPageFiveTextCount: null,
          advancedPageSevenTextCount: null,
          syntheticMarkersPresent: false,
          bannedDirectionalLanguageAbsent: false,
        };
    reasons.push(...inspection.reasons);
    if (!expectedPageCount) reasons.push("tier_invalid");
    if (entry.pageCount !== expectedPageCount) reasons.push(`manifest_page_count:${entry.pageCount}/${expectedPageCount}`);
    if (bytes && sha256(bytes) !== entry.sha256) reasons.push("pdf_sha256_mismatch");
    if (bytes && bytes.byteLength !== entry.byteLength) reasons.push("pdf_byte_length_mismatch");
    if (!/^sha256:[a-f0-9]{64}$/.test(String(entry.sha256 ?? ""))) reasons.push("pdf_sha256_format_invalid");
    if (!/^sha256:[a-f0-9]{64}$/.test(String(entry.snapshotDigest ?? ""))) reasons.push("snapshot_digest_format_invalid");
    if (entry.sourceMode !== "missing" || entry.sourceConfidence !== 0) reasons.push("synthetic_source_boundary_invalid");
    if (entry.synthetic !== true || entry.offline !== true || entry.notLive !== true || entry.notForSale !== true || entry.commercialUseAllowed !== false) {
      reasons.push("pdf_manifest_boundary_invalid");
    }
    pdfs.push({
      id: entry.id ?? null,
      assetId: entry.assetId ?? null,
      symbol: entry.symbol ?? null,
      tier: entry.tier ?? null,
      locale: entry.locale ?? null,
      scenario: entry.scenario ?? null,
      path: entry.path ?? null,
      sha256: bytes ? sha256(bytes) : null,
      byteLength: bytes?.byteLength ?? 0,
      pageCount: inspection.pageCount,
      a4PageCount: inspection.a4PageCount,
      syntheticMarkersPresent: inspection.syntheticMarkersPresent,
      truncationMarkerOccurrences: inspection.truncationMarkerOccurrences,
      truncationMarkerCount: inspection.truncationMarkerCount,
      duplicatePeriodCount: inspection.duplicatePeriodCount,
      fontEmbedded: inspection.fontEmbedded,
      unicodeMapPresent: inspection.unicodeMapPresent,
      minimumFontSize: inspection.minimumFontSize,
      pageTwoFooterSafe: inspection.pageTwoFooterSafe,
      pageTwoFooterMaximumOverlap: inspection.pageTwoFooterMaximumOverlap,
      subjectUnicodeValid: inspection.subjectUnicodeValid,
      subject: inspection.subject,
      localeLeakCount: inspection.localeLeakCount,
      localeLeaks: inspection.localeLeaks,
      advancedPageFiveCardCount: inspection.advancedPageFiveCardCount,
      advancedPageSevenCardCount: inspection.advancedPageSevenCardCount,
      advancedPageFiveTextCount: inspection.advancedPageFiveTextCount,
      advancedPageSevenTextCount: inspection.advancedPageSevenTextCount,
      bannedDirectionalLanguageAbsent: inspection.bannedDirectionalLanguageAbsent,
      sourceMode: entry.sourceMode ?? null,
      sourceConfidence: entry.sourceConfidence ?? null,
      commercialUseAllowed: false,
      status: reasons.length ? "FAIL" : "PASS",
      reasons,
    });
  }

  const passedPdfs = pdfs.filter((pdf) => pdf.status === "PASS").length;
  const totalPages = pdfs.reduce((sum, pdf) => sum + pdf.pageCount, 0);
  if (totalPages !== 700) failures.push(`total_pages:${totalPages}/700`);
  if (passedPdfs !== 150) failures.push(`passing_pdfs:${passedPdfs}/150`);
  const assertions = {
    total: 9 + pdfs.length * 21 + pdfs.filter((pdf) => pdf.tier === "Advanced").length * 4,
    passed: 0,
    failed: 0,
  };
  assertions.failed = failures.length + pdfs.reduce((sum, pdf) => sum + pdf.reasons.length, 0);
  assertions.passed = Math.max(0, assertions.total - assertions.failed);
  const byTier = Object.fromEntries(Object.keys(expectedPages).map((tier) => [tier, pdfs.filter((pdf) => pdf.tier === tier).length]));
  const receipt = {
    schemaVersion: "velmere.pass35.local-pdf-qa-receipt.v1",
    generatedAt: manifest?.generatedAt ?? "1970-01-01T00:00:00.000Z",
    mode: "synthetic_offline_renderer_qa",
    status: failures.length === 0 && pdfs.every((pdf) => pdf.status === "PASS") ? "PASS" : "FAIL",
    manifest: {
      path: path.relative(repoRoot, manifestPath).split(path.sep).join("/"),
      sha256: manifestBytes ? sha256(manifestBytes) : null,
    },
    boundaries: {
      synthetic: true,
      offline: true,
      notLive: true,
      notForSale: true,
      investmentRecommendation: false,
      productionEntitlementBypassed: false,
    },
    totals: {
      pdfCount: pdfs.length,
      byTier,
      totalPages,
    },
    pdfs,
    assertions,
    failures,
  };
  if (writeReceipt) {
    await fs.mkdir(qualityRoot, { recursive: true });
    await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  }
  return receipt;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  const receipt = await verifyLocalPdfCorpus();
  console.log(JSON.stringify({
    status: receipt.status,
    receiptPath: path.relative(repoRoot, receiptPath).split(path.sep).join("/"),
    totals: receipt.totals,
    assertions: receipt.assertions,
    failures: receipt.failures,
  }, null, 2));
  if (receipt.status !== "PASS") process.exitCode = 1;
}
