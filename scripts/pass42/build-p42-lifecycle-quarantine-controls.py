#!/usr/bin/env python3
"""Build deterministic P42 lifecycle quarantine, execution allowlist, and GitHub Action pins.

The builder inspects exact current lock/package and already-generated archive inventory as data.
It never executes dependency lifecycle code and grants no lifecycle approval.
"""
from __future__ import annotations
import argparse, copy, hashlib, json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
GENERATED_AT = "2026-08-14T11:20:00.000Z"
REVISION = "P42_V16_CURRENT_LOCK_LIFECYCLE_QUARANTINE_ACTION_PINNING_V2"
PINS = {
    "actions/checkout": {
        "sha": "11d5960a326750d5838078e36cf38b85af677262",
        "tagHint": "v4",
        "purpose": "read-only source checkout",
    },
    "actions/setup-node": {
        "sha": "49933ea5288caeca8642d1e84afbd3f7d6820020",
        "tagHint": "v4",
        "purpose": "exact Node 24.18.0 setup",
    },
    "actions/upload-artifact": {
        "sha": "ea165f8d65b6e75b540449e92b4886f43607fa02",
        "tagHint": "v4",
        "purpose": "always-uploaded failure/PASS evidence",
    },
}

def sha256_bytes(b: bytes) -> str: return hashlib.sha256(b).hexdigest()
def sha256_file(p: Path) -> str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()
def canonical_sha(v: Any) -> str:
    return sha256_bytes(json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())
def binding(root: Path, rel: str) -> dict[str, Any]:
    p=root/rel
    return {"path":rel,"sha256":sha256_file(p),"byteLength":p.stat().st_size}
def with_integrity(v: dict[str, Any]) -> dict[str, Any]:
    out=copy.deepcopy(v); out["integritySha256"]=canonical_sha(out); return out
