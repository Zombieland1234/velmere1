export type Pass370BrainMode = "basic" | "pro" | "advanced";

export type Pass370BrainReadout = {
  id: string;
  label: string;
  value: string;
  copy: string;
};

const MODE_LIMIT: Record<Pass370BrainMode, number> = {
  basic: 10,
  pro: 14,
  advanced: 20,
};

export function buildPass370UnifiedAiBrainOutput(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass370BrainMode;
}): Pass370BrainReadout[] {
  const riskBand = input.risk >= 50 ? "review" : input.risk >= 36 ? "watch" : "calm";
  const collectionTarget = input.mode === "advanced" ? "8.8s" : input.mode === "pro" ? "6.6s" : "4.4s";
  const rows: Pass370BrainReadout[] = [
    { id: "identity", label: "identity", value: input.symbol, copy: `${input.name} zostaje rozpoznany jako ${input.type}; nazwa, symbol i klasa są oddzielone od wniosków ryzyka.` },
    { id: "source", label: "source state", value: input.source, copy: `Źródło ma być pokazane jako timestamp/provider state, a nie ukryte za ładnym wykresem.` },
    { id: "risk", label: "risk band", value: `${input.risk}/100`, copy: `Aktualny odczyt jest w trybie ${riskBand}; mocniejszy opis wymaga świeżości i drugiego źródła.` },
    { id: "chart", label: "chart lane", value: "OHLC + MA", copy: "Wykres używa świec, wolumenu, siatki i średnich jak Shield, żeby stock/FX/ETF wyglądał jak pełny terminal." },
    { id: "liquidity", label: "liquidity", value: "depth / volume", copy: "Dla krypto liczy się orderbook; dla stocków i FX osobno pokazujemy wolumen, provider i cadence." },
    { id: "second", label: "second source", value: "required", copy: "Jeden provider nie wystarcza do mocnego opisu; druga warstwa ma potwierdzić albo obniżyć pewność." },
    { id: "issuer", label: "issuer / filing", value: input.type === "stock" ? "SEC / issuer" : "context", copy: "Dla spółek AI Brain łączy wykres z filingiem/eventem, zamiast traktować akcje jak token." },
    { id: "macro", label: "macro context", value: input.type, copy: "Waluty, surowce, ETF i real estate mają własny rytm danych, więc nie mieszamy ich z crypto hype." },
    { id: "copy", label: "human copy", value: "clean", copy: "AI tłumaczy technikę na krótkie zdania: co widzi, czego brakuje i jaki jest następny krok." },
    { id: "target", label: "scan time", value: collectionTarget, copy: `Animacja zbierania danych ma trwać około ${collectionTarget}, potem mózg przechodzi w panel wyników.` },
    { id: "holder", label: "holder / ownership", value: "optional", copy: "Dla tokenów dochodzi holder layer; dla spółek zastępuje go issuer, float i wydarzenia spółki." },
    { id: "venue", label: "venue health", value: "Binance/MEXC", copy: "Giełdy mają osobny pas health: API, withdrawals, reserves, volume, social stress i reconnect." },
    { id: "redaction", label: "redaction", value: "on", copy: "Publiczny raport nie pokazuje sekretów, tokenów API, raw eventów ani operatorowych heurystyk." },
    { id: "pdf", label: "PDF parity", value: "shared", copy: "Preview i download używają tej samej mapy sekcji, języka i kolejności treści." },
    { id: "rng", label: "entropy", value: "real RNG", copy: "Security Lab tłumaczy, że jakość losowości jest fundamentem kluczy, ale bez instrukcji generowania sekretów." },
    { id: "ecc", label: "ECC/BTC", value: "public model", copy: "Użytkownik widzi mental model: sekret podpisuje, publiczny klucz weryfikuje, adres odbiera środki." },
    { id: "prime", label: "prime lab", value: "audit", copy: "Bajak Protocol jest pokazywany jako audyt numeryczny i falsyfikacja, nie jako publiczny dowód twierdzenia." },
    { id: "cadence", label: "cadence", value: "visible", copy: "Każda klasa rynku pokazuje swój rytm: fast live, daily reference, slow macro albo historical context." },
    { id: "operator", label: "operator step", value: "review", copy: "Gdy brakuje danych, system nie wymyśla werdyktu — kieruje do review albo blokuje mocny opis." },
    { id: "output", label: "output", value: "readout", copy: "Końcowy ekran ma być polem wyników 10/14/20, a nie przypadkowymi kafelkami debugowymi." },
  ];

  return rows.slice(0, MODE_LIMIT[input.mode]);
}
