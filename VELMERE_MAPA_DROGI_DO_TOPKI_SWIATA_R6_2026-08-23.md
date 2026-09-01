# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R6

## Current truth

- Canonical checkpoint: **P101R1**.
- Current working candidate: **R6**, bezpośrednio z ostatniego fizycznego R4.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Global: **NO_GO / STOP_SELL**.
- Local campaign: **41/47 PASS, 0 FAIL**.

## Co zostało skrócone

R4 miał 7 dependency WITHHELD, 1 authorized-runtime WITHHELD i 1 test NOT_RUN. R6 ma już tylko:

- 5 × exact PGlite;
- 1 × exact Windows.

React/TSX nie blokuje już kontraktowych testów Public Proof i Verify. Angel deletion nie zależy już od niedostępnego SDK. Runtime-env receipt nie jest już pomijany.

## Najbliższa kolejność

### A. Exact runtime unlock

1. Pozyskać dokładny tarball PGlite 0.5.4 albo wykonać pełny `npm ci` z bieżącego locka.
2. Zweryfikować SRI i wykonać sekwencyjnie pięć testów migracji/export/erasure/Verify/monitor.
3. Uruchomić przygotowany workflow `windows-2025` z Node 24.18.0/npm 11.16.0.
4. Zachować zielone: TypeScript, ESLint, Webpack, Turbopack i dwie pełne kampanie.

### B. Common staging unlock

5. Owner-authorized local PostgreSQL/Supabase albo Supabase Free.
6. Migracje, service role, dwa JWT, RLS/cross-account denial.
7. Write/readback, rollback, concurrency, export/delete.
8. DB + Storage backup/restore i post-restore ownership/RLS.

### C. Pierwsze row FINAL candidates

9. Browser Basic: authorized input → rights-safe fetch → durable storage → exact account readback.
10. Risk Indicator: request-bound identity → history → two-account RLS → restore → deployed customer flow.
11. Audit Basic: supported contract → evidence/findings → remediation/retest → immutable PDF → same-blob account delivery.

### D. Scale

12. Browser Pro/Advanced i Audit Pro/Advanced z materialnym same-input value.
13. Shield B/P/A oraz Shield Pro B/P/A.
14. Real Markets B/P/A field-by-field, bez udawania brakujących licencji lub obserwacji.
15. Shield Map, Market Impact, Whale Watch i real-model Angel.
16. Exact final-byte replay wszystkich 20 rows.

### E. Dopiero po 20/20

17. 100 personas × 24 steps.
18. 50 Audit cases × 3 tiers × ≥6 reviewer roles.
19. Real-model Angel multilingual/adversarial campaign.
20. Accessibility, performance, stability, security, polish i convergence.
21. External pilot, human AppSec, attributable legal review, GO_PAID i LIVE jako osobne bramki.

## Zasada

Nie zaliczamy workflow bez runu, PGlite bez dokładnych bajtów, lokalnego view-modelu jako produkcyjnego renderingu ani local PASS jako Customer FINAL.
