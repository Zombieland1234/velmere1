#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json'
directive=ROOT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
payload={
 'schemaVersion':'velmere.p86.master-directive-v2-owner-authority-binding.v1',
 'generatedAt':'2026-08-20T04:05:00Z',
 'status':'BOUND_LATEST_EXPLICIT_OWNER_EXECUTION_AUTHORITY_WITH_CAPTURE_BOUNDARY',
 'authority':{
   'title':'VELMÈRE — ULTIMATE WORLD-CLASS CONTINUOUS CLOSURE / FINAL CANDIDATE MASTER DIRECTIVE V2',
   'authorityClass':'LATEST_EXPLICIT_OWNER_DECISION',
   'precedenceRank':1,
   'effectiveDate':'2026-08-20',
   'controlsClosureExecution':True,
   'changesCanonicalProductTopology':False,
   'changesCurrentDenominators':False,
 },
 'canonicalTopologyAuthority':{'file':directive.name,'bytes':directive.stat().st_size,'sha256':hashlib.sha256(directive.read_bytes()).hexdigest(),'status':'REMAINS_BOUND'},
 'captureBoundary':{
   'exactRawConversationTransportBytesAvailableToSourcePackage':False,
   'receivedVisibleContentThrough':'section heading 44. BACKUP / RESTORE',
   'unreceivedOrTruncatedTailInvented':False,
   'fullTranscriptHashClaimed':False,
   'bindingMethod':'owner-decision semantic binding receipt; no fabricated byte-exact transcript file',
 },
 'appliedInP86':[
   'continuous evidence-first execution; pass is a savepoint, not a release claim',
   'real customer truth over pass/test-count optimisation',
   'zero fake credit and explicit WITHHELD boundaries',
   'no-progress loop protection when external staging is unavailable',
   'render-once immutable PDF bytes with preview/download/account identity',
   'legacy artifact without exact bytes fails closed instead of rerendering',
   'no product-topology mutation and no invented tiers',
 ],
 'governanceDecision':'No V17 authority churn is introduced because Master Directive V2 governs execution and explicitly does not independently change owner product topology. This receipt records precedence without rewriting history.',
 'truthBoundary':'This is not a byte-exact copy of the conversation message and does not claim one. It binds the received owner decision semantically and records the visible capture boundary.'
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n'); print(json.dumps(payload,indent=2,ensure_ascii=False))
