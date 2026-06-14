# VELMÈRE — MASTER BUILD MAP PASS356

Generated: 2026-06-05T17:35:00Z

## PASS356 delta — Real Markets Proof Passport + Orbit native scroll bridge + Security safe harbor split

- I01/I02/I05/I06/I07/I08/I12/I17/K05: Real Markets idzie z Proof Reader do **Proof Passport**. Karty mają teraz collapsed `Proof passport`: **Dla klienta / Dla operatora / Granica**. Front zostaje clean, techniczne warstwy są schowane.
- B07/B08/B09/K12: dodany luxury proof rail: **Clean first / Proof second / Luxury restraint**. To wzmacnia zasadę LVMH/Aesop/COS: mniej hałasu, większy dowód i premium rytm.
- D07/D20/D23/J04/J05: Orbit drawer dostał PASS356 native scroll bridge. Wewnętrzny scroll-frame znów ma prawdziwy natywny scroll, a tylko padding/chrome panelu jest delta-bridged do frame. Dodany keyboard scroll: Arrow/Page/Home/End.
- F01/F09/F10/L07: Security Challenge rozdzielony na prywatny intake i publiczny safe-harbor. Dodany `buildSecuritySafeHarborSnapshot()` i UI: phase, launch gate, boundary, rules. Publicznie nie zapraszamy do ataku na produkcję.
- L01/L02/L03/L09: Real Markets i Security dalej trzymają granice: brak rekomendacji, brak certyfikatu bezpieczeństwa, brak fake-live i brak dark-patternowego FOMO.
- A05/J09: dodany guard `verify:pass356-proof-passport-security-orbit`.

## Progress delta

| Obszar | PASS355 | PASS356 | Delta |
|---|---:|---:|---:|
| Real Markets public reader | 48% | 52% | +4 |
| Per-asset proof passport/copy | 34% | 40% | +6 |
| Orbit drawer scroll reliability | 57% | 63% | +6 |
| Security public readiness | 25% | 31% | +6 |
| Public UI anti-wall discipline | 66% | 69% | +3 |
| Whole prototype | 22% | 23% | +1 |

## Aktywne blockery po PASS356

1. P0: nadal potrzebny real browser QA Orbit scroll: mouse wheel, touchpad, mobile, SVG target, padding target, keyboard.
2. P0: typecheck nadal blokowany przez brak zależności/typów w paczce eksportowej (`next`, `react`, `lucide-react`, `@types/node`, `tailwindcss`, `zustand` itd.) oraz stare błędy w projekcie.
3. P0: Real Markets nadal nie ma live provider/cache timestamp runtime — UI jest przygotowany, ale provider keys/cache trzeba podpiąć osobnym passem.
4. P0: Lens PDF v6/v7 nadal wymaga page-break engine i visual regression pobranego PDF.
5. P0: Shield Search full token index/cache/logos dla `b`, `bat`, `btc` nadal wymaga osobnego passu.
6. P0: Security safe-harbor nie może być publicznym challenge bez sandboxu, legal terms, contact route i triage SLA.
7. P1: Lookbook editorial/product path nadal wymaga kolejnego clean passu.
8. P1: Source ledger/durable evidence nadal jest największą różnicą między demo a produktem.

## Następny kierunek PASS357

1. Lens PDF visual renderer v6/v7: page-break, 5 stron, proof passport page, no clipping, per-asset data.
2. Shield/Lens search index: CoinGecko/token cache + logo fallback + suggestions dla BAT/BTC/BNB/USDT i wielu wyników po literze `b`.
3. Orbit QA harness: test matrix + browser checklist + optional debug HUD tylko operator-only.
4. Real Markets provider cache envelope: source timestamp, stale/fallback, safe numbers, provider required state.
5. Lookbook editorial cleanup: duże karty, mniej tekstu, product path.

---

# VELMÈRE — MASTER BUILD MAP PASS355

