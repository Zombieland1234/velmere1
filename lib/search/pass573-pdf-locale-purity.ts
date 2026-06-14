export type Pass573Locale = "pl" | "de" | "en";

export type Pass573PdfLocalePurity = {
  version: "pass573-pdf-locale-purity";
  locale: Pass573Locale;
  state: "clean" | "repaired" | "review";
  leakCount: number;
  repairedCount: number;
  leaks: string[];
  boundary: string;
};

const phraseMap: Record<Exclude<Pass573Locale, "en">, ReadonlyArray<readonly [RegExp, string]>> = {
  pl: [
    [/\bsource confidence\b/gi, "pewność źródeł"],
    [/\bsource ledger preview\b/gi, "podgląd rejestru źródeł"],
    [/\bmissing data\b/gi, "brakujące dane"],
    [/\bsecond provider\b/gi, "drugi provider"],
    [/\bready to download\b/gi, "gotowy do pobrania"],
    [/\breview required\b/gi, "wymaga przeglądu"],
    [/\bblocked\b/gi, "zablokowany"],
    [/\bpartial\b/gi, "częściowe"],
    [/\bfallback\b/gi, "tryb zastępczy"],
    [/\bunknown\b/gi, "brak potwierdzenia"],
    [/\bprovider unavailable\b/gi, "provider niedostępny"],
  ],
  de: [
    [/\bsource confidence\b/gi, "Quellenkonfidenz"],
    [/\bsource ledger preview\b/gi, "Vorschau des Quellenregisters"],
    [/\bmissing data\b/gi, "fehlende Daten"],
    [/\bsecond provider\b/gi, "Zweitprovider"],
    [/\bready to download\b/gi, "downloadbereit"],
    [/\breview required\b/gi, "Prüfung erforderlich"],
    [/\bblocked\b/gi, "blockiert"],
    [/\bpartial\b/gi, "teilweise"],
    [/\bfallback\b/gi, "Ersatzmodus"],
    [/\bunknown\b/gi, "nicht bestätigt"],
    [/\bprovider unavailable\b/gi, "Provider nicht verfügbar"],
  ],
};

const leakPatterns: Record<Exclude<Pass573Locale, "en">, ReadonlyArray<RegExp>> = {
  pl: [/\bsource confidence\b/i, /\bsource ledger preview\b/i, /\bmissing data\b/i, /\bready to download\b/i, /\breview required\b/i],
  de: [/\bsource confidence\b/i, /\bsource ledger preview\b/i, /\bmissing data\b/i, /\bready to download\b/i, /\breview required\b/i, /\bpodgląd\b/i, /\bźród/i],
};

export function sanitizePass573PublicPdfText(locale: Pass573Locale, value: string) {
  if (locale === "en") return value.replace(/\s+/g, " ").trim();
  let output = value;
  for (const [pattern, replacement] of phraseMap[locale]) output = output.replace(pattern, replacement);
  return output.replace(/\s+/g, " ").trim();
}

export function buildPass573PdfLocalePurity(locale: Pass573Locale, values: readonly string[]): Pass573PdfLocalePurity {
  if (locale === "en") {
    return { version: "pass573-pdf-locale-purity", locale, state: "clean", leakCount: 0, repairedCount: 0, leaks: [], boundary: "English is the selected report locale; no cross-locale repair is required." };
  }
  const leaks = values.flatMap((value) => leakPatterns[locale].filter((pattern) => pattern.test(value)).map((pattern) => pattern.source));
  const repairedCount = values.reduce((count, value) => count + (sanitizePass573PublicPdfText(locale, value) === value.replace(/\s+/g, " ").trim() ? 0 : 1), 0);
  return {
    version: "pass573-pdf-locale-purity",
    locale,
    state: leaks.length ? "repaired" : "clean",
    leakCount: leaks.length,
    repairedCount,
    leaks: Array.from(new Set(leaks)).slice(0, 12),
    boundary: locale === "pl" ? "Publiczny Reader i pobrany PDF używają jednego języka; nazwy własne providerów pozostają bez zmian." : "Öffentlicher Reader und Download-PDF verwenden eine Sprache; Eigennamen der Provider bleiben unverändert.",
  };
}
