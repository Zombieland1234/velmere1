#!/usr/bin/env python3
from __future__ import annotations
import datetime as dt, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
workflow=ROOT/'.github/workflows/r6-exact-windows-current-byte-closure.yml'
text=workflow.read_text(encoding='utf-8')
required={
 'manualOnly':'workflow_dispatch:' in text and 'push:' not in text,
 'contentsReadOnly':'contents: read' in text,
 'windows2025':'runs-on: windows-2025' in text,
 'nodeExact':'node-version: 24.18.0' in text and "v24.18.0" in text,
 'npmExact':'npm@11.16.0' in text and "'11.16.0'" in text,
 'packageHashBound':'de067fe9cd5611ebf9c719ca0be30e5b149d19b002268a0ce496acb10f871c1c' in text,
 'lockHashBound':'e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb' in text,
 'npmCi':'npm ci --ignore-scripts' in text,
 'pgliteExact':"p.version!=='0.5.4'" in text,
 'typescript':'npm run typecheck' in text,
 'eslint':'npm run lint' in text,
 'webpack':'npm run build:webpack' in text,
 'turbopack':'npm run build:turbopack' in text,
 'campaignTwice':text.count('run-r6-isolated-current-execution-campaign.py')==2,
 'repeatability':'build-r6-repeatability.py' in text,
 'artifactPinned':'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a' in text,
 'noPersistedCredentials':'persist-credentials: false' in text,
 'timeout':'timeout-minutes: 90' in text,
}
status='PASS_CONTRACT_NOT_EXECUTED' if all(required.values()) else 'FAIL_WORKFLOW_CONTRACT'
payload={
 'schemaVersion':'velmere.r6.exact-windows-workflow-contract.v1',
 'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z'),
 'workflowPath':workflow.relative_to(ROOT).as_posix(),
 'workflowSha256':hashlib.sha256(workflow.read_bytes()).hexdigest(),
 'checks':required,'checkCount':len(required),'passedCheckCount':sum(required.values()),
 'status':status,'executed':False,'exactWindowsCredit':False,'customerFinalCredit':False,
 'truthBoundary':'A green static workflow contract proves only that the exact execution path is physically encoded. It does not prove a GitHub Actions run or any Windows result.',
}
out=ROOT/'artifacts/r6/VELMERE_R6_EXACT_WINDOWS_WORKFLOW_CONTRACT.json'; out.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':status,'passed':payload['passedCheckCount'],'total':payload['checkCount']},indent=2))
raise SystemExit(0 if status.startswith('PASS') else 2)