Generated: 2026-06-05T17:08:22.485258+00:00

## PASS355 delta — Real Markets Proof Reader + Orbit deterministic delta sink

- I01/I02/I05/I09/I12/I15/I17/J07/K05: Real Markets dostał per-instrument proof reader: każda karta ma teraz `Czytamy / Dowód / Pewność rośnie gdy` oraz public cue dla stocków, FX, ETF, real estate i commodities.
- I05/I06/I07/I08/K07: dodane konkretne profile dla AAPL, NVDA, MSFT, COIN, JPM, MC.PA, EUR/USD, EUR/PLN, USD/PLN, USD/JPY, DXY, SPY, QQQ, VNQ, GLD, XAU/XAG, WTI i BRENT. To usuwa generyczne copy typu „stocki będą analizowane...” z najważniejszych kart.
- I09/L02: Exchange Stability dalej nie jest tabelą ostrzeżeń; PASS355 dodaje clean proof mini-block: stability = jakość lane, bez certyfikatu bezpieczeństwa bez liabilities/withdrawals/ledger.
- I15/K05/L03: Second Source dostał mocniejszą human copy: kontrola potwierdzenia, świeżości, zgodności rytmu źródła i braków przed pewnością.
- D07/J04/J05: Orbit drawer dostał deterministic delta sink: wheel/touch z panelu, SVG, path, text i paddingu jest normalizowany (`deltaMode` line/page) i zawsze konsumowany przez wewnętrzny scroll-frame zamiast losowo wpadać w body/orbit.
- A03: usunięty realny błąd w danych: podwójny `rank: 11` w `SPY` w Universal Asset Matrix.
- Guard: `verify:pass355-market-proof-orbit-delta`.

## Progress delta

| Obszar | PASS354 | PASS355 | Delta |
|---|---:|---:|---:|
| Real Markets public reader | 43% | 48% | +5 |
| Per-asset stock/FX/ETF copy | 24% | 34% | +10 |
| Exchange Stability clarity | 45% | 49% | +4 |
| Second-source comprehension | 40% | 44% | +4 |
| Orbit drawer scroll reliability | 49% | 57% | +8 |
| Runtime/data sanity | 39% | 40% | +1 |
| Whole prototype | 21% | 22% | +1 |

## PASS356 next focus

1. Unified overlay scroll-lock hook dla Orbit/Search/Modal zamiast osobnych patchy.
2. Lens PDF v6/v7: page-break + per-asset profile + visual regression na pobranym PDF.
3. Shield Search full token index/cache + logo fallback dla wpisów typu `b`, `bat`, `btc`.
4. Real Markets provider cache envelope: timestamp, stale/fallback, source state i safe numbers.
5. Lookbook/editorial: duże clean kafle, mniej tekstu, product path.

---

# VELMÈRE — MASTER BUILD MAP PASS354

Generated: 2026-06-05T16:31:52.273269+00:00

## PASS354 delta — Market Compass + Orbit document scroll router

- I01/I02/I09/I17/J04/J05/D07: Real Markets zostało dociągnięte z „reader” do `Real Markets Compass`: najpierw człowiek widzi sens karty, źródło, proof lane, second source i brakujące dane, a techniczne adaptery są schowane w `details`.
- I12/J07: karty dalej trzymają real logo/glyph fallback i mini trend, ale PASS354 dodaje human takeaway dla FX/stock/ETF/real estate/commodity.
- I15/K05/L01/L02: second-source pokazuje 3-krokowy ladder: pierwszy odczyt → drugi punkt kontroli → braki przed pewnością; bez porad inwestycyjnych i bez paniki.
- I09: Exchange Stability ma jedną czytelną linię publiczną; metryki Depth/Withdrawals/Volume/Reserves/API/Social zostają collapsed.
- D07/J04: Orbit drawer dostał document-level scroll router: wheel/touch z wnętrza scroll-frame zostaje natywny, scroll z paddingu panelu trafia do frame, a body/orbit nie przejmuje gestu.
- Guard: `verify:pass353-market-compass-orbit-router`.

