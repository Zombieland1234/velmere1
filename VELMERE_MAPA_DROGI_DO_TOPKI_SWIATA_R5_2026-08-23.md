# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R5

## Stan nadrzędny

- Canonical checkpoint: **P101R1**.
- Bieżący plik do dalszej pracy: **R5 audited current-source candidate**.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Globalnie: **NO_GO / STOP_SELL**.

## Co R5 fizycznie przesunął

1. Kampania wzrosła do **38 PASS / 48**, przy **0 rzeczywistych FAIL/TIMEOUT**.
2. Nowa ścieżka Market Impact obsługuje customer-owned snapshoty bez providerowego API i bez obchodzenia provider rights gate.
3. Receipt jest account/asset/snapshot/time-bound, podpisany HMAC-SHA256 i odporny na cross-account replay oraz podmianę bajtów.
4. Dane customer-owned są zawsze `verified_staging`; nie mogą udawać `live`, niezależnego quorum ani publikowalnego risk score.
5. Providerowe ścieżki nadal fail-closed.
6. Verifier granicy przeszedł **21/21**, a dwie kompletne kampanie utrzymały **48/48** identycznych klasyfikacji i kodów wyjścia.
7. Naprawiono realny błąd semantyczny `storage` → `age` oraz utratę blockerów w unavailable path.

## Najkrótsza uczciwa droga dalej

### Faza A — pierwszy pełny row candidate

1. Wdrożyć customer-owned evidence + Market Impact na owner-authorized staging.
2. Użyć realnego konta/JWT, dwóch tenantów i RLS; potwierdzić cross-account denial.
3. Trwale zapisać receipt, normalized snapshots i exact report bytes.
4. Wykonać same-account readback, backup/restore i post-restore ownership/RLS.
5. Podpiąć przypisywalną field/use rights decision oraz exact currentness/source identity.
6. Uruchomić thin/stale/manipulated/conflicted books i kalibrację bez fałszywej precyzji.
7. Exact engineering + Windows final-byte replay.

### Faza B — wspólne odblokowanie pozostałych rowów

8. Exact React 19.2.7, ReactDOM 19.2.7, TypeScript 5.9.3 i PGlite 0.5.4 albo świeży exact-lock `npm ci` receipt.
9. Pełne TypeScript, ESLint zero-warning, Webpack, Turbopack, smoke, browser, PDF i PL/EN/DE.
10. Lokalny/Supabase staging: migracje, service role, dwa JWT, RLS, rollback/concurrency, export/delete, DB+Storage restore.

### Faza C — najbliższe kolejne FINAL candidates

11. Browser Basic: authorized input → safe fetch → durable store → account readback.
12. Risk Indicator: migrations/RLS/history/restore/deployed HTTP.
13. Audit Basic: real input → evidence → findings → remediation/retest → immutable PDF same-blob.
14. Potem Browser/Audit/Shield/Shield Pro tiery i 10/10 matched paid transitions.
15. Audit Pro/Advanced quorum, Real Markets mandatory observations i Angel real model.
16. Exact 20-row final-byte replay; dopiero wtedy `Customer FINAL = 20/20`.

## Po 20/20

100 personas × 24 kroki, 50 Audit cases × 3 tiery × ≥6 reviewerów, pełny Angel real-model campaign, accessibility/performance/stability, polish, external pilot i human AppSec/legal pozostają osobną późniejszą fazą.

## Zasada

Customer-owned data nie omija praw. R5 pozwala użyć danych, do których właściciel/klient deklaruje dokładne uprawnienia, lecz nadal wymusza private/staging/fail-closed stan i nie przyznaje zielonej odznaki bez trwałego stagingowego dowodu.
