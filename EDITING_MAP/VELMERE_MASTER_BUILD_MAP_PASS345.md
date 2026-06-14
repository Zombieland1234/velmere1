# VELMÈRE MASTER BUILD MAP — PASS345

## Brutalny stan po PASS345
Publiczny prototyp nadal traktować jako ok. 14% finalnego produktu. PASS345 poprawia konkretny scroll/search/provider/PDF layer, ale live adaptery, source ledger storage, pełne logotypy, finalny PDF renderer i browser QA nadal są krytyczne.

## Co PASS345 naprawia
1. Shield search: usunięty fixed portal i globalny scroll repaint listener.
2. Shield search: podpowiedzi są inline/absolute w obrębie search shell, jak VLM Browser, więc nie powinny skakać przy scrollu.
3. Shield search: renderuje realne `suggestions.slice(0,12)` z token logo/avatar, nie tylko routerowe fake rows.
4. Orbit drawer: v4 native scroll marker i CSS: `pan-y`, overscroll containment, wolniejszy reveal.
5. Real Markets: provider contract route i UI ribbon.
6. Real Markets: provider chips pokazują `live_first`, `provider_required`, `slow_macro`, `operator_review`.
7. Universal Asset Matrix: 23 instrumenty, dodane USD/PLN, QQQ, GLD, BRENT.
8. Universal Asset Matrix: usunięty duplicate `symbol: XAU/USD`.
9. Lens PDF: 5 stron, nowa strona Asset Profile + Provider Contract.
10. Lens PDF: BAT/BTC/ETH/USDT/AAPL/EURUSD mają per-asset evidence copy.
11. Cross Asset API: eksportuje `realMarketProviderContract`.
12. Guard: `verify:pass345-provider-search-pdf-orbit`.

## A-M progres po PASS345
| ID | Obszar | Stan | Progress | Największy blocker |
|---|---|---:|---:|---|
| A | Core runtime / build | P0 | 37% | Brak `node_modules`/typów w paczce eksportowej; pełny typecheck nie przechodzi przez zależności. |
| B | Brand/luxury public UI | P1 | 24% | Nadal trzeba usuwać techniczne copy z publicznych powierzchni. |
| C | VLM Shield token surface | P0 | 33% | Search jest stabilniejszy, ale full CoinGecko cache i token index nadal P0. |
| D | VLM AI Brain / Orbit 360 | P0 | 32% | Drawer v4 ma scroll guard, ale tile copy/QA/focus trap nadal P0. |
| E | Velmère Lens / Browser / PDF | P0 | 28% | PDF ma 5 stron i profile assetów, ale renderer dalej manualny. |
| F | Security / privacy / challenge | P0 | 25% | CSP, safe harbor, storage i challenge scope nadal niewdrożone. |
| G | Commerce / shop / products | P1 | 20% | Lookbook/product truth wymagają kolejnych passów. |
| H | Lookbook / collection | P1 | 24% | Pilnować, żeby nie wrócił product text wall. |
| I | Real Markets / Cross-Asset | P0 | 24% | Provider contract jest, ale brak prawdziwych API keys/adapters/cache. |
| J | Interaction / scroll / performance | P0 | 31% | Search usunięty z portala, ale potrzebny real browser profiler. |
| K | AI bot / copy engine | P0 | 31% | Per-asset copy zaczęte w PDF; UI/Orbit nadal generyczne w miejscach. |
| L | Legal / compliance | P0 | 31% | Granice są, ale final legal review nadal brak. |
| M | Evidence / reports / storage | P0 | 21% | PDF/provider contract lepszy, ale durable snapshot ledger nadal brak. |