## Progress delta

| Obszar | PASS352 | PASS354 | Delta |
|---|---:|---:|---:|
| Real Markets public reader | 56% | 61% | +5 |
| Exchange Stability readability | 58% | 62% | +4 |
| Second-source explanation | 55% | 60% | +5 |
| Orbit drawer scroll reliability | 55% | 63% | +8 |
| Public UI anti-wall discipline | 62% | 66% | +4 |
| Whole prototype | 54% | 55% | +1 |

---

# VELMÈRE MASTER BUILD MAP — PASS352

## Brutalny stan po PASS352
Publiczny prototyp traktować jako ok. 21% finalnego produktu. PASS352 nie udaje live providera ani finalnego QA: naprawia następny realny problem z Twoich screenów — Real Markets ma już czytać się jak Shield, a nie jak pozioma tabela/debug wall. Karty dostały stały logo/glyph fallback, mini trend, proof lane, review label i second-source explanation. Orbit drawer dostał osobny PASS352 scroll contract: wewnętrzny frame ma natywny scroll, a wheel/touch nie ma uciekać do body ani do Orbit 360.

## Co PASS352 naprawia
1. Real Markets root ma `data-pass352-shield-grade-reader="true"`.
2. Real Markets hero mówi teraz `shield-grade reader`, nie stare `Table`/debug.
3. Każda karta instrumentu ma `data-pass352-shield-grade-card="true"`.
4. Każda karta ma nowy publiczny strip: `Źródło / Proof / Ryzyko`.
5. Stock/FX/ETF/real estate/commodity nie opierają się tylko na zewnętrznym logo: mają deterministyczny glyph fallback.
6. Apple/Nvidia/Microsoft/Coinbase/JPM/LVMH/SPY/QQQ/VNQ/GLD/WTI/Brent mają widoczne brand/proxy glyphs nawet jeśli remote logo nie wczyta się przez CSP.
7. Szeroki price/debug row w kartach PASS352 jest ukryty, żeby nie robił ściany informacji.
8. Mini trend ma własny czytelny box i mówi, że nie jest sygnałem kup/sprzedaj.
9. `Co to znaczy` i `Brakuje` zostają na froncie karty.
10. Techniczne `Source / Volume / Proof / Second source` zostaje pod details.
11. Exchange Stability dostało `data-pass352-exchange-ledger="true"`: stability explanation + brakujące proof lanes.
12. Second Source dostał prosty human ladder: pierwszy odczyt → drugi punkt kontroli → braki przed pewnością.
13. Cross asset page ma `data-pass352-shield-grade-reader-page="true"`.
14. Orbit drawer ma `data-pass352-orbit-scroll-contract="true"`.
15. Orbit scroll-frame ma `data-pass352-native-scroll-zone="true"`.
16. PASS352 dodaje `stopOrbitLeakPass352`: scroll w panelu zostaje natywny, ale nie przecieka do body/orbit.
17. CSS wymusza `overflow-y:auto`, `touch-action:pan-y`, `overscroll-behavior:contain` i stabilny scrollbar gutter na frame.
18. Drawer reveal zwolniony do 1960ms.
19. Dodany guard `verify:pass352-shield-grade-reader-orbit-contract`.
20. Zachowane guardy PASS344–PASS351 przez compatibility markers bez przywracania starego UI.

