# VELMÈRE — R6 CONTINUATION EXECUTION REPORT

Classification: `AUDITED_CURRENT_SOURCE_CANDIDATE_R6 / NOT_A_CANONICAL_CHECKPOINT`

R6 jest fizycznym następcą ostatniego rzeczywistego R4. Wcześniej opisany pełny pakiet R5 nie był obecny na dysku, dlatego nie został użyty jako parent i nie odziedziczył żadnego kredytu.

## Wynik wykonania

| Oś | R4 | R6 |
|---|---:|---:|
| Customer FINAL | 0/20 | **0/20** |
| Paid value FINAL | 0/10 | **0/10** |
| Local PASS | 37/47 | **41/47** |
| Dependency WITHHELD | 7 | **5** |
| NOT_RUN / authorized-runtime WITHHELD | 2 | **0** |
| Actual FAIL/TIMEOUT | 0 | **0** |
| Repeatability | 47/47 classification + exit | **47/47 classification + exit** |
| Exact Windows | WITHHELD | **18/18 workflow contract PASS, execution WITHHELD** |

## Cztery realnie zamknięte luki

1. **Angel durable-memory deletion**: produkcyjny adapter wysyła ograniczony `DELETE` do PostgREST, z `no-store`, server-owned service credentials, account-bound hash, 5-sekundowym timeoutem i fail-closed error handling. Targeted test: **53 assertions**; adapter regression: **24 assertions**.
2. **Public Proof publication**: route controller oraz metadata przeszły do czystej, dependency-free granicy. **63/63 assertions** bez udawania produkcyjnego React/Next renderingu.
3. **Verify durable registry projection**: status, badge, history/current report oraz digest są projektowane w czystym view-modelu. **66/66 assertions** bez testowego Reacta.
4. **Runtime environment authority**: test generuje receipt wewnątrz kampanii i wiąże `ENV_PRODUCTION_READY.example` z bieżącym manifestem: **17,006 B / SHA-256 f5f94e... / 321 documented keys / 241 runtime keys**.

## Pełna kampania

Dwa osobne przebiegi po 47 testów dały identyczny wynik:

```json
{
  "run1": {
    "PASS": 41,
    "WITHHELD_DEPENDENCY_ENVIRONMENT": 5,
    "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED": 1
  },
  "run2": {
    "PASS": 41,
    "WITHHELD_DEPENDENCY_ENVIRONMENT": 5,
    "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED": 1
  },
  "actualFailureCount": 0,
  "classification": "PASS_LOCAL_CAMPAIGN_WITH_EXPLICIT_WITHHELD_GATES"
}
```

Repeatability:

- classifications: **47/47**;
- exit codes: **47/47**;
- stdout hashes: **42/47**;
- stderr hashes: **47/47**;
- claim: **PASS_OUTCOME_REPEATABLE**, bez twierdzenia o pełnej byte-identical stdout.

## Dokładny pozostały lokalny blocker

Pięć testów nadal wymaga prawdziwego `@electric-sql/pglite@0.5.4`. Current lock wymaga:

- resolved: `https://registry.npmjs.org/@electric-sql/pglite/-/pglite-0.5.4.tgz`;
- integrity: `sha512-yYZUyyXrHU7tPlCjwZQJ6hIG9DscdCCn7Uk0mYKwC1FeHX286AbcmFveMiRBEak8e9iPupjsoVImN3yJZVed2g==`;
- status w tej sesji: **WITHHELD_EXACT_PACKAGE_BYTES_UNAVAILABLE**.

R6 nie używa emulatora ani obcego WASM. Dodał verifier/install bridge, który przyjmuje tylko tarball o dokładnym SRI, odrzuca path traversal/symlinki, sprawdza package identity i wymagane runtime assets. Dopóki dokładne bajty nie są obecne, wynik pozostaje WITHHELD.

Pięć PGlite testów runner wykonuje sekwencyjnie. Jest to świadoma kontrola stabilności, nie skrót: upstream ma aktywne zgłoszenie o możliwym natywnym `SIGSEGV` przy równoległych inicjalizacjach PGlite w procesach Node.

## Exact Windows bridge

Nowy manual-only workflow:

`/.github/workflows/r6-exact-windows-current-byte-closure.yml`

Statyczny kontrakt: **18/18 PASS**. Workflow obejmuje:

- `windows-2025`;
- Node 24.18.0 / npm 11.16.0;
- SHA-256 package + lock;
- pełne `npm ci`;
- exact PGlite 0.5.4 identity;
- TypeScript i ESLint;
- Webpack i Turbopack;
- dwie kampanie oraz repeatability;
- pinned action SHAs, `contents: read`, `persist-credentials: false`, 90-min hard timeout;
- artifact evidence bez billing activation.

Stan pozostaje **PASS_CONTRACT_NOT_EXECUTED**. Sam plik workflow nie daje exact-Windows ani Customer FINAL.

## Supply-chain policy

Dodanie dziewiątego workflow uruchomiło realny fail w istniejącym denominatorze. R6 poprawił policy registry do:

- **9 workflow files**;
- **30 pinned action references**;
- current workflow audit PASS;
- adversarial supply-chain tests **23/23 PASS**.

## Co nadal blokuje pierwszy FINAL

1. Exact PGlite albo pełny exact-lock dependency run.
2. Exact Windows current-byte run.
3. Owner-authorized PostgreSQL/Supabase z dwoma kontami/JWT, RLS, durable readback, concurrency, export/delete i restore.
4. Field-level rights decisions.
5. Następnie Browser Basic → Risk Indicator → Audit Basic, potem płatne tiery i pozostałe rows.

## Uczciwy stan

- `CUSTOMER_FINAL = 0/20`
- `PAID_VALUE_FINAL = 0/10`
- `GLOBAL = NO_GO / STOP_SELL`
- `LOCAL_CAMPAIGN = 41 PASS / 5 PGLITE WITHHELD / 1 EXACT WINDOWS WITHHELD / 0 FAIL`
- `AUTHORIZED_STAGING = WITHHELD`
- `FIELD_RIGHTS = WITHHELD`
- `NEXT_HIGHEST_VALUE = EXACT PGLITE + EXACT WINDOWS + OWNER-AUTHORIZED DB/STAGING`
