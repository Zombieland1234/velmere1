#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALIGN = (ROOT / 'lib/market-integrity/risk-history-current-alignment.ts').read_text(encoding='utf-8')
UI = (ROOT / 'components/market-integrity/RiskHistoryControl.tsx').read_text(encoding='utf-8')
SHIELD = (ROOT / 'components/market-integrity/ShieldRealMarketsParityClient.tsx').read_text(encoding='utf-8')
ACTIVE = (ROOT / 'VELMERE_ACTIVE_PASS.txt').read_text(encoding='utf-8').strip()
checks=[]
def check(identifier: str, condition: bool, detail=None):
    checks.append({'id':identifier,'status':'PASS' if condition else 'FAIL', **({} if detail is None else {'detail':detail})})

# Versioned production boundary.
check('active_pass_p96r1', ACTIVE == 'P96R1', ACTIVE)
check('alignment_module_exists', bool(ALIGN.strip()))
check('current_observation_schema_versioned', 'velmere.risk-history-current-observation.v1' in ALIGN)
check('alignment_schema_versioned', 'velmere.risk-history-current-alignment.v1' in ALIGN)
check('current_observation_exact_shape_verified', 'verifyRiskHistoryCurrentObservation' in ALIGN and 'CURRENT_OBSERVATION_FIELDS' in ALIGN)
check('alignment_reverifies_current_object', 'const current = verifyRiskHistoryCurrentObservation(args.current)' in ALIGN)
for state in [
    'CURRENT_WITHHELD','HISTORY_EMPTY','ALIGNED_SAME_OBSERVATION','CURRENT_NEWER_COMPARABLE',
    'CURRENT_NEWER_NEW_SEGMENT','HISTORY_NEWER_THAN_CURRENT','IDENTITY_CONFLICT','SAME_OBSERVATION_CONFLICT',
]: check(f'alignment_state_{state.lower()}', f'"{state}"' in ALIGN)

# Current score is rebuilt through the exact Risk History contract.
check('rebuilds_exact_snapshot', 'buildRiskHistorySnapshot({' in ALIGN)
check('verifies_rebuilt_snapshot', 'verifyRiskHistorySnapshot(snapshot)' in ALIGN)
check('snapshot_build_exception_fails_closed', 'current_snapshot_build_failed' in ALIGN and 'catch {' in ALIGN)
check('current_timestamp_canonical', 'canonicalIso(args.result.generatedAt)' in ALIGN)
check('current_score_bounded', 'value >= 0 && value <= 100' in ALIGN)
check('current_score_snapshot_match_required', 'Math.round(score) !== snapshot.score' in ALIGN)
check('current_publication_required', '!snapshot.customerPublishable || snapshot.publicationState !== "PUBLIC"' in ALIGN)
check('current_identity_bound', 'canonicalAssetId: snapshot.canonicalAssetId' in ALIGN)
check('current_methodology_bound', 'methodologyVersion: snapshot.methodologyVersion' in ALIGN)
check('current_score_version_bound', 'scoreVersion: snapshot.scoreVersion' in ALIGN)
check('current_evidence_version_bound', 'evidenceVersion: snapshot.evidenceVersion' in ALIGN)
check('current_comparability_bound', 'comparabilityKey: snapshot.comparabilityKey' in ALIGN)

# Alignment compares identity, exact time and version dimensions.
check('latest_history_selected_only', 'history.at(-1)' in ALIGN)
check('canonical_identity_conflict_blocks', 'current.canonicalAssetId !== args.historyAssetCanonicalId' in ALIGN and 'state: "IDENTITY_CONFLICT"' in ALIGN)
check('exact_time_delta', 'const timeDeltaMs = currentTime - historyTime' in ALIGN)
check('all_version_axes_compared', all(token in ALIGN for token in [
    'current.comparabilityKey === latestHistory.comparabilityKey',
    'current.methodologyVersion === latestHistory.methodologyVersion',
    'current.scoreVersion === latestHistory.scoreVersion',
    'current.evidenceVersion === latestHistory.evidenceVersion',
]))
check('same_time_conflict_blocks_current', 'state === "ALIGNED_SAME_OBSERVATION"' in ALIGN and 'currentDisplayAllowed: state === "ALIGNED_SAME_OBSERVATION"' in ALIGN)
check('history_newer_blocks_current', 'state: "HISTORY_NEWER_THAN_CURRENT"' in ALIGN and 'currentDisplayAllowed: false' in ALIGN)
check('withheld_current_preserves_history', 'state: "CURRENT_WITHHELD"' in ALIGN and 'historyDisplayAllowed: latestHistory !== null' in ALIGN)
check('no_provider_urls_in_alignment', 'providerUrl' not in ALIGN and 'https://' not in ALIGN)
check('no_raw_response_in_alignment', 'rawResponse' not in ALIGN and 'sourceReceiptRoot' not in ALIGN and 'receiptDigest' not in ALIGN)

