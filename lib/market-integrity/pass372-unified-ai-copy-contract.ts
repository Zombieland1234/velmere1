export type Pass372Mode = "basic" | "pro" | "advanced";

export const pass372BrainTransformPhases = [
  { id: "identity", label: "Identity", seconds: 0.7, copy: "Rozpoznanie symbolu, klasy rynku i właściwego provider lane." },
  { id: "sources", label: "Sources", seconds: 1.1, copy: "Timestamp, cache age, fallback i drugi tor potwierdzenia." },
  { id: "chart", label: "Chart", seconds: 1.0, copy: "Świece, wolumen, MA, timeframe i zmienność w jednym modelu." },
  { id: "security", label: "Security", seconds: 1.3, copy: "Wallet boundary, ECC mental model, entropy quality i redacted proof." },
  { id: "research", label: "Research", seconds: 1.2, copy: "Prime Lab pokazuje hipotezę i audyt numeryczny bez publicznego overclaimu." },
  { id: "readout", label: "Readout", seconds: 1.4, copy: "10/14/20 krótkich punktów zamiast ściany tekstu albo debug lanes." },
] as const;

export function getPass372ScanSeconds(mode: Pass372Mode) {
  const base = pass372BrainTransformPhases.reduce((sum, phase) => sum + phase.seconds, 0);
  if (mode === "advanced") return `${(base + 2.4).toFixed(1)}s`;
  if (mode === "pro") return `${(base + 1.0).toFixed(1)}s`;
  return `${Math.max(5.0, base - 0.8).toFixed(1)}s`;
}

export function buildPass372HumanAiBrief(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass372Mode }) {
  const band = input.risk >= 55 ? "review" : input.risk >= 38 ? "watch" : "calm";
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  return {
    label: "PASS372 Unified AI Brief",
    band,
    count,
    scanSeconds: getPass372ScanSeconds(input.mode),
    headline: `${input.symbol} ma dostać jeden spójny audyt: wykres, źródła, bezpieczeństwo i ludzkie podsumowanie.`,
    bullets: [
      `Najpierw Velmère sprawdza identity i provider state dla ${input.name}.`,
      `Wykres ma używać tego samego układu co Shield: świece, wolumen, MA i timeframe.`,
      `AI nie tworzy losowego tekstu: opis zależy od klasy rynku, ryzyka ${input.risk}/100 i stanu źródła ${input.source}.`,
      `PDF preview i download mają korzystać z tej samej mapy sekcji oraz języka strony.`,
      `Security mówi prostym językiem o podpisach, entropii, audycie i granicy prywatnych danych.`,
    ],
  };
}

export const pass372PdfParityManifest = {
  version: "PASS372.pdf_preview_download_parity",
  requiredSections: ["Executive brief", "Asset profile", "Source rhythm", "Second source", "AI Brain", "Security / cryptography", "Research Lab", "Next step"],
  localeRule: "PL/EN/DE labels and customer copy must come from the same report object before HTML or binary PDF rendering.",
  copyRule: "No duplicated filler text. Every page must explain one useful thing in short human language.",
};

export const pass372SecurityPublicStory = [
  "Klucz prywatny nigdy nie jest pokazywany ani proszony przez Velmère.",
  "Podpis kryptograficzny potwierdza kontrolę bez ujawniania sekretu.",
  "Dobra losowość zaczyna się od jakości entropii, a nie od marketingowego hasła RNG.",
  "Banki używają warstw: szyfrowanie, limity, audyt, segmentacja i kontrola dostępu.",
  "Research Lab pokazuje test, limit i następny krok, zamiast obiecywać magiczne złamanie kryptografii.",
];
