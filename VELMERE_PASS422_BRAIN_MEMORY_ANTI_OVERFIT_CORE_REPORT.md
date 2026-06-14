# PASS422 — Velmère Brain Memory & Anti-Overfit Core

## Cel
PASS422 wzmacnia rdzeń Velmère AI, który liczy ryzyko, czyta źródła, buduje narrację PDF i ma zachowywać się jak żyjący system decyzyjny bez niekontrolowanego overfitu.

## Zmienione pliki
- `lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts`
- `lib/market-integrity/risk-brain.ts`
- `lib/search/lens-report.ts`
- `app/api/market-integrity/analyze/route.ts`
- `app/api/search/lens-report/route.ts`
- `scripts/verify-pass422-brain-memory-anti-overfit-core.mjs`
- `package.json`

## Co dodano
- Nowy core: `buildPass422BrainMemoryCore(...)`.
- Pamięć ryzyka z decay half-life 72h.
- `overfitGuard`: `locked`, `shadow`, `limited`, `adaptive`.
- `sourceGenome`: liczba źródeł, drugi provider, confidence, missing core fields, provider risk.
- `evidenceRail`: dominujące warstwy i sygnały z powodami.
- `adaptiveWeights`: małe adaptacyjne korekty, ale tylko po guardach.
- `antiOverfitRules`: jawne reguły, że jeden event nie tworzy reguły.
- Narracja PDF PL/EN/DE oparta o payload, nie losowy generator.
- Lens report dostał `brain`, `sections`, `checksum` i `localeBranch`.
- Analyze API zwraca teraz `brain` i `pass422`, nie tylko surowy risk result.
- PDF route drukuje checksum payloadu, aby preview/download dało się śledzić.

## Produktowo
Mózg ma teraz wyglądać jak system żywy: pamięta, waży, widzi trendy i źródła, ale nie zaczyna zmieniać prawdy po jednym evencie. Basic/Pro/Advanced mogą później czytać ten sam payload i różnić się tylko liczbą pól.

## Walidacja
- `npm run verify:pass422-brain-memory-anti-overfit-core` ✅ — 733 TS/TSX parsed
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ❌ nadal blokowany przez stare niezwiązane guardy: raw `<img>` w dwóch komponentach i brakujące historyczne markery PASS175/PASS179/PASS188/PASS193/PASS267. PASS422 brain core przechodzi własny guard.
