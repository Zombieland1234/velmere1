# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R2

## Stan nadrzędny

- Canonical checkpoint: **P101R1**.
- Najnowszy bieżący plik do pracy: **R2 audited current-source candidate**.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Globalnie: **NO_GO / STOP_SELL**.

## Co wykonano w R2

1. Ponowiono dostępne dependency, TypeScript, ESLint, i18n, build, test, preflight i smoke gates; dokładny wynik każdego znajduje się w raporcie wewnątrz ZIP-a.
2. Uruchomiono szeroką kampanię istniejących testów current-execution dla Shield, Shield Pro, Real Markets, Audit, Browser, Verify, Angel, kont i providerów.
3. Dodano public/customer error-redaction regression i usunięto jednoznaczne odbijanie surowego tekstu wyjątków w odpowiedziach klienta.
4. Dodano gate, który blokuje government/reference lanes przed udawaniem live lub executable market data.
5. Dodano audyt granicy account export/account erasure.
6. Dodano statyczny kontrakt tabel Shield/Shield Pro/Real Markets B/P/A.
7. Dodano niezależny inventory/verifier dowodów kampanii AI 2400/900.

## Kolejność do 20/20

### Faza 1 — wspólne odblokowanie

1. Autoryzowany darmowy Supabase staging albo lokalny Supabase.
2. Migracje, service-role, dwa testowe JWT, RLS, cross-account, rollback, concurrency i restore.
3. GitHub Actions `windows-2025` na exact Node 24.18.0/npm 11.16.0.
4. Field-level rights matrix oraz free/open alternatywy.

### Faza 2 — produkty tierowane

5. Shield B/P/A: real evidence, kalibracja, customer tables, matched-input value.
6. Shield Pro B/P/A: real server workflow, case boundaries, entitlements i materialne delty.
7. Real Markets B/P/A: prawdziwe pola, semantic classes, session/time/currentness i rights.
8. Audit B/P/A: realny supported input, evidence, findings, remediation/retest, immutable PDF/account delivery.
9. Browser B/P/A: real input, rights, storage, same-blob, account readback, tiers.

### Faza 3 — standalone

10. Risk Indicator staging chain.
11. Verify registry/monitor/badge na stagingu.
12. Whale Watch real chain/finality/labels.
13. Market Impact real rights-safe book albo jawne NO_USABLE_ORDER_BOOK.
14. Shield Map real node/edge semantics.
15. Angel provider/privacy decision i finalna evaluation.

### Faza 4 — walidacja

16. Internal customer execution dla 20 rows.
17. 100 personas × 24 steps — final-byte rerun.
18. 50 cases × 3 tiers × ≥6 reviewers — final-byte rerun.
19. Angel multilingual/adversarial campaign.
20. Security, accessibility, browser, stability and performance.
21. 10/10 matched-input paid transitions.

### Faza 5 — wykończenie

22. Functional/product/security freeze.
23. Final visual polish.
24. Post-polish regression.
25. Three clean convergence rounds.
26. External pilot, human AppSec and legal review.
27. FINAL_CANDIDATE → PILOT_READY → GO_PAID → LIVE.

## Zasada

Nie zwiększamy licznika za fixture, lokalny mock, sam build, samą kampanię AI ani działający publiczny endpoint bez praw. Najpierw produkt zasługuje na zielony status.