# UI no longer relabels stored history as current.
check('ui_imports_alignment_boundary', 'risk-history-current-alignment' in UI)
check('ui_requires_current_observation_prop', 'currentObservation: RiskHistoryCurrentObservation;' in UI)
check('legacy_score_prop_removed', 'score: number | null;' not in UI[UI.index('export default function RiskHistoryControl'):])
check('legacy_latest_overwrites_current_removed', 'latest?.score ?? score' not in UI)
check('legacy_unbound_score_identifier_removed', 'formatScore(score, locale)' not in UI and 'scoreTone(score)' not in UI)
check('alignment_memoized', 'alignRiskHistoryCurrentObservation({' in UI and 'useMemo' in UI)
check('current_display_gate_enforced', 'const currentScore = alignment.currentDisplayAllowed ? alignment.current.score : null;' in UI)
check('history_display_gate_enforced', 'const latestStored = alignment.historyDisplayAllowed ? alignment.latestHistory : null;' in UI)
check('current_and_latest_have_separate_markers', UI.count('data-risk-history-score-role="current-table"') >= 3 and UI.count('data-risk-history-score-role="latest-stored"') >= 3)
check('alignment_disclosure_rendered', UI.count('data-risk-history-current-alignment={alignment.state}') >= 3)
check('current_timestamp_rendered', 'dateTime={alignment.current.observedAt ?? undefined}' in UI)
check('stored_timestamp_rendered', 'dateTime={latestStored?.observedAt}' in UI)
check('history_rounding_disclosed', all(text in UI for text in [
    'Zapis historii normalizuje wynik do pełnych punktów',
    'Stored history normalizes scores to whole points',
    'Der gespeicherte Verlauf normalisiert Werte auf ganze Punkte',
]))
check('current_label_pl', 'Bieżący wynik tabeli' in UI)
check('current_label_en', 'Current table score' in UI)
check('current_label_de', 'Aktueller Tabellenwert' in UI)
check('latest_stored_label_pl', 'Najnowsza zapisana obserwacja' in UI)
check('latest_stored_label_en', 'Latest stored observation' in UI)
check('latest_stored_label_de', 'Neueste gespeicherte Beobachtung' in UI)
check('history_newer_warning_pl', 'Zapis historii jest nowszy niż wynik tabeli' in UI)
check('history_newer_warning_en', 'Stored history is newer than the table score' in UI)
check('history_newer_warning_de', 'Der gespeicherte Verlauf ist neuer als der Tabellenwert' in UI)
check('not_probability_preserved', 'nie prawdopodobieństwo ani prognoza ceny' in UI and 'not a probability or price forecast' in UI)
check('compact_popover_separates_scores', 'data-risk-history-popover="compact-customer-safe"' in UI and 'copy.latestStored' in UI)
check('dialog_separates_scores', 'data-risk-history-dialog="expanded-customer-safe"' in UI and 'lg:grid-cols-5' in UI)

# All real Shield surfaces build the current observation from the actual row result.
check('shield_imports_builder', 'buildRiskHistoryCurrentObservation' in SHIELD)
check('shield_helper_binds_row_result', 'result: row.result' in SHIELD and 'publishedScore: score' in SHIELD)
check('three_risk_history_callers_pass_current_observation', SHIELD.count('currentObservation={buildCurrentRiskHistoryObservation(row, risk)}') == 3, SHIELD.count('currentObservation={buildCurrentRiskHistoryObservation(row, risk)}'))
check('no_legacy_score_prop_in_callers', 'score={risk}' not in SHIELD)
check('mobile_separate_action_preserved', 'data-risk-history-mobile-card="separate-primary-and-history-actions"' in SHIELD)

# Scope and safety.
check('no_new_network_call_in_alignment', 'fetch(' not in ALIGN and 'XMLHttpRequest' not in ALIGN)
check('no_browser_storage_in_alignment', 'localStorage' not in ALIGN and 'sessionStorage' not in ALIGN)
check('no_probability_field_in_alignment', 'probabilityPercent' not in ALIGN)
check('no_final_claim_in_sources', 'Customer FINAL' not in ALIGN and 'Risk Indicator FINAL' not in ALIGN)

failed=[row for row in checks if row['status']!='PASS']
receipt={
    'schemaVersion':'velmere.p96.risk-history-current-alignment-static.v1',
    'generatedAt':'2026-08-21T01:35:00.000Z',
    'status':'PASS_BOUNDED_STATIC_CURRENT_VS_STORED_ALIGNMENT' if not failed else 'FAIL',
    'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
    'zeroFakeCredit':{'browserRendered':False,'databaseExecuted':False,'deployedRoute':False,'wholeProjectTypeScript':False,'customerFinal':'0/20'},
    'truthBoundary':'Static source proof verifies the version/time/identity alignment boundary and separate current-vs-stored customer presentation. It does not execute React, Browser, HTTP, PostgreSQL, whole-project TypeScript or Customer FINAL.',
}
for rel in ['receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_STATIC.json','artifacts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_STATIC.json']:
    target=ROOT/rel; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks']},indent=2))
raise SystemExit(1 if failed else 0)