## A-M progres po PASS352
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Core runtime / build | P0 | 39% | Full typecheck nadal zależy od brakujących typów/deps w paczce. |
| B | Brand/luxury public UI | P1 | 35% | Real Markets mniej debugowy; reszta public surfaces nadal wymaga cleanupu. |
| C | VLM Shield token surface | P0 | 33% | Full CoinGecko cache/token index/logos nadal P0. |
| D | VLM AI Brain / Orbit 360 | P0 | 45% | PASS352 wzmacnia scroll contract, ale real mobile/touchpad QA nadal P0. |
| E | Velmère Lens / Browser / PDF | P0 | 28% | PDF v6 + visual regression nadal P0. |
| F | Security / privacy / challenge | P0 | 25% | CSP, safe harbor, storage, WAF i challenge scope nadal niewdrożone. |
| G | Commerce / shop / products | P1 | 20% | Lookbook/product truth wymagają kolejnych passów. |
| H | Lookbook / collection | P1 | 24% | Pilnować editorial lookbook, zero product text wall. |
| I | Real Markets / Cross-Asset | P0 | 52% | UI robi się Shield-grade; provider data/cache/API keys nadal brak. |
| J | Interaction / scroll / performance | P0 | 47% | Scroll contract mocniejszy, ale browser QA artifacts nadal brak. |
| K | AI bot / copy engine | P0 | 41% | Second-source copy czytelniejsze; pełne per-asset templates nadal brak. |
| L | Legal / compliance | P0 | 33% | Boundaries lepsze, final legal review nadal brak. |
| M | Evidence / reports / storage | P0 | 22% | Durable snapshots/source ledger nadal brak. |

## Następny PASS354 — kierunek
1. Orbit drawer: dodać focus trap, ESC close, keyboard scroll i real QA checklist pod mobile/touchpad.
2. Real Markets: dodać category filters/tabs bez table layout i poprawić copy dla każdej klasy assetu.
3. Lens/PDF: wrócić do PDF v6 visual renderer i mniej generycznego tekstu per asset.
4. Shield search: pełny token index/cache + logo fallback zgodny z PASS352.
5. Security: public safe-harbor draft i headers/readiness split implemented/planned.

