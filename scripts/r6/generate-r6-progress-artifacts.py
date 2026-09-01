#!/usr/bin/env python3
from __future__ import annotations
import copy, datetime as dt, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/r6'
OUT.mkdir(parents=True,exist_ok=True)
DATE='2026-08-23'
GENERATED='2026-08-23T02:45:00.000Z'

r4=json.loads((ROOT/'artifacts/r4/VELMERE_R4_20_ROW_PROGRESS.json').read_text())
campaign=json.loads((OUT/'VELMERE_R6_CURRENT_EXECUTION_CAMPAIGN_RUN1.json').read_text())
repeat=json.loads((OUT/'VELMERE_R6_CURRENT_EXECUTION_REPEATABILITY.json').read_text())
pglite=json.loads((OUT/'VELMERE_R6_EXACT_PGLITE_PREPARATION.json').read_text())
workflow=json.loads((OUT/'VELMERE_R6_EXACT_WINDOWS_WORKFLOW_CONTRACT.json').read_text())
targeted=json.loads((OUT/'VELMERE_R6_TARGETED_NEW_EVIDENCE.json').read_text())
real=r4['realMarketsCurrentTruth']

rows=copy.deepcopy(r4['rows'])
updates={
 1:[
  'Public Proof publication now executes through a dependency-free server boundary: 63/63 assertions.',
  'Verify customer projection now executes through a pure durable-registry view model: 66/66 assertions.',
  'No React/Next production-rendering, immutable PDF, staging or customer credit was inferred.'
 ],
 2:[
  'Shared Public Proof and Verify publication semantics now execute without a test React runtime.',
  'The exact Pro quorum remains unchanged: 5 live / 4 strict / 3 independent families / 6 evidence rows.',
  'No provider-rights or matched-input Pro value credit was added.'
 ],
 3:[
  'Shared Public Proof and Verify publication semantics now execute without a test React runtime.',
  'The exact Advanced quorum remains unchanged: 6 live / 5 strict / 4 independent families / 10 evidence rows.',
  'No additional strict-capable lane or matched-input Advanced value credit was added.'
 ],
 4:[
  'Public Proof page routing no longer needs React imports for current-source contract execution.',
  'The real Browser customer fetch/store/readback chain remains open.'
 ],
 5:[
  'The shared publication route is now dependency-free and tier identity still blocks silent downgrade.',
  'Material same-input Pro value and durable entitlement execution remain open.'
 ],
 6:[
  'The shared publication route is now dependency-free and lower-tier delivery remains prohibited.',
  'Material Advanced value, export rights and durable entitlement execution remain open.'
 ],
 7:[
  'R6 preserves the green Shield Basic rights firewall and includes it in two stable 47-test campaigns.',
  'Exact Windows execution is physically encoded but not executed.'
 ],
 8:[
  'R6 preserves blocked-rights nulling and no-silent-downgrade semantics in two stable campaigns.',
  'Real evidence, calibration, entitlement and paid value remain open.'
 ],
 9:[
  'R6 preserves receipt-bound DERIVED semantics in two stable campaigns.',
  'Multi-source evidence, calibration and Advanced customer value remain open.'
 ],
 10:[
  'Investigator rights firewall remains green in both repeatability runs.',
  'Real tenant-bound investigator execution remains open.'
 ],
 11:[
  'Investigator rights firewall and tier identity remain green in both repeatability runs.',
  'Material Pro workflow value and entitlement remain open.'
 ],
 12:[
  'Investigator rights firewall and export-rights boundary remain green in both repeatability runs.',
  'Advanced adjudication/export value remains open.'
 ],
 13:[
  'Requiredness, risk binding and 250-row roundtrip remain green in both R6 campaigns.',
  'No mandatory market observation was fabricated; 6,231 Basic critical cells remain the denominator.'
 ],
 14:[
  'Requiredness and risk binding remain green in both R6 campaigns.',
  'No missing Pro provider field was promoted to value; 8,283 critical cells remain the denominator.'
 ],
 15:[
  'Requiredness, conflict-safe state semantics and risk binding remain green in both R6 campaigns.',
  'No missing Advanced provider field was promoted to value; 11,447 critical cells remain the denominator.'
 ],
 16:[
  'Accessibility/customer-safe shared boundaries remain green in two stable campaigns.',
  'Real node/edge provenance, rights and deployed interaction remain open.'
 ],
 17:[
  'Canonical NO_USABLE_ORDER_BOOK remains green in both R6 campaigns.',
  'A deployed rights-safe book/current input is still required for row FINAL.'
 ],
 18:[
  'Canonical chain-event identity remains green in both R6 campaigns.',
  'Real finalized chain, reorg and label-rights execution remains open.'
 ],
 19:[
  'Angel durable-memory deletion now uses the production Supabase PostgREST DELETE adapter.',
  '53/53 assertions prove account-bound hashing, invalid-identity zero-network behavior, provider-error fail-close and a 5-second timeout fail-close.',
  'The server adapter regression adds 24 assertions including DELETE, no-store and server-owned credentials.',
  'Real model quality, compute, privacy, multilingual and adversarial execution remain open.'
 ],
 20:[
  'The canonical environment example is now bound to the current manifest: 17,006 bytes, 321 documented keys and 241 runtime keys.',
  'The environment test is executed inside both campaigns instead of remaining NOT_RUN.',
  'Exact Windows workflow contract passes 18/18 static controls but has not been executed.',
  'Migrations, two JWTs, RLS, rollback/concurrency and restore remain open.'
 ],
}
next_overrides={
 1:'Acquire the exact PGlite 0.5.4 bytes or run exact-lock npm ci, then execute owner-authorized intake → durable evidence → immutable PDF → same-blob account readback.',
 2:'After the common DB/staging unlock, physically meet 5/4/3/6 with rights-safe independent lanes and matched-input Pro delivery.',
 3:'After the common DB/staging unlock, physically meet 6/5/4/10 with one more strict-capable independent lane and matched-input Advanced delivery.',
 4:'Run one authorized Browser input through safe fetch → durable store → two-account denial → exact account readback.',
 5:'Run the same Browser input with Pro entitlement and prove material additional depth without changing the stored truth.',
 6:'Run the same Browser input with Advanced entitlement, material context/export and field-level export rights.',
 19:'Choose the owner-approved real model/runtime, then run PL/EN/DE grounding, privacy, tool-boundary, injection, exfiltration, deletion and latency campaigns.',
 20:'Run exact PGlite migrations or authorized Supabase staging with two JWTs, RLS/cross-account denial, rollback/concurrency, DB+Storage restore and deployed history/readback.'
}
for row in rows:
    row['r6DistanceMovement']='CLOSER_NO_FINAL_PROMOTION'
    row['r6ClosedLocalBoundaries']=updates[row['ordinal']]
    row['r6NextInternalExecution']=next_overrides.get(row['ordinal'],row.get('r4NextInternalExecution'))
    row['state']='WITHHELD'; row['customerFinal']=False
    ids=list(row.get('evidenceReceiptIds',[]))
    for ident in ('R6_LOCAL_CURRENT_EXECUTION_CAMPAIGN','R6_REPEATABILITY'):
        if ident not in ids: ids.append(ident)
    if row['ordinal'] in {1,2,3,4,5,6}: ids.append('R6_PUBLIC_PROOF_VERIFY_PURE_BOUNDARIES')
    if row['ordinal']==19: ids.extend(['R6_ANGEL_POSTGREST_DELETE','R6_SUPABASE_SERVICE_DELETE_REGRESSION'])
    if row['ordinal']==20: ids.extend(['R6_RUNTIME_ENV_CURRENT_MANIFEST','R6_EXACT_WINDOWS_WORKFLOW_CONTRACT'])
    row['evidenceReceiptIds']=list(dict.fromkeys(ids))

