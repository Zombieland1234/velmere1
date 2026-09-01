# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R4

## Stan nadrzędny

- Canonical checkpoint: **P101R1**.
- Bieżący plik do dalszej pracy: **R4 audited current-source candidate**.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Globalnie: **NO_GO / STOP_SELL**.

## Co R4 fizycznie przesunął

1. Pełna kampania lokalna wzrosła z **29 do 37 PASS** przy **0 rzeczywistych FAIL**.
2. Dependency WITHHELD spadło z **15 do 7**.
3. Dokładny `zod@3.25.76` został odtworzony z już istniejącego, SHA-256-związanego archiwum źródłowego.
4. Dwa testy auth/session wykonują się przez test-only `after()` boundary; 1,954 pliki produkcyjne nie odwołują się do shimu.
5. Market Impact ma zielony lokalny kontrakt `NO_USABLE_ORDER_BOOK` bez syntetycznej płynności.
6. Shield Basic rights firewall, Real Markets contract binding, 250-row roundtrip, cross-product rights firewall i provider cost guard są zielone lokalnie.
7. Dwa pełne przebiegi utrzymały 47/47 tych samych klasyfikacji i kodów wyjścia.
8. Audyt zależności ustalił dokładny denominator: **70/618** wymaganych tarballi jest w źródle, **548** brakuje.

## Najkrótsza uczciwa droga do pierwszych FINAL

### Faza A — dependency i narzędzia

1. Pozyskać dokładne archiwa React 19.2.7, ReactDOM 19.2.7, TypeScript 5.9.3 i PGlite 0.5.4 albo wykonać świeży, exact-lock `npm ci` z pełnym receipt’em.
2. Odtworzyć pełny lock-bound dependency tree i sprawdzić platform-native resolution.
3. Node 24.18.0 + npm 11.16.0.
4. TypeScript, ESLint zero-warning, Webpack, Turbopack, smoke, browser, PDF i PL/EN/DE.

### Faza B — wspólne staging unlock

5. Lokalny Supabase/PostgreSQL albo autoryzowany Supabase Free.
6. Migracje, service role, dwa JWT, RLS i cross-account denial.
7. Write/readback, rollback, concurrency, export/delete.
8. DB + Storage backup/restore i post-restore ownership/RLS.

### Faza C — najbliższe row candidates

9. Browser Basic: real authorized input → safe fetch → durable store → account readback.
10. Risk Indicator: staging migrations/RLS/history/restore/deployed HTTP.
11. Audit Basic: real supported input → evidence → findings → remediation/retest → immutable PDF same-blob.
12. Market Impact: deployed route with rights-safe book/AMM or canonical `NO_USABLE_ORDER_BOOK`.

### Faza D — Audit quorum

13. Sourcify/self-controlled chain/DEX Screener/4byte/open-security lanes.
14. Pro: 5 live / 4 strict / 3 families / 6 evidence rows.
15. Advanced: 6 live / 5 strict / 4 families / 10 evidence rows.
16. Generalization pack; zero cherry-pick.

### Faza E — tiery i paid value

17. Browser Pro/Advanced.
18. Audit Pro/Advanced.
19. Shield B/P/A.
20. Shield Pro B/P/A.
21. 10/10 matched-input paid transitions.

### Faza F — Real Markets i standalone

22. Real Markets Basic 6,231 critical cells: real/right-safe lub exact fail-closed.
23. Pro 8,283 i Advanced 11,447: rzeczywiste obserwacje, semantyka, rights, matched value.
24. Shield Map, Whale Watch, Angel real model/hardware/evaluation.

### Faza G — closure

25. Exact final bytes + pełny engineering stack.
26. Exact Windows Server 2025.
27. 20 owner-authorized end-to-end row executions.
28. Dopiero wtedy `Customer FINAL = 20/20`.

### Faza H — po 20/20

29. 100 personas × 24 steps.
30. 50 Audit cases × 3 tiers × ≥6 reviewer roles.
31. Full Angel real-model campaign.
32. Accessibility/performance/stability, polish i post-polish regression.
33. External pilot, human AppSec/legal, convergence i osobne GO_PAID/LIVE gates.

## Zasada

Nie podbijamy licznika za fixture, test-only shim, pojedynczy pakiet, lokalny mock, sam build ani działający endpoint bez praw. R4 jest realnym skróceniem dystansu, ale **Customer FINAL pozostaje 0/20** do pełnego end-to-end dowodu.
