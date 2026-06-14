export type Pass371BrainMode = "basic" | "pro" | "advanced";

export type Pass371BrainPhase = {
  id: string;
  label: string;
  durationMs: number;
  publicCopy: string;
};

export type Pass371BrainField = {
  id: string;
  label: string;
  value: string;
  copy: string;
  className: "identity" | "source" | "market" | "security" | "research" | "output";
};

const MODE_LIMIT: Record<Pass371BrainMode, number> = { basic: 10, pro: 14, advanced: 20 };

export const pass371BrainPhases: Pass371BrainPhase[] = [
  { id: "scan", label: "SCAN", durationMs: 900, publicCopy: "AI Brain rozpoznaje symbol, klasę rynku i właściwy rytm danych." },
  { id: "source", label: "SOURCE MATCH", durationMs: 1200, publicCopy: "System sprawdza, czy źródło ma timestamp, fallback i drugi tor potwierdzenia." },
  { id: "flow", label: "FLOW MAP", durationMs: 1300, publicCopy: "Dane przechodzą przez liquidity, issuer, macro, holder albo exchange-health lane." },
  { id: "brain", label: "BRAIN BUILD", durationMs: 1500, publicCopy: "Neuron core łączy wykres, source freshness, missing evidence i copy boundary." },
  { id: "output", label: "RISK OUTPUT", durationMs: 1100, publicCopy: "Końcowy readout pokazuje 10/14/20 pól zależnie od trybu." },
];

export function getPass371CollectionSeconds(mode: Pass371BrainMode) {
  const base = pass371BrainPhases.reduce((sum, phase) => sum + phase.durationMs, 0) / 1000;
  if (mode === "advanced") return `${(base + 2.8).toFixed(1)}s`;
  if (mode === "pro") return `${(base + 1.3).toFixed(1)}s`;
  return `${Math.max(4.8, base - 0.6).toFixed(1)}s`;
}

export function buildPass371UnifiedSecurityAiBrain(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass371BrainMode;
}): Pass371BrainField[] {
  const band = input.risk >= 55 ? "review" : input.risk >= 38 ? "watch" : "calm";
  const collect = getPass371CollectionSeconds(input.mode);
  const fields: Pass371BrainField[] = [
    { id: "identity", label: "Identity lock", value: input.symbol, className: "identity", copy: `${input.name} jest rozdzielone na symbol, nazwę, klasę rynku i provider lane, zanim AI stworzy opis.` },
    { id: "class", label: "Market class", value: input.type, className: "identity", copy: `Inaczej czytamy token, akcję, walutę, surowiec, ETF, real estate proxy i giełdę.` },
    { id: "source", label: "Source freshness", value: input.source, className: "source", copy: "Najpierw timestamp i stan providera; dopiero potem pewność opisu." },
    { id: "second", label: "Second source", value: "required", className: "source", copy: "Mocniejszy tekst publiczny wymaga potwierdzenia z drugiego źródła albo jawnego fallbacku." },
    { id: "chart", label: "Shield-grade chart", value: "OHLC / MA / volume", className: "market", copy: "Każdy real-market instrument używa tej samej logiki wykresu co Shield: świece, wolumen, siatka i timeframe." },
    { id: "risk", label: "Risk band", value: `${input.risk}/100 · ${band}`, className: "market", copy: "Risk nie jest komendą kup/sprzedaj; to stan do dalszej weryfikacji i czytelnego briefu." },
    { id: "liquidity", label: "Liquidity / volume", value: input.type === "exchange" ? "depth / API" : "volume / method", className: "market", copy: "Krypto ma orderbook; stock/ETF/FX/surowce mają wolumen, metodę ceny i cadence." },
    { id: "issuer", label: "Issuer / venue", value: input.type === "stock" ? "SEC / issuer" : input.type === "exchange" ? "venue health" : "method", className: "source", copy: "Spółki potrzebują filingów, giełdy heartbeat/reconnect, a FX/surowce jawnej metody ceny." },
    { id: "pdf", label: "PDF parity", value: "same map", className: "output", copy: "Preview i pobrany PDF muszą iść z tej samej mapy sekcji oraz języka PL/EN/DE." },
    { id: "collect", label: "Collection time", value: collect, className: "output", copy: `Animacja danych trwa około ${collect}, żeby użytkownik widział proces zamiast losowego pop-upu.` },
    { id: "wallet", label: "Wallet model", value: "private stays private", className: "security", copy: "Security tłumaczy podpisy i wallet boundary bez proszenia o seed phrase ani ujawniania sekretów." },
    { id: "entropy", label: "Entropy / RNG", value: "physical source quality", className: "security", copy: "Publicznie mówimy o jakości entropii i standardzie, ale bez instrukcji generowania prywatnych kluczy." },
    { id: "ecc", label: "ECC / BTC", value: "secp256k1 mental model", className: "security", copy: "Sekret podpisuje, publiczny klucz weryfikuje, a adres jest warstwą odbioru — prosto i bez niebezpiecznych detali." },
    { id: "bank", label: "Bank security", value: "HSM / audit / limits", className: "security", copy: "Banki działają warstwowo: szyfrowanie, podpisy, limity, audyt zdarzeń, segmentacja i kontrola operatora." },
    { id: "prime", label: "Prime Lab", value: "numerical audit", className: "research", copy: "Bajak Protocol pokazujemy jako audyt i falsyfikację rekonstrukcji π(x)-R(x), nie jako publiczny dowód RH." },
    { id: "determinism", label: "Determinism lane", value: "hypothesis visual", className: "research", copy: "Animacja determinizmu pokazuje hipotezę: noise → resonance → correction → benchmark, bez obietnicy absolutnej pewności." },
    { id: "copy", label: "Human copy", value: "clean brief", className: "output", copy: "AI pisze ludzkie zdania: co widzi, czego brakuje, co dalej — bez debugowych tekstów typu proof lane unavailable." },
    { id: "redaction", label: "Redaction", value: "operator rules hidden", className: "output", copy: "Publiczny raport nie pokazuje tokenów API, raw logów, pełnych heurystyk ani sekretów operacyjnych." },
    { id: "action", label: "Next action", value: band === "calm" ? "monitor" : "review", className: "output", copy: "Końcowy krok jest spokojny: monitoruj, sprawdź źródła albo przejdź do review — bez presji FOMO." },
    { id: "surface", label: "Surface parity", value: "Shield / Browser / Real Markets", className: "output", copy: "Ten sam mózg obsługuje Shield, Browser, PDF i Real Markets, aby nie tworzyć losowych opisów w każdym miejscu." },
  ];
  return fields.slice(0, MODE_LIMIT[input.mode]);
}