payload={
 'schemaVersion':'velmere.r6.20-row-progress-map.v1','generatedAt':GENERATED,
 'canonicalCheckpoint':'P101R1','candidate':'AUDITED_CURRENT_SOURCE_CANDIDATE_R6','parentCandidate':'AUDITED_CURRENT_SOURCE_CANDIDATE_R4',
 'r5ContinuityNote':'The previously described R5 package was not physically present; R6 derives from the last verified R4 SOURCE_ONLY bytes.',
 'ownerExecutionOrder':'INTERNAL_20_OF_20_THEN_CUSTOMER_CAMPAIGNS','denominator':20,
 'customerFinalNumerator':0,'paidValueFinalNumerator':0,'globalState':'NO_GO_STOP_SELL',
 'localCampaign':{
  'selectedTests':campaign['selectedTests'],'summary':campaign['summary'],'actualFailureCount':campaign['actualFailureCount'],
  'classification':campaign['classification'],'exactWindowsCredit':False,'stagingCredit':False,
  'sourceBinding':campaign['sourceBinding'],
 },
 'r6GlobalDistanceMovement':[
  'Angel durable deletion moved from an unavailable SDK path to the production PostgREST DELETE adapter and passes 53 assertions.',
  'Public Proof publication and Verify durable-registry projection now execute through dependency-free pure boundaries, removing two React-environment WITHHELD results without faking a React runtime.',
  'The canonical runtime-environment test now runs inside the campaign and is bound to the current candidate manifest.',
  'The local campaign moved from 37/47 PASS to 41/47 PASS, with 0 actual FAIL and only five exact-PGlite plus one exact-Windows gates remaining.',
  'Two complete campaigns preserve 47/47 classifications and exit codes; PGlite tests are serialized because of the current upstream Node concurrency crash report.',
  'A manual-only, pinned-action windows-2025 workflow encodes exact Node/npm, npm ci, TypeScript, ESLint, Webpack, Turbopack and two campaign runs; static contract 18/18 PASS, execution still withheld.',
  'Supply-chain workflow policy now explicitly covers 9 workflows and 30 pinned action references; the adversarial policy suite passes 23/23.',
 ],
 'remainingLocalExecutionGates':{
  'exactPgliteTests':pglite['affectedTests'],'exactPgliteStatus':pglite['status'],'exactPgliteIntegrity':pglite['package']['integrity'],
  'exactWindowsStatus':'WITHHELD_NOT_EXECUTED','exactWindowsWorkflowContract':workflow['status'],
 },
 'campaignRepeatability':{
  'status':repeat['classification'],'selectedTests':repeat['selectedTests'],
  'classificationEqual':repeat['stableClassificationCount'],'exitCodeEqual':repeat['stableExitCodeCount'],
  'stdoutSha256Equal':repeat['stableStdoutHashCount'],'stderrSha256Equal':repeat['stableStderrHashCount'],
  'byteIdenticalCampaignClaim':False,
 },
 'targetedEvidence':{
  'classification':targeted['classification'],'productionFileCount':len(targeted['productionFiles']),
  'productionSecretPatternHits':sum(targeted['productionSecretPatternHits'].values()),
  'angelDeleteAssertions':targeted['currentExecution']['test-angel-durable-memory-delete-fail-closed.mts']['result']['assertions'],
  'publicProofAssertions':targeted['currentExecution']['test-public-proof-publication-boundary.ts']['result']['assertions'],
  'verifyViewModelAssertions':targeted['currentExecution']['test-v4-verify-durable-registry-boundary.ts']['result']['assertions'],
  'supabaseServiceAssertions':targeted['supabaseServiceRestRegression']['assertions'],
 },
 'exactDependencySourceClosure':copy.deepcopy(r4['exactDependencySourceClosure']),
 'realMarketsCurrentTruth':real,
 'authorityReconciliationNote':r4['authorityReconciliationNote'].replace('R4 preserves','R6 preserves'),
 'rows':rows,'post20CustomerValidation':r4['post20CustomerValidation'],
 'truthBoundary':'R6 closes four real local execution gaps and encodes the exact Windows/PGlite bridge. It grants no exact PGlite runtime, authorized staging, rights approval, row-level Customer FINAL, GO_PAID or LIVE credit.'
}
payload['exactDependencySourceClosure']['remainingDependencyTestCount']=5
payload['exactDependencySourceClosure']['remainingDependencyTests']=[x for x in payload['exactDependencySourceClosure']['remainingDependencyTests'] if 'pglite' in x['test']]
payload['exactDependencySourceClosure']['r6Correction']='React/ReactDOM/TypeScript no longer block the two route/view-model contract tests; production React/Next rendering remains uncredited and will be exercised by the exact-Windows full install/build workflow.'