## Blockery aktywne — jawne
1. P0: Full typecheck nadal blokuje brak `node_modules` w paczce.
2. P0: Orbit drawer wymaga browser QA: mouse wheel, touchpad, mobile, small viewport.
3. P0: Shield search wymaga full CoinGecko token index, TTL cache, stale/fallback UI i B-query QA.
4. P0: Real token/stock/FX/commodity logos nadal potrzebują deterministic provider map.
5. P0: Real Markets provider contract nie jest live adapterem; nadal trzeba podpiąć FX/stocks/ETF/commodities/real estate data.
6. P0: Binance/MEXC live adapters wymagają heartbeat, reconnect, fallback i endpoint weight guard.
7. P0: PDF renderer nadal manualny; potrzebny layout engine/render regression.
8. P0: PDF download wymaga testów wizualnych na 5 stronach.
9. P0: Security page/challenge potrzebuje safe harbor, scope, out-of-scope, mailbox, SLA.
10. P0: CSP/security headers i rate-limit readiness nadal wymagają produkcyjnego wdrożenia.
11. P0: Public UI nadal ma miejscami operatorowy język i pass telemetry.
12. P0: AI Brain tile copy musi być unikalne per risk lane.
13. P0: Source ledger nie jest durable storage.
14. P0: Evidence snapshots nie mają finalnego hash/retention policy runtime.
15. P0: Real browser QA artifacts nadal nie istnieją.
16. P1: Stablecoin reserve/peg bridge nadal brak.
17. P1: Contract scanner per chain nadal brak.
18. P1: Holder cluster adapter nadal brak.
19. P1: Unlock/vesting source nadal brak.
20. P1: Orderbook depth second source nadal brak.
21. P1: Withdrawal/status source ledger nadal brak.
22. P1: Public incident feed nadal brak.
23. P1: SEC filing parser nadal brak.
24. P1: EU issuer disclosure parser nadal brak.
25. P1: ECB/FRED/FHFA calendars nadal brak.
26. P1: REIT/ETF provider nadal brak.
27. P1: Commodity normalization nadal brak.
28. P1: FX intraday provider nadal brak.
29. P1: Symbol mapping across providers nadal brak.
30. P1: Source cache TTL model nadal brak.
31. P1: Server-side rate-limit store nadal brak.
32. P1: Bot protection edge rules nadal brak.
33. P1: Safe-harbor challenge public page nadal brak.
34. P1: Admin authentication provider nadal brak.
35. P1: Redacted event export nadal brak.
36. P1: Privacy policy alignment for analytics nadal brak.
37. P1: Wallet access gate final policy nadal brak.
38. P1: VLM utility/legal final review nadal brak.
39. P1: Product SKU/provider truth final nadal brak.
40. P1: Shipping/returns final data nadal brak.
41. P1: Payment webhook production proof nadal brak.
42. P1: Order persistence proof nadal brak.
43. P1: Image optimization for lookbook nadal brak.
44. P1: Mobile drawer QA nadal brak.
45. P1: Screen-reader QA nadal brak.
46. P1: Reduced-motion audit nadal brak.
47. P1: Lighthouse/Core Web Vitals pass nadal brak.
48. P1: SEO structured data for products nadal brak.
49. P1: Sitemap/metadata final nadal brak.
50. P1: Translations audit PL/EN/DE nadal brak.
51. P1: Route map cleanup nadal brak.
52. P1: Dead route cleanup nadal brak.
53. P1: Duplicate copy cleanup nadal brak.
54. P1: Raw API button audit nadal brak.
55. P1: Hidden JSON surface audit nadal brak.
56. P1: PDF fonts/brand typography final nadal brak.
57. P1: PDF page-break engine nadal brak.
58. P1: A4 print CSS validation nadal brak.
59. P1: Downloaded PDF visual regression nadal brak.
60. P1: Browser dropdown outside-click consistency nadal brak.
61. P1: Modal focus trap nadal brak.
62. P1: Escape close audit nadal brak.
63. P1: Scroll restoration guard nadal brak.
64. P1: Table virtual scroll nadal brak.
65. P1: Long-list image cache nadal brak.
66. P1: WebGL renderer feature gate nadal brak.
67. P1: Performance governor dla search/drawer nadal wymaga profiler pass.
68. P1: AI bot fixtures dla stale/missing/fake data nadal brak.
69. P1: Per-asset UI copy dla wszystkich tokenów nadal brak.
70. P1: Per-stock/FX/ETF report templates nadal brak.
71. P1: Luxury proof-passport product page nadal brak.
72. P1: Provenance/DPP copy dla commerce nadal brak.
73. P1: Lookbook large editorial photo system nadal brak.
74. P1: Product detail material/size/delivery truth nadal brak.
75. P1: Guest checkout polish nadal brak.
76. P1: Analytics funnel privacy-safe events nadal brak.
77. P1: Admin/operator wall isolation nadal brak.
78. P1: Customer-safe export firewall nadal brak final runtime.
79. P1: Rollback vault nadal brak runtime proof.
80. P1: Release QA scorecard nadal brak final pass.
81. P1: Source freshness registry UI nadal nie jest pełny.
82. P1: Market source cadence row wymaga real timestamps.
83. P1: Second source divergence wymaga real providers.
84. P1: Exchange stability table wymaga live status/reserve/liability context.
85. P1: Native-token dependency lane nadal brak.
86. P1: Stablecoin reserve timestamp parser nadal brak.
87. P1: Search no-result UX nadal wymaga polish.
88. P1: Search cooldown UI wymaga clean copy.
89. P1: Mobile Real Markets table wymaga cards/stack.
90. P1: Mobile Lens PDF preview wymaga full QA.
91. P1: PDF filename/sanitization QA nadal brak.
92. P1: Provider contract docs require public admin boundary.
93. P1: API error envelopes require final typed contract.
94. P1: Cache invalidation strategy nadal brak.
95. P1: Evidence redaction envelope runtime nadal brak.
96. P1: Security event ledger retention nadal brak.
97. P1: Stripe webhook replay QA nadal brak final.
98. P1: Wallet seed-phrase warning copy nadal wymaga audit.
99. P1: Multi-locale legal boundary copy nadal wymaga review.
100. P1: Visual regression screenshots nadal brak.
101. P1: Browser e2e script nadal brak.
102. P1: Deployment/Vercel parity nadal brak final proof.
103. P1: Production env readiness checklist nadal brak final pass.
104. P1: Product media optimization nadal brak.
105. P1: Lookbook routes need clean editorial hierarchy.
106. P1: Community/Square security copy nadal wymaga polish.
107. P1: Angel widget overlap z tabelami nadal wymaga QA.
108. P1: Header z-index with search/drawer nadal wymaga regression.
109. P1: Scroll lock across modal/drawer/search nadal wymaga unified hook.
110. P1: Final release freeze protocol nadal brak.

## Następny build order
PASS346: CoinGecko/cache full token index + stale/fallback UI + B-query QA.
PASS347: Orbit unique tile copy + drawer accordion + keyboard/ESC/focus trap.
PASS348: PDF renderer v6 visual engine + generated PDF visual regression.
PASS349: Real logos/icon map for stocks/FX/ETF/commodities + deterministic fallback.
PASS350: Security safe-harbor page + CSP/rate-limit readiness.
