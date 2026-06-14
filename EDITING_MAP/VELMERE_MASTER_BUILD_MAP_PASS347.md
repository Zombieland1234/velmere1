# VELMÈRE MASTER BUILD MAP — PASS347

## Brutalny stan po PASS347
Publiczny prototyp nadal traktować jako ok. 16% finalnego produktu. PASS347 usuwa z Real Markets publiczne poziome tabele, grupuje rynki w karty jak Shield, dodaje ludzki primer dla Second Source i wzmacnia scroll Orbit drawer v5. Nadal krytyczne są: live adaptery, durable source ledger, finalny PDF renderer, browser QA, security production i pełny typecheck z zależnościami.

## Co PASS347 naprawia
1. Real Markets nie renderuje już publicznie legacy tabel `Global Market`, `Universal Asset Matrix`, `Adapter tables` i `FTX old data`; dostały twardy atrybut `hidden`, więc nie wysypią się nawet bez CSS.
2. Real Markets dostał reader primer: jak czytać rynek, co znaczy risk i czym jest second source.
3. Real Markets jest pogrupowany kategoriami: FX, stocki, ETF, real estate proxy i commodities.
4. Każda kategoria ma karty jak Shield: logo/monogram, class, source state, risk, mini trend, AI note, source/volume/proof/second-source.
5. Exchange Stability ma logo map dla Binance, MEXC, Coinbase, Kraken, Bybit i OKX.
6. Exchange Stability nie powtarza `Stability: wyżej = lepiej` w każdym wierszu; zostaje tylko w nagłówku.
7. Second Source Divergence dostał ludzki opis: źródło A → źródło B → czego brakuje przed pewnością.
8. Real Markets CSS blokuje horizontal overflow i wymusza kartowy układ także przy błędach layoutu.
9. Orbit drawer v5 ma `data-pass347-orbit-scroll-native`, wolniejsze wysuwanie i routing wheel delta do najbliższego scroll-zone.
10. Orbit drawer zatrzymuje pointer/touch/scroll propagation, żeby canvas/body nie kradły scrolla po kliknięciu kafelka.
11. Sticky pseudo-label z góry drawer jest wyłączony, żeby nie wyskakiwał podczas scrollowania.
12. Dodany guard: `verify:pass347-real-market-reader-orbit-v5`.
13. PASS344/PASS345/PASS346 guard compatibility zachowana.

## A-M progres po PASS347
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Core runtime / build | P0 | 38% | Brak `node_modules`/typów w paczce eksportowej; pełny typecheck nadal nie przechodzi przez zależności. |
| B | Brand/luxury public UI | P1 | 27% | Real Markets czytelniejsze, ale public UI nadal ma miejsca z technicznym językiem. |
| C | VLM Shield token surface | P0 | 33% | Full CoinGecko cache i token index nadal P0. |
| D | VLM AI Brain / Orbit 360 | P0 | 36% | Drawer ma hard scroll lock, ale potrzebny real browser QA i focus trap. |
| E | Velmère Lens / Browser / PDF | P0 | 28% | PDF ma lepszy content od PASS345, ale renderer dalej nie ma visual regression. |
| F | Security / privacy / challenge | P0 | 25% | CSP, safe harbor, storage i challenge scope nadal niewdrożone. |
| G | Commerce / shop / products | P1 | 20% | Lookbook/product truth wymagają kolejnych passów. |
| H | Lookbook / collection | P1 | 24% | Pilnować, żeby nie wrócił product text wall. |
| I | Real Markets / Cross-Asset | P0 | 34% | UI kart jest lepszy, ale provider data/cache/API keys nadal brak. |
| J | Interaction / scroll / performance | P0 | 37% | Orbit scroll hardlock jest, ale potrzebny real browser profiler i mobile QA. |
| K | AI bot / copy engine | P0 | 35% | Second Source copy lepsze, ale per-asset copy dla wszystkich rynków nadal niedokończone. |
| L | Legal / compliance | P0 | 31% | Granice są, ale final legal review nadal brak. |
| M | Evidence / reports / storage | P0 | 22% | Source ledger i durable snapshots nadal brak. |

## Blockery aktywne — jawne 110+
1. P0: Full typecheck nadal blokuje brak `node_modules` w paczce.
2. P0: Orbit drawer wymaga real browser QA: mouse wheel, touchpad, mobile, small viewport.
3. P0: Orbit drawer potrzebuje focus trap, ESC close i keyboard navigation bez regresji.
4. P0: Shield search wymaga full CoinGecko token index, TTL cache, stale/fallback UI i B-query QA.
5. P0: Real token/stock/FX/commodity logos wymagają image cache i deterministic provider map dla wszystkich assetów.
6. P0: Real Markets provider contract nie jest live adapterem; nadal trzeba podpiąć FX/stocks/ETF/commodities/real estate data.
7. P0: Binance/MEXC live adapters wymagają heartbeat, reconnect, fallback i endpoint weight guard.
8. P0: PDF renderer nadal manualny; potrzebny layout engine/render regression.
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
65. P1: Table virtual scroll / card virtualization dla długich list nadal brak.
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
85. P1: Exchange stability table/card wymaga live status/reserve/liability context.
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
113. P1: Exchange card icon/logo provider nadal brak realnych logotypów giełd.
114. P1: Asset card hover/details route nadal brak.
115. P1: Real Markets search/filter within cards nadal brak.

## Następny build order
PASS348: Orbit focus trap/ESC/mobile QA + drawer read-mode accordion.
PASS349: PDF renderer v6 visual engine + downloaded PDF visual regression.
PASS350: Full logo/icon provider map + image cache + deterministic fallback for all assets.
PASS351: Security safe-harbor page + CSP/rate-limit readiness.
PASS352: CoinGecko/cache full token index + stale/fallback UI + B-query QA.
