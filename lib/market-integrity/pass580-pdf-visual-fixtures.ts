export type Pass580Locale = "pl" | "de" | "en";
export type Pass580Depth = "basic" | "pro" | "advanced";
export type Pass580Density = "short" | "normal" | "overloaded";

export type Pass580PdfVisualFixture = {
  id: string;
  locale: Pass580Locale;
  depth: Pass580Depth;
  density: Pass580Density;
  expectedPages: 4;
  expectedSourceRows: number;
  expectedFieldBudget: 10 | 14 | 20;
  maxDensityPercent: number;
};

export type Pass580PdfVisualFixtureReceipt = {
  version: "pass580-pdf-visual-fixtures";
  fixtureId: string;
  snapshotKey: string;
  locale: Pass580Locale;
  depth: Pass580Depth;
  density: Pass580Density;
  expectedPages: 4;
  state: "ready" | "review";
  boundary: string;
};

const depthBudgets: Record<Pass580Depth, 10 | 14 | 20> = {
  basic: 10,
  pro: 14,
  advanced: 20,
};

const densityProfiles: Record<
  Pass580Density,
  { sources: number; maxDensity: number }
> = {
  short: { sources: 1, maxDensity: 56 },
  normal: { sources: 3, maxDensity: 92 },
  overloaded: { sources: 8, maxDensity: 118 },
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

export const PASS580_PDF_VISUAL_FIXTURES: readonly Pass580PdfVisualFixture[] = (
  ["pl", "de", "en"] as const
).flatMap((locale) =>
  (["basic", "pro", "advanced"] as const).flatMap((depth) =>
    (["short", "normal", "overloaded"] as const).map((density) => ({
      id: `pass580-${locale}-${depth}-${density}`,
      locale,
      depth,
      density,
      expectedPages: 4 as const,
      expectedSourceRows: densityProfiles[density].sources,
      expectedFieldBudget: depthBudgets[depth],
      maxDensityPercent: densityProfiles[density].maxDensity,
    })),
  ),
);

export function resolvePass580Density(maxDensity: number): Pass580Density {
  if (maxDensity <= 64) return "short";
  if (maxDensity <= 100) return "normal";
  return "overloaded";
}

export function buildPass580PdfVisualFixtureReceipt(input: {
  locale: Pass580Locale;
  depth: Pass580Depth;
  maxDensity: number;
  sourceCount: number;
  fieldBudget: number;
  checksum: string;
}): Pass580PdfVisualFixtureReceipt {
  const density = resolvePass580Density(input.maxDensity);
  const fixture = PASS580_PDF_VISUAL_FIXTURES.find(
    (candidate) =>
      candidate.locale === input.locale &&
      candidate.depth === input.depth &&
      candidate.density === density,
  );
  const fixtureId =
    fixture?.id ?? `pass580-${input.locale}-${input.depth}-${density}`;
  const snapshotKey = `VLM-FIX-${hash(
    [
      fixtureId,
      input.sourceCount,
      input.fieldBudget,
      input.maxDensity,
      input.checksum,
    ].join("|"),
  )}`;

  return {
    version: "pass580-pdf-visual-fixtures",
    fixtureId,
    snapshotKey,
    locale: input.locale,
    depth: input.depth,
    density,
    expectedPages: 4,
    state: density === "overloaded" ? "review" : "ready",
    boundary:
      "The same PL/DE/EN short, normal and overloaded fixtures are used by Reader and download regression checks.",
  };
}