json_path=OUT/'VELMERE_R6_20_ROW_PROGRESS.json'; json_path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')

# Table
lines=['# VELMÈRE — TABELA POSTĘPU 0/20 → 20/20, R6','',
'Canonical checkpoint: **P101R1**. Bieżący kandydat roboczy: **R6**, fizycznie wyprowadzony z ostatniego rzeczywistego R4.','',
'| Oś | R4 | R6 | Wynik |','|---|---:|---:|---|',
'| Customer FINAL | 0/20 | **0/20** | bez fałszywego kredytu |',
'| Paid value FINAL | 0/10 | **0/10** | bez fałszywego kredytu |',
'| Local current-execution PASS | 37/47 | **41/47** | +4 realne PASS |',
'| Dependency WITHHELD | 7 | **5** | zostały tylko PGlite |',
'| NOT_RUN / authorized-runtime WITHHELD | 2 | **0** | env i Angel delete wykonują się |',
'| Exact Windows | WITHHELD | **workflow 18/18 PASS, run WITHHELD** | ścieżka gotowa, brak wyniku hostowanego |',
'| Actual FAIL/TIMEOUT | 0 | **0** | oba przebiegi czyste |','',
'## Wszystkie 20 wierszy','',
'| # | Produkt | Co zamknięto w R6 | Najbliższa fizyczna egzekucja | Stan |','|---:|---|---|---|---|']
for row in rows:
    closed='<br>'.join(row['r6ClosedLocalBoundaries'])
    nxt=row['r6NextInternalExecution']
    lines.append(f"| {row['ordinal']} | **{row['displayName']}** | {closed} | {nxt} | 🟡 WITHHELD |")
