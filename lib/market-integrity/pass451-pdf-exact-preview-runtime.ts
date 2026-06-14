export type Pass451Locale = "pl" | "de" | "en";

export type Pass451PdfExactPreview = {
  version: "pass451-pdf-exact-preview-runtime";
  locale: Pass451Locale;
  pageCount: 4;
  previewMode: "binary_pdf_exact";
  previewParity: "same_blob_as_download";
  focusPolicy: "trap_restore_escape";
  scrollPolicy: "background_locked_reader_only";
  labels: {
    exactPreview: string;
    humanReader: string;
    previewHint: string;
    progress: string;
    pageCount: string;
    generatedFrom: string;
  };
  forgeStages: Array<{
    id: "identity" | "sources" | "narrative" | "signature";
    label: string;
    detail: string;
  }>;
};

function resolveLocale(locale: string): Pass451Locale {
  return locale === "de" || locale === "en" ? locale : "pl";
}

export function buildPass451PdfExactPreview(locale: string): Pass451PdfExactPreview {
  const safeLocale = resolveLocale(locale);
  if (safeLocale === "de") {
    return {
      version: "pass451-pdf-exact-preview-runtime",
      locale: safeLocale,
      pageCount: 4,
      previewMode: "binary_pdf_exact",
      previewParity: "same_blob_as_download",
      focusPolicy: "trap_restore_escape",
      scrollPolicy: "background_locked_reader_only",
      labels: {
        exactPreview: "PDF 1:1",
        humanReader: "Lesbare Ansicht",
        previewHint: "Die Vorschau verwendet exakt dieselbe PDF-Datei wie der Download.",
        progress: "Dokumentfortschritt",
        pageCount: "4 Seiten",
        generatedFrom: "Aus einem verifizierten Report-Payload erzeugt",
      },
      forgeStages: [
        { id: "identity", label: "Instrument erkennen", detail: "Symbol, Markt und primäre Datenroute werden zugeordnet." },
        { id: "sources", label: "Quellen prüfen", detail: "Frische, Zweitquelle und sichtbare Datenlücken werden bewertet." },
        { id: "narrative", label: "Bericht schreiben", detail: "Basic, Pro und Advanced werden in verständliche Sprache übersetzt." },
        { id: "signature", label: "PDF versiegeln", detail: "Vier A4-Seiten und die Velmère-Signatur werden aus demselben Payload erzeugt." },
      ],
    };
  }
  if (safeLocale === "en") {
    return {
      version: "pass451-pdf-exact-preview-runtime",
      locale: safeLocale,
      pageCount: 4,
      previewMode: "binary_pdf_exact",
      previewParity: "same_blob_as_download",
      focusPolicy: "trap_restore_escape",
      scrollPolicy: "background_locked_reader_only",
      labels: {
        exactPreview: "PDF 1:1",
        humanReader: "Readable view",
        previewHint: "The preview uses the exact same PDF file as the download.",
        progress: "Document progress",
        pageCount: "4 pages",
        generatedFrom: "Generated from one verified report payload",
      },
      forgeStages: [
        { id: "identity", label: "Resolve instrument", detail: "The symbol, market and primary data route are matched." },
        { id: "sources", label: "Verify sources", detail: "Freshness, second source and visible evidence gaps are checked." },
        { id: "narrative", label: "Write the report", detail: "Basic, Pro and Advanced are translated into human language." },
        { id: "signature", label: "Seal the PDF", detail: "Four A4 pages and the Velmère signature are built from the same payload." },
      ],
    };
  }
  return {
    version: "pass451-pdf-exact-preview-runtime",
    locale: safeLocale,
    pageCount: 4,
    previewMode: "binary_pdf_exact",
    previewParity: "same_blob_as_download",
    focusPolicy: "trap_restore_escape",
    scrollPolicy: "background_locked_reader_only",
    labels: {
      exactPreview: "PDF 1:1",
      humanReader: "Widok czytelny",
      previewHint: "Podgląd używa dokładnie tego samego pliku PDF co pobieranie.",
      progress: "Postęp dokumentu",
      pageCount: "4 strony",
      generatedFrom: "Wygenerowano z jednego zweryfikowanego payloadu raportu",
    },
    forgeStages: [
      { id: "identity", label: "Rozpoznanie instrumentu", detail: "System przypisuje symbol, rynek i główną ścieżkę danych." },
      { id: "sources", label: "Weryfikacja źródeł", detail: "Sprawdzana jest świeżość, drugie źródło i jawne luki dowodowe." },
      { id: "narrative", label: "Redakcja raportu", detail: "Basic, Pro i Advanced są tłumaczone na język zrozumiały dla człowieka." },
      { id: "signature", label: "Złożenie PDF", detail: "Cztery strony A4 i podpis Velmère powstają z tego samego payloadu." },
    ],
  };
}

export const pass451PdfExactPreviewRuntime = {
  id: "PASS451",
  title: "PDF Exact Preview & Accessible Modal Runtime",
  invariants: [
    "Preview and download must use the same binary PDF blob.",
    "Keyboard focus remains inside the dialog until close and then returns to the trigger.",
    "Background scroll is locked while the forge or preview is open.",
    "The four-stage V forge exposes visible progress without fake completion.",
  ],
} as const;