## Blockery aktywne — 112+
1. P0: Full typecheck nadal blokuje brak `node_modules`/typów `next`, `react`, `lucide-react`, `next-intl`, `@types/node`, `tailwindcss`, `zustand` itd.
2. P0: PASS351 scroll router wymaga real browser QA: mouse wheel, touchpad, mobile, small viewport.
3. P0: Orbit drawer potrzebuje focus trap, ESC close i keyboard navigation bez regresji.
4. P0: Shield search wymaga full CoinGecko token index, TTL cache, stale/fallback UI i B-query QA.
5. P0: Real Markets live/cache/provider data nadal brak.
6. P0: Public Real Markets cards nie mogą wrócić do poziomych tabel ani debug/provider ściany.
7. P0: Binance/MEXC live adapters wymagają heartbeat, reconnect, fallback i endpoint weight guard.
8. P0: PDF renderer v6 i visual regression nadal P0.
9. P0: PDF download wymaga testów wizualnych na 5 stronach.
10. P0: Security page/challenge potrzebuje safe harbor, scope, out-of-scope, mailbox, SLA.
11. P0: CSP/security headers i rate-limit readiness nadal wymagają produkcyjnego wdrożenia.
12. P0: Public UI nadal ma miejscami operatorowy język i pass telemetry.
13. P0: AI Brain tile copy musi być unikalne per risk lane.
14. P0: Source ledger nie jest durable storage.
15. P0: Evidence snapshots nie mają finalnego hash/retention policy runtime.
16. P0: Real browser QA artifacts nadal nie istnieją.
17. P1: Stablecoin reserve/peg bridge nadal brak.
18. P1: Contract scanner per chain nadal brak.
19. P1: Holder cluster adapter nadal brak.
20. P1: Unlock/vesting source nadal brak.
21. P1: Orderbook depth second source nadal brak.
22. P1: Withdrawal/status source ledger nadal brak.
23. P1: Public incident feed nadal brak.
24. P1: SEC filing parser nadal brak.
25. P1: EU issuer disclosure parser nadal brak.
26. P1: ECB/FRED/FHFA calendars nadal brak.
27. P1: REIT/ETF provider nadal brak.
28. P1: Commodity normalization nadal brak.
29. P1: FX intraday provider nadal brak.
30. P1: Symbol mapping across providers nadal brak.
31. P1: Source cache TTL model nadal brak.
32. P1: Server-side rate-limit store nadal brak.
33. P1: Bot protection edge rules nadal brak.
34. P1: Safe-harbor challenge public page nadal brak.
35. P1: Admin authentication provider nadal brak.
36. P1: Redacted event export nadal brak.
37. P1: Privacy policy alignment for analytics nadal brak.
38. P1: Wallet access gate final policy nadal brak.
39. P1: VLM utility/legal final review nadal brak.
40. P1: Product SKU/provider truth final nadal brak.
41. P1: Shipping/returns final data nadal brak.
42. P1: Payment webhook production proof nadal brak.
43. P1: Order persistence proof nadal brak.
44. P1: Image optimization for lookbook nadal brak.
45. P1: Mobile drawer QA nadal brak.
46. P1: Screen-reader QA nadal brak.
47. P1: Reduced-motion audit nadal brak.
48. P1: Lighthouse/Core Web Vitals pass nadal brak.
49. P1: SEO structured data for products nadal brak.
50. P1: Sitemap/metadata final nadal brak.
51. P1: Translations audit PL/EN/DE nadal brak.
52. P1: Route map cleanup nadal brak.
53. P1: Dead route cleanup nadal brak.
54. P1: Duplicate copy cleanup nadal brak.
55. P1: Raw API button audit nadal brak.
56. P1: Hidden JSON surface audit nadal brak.
57. P1: PDF fonts/brand typography final nadal brak.
58. P1: PDF page-break engine nadal brak.
59. P1: A4 print CSS validation nadal brak.
60. P1: Downloaded PDF visual regression nadal brak.
61. P1: Browser dropdown outside-click consistency nadal brak.
62. P1: Modal focus trap nadal brak.
63. P1: Escape close audit nadal brak.
64. P1: Scroll restoration guard nadal brak.
65. P1: Table/card virtualization dla długich list nadal brak.
66. P1: Long-list image cache nadal brak.
67. P1: WebGL renderer feature gate nadal brak.
68. P1: Performance governor dla search/drawer nadal wymaga profiler pass.
69. P1: AI bot fixtures dla stale/missing/fake data nadal brak.
70. P1: Per-asset UI copy dla wszystkich tokenów nadal brak.
71. P1: Per-stock/FX/ETF report templates nadal brak.
72. P1: Luxury proof-passport product page nadal brak.
73. P1: Provenance/DPP copy dla commerce nadal brak.
74. P1: Lookbook large editorial photo system nadal brak.
75. P1: Product detail material/size/delivery truth nadal brak.
76. P1: Guest checkout polish nadal brak.
77. P1: Analytics funnel privacy-safe events nadal brak.
78. P1: Admin/operator wall isolation nadal brak.
79. P1: Customer-safe export firewall nadal brak final runtime.
80. P1: Rollback vault nadal brak runtime proof.
81. P1: Release QA scorecard nadal brak final pass.
82. P1: Source freshness registry UI nadal nie jest pełny.
83. P1: Market source cadence row wymaga real timestamps.
84. P1: Second source divergence wymaga real providers.
85. P1: Exchange stability card wymaga live status/reserve/liability context.
86. P1: Native-token dependency lane nadal brak.
87. P1: Stablecoin reserve timestamp parser nadal brak.
88. P1: Search no-result UX nadal wymaga polish.
89. P1: Search cooldown UI wymaga clean copy.
90. P1: Mobile Real Markets cards wymagają browser QA.
91. P1: Mobile Lens PDF preview wymaga full QA.
92. P1: PDF filename/sanitization QA nadal brak.
93. P1: Provider contract docs require public admin boundary.
94. P1: API error envelopes require final typed contract.
95. P1: Cache invalidation strategy nadal brak.
96. P1: Evidence redaction envelope runtime nadal brak.
97. P1: Security event ledger retention nadal brak.
98. P1: Stripe webhook replay QA nadal brak final.
99. P1: Wallet seed-phrase warning copy nadal wymaga audit.
100. P1: Multi-locale legal boundary copy nadal wymaga review.
101. P1: Visual regression screenshots nadal brak.
102. P1: Browser e2e script nadal brak.
103. P1: Deployment/Vercel parity nadal brak final proof.
104. P1: Production env readiness checklist nadal brak final pass.
105. P1: Product media optimization nadal brak.
106. P1: Lookbook routes need clean editorial hierarchy.
107. P1: Community/Square security copy nadal wymaga polish.
108. P1: Angel widget overlap z kartami nadal wymaga QA.
109. P1: Header z-index with search/drawer nadal wymaga regression.
110. P1: Scroll lock across modal/drawer/search nadal wymaga unified hook.
111. P1: Final release freeze protocol nadal brak.
112. P1: Public user education for Second Source requires tooltip/help overlay polish.

