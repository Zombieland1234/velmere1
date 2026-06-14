# Velmère Master Build Map — PASS464

## A. Velmère Browser / Lens / PDF
- [x] Czteroetapowa animacja V, jeden payload preview/download, download icon i ciągły scroll-lock pozostają aktywne.
- [x] PDF contract przyjmuje fundamental state, score, confidence cap, filing/period, FCF/leverage oraz ETF concentration/overlap.
- [x] PASS460 consensus PDF może tylko obniżyć pewność przez quality cap.
- [x] Brak snapshotu fundamentals nie generuje wymyślonych liczb.
- [ ] Dodać bezpośrednie stock/ETF/REIT discovery w Browserze.
- [ ] Wykonać Chromium render i pixel diff czterech stron dla PL/DE/EN.
- [>] PASS465: automatyczne dołączenie detail snapshotu do raportu Browsera dla wspieranych symboli.

## B. Basic / Pro / Advanced
- [x] Basic pozostaje ceną, kapitalizacją/proxy, 24h, wolumenem, zakresem, źródłem i freshness.
- [x] Pro zawiera wycenę, drugi provider, quorum, FDV/turnover i evidence debt.
- [x] Advanced otrzymuje FCF TTM, current ratio, debt/equity, debt/EBITDA, net debt/EBITDA, cash conversion i filing freshness.
- [x] ETF Advanced otrzymuje top concentration, HHI, effective holdings, sector concentration i overlap.
- [x] Missing statements nie są zerami.
- [ ] Debt maturity, lease liabilities i covenant context.
- [ ] Earnings cadence/surprise z jednoznacznym okresem.

## C. Real Markets
- [x] Oddzielne source policies dla crypto, stock, ETF, REIT, FX, commodities, indices i venue health.
- [x] Fundamentals są hydradowane w detail mode, nie dla całej tabeli.
- [x] Akcje/REIT mają trzy statements; ETF ma profil holdings i opcjonalny benchmark.
- [x] Quality panel jest przed operator ledger i nie pokazuje surowego `unknown`.
- [x] Końcowy confidence cap uwzględnia jakość fundamentals.
- [ ] Rozszerzyć pokrycie symboli spoza USA i mapowanie tickerów giełdowych.
- [ ] Dodać direct filing links i issuer IR timeline.

## D. Shield AI
- [x] Bot i audit layer używają source-bound state zamiast ogólnego „unknown”.
- [x] Fundamental quality może ograniczyć język i confidence.
- [x] Boundary zabrania prognozy ceny i gwarancji bezpieczeństwa.
- [ ] Cytowania per zdanie z linkiem do konkretnego filing/provider timestamp.
- [ ] Follow-up probe po stale/partial z quota guard.

## E. Shield Map / VLM Brain / Orbit 360
- [x] Handoff Browser → PDF → Shield → Map pozostaje zachowany.
- [x] Orbit nadal reaguje na consensus/freshness/source state.
- [ ] Dodać osobne węzły Filing, FCF, Balance Sheet i ETF Concentration.
- [ ] Klikany drawer z quality flags i statement lineage.

## F. Provider / Data Backbone
- [x] Alpha Vantage `OVERVIEW`, `INCOME_STATEMENT`, `BALANCE_SHEET`, `CASH_FLOW` i `ETF_PROFILE` mają osobne role.
- [x] SEC submissions jest opcjonalnym źródłem daty filing przez CIK + `SEC_USER_AGENT`.
- [x] Cache/inflight dedupe i atomowa rezerwacja quota ograniczają duplikaty.
- [x] Strict TTM i strict total debt blokują fałszywą kompletność.
- [x] Benchmark overlap wymaga drugiego holdings payloadu.
- [ ] SEC Companyfacts/XBRL jako niezależna weryfikacja wartości.
- [ ] Durable quota/provider ledger współdzielony między instancjami.
- [ ] Provider health SLO, retry-after i dłuższy circuit breaker.

## G. UI / UX
- [x] Fundamental Quality ma osobny, czytelny panel.
- [x] KPI i flags są przed surową diagnostyką.
- [x] Akcje i ETF mają różne metryki, bez mieszania z token unlock/holders.
- [x] Wartości brakujące mówią `source required`.
- [ ] Mobile QA pełnego panelu z 8 metrykami.
- [ ] Compact/Analyst/Operator density modes.

## H. i18n
- [x] Gate PL/DE/EN przechodzi.
- [x] Najważniejsze etykiety quality panelu mają PL/DE/EN.
- [x] Techniczne nazwy endpointów i formularzy pozostają nieprzetłumaczone celowo.
- [ ] Przenieść wszystkie lokalne ternary labels do centralnego słownika.
- [ ] Locale-leak test dla nowych flag i boundary copy.

## I. Build / QA
- [x] PASS453–PASS464 regression gates zielone.
- [x] PASS464 verifier obejmuje 10 kluczowych plików i runtime semantics.
- [x] Pełny parser: 776 TS/TSX, 0 błędów składni.
- [x] i18n zielony.
- [x] Vercel preflight zielony — 772 pliki.
- [x] ZIP integrity i SHA-256 w paczce końcowej.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Playwright Browser → PDF → Shield AI → Real Markets.
- [ ] Live provider smoke z prawdziwym kluczem i SEC user-agent.

## J. Security / Claim Boundaries
- [x] `ALPHA_VANTAGE_API_KEY` i `SEC_USER_AGENT` pozostają server-only.
- [x] Brak osobistego maila lub sekretu w kodzie.
- [x] SEC URL jest budowany wyłącznie z normalizowanego CIK.
- [x] Filing date i period-end proxy są rozróżnione.
- [x] Historyczne fundamentals nie są prognozą ceny ani rekomendacją.
- [ ] SSRF allowlist test wszystkich provider URL.
- [ ] Redacted provider incident ledger.

## K. Performance / Quota
- [x] Statement hydration uruchamia się dopiero po otwarciu szczegółów.
- [x] SEC ma 6h cache i inflight dedupe.
- [x] ETF benchmark request jest opcjonalny i jawny.
- [x] Quota jest rezerwowana przed wykonaniem requestu.
- [ ] AbortController po zamknięciu modala.
- [ ] Persisted quota budget i adaptive cadence.

## L. Otwarte blockery
1. Brak `node_modules` — pełny Next.js build nie został wykonany.
2. Brak produkcyjnego `ALPHA_VANTAGE_API_KEY` — brak live statement smoke.
3. Brak skonfigurowanego `SEC_USER_AGENT` — SEC filing date pozostaje opcjonalna.
4. Brak Chromium/Playwright — brak testu interakcji i pixel diff PDF.
5. Alpha Vantage rate limits wymagają realnego testu 429/Retry-After.
6. ETF overlap obejmuje tylko disclosed holdings z payloadu, nie pełny look-through instrumentów pochodnych.
7. Period-end bez SEC jest proxy, nie datą faktycznego złożenia.
8. Brak direct SEC XBRL second-source dla liczb finansowych.
9. Część symboli międzynarodowych wymaga mapowania giełda/provider.
10. Pełne Browser discovery dla stocks/ETF/REIT pozostaje otwarte.

## M. Kolejność dalszej pracy
- **PASS465:** SEC Companyfacts/XBRL cross-check, earnings cadence, direct filing links oraz Browser stock/ETF discovery.
- **PASS466:** Orbit fundamental topology, source timeline i explain-why-confidence-changed.
- **PASS467:** pełny build, Playwright, PDF render/diff, mobile blocker sweep i public-beta release packet.
