export type Pass373Mode = "basic" | "pro" | "advanced";

export const pass373BrainStoryboard = [
  { id: "coin", label: "VLM Core", seconds: 0.8, copy: "Moneta VLM pojawia się jako podpis audytu, nie jako obietnica rynku." },
  { id: "neuron", label: "Neural paths", seconds: 1.1, copy: "Niebieskie połączenia spinają symbol, źródło, chart, issuer i security lane." },
  { id: "flow", label: "Data flow", seconds: 1.2, copy: "Adresy, provider timestamps i source states płyną do rdzenia, bez pokazywania prywatnych sekretów." },
  { id: "collapse", label: "Audit field", seconds: 1.3, copy: "Mózg przekształca się w uporządkowane pole 10/14/20 wyników." },
  { id: "parity", label: "PDF parity", seconds: 0.9, copy: "Preview i pobrany PDF korzystają z tych samych sekcji oraz języka strony." },
] as const;

export const pass373PdfExactParity = {
  version: "PASS373.exact_preview_download_parity",
  rule: "HTML preview, modal readout and downloadable PDF must render from one resolved report object; no second random copy generator is allowed.",
  sections: ["Executive", "Asset profile", "Provider state", "AI Brain", "Security", "Research Lab", "Missing data", "Next step"],
  locale: "pl/en/de customer labels stay resolved before preview or binary PDF rendering.",
};

export const pass373SecurityLaunchCopy = [
  "Velmere pokazuje warstwy ochrony prostym językiem: podpis, źródło, entropia, redakcja i operator review.",
  "Klucz prywatny zostaje poza systemem; podpis potwierdza kontrolę bez proszenia o sekret.",
  "Real RNG oznacza jakość fizycznej entropii i walidację źródła, a nie marketingowe losowanie bez dowodu.",
  "Research Lab opisuje hipotezę, benchmark i falsyfikację; nie obiecuje łamania portfeli ani gotowego twierdzenia.",
];

export function buildPass373UnifiedBrainNarrative(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass373Mode }) {
  const fields = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass373BrainStoryboard.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.2 : input.mode === "pro" ? 1.1 : 0.3);
  const band = input.risk >= 55 ? "operator-review" : input.risk >= 40 ? "source-watch" : "clean-readout";
  return {
    version: "PASS373.unified_ai_brain_narrative",
    band,
    fields,
    seconds: Number(seconds.toFixed(1)),
    headline: `${input.symbol} przechodzi przez jeden mózg Velmere: wykres, źródła, security i Research Lab bez losowego filler copy.`,
    humanSummary: `${input.name} (${input.type}) dostaje ${fields} krótkich pól. Ton zależy od ryzyka ${input.risk}/100 i źródła ${input.source}, a nie od hype albo powtarzalnego szablonu.`,
    outputNames: ["Identity", "Provider", "Chart", "Risk", "Second source", "Issuer", "Macro", "Security", "Entropy", "Research", "Missing data", "Next step"],
  };
}