## Następny kierunek PASS355
1. Focus trap + ESC close + unified scroll lock registry dla Orbit/search/modal.
2. Real Markets provider cache envelope z timestampami i stale/fallback UI bez fake-live.
3. Lens PDF v6: page-break contract + stronger asset profile pages.
4. Lookbook editorial cleanup: duże karty, mniej tekstu, premium route do produktów.
5. Security public readiness: implemented/planned/blocked split.



## PASS354 delta — Lux Market Proof Reader + Orbit SVG scroll router

### Naprawione / rozwinięte
- I01/I02/I09/I17/J04/J05/D07: Real Markets dostał kolejny poziom clean readera: krótkie proof cards, mniej operatorowego języka, czytelne "Najważniejsze / Nie udajemy / Większa pewność".
- I12/J07: logo/glyph fallback w kartach stocków/giełd jest zawsze widoczny nawet gdy remote logo nie załaduje się albo jest przykryte tłem.
- I15/K05/K12: Second Source jest tłumaczony po ludzku: to kontrola potwierdzenia, świeżości i braków, nie tabela strachu.
- I09/L02/L03: Exchange Stability bez powtarzanej notki w każdej karcie; publiczny tekst mówi uczciwie o jakości adaptera i brakach, bez werdyktu o giełdzie.
- D07/J04: Orbit drawer scroll router używa `Element.closest`, nie tylko `HTMLElement`, więc scroll z SVG/path/text w panelu nie wpada losowo w body/orbit.
- D25/J04: przy otwarciu kafelka scroll-frame jest resetowany i focusowany, więc użytkownik zaczyna na górze panelu i scrolluje właściwy kontener.

### Stan po PASS354
| Obszar | Było | Jest | Delta |
|---|---:|---:|---:|
| Real Markets public reader | 39% | 43% | +4 |
| Real stock/exchange logos | 31% | 36% | +5 |
| Second Source comprehension | 34% | 40% | +6 |
| Exchange Stability clarity | 41% | 45% | +4 |
| Orbit drawer scroll reliability | 42% | 49% | +7 |
| Overall prototype | 20% | 21% | +1 |

### Blockery nadal aktywne
- P0: trzeba wykonać real browser QA scrollu na Orbit 360, bo statyczny guard nie zastępuje testu mysz/touchpad/mobile.
- P0: live provider data dla Real Markets nadal nie jest podpięte; obecnie UI jest przygotowany pod provider/cache/timestamp.
- P0: PDF v6/v7 nadal wymaga visual regression i page-break audit na pobranym pliku.
- P1: unified scroll lock hook dla search/modal/orbit nadal do zrobienia, żeby nie łatać każdego overlay osobno.
- P1: Real Market cards potrzebują real sparklines z provider cache, nie tylko poglądowy mini trend.