def write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',type=Path,default=ROOT)
    ap.add_argument('--allowlist-output',type=Path,default=Path('config/p42/p42-lifecycle-execution-allowlist.json'))
    ap.add_argument('--pins-output',type=Path,default=Path('config/p42/p42-github-action-pins.json'))
    ap.add_argument('--policy-output',type=Path,default=Path('config/p42/p42-lifecycle-quarantine-policy.json'))
    a=ap.parse_args(); root=a.root.resolve()
    def target(p: Path)->Path: return p if p.is_absolute() else root/p
    package=json.loads((root/'package.json').read_text(encoding='utf-8'))
    inventory_path=root/'config/p42/p42-current-lock-lifecycle-inventory.json'
    inventory=json.loads(inventory_path.read_text(encoding='utf-8'))
    rows=[]
    for source in inventory['dependencyLifecycleRows']:
        row={
            "packagePath":source['packagePath'],"name":source['name'],"version":source['version'],
            "resolved":source['resolved'],"integrity":source['integrity'],"licenseFromLock":source.get('licenseFromLock'),
            "optional":source.get('optional',False),"dev":source.get('dev',False),
            "targetApplicability":source['targetApplicability'],
            "applicableToAnyRequiredTarget":source['applicableToAnyRequiredTarget'],
            "exactCurrentArchiveEvidence":source['exactCurrentArchiveEvidence'],
            "archiveEvidenceSha256":source.get('archiveEvidence',{}).get('archiveSha256') if source.get('archiveEvidence') else None,
            "archivePackageJsonSha256":source.get('archiveEvidence',{}).get('packageJsonSha256') if source.get('archiveEvidence') else None,
            "lifecycleScripts":source.get('archiveEvidence',{}).get('lifecycleScripts',{}) if source.get('archiveEvidence') else {},
            "networkCapableStaticIndicators":source.get('archiveEvidence',{}).get('networkCapableStaticIndicators',[]) if source.get('archiveEvidence') else [],
            "processExecutionStaticIndicators":source.get('archiveEvidence',{}).get('processExecutionStaticIndicators',[]) if source.get('archiveEvidence') else [],
            "executionApproved":False,
            "executionState":"QUARANTINED_NOT_AUTHORIZED",
            "approvalEvidence":None,
            "controlledExecutionReceipt":None,
        }
        rows.append(row)
    allowlist=with_integrity({
        "schemaVersion":"velmere.p42.lifecycle-execution-allowlist.v2","revision":REVISION,
        "generatedAt":GENERATED_AT,"parentRoot":"R44P46","checkpoint":"P42",
        "mode":"EXACT_CURRENT_TUPLE_FAIL_CLOSED_NO_DEPENDENCY_LIFECYCLE_APPROVAL",
        "bindings":{
            "packageJson":binding(root,'package.json'),"packageLock":binding(root,'package-lock.json'),
            "inventory":{**binding(root,'config/p42/p42-current-lock-lifecycle-inventory.json'),"integritySha256":inventory['integritySha256']},
        },
        "packageJsonAllowScriptsExpected":package.get('allowScripts',{}),
        "rootLifecycle":{
            "name":"velmere-store","version":package.get('version'),"scriptName":"preinstall",
            "command":package.get('scripts',{}).get('preinstall'),"ownedByVelmere":True,
            "executionApproved":True,"approvalScope":"runtime-contract-only",
            "dependencyLifecyclePermission":False,
        },
        "dependencyLifecycleRows":rows,
        "gate":{
            "dependencyLifecycleExecutionAllowed":False,
            "npmCiWithoutIgnoreScriptsAllowed":False,
            "semanticTypecheckLintBuildAllowed":False,
            "reasonCodes":[
                "NO_TARGET_APPLICABLE_DEPENDENCY_LIFECYCLE_TUPLE_APPROVED",
                "NETWORK_CAPABLE_FALLBACKS_REMAIN_QUARANTINED",
                "EXACT_WINDOWS_CURRENT_ROOT_NATIVE_PLATFORM_PROBE_NOT_YET_INGESTED",
            ],
        },
        "creditBoundary":{
            "exactArchiveInspection":True,"archiveCodeExecuted":False,"dependencyLifecycleExecution":False,
            "currentWindowsSemanticBuild":False,"browser":False,"pdf":False,"goInternal":False,"goPaid":False,
        },
    })
    pins=with_integrity({
        "schemaVersion":"velmere.p42.github-action-full-commit-pins.v1","revision":REVISION,
        "generatedAt":GENERATED_AT,"parentRoot":"R44P46","checkpoint":"P42",
        "policy":"FULL_40_HEX_COMMIT_REQUIRED_NO_MOVING_TAG_EXECUTION","pins":PINS,
    })
    # Write generated controls first so the policy can bind their exact bytes.
    write(target(a.allowlist_output),allowlist); write(target(a.pins_output),pins)
    policy_bindings={
        "packageJson":binding(root,'package.json'),"packageLock":binding(root,'package-lock.json'),
        "inventory":binding(root,'config/p42/p42-current-lock-lifecycle-inventory.json'),
        "allowlist":binding(root,'config/p42/p42-lifecycle-execution-allowlist.json'),
        "actionPins":binding(root,'config/p42/p42-github-action-pins.json'),
        "genericQuarantinePolicy":binding(root,'config/supply-chain-quarantine-policy.json'),
        "p42Workflow":binding(root,'.github/workflows/p42-exact-windows-node24-lifecycle-quarantine.yml'),
        "supersededP41Workflow":binding(root,'.github/workflows/p41-exact-windows-node24-current-root-closure.yml'),
        "sourceContract":binding(root,'scripts/pass4823/typecheck-source-contract.mjs'),
        "inventoryBuilder":binding(root,'scripts/pass42/build-p42-lifecycle-inventory.py'),
        "archiveAcquirer":binding(root,'scripts/pass42/acquire-p42-lifecycle-evidence.py'),
        "controlBuilder":binding(root,'scripts/pass42/build-p42-lifecycle-quarantine-controls.py'),
        "quarantineVerifier":binding(root,'scripts/pass42/verify-p42-lifecycle-quarantine.py'),
        "trustedNativeGuard":binding(root,'scripts/runtime/rebuild-trusted-native.mjs'),
        "nativePlatformProbe":binding(root,'scripts/pass42/verify-p42-native-platform-availability.mjs'),
        "semanticWorkflow":binding(root,'.github/workflows/p42-exact-windows-semantic-dual-build.yml'),
        "semanticRunner":binding(root,'scripts/pass42/run-p42-exact-windows-semantic-dual-build.mjs'),
    }
    policy=with_integrity({
        "schemaVersion":"velmere.p42.lifecycle-quarantine-policy.v2","revision":REVISION,
        "generatedAt":GENERATED_AT,"parentRoot":"R44P46","checkpoint":"P42",
        "exactTarget":{"os":"windows-2025","platform":"win32","arch":"x64","node":"v24.18.0","npm":"11.16.0"},
        "bindings":policy_bindings,
        "rules":{
            "dependencyLifecycleDefault":"DENY","exactTupleApprovalRequired":True,
            "archiveSriAndShaRequired":True,"staticInspectionNeverExecutesCode":True,
            "networkFallbackDuringLifecycleForbidden":True,"npmCiMustUseIgnoreScripts":True,
            "movingGithubActionTagsForbidden":True,"checkoutCredentialsPersisted":False,
            "semanticBuildRequiresNativePlatformProbe":True,"failureEvidenceAlwaysUploaded":True,
        },
        "expectedGate":{
            "dependencyLifecycleExecutionAllowed":False,"npmCiWithoutIgnoreScriptsAllowed":False,
            "semanticTypecheckLintBuildAllowed":False,
        },
        "releaseBoundary":{
            "currentExactWindowsDependencyGraph":"HISTORICAL_LOCK_BOUND_PLUS_CURRENT_MANIFEST_DIFFERENTIAL",
            "currentExactWindowsLifecycle":"WITHHELD","currentExactWindowsSemanticDualBuild":"NOT_EXECUTED",
            "goInternal":False,"goPaid":False,
        },
    })
    write(target(a.policy_output),policy)
    print(json.dumps({"status":"PASS","allowlistIntegrity":allowlist['integritySha256'],"pinsIntegrity":pins['integritySha256'],"policyIntegrity":policy['integritySha256'],"rows":len(rows),"approved":sum(1 for r in rows if r['executionApproved'])},indent=2))
    return 0
if __name__=='__main__': raise SystemExit(main())
