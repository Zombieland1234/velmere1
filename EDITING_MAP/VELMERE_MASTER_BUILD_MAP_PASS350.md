# VELMÈRE MASTER BUILD MAP — PASS350

## Brutalny stan po PASS350
Publiczny prototyp traktować jako ok. 19% finalnego produktu. PASS350 nie udaje, że live data jest gotowe: poprawia używalność i czytelność miejsc, które użytkownik nadal zgłaszał jako zbugowane. Real Markets dostał układ bliższy Shield: karty z logo, mini-trendem, krótkim opisem, decyzją i szczegółami pod rozwinięciem. Orbit 360 dostał twardszy scroll engine: każdy wheel/touch delta idzie do wewnętrznego scroll-frame, a body/orbit nie przejmuje przewijania. Nadal P0: prawdziwe adaptery live, browser QA, PDF visual regression, full typecheck po node_modules, security production, durable ledger.

## Co PASS350 naprawia
1. Real Markets Reader ma `data-pass350-shield-reader="true"` i executive ribbon: karta / second-source / szczegóły techniczne.
2. Karty real markets mają `shield-real-card-decision-strip`: source + second source na froncie, technikalia w `details`.
3. Publiczny widok nie wygląda jak długa tabela — karta ma price lane, review pressure, mini sparkline i krótki AI opis.
4. Exchange Stability ma czystszy decision strip: adapter state + social stress, a metryki zostają collapsed.
5. Second Source dostał bardziej ludzkie explanation boxy z ikoną Info i granicę public copy.
6. Cross asset page copy zmienione z „Risk Tables” na „Real Markets Reader”.
7. Orbit drawer dostał `selectedTileDetailScrollFrameRef` i `routeSelectedTileDetailScrollPass350()`.
8. Wheel event zawsze robi `preventDefault()` i scrolluje wewnętrzny frame, więc body/orbit nie powinno przejmować scrolla.
9. Touch start/move też jest kierowany do tego samego scroll-frame.
10. Ukryty poprzedni/następny row w drawerze, żeby nie wracał zbugowany strip.
11. CSS dodał PASS350 scroll engine: `touch-action: none`, `overscroll-behavior: contain`, `overflow-y: auto`, contain content.
12. Dodany guard `verify:pass350-shield-reader-orbit-scroll-engine`.
13. Zachowane guardy PASS349 i i18n.
14. Typecheck nadal blokuje brak `node_modules`/typów w paczce eksportowej.

## A-M progres po PASS350
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Core runtime / build | P0 | 38% | Brak `node_modules`/typów; pełny typecheck nadal nie jest dowodem. |
| B | Brand/luxury public UI | P1 | 32% | Real Markets czytelniejszy, ale część public copy nadal techniczna. |
| C | VLM Shield token surface | P0 | 33% | Full CoinGecko cache/token index/logos nadal P0. |
| D | VLM AI Brain / Orbit 360 | P0 | 42% | PASS350 wzmacnia scroll engine, ale potrzebny real browser QA/focus trap. |
| E | Velmère Lens / Browser / PDF | P0 | 28% | PDF v6 + visual regression nadal P0. |
| F | Security / privacy / challenge | P0 | 25% | CSP, safe harbor, storage, WAF i challenge scope nadal niewdrożone. |
| G | Commerce / shop / products | P1 | 20% | Lookbook/product truth wymagają kolejnych passów. |
| H | Lookbook / collection | P1 | 24% | Pilnować editorial lookbook, zero product text wall. |
| I | Real Markets / Cross-Asset | P0 | 45% | UI coraz lepszy; provider data/cache/API keys nadal brak. |
| J | Interaction / scroll / performance | P0 | 43% | Twardy scroll engine statycznie wdrożony, ale mobile/touchpad QA nadal brak. |
| K | AI bot / copy engine | P0 | 39% | Second-source copy lepsze, ale per-asset copy dla wszystkich rynków nadal brak. |
| L | Legal / compliance | P0 | 31% | Granice copy są, final legal review nadal brak. |
| M | Evidence / reports / storage | P0 | 22% | Source ledger/durable snapshots nadal brak. |

## Blockery aktywne — 112+
1. P0: Full typecheck nadal blokuje brak `node_modules` w paczce.
2. P0: PASS350 scroll engine wymaga real browser QA: mouse wheel, touchpad, mobile, small viewport.
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

## Następny kierunek PASS351
1. Browser QA hooks: focus trap + ESC + scroll lock registry dla drawer/search/modal.
2. Real Markets provider route: cache envelope i source timestamp mock/live-ready without fake live.
3. Lens PDF v6: page-break contract + stronger asset profile pages.
4. Lookbook cleanup: editorial cards and no text wall.
5. Security public readiness: implemented/planned/blocked split.