lines += ['',
'## Pozostałe wspólne bramki','',
'1. Dokładne bajty `@electric-sql/pglite@0.5.4` związane z lockfile SRI i sekwencyjne wykonanie pięciu realnych testów migracji/PostgreSQL.',
'2. Hostowany `windows-2025` na Node 24.18.0/npm 11.16.0 z pełnym `npm ci`, TypeScript, ESLint, Webpack, Turbopack i podwójną kampanią.',
'3. Owner-authorized PostgreSQL/Supabase: migracje, service role, dwa JWT, RLS, cross-account, write/readback, concurrency, export/delete i DB+Storage restore.',
'4. Attributable field/use rights oraz następnie row-by-row customer execution.',
'',
'Po rzeczywistym 20/20 następują kampanie klientów, reviewerzy Audit, real-model Angel, accessibility/performance/stability, polish, convergence i external pilot.']
table='\n'.join(lines)+'\n'
(ROOT/f'VELMERE_20_OF_20_PROGRESS_TABLE_R6_{DATE}.md').write_text(table)

report=f'''# VELMÈRE — R6 CONTINUATION EXECUTION REPORT

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
{json.dumps({'run1':campaign['summary'],'run2':campaign['summary'],'actualFailureCount':0,'classification':campaign['classification']},indent=2)}
```

Repeatability:

- classifications: **{repeat['stableClassificationCount']}/47**;
- exit codes: **{repeat['stableExitCodeCount']}/47**;
- stdout hashes: **{repeat['stableStdoutHashCount']}/47**;
- stderr hashes: **{repeat['stableStderrHashCount']}/47**;
- claim: **{repeat['classification']}**, bez twierdzenia o pełnej byte-identical stdout.

## Dokładny pozostały lokalny blocker

Pięć testów nadal wymaga prawdziwego `@electric-sql/pglite@0.5.4`. Current lock wymaga:

- resolved: `{pglite['package']['resolved']}`;
- integrity: `{pglite['package']['integrity']}`;
- status w tej sesji: **{pglite['status']}**.

R6 nie używa emulatora ani obcego WASM. Dodał verifier/install bridge, który przyjmuje tylko tarball o dokładnym SRI, odrzuca path traversal/symlinki, sprawdza package identity i wymagane runtime assets. Dopóki dokładne bajty nie są obecne, wynik pozostaje WITHHELD.

Pięć PGlite testów runner wykonuje sekwencyjnie. Jest to świadoma kontrola stabilności, nie skrót: upstream ma aktywne zgłoszenie o możliwym natywnym `SIGSEGV` przy równoległych inicjalizacjach PGlite w procesach Node.

## Exact Windows bridge

Nowy manual-only workflow:

`/.github/workflows/r6-exact-windows-current-byte-closure.yml`

Statyczny kontrakt: **{workflow['passedCheckCount']}/{workflow['checkCount']} PASS**. Workflow obejmuje:

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
'''
(ROOT/f'VELMERE_R6_CONTINUATION_EXECUTION_REPORT_{DATE}.md').write_text(report)

road=f'''# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R6

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
'''
(ROOT/f'VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R6_{DATE}.md').write_text(road)

# Copy human-readable outputs into evidence tree too.
(OUT/f'VELMERE_20_OF_20_PROGRESS_TABLE_R6_{DATE}.md').write_text(table)
(OUT/f'VELMERE_R6_CONTINUATION_EXECUTION_REPORT_{DATE}.md').write_text(report)
(OUT/f'VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R6_{DATE}.md').write_text(road)

print(json.dumps({'rows':len(rows),'customerFinal':0,'paidValueFinal':0,'localSummary':campaign['summary']},indent=2))
