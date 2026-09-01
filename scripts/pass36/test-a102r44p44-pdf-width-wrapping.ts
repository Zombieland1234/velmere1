#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  headlinePdf,
  lensPdfTextWidth,
  wrapPdfWidth,
} from "../../lib/search/lens-pdf-renderer.ts";

type Locale = "pl" | "en" | "de";

type Case = {
  id: string;
  locale: Locale;
  value: string;
  size: number;
  maximumWidth: number;
  maxLines: number;
  mustNotTruncate?: boolean;
};

const cases: Case[] = [
  {
    id: "a83-vanguard-first-page",
    locale: "en",
    value: "[A83 QA] Vanguard Real Estate ETF",
    size: 31,
    maximumWidth: 503,
    maxLines: 2,
  },
  {
    id: "german-advanced-provenance",
    locale: "de",
    value: "Erweiterter Evidenz-, Widerspruchs- und Herkunftsnachweis",
    size: 28,
    maximumWidth: 503,
    maxLines: 2,
  },
  {
    id: "polish-advanced-missing-proof",
    locale: "pl",
    value: "Zaawansowany rejestr brakujących dowodów i sprzeczności źródeł",
    size: 28,
    maximumWidth: 503,
    maxLines: 2,
  },
  {
    id: "long-unbroken-token",
    locale: "en",
    value: "SUPERCALIFRAGILISTICEXPIALIDOCIOUSSOURCEIDENTITYWITHOUTBREAKS",
    size: 31,
    maximumWidth: 503,
    maxLines: 2,
  },
  {
    id: "full-calibration-sha256",
    locale: "en",
    value: "28b844d31ef1382be3bc2f9fd5347342cef9b09d7d3f91f567ba115c5a2df191",
    size: 8,
    maximumWidth: 210,
    maxLines: 2,
    mustNotTruncate: true,
  },
];

const rows: Array<Record<string, unknown>> = [];
for (const testCase of cases) {
  const lines = wrapPdfWidth(
    testCase.value,
    testCase.maximumWidth,
    testCase.maxLines,
    testCase.size,
    testCase.locale,
  );
  assert.ok(lines.length >= 1 && lines.length <= testCase.maxLines, `${testCase.id}:line_count`);
  for (const [index, line] of lines.entries()) {
    const width = lensPdfTextWidth(line, testCase.size);
    assert.ok(
      width <= testCase.maximumWidth + 0.001,
      `${testCase.id}:line_${index + 1}_width:${width}`,
    );
  }
  if (testCase.mustNotTruncate) {
    assert.doesNotMatch(lines.join(""), /\[(?:cut|skr\.|gek\.)\]/u, `${testCase.id}:unexpected_truncation`);
  }
  rows.push({
    id: testCase.id,
    locale: testCase.locale,
    lines,
    widths: lines.map((line) => Number(lensPdfTextWidth(line, testCase.size).toFixed(3))),
    maximumWidth: testCase.maximumWidth,
  });
}

const commands: string[] = [];
headlinePdf(
  commands,
  46,
  744,
  "[A83 QA] Vanguard Real Estate ETF",
  34,
  2,
  "en",
  503,
);
assert.ok(commands.length >= 1 && commands.length <= 2, "headline line-count contract");
assert.ok(commands.every((command) => command.includes("/F1 31 Tf")), "headline font contract");

console.log(
  JSON.stringify(
    {
      status: "PASS_R44P44_PDF_WIDTH_WRAPPING",
      checks: cases.length + 2,
      rows,
      headlineCommandCount: commands.length,
      truthBoundary:
        "This verifies physical-width wrapping against the embedded PDF font metrics. Full 450-document raster QA remains a separate required gate.",
    },
    null,
    2,
  ),
);
