#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=Path('/mnt/data')
archive=DATA/'VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R6_2026-08-23.zip'
receipt=json.loads((DATA/'VELMERE_R6_ARCHIVE_RECEIPT_2026-08-23.json').read_text())
campaign=json.loads((ROOT/'artifacts/r6/VELMERE_R6_CURRENT_EXECUTION_CAMPAIGN_RUN1.json').read_text())
repeat=json.loads((ROOT/'artifacts/r6/VELMERE_R6_CURRENT_EXECUTION_REPEATABILITY.json').read_text())
progress=json.loads((ROOT/'artifacts/r6/VELMERE_R6_20_ROW_PROGRESS.json').read_text())
pglite=json.loads((ROOT/'artifacts/r6/VELMERE_R6_EXACT_PGLITE_PREPARATION.json').read_text())
workflow=json.loads((ROOT/'artifacts/r6/VELMERE_R6_EXACT_WINDOWS_WORKFLOW_CONTRACT.json').read_text())
checks={}
checks['archiveExists']=archive.is_file()
checks['archiveHashMatches']=hashlib.sha256(archive.read_bytes()).hexdigest()==receipt['archiveSha256']
checks['archiveSizeMatches']=archive.stat().st_size==receipt['archiveByteLength']
with zipfile.ZipFile(archive) as z:
    names=z.namelist(); checks['zipCrc']=z.testzip() is None
    checks['entryCountMatches']=len(names)==receipt['entryCount']
    checks['noRuntimePaths']=not any(n.startswith(('.git/','.velmere/','node_modules/','.next/','.pytest_cache/')) or '/__pycache__/' in f'/{n}/' or n.endswith('.pyc') for n in names)
checks['campaignSummary']=campaign['summary']=={'PASS':41,'WITHHELD_DEPENDENCY_ENVIRONMENT':5,'WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED':1}
checks['campaignNoFailures']=campaign['actualFailureCount']==0
checks['repeatability']=repeat['classification']=='PASS_OUTCOME_REPEATABLE' and repeat['stableClassificationCount']==47 and repeat['stableExitCodeCount']==47
checks['twentyRows']=len(progress['rows'])==20 and progress['customerFinalNumerator']==0 and all(not r['customerFinal'] and r['state']=='WITHHELD' for r in progress['rows'])
checks['paidZero']=progress['paidValueFinalNumerator']==0
checks['pgliteHonest']=pglite['status']=='WITHHELD_EXACT_PACKAGE_BYTES_UNAVAILABLE' and not pglite['installed']
checks['windowsHonest']=workflow['status']=='PASS_CONTRACT_NOT_EXECUTED' and not workflow['executed']
checks['manifestInside']=all(x in names for x in ('CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','CURRENT_CANDIDATE_RECEIPT.json','CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json','VELMERE_R6_CURRENT_SOURCE_MANIFEST.tsv'))
status='PASS' if all(checks.values()) else 'FAIL'
payload={'schemaVersion':'velmere.r6.final-artifact-validation.v1','status':status,'checks':checks,'passed':sum(checks.values()),'total':len(checks),'archiveSha256':receipt['archiveSha256'],'customerFinal':'0/20','paidValueFinal':'0/10','truthBoundary':'Artifact integrity and internal evidence consistency only; no withheld product gate is promoted.'}
(DATA/'VELMERE_R6_FINAL_VALIDATION_2026-08-23.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps(payload,indent=2));raise SystemExit(0 if status=='PASS' else 2)
