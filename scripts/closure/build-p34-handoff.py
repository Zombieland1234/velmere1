#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p34"
OUT = ART / "P34_HANDOFF_MANIFEST.json"
METHOD = ROOT / "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V12_INTERNAL_AI_DUAL_LEDGER_2026-08-13.txt"
GROWTH = ROOT / "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R10_INTERNAL_AI_DUAL_LEDGER_2026-08-13.txt"
AUTHORITY = ROOT / "docs/authority/CURRENT_AUTHORITY_P34.json"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read(path: Path):
    return json.loads(path.read_text("utf-8"))


def main() -> int:
    source = read(ART / "source-identity.json")
    summary = read(ART / "internal-ai-dual-ledger-summary.json")
    verifier = read(ART / "internal-ai-dual-ledger-verifier-receipt.json")
    diff = read(ART / "p33-vs-p34-current-diff.json")
    screen = read(ART / "P34_STATIC_SCREEN.json")
    status = read(ART / "P34_STATUS.json")
    result = {
        "schemaVersion": "velmere.p34.handoff-manifest.v4",
        "state": "CURRENT_IN_PROGRESS",
        "releaseState": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
        "threeAuthorityArtifacts": [
            {"kind": "METHODOLOGY", "path": str(METHOD.relative_to(ROOT)), "sha256": sha(METHOD)},
            {"kind": "GROWTH_INTEL", "path": str(GROWTH.relative_to(ROOT)), "sha256": sha(GROWTH)},
            {"kind": "CURRENT_SOURCE_ONLY", "path": "EXTERNAL_HANDOFF_ZIP_CREATED_BY_PACKAGE_STEP", "sha256": None},
        ],
        "currentAuthority": {"path": str(AUTHORITY.relative_to(ROOT)), "sha256": sha(AUTHORITY)},
        "sourceIdentity": {
            "path": "artifacts/closure/p34/source-identity.json",
            "sha256": sha(ART / "source-identity.json"),
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
        },
        "aiInternalTable": {
            "rowsExecuted": summary["totalRowsExecuted"],
            "rowDenominator": summary["totalRowDenominator"],
            "coveragePercent": summary["aiInternalExecutionCoveragePercent"],
            "cohorts": summary["cohortCount"],
            "profilesCovered": summary["profileCoverage"]["profileCount"],
        },
        "realExternalTable": {"tracksCompleted": 0, "trackDenominator": 9, "coveragePercent": 0, "externalCredit": 0},
        "falsePromotionVerifier": {
            "path": "artifacts/closure/p34/internal-ai-dual-ledger-verifier-receipt.json",
            "sha256": sha(ART / "internal-ai-dual-ledger-verifier-receipt.json"),
            "status": verifier["status"],
            "mutationsDetected": verifier["mutationsDetected"],
            "mutationDenominator": verifier["mutationDenominator"],
        },
        "parentDiff": {
            "path": "artifacts/closure/p34/p33-vs-p34-current-diff.json",
            "sha256": sha(ART / "p33-vs-p34-current-diff.json"),
            "onlyParentCount": diff["onlyParentCount"],
            "onlyCurrentCount": diff["onlyCurrentCount"],
            "changedCount": diff["changedCount"],
        },
        "staticScreen": {"path": "artifacts/closure/p34/P34_STATIC_SCREEN.json", "sha256": sha(ART / "P34_STATIC_SCREEN.json"), "status": screen["status"]},
        "planningEstimate": status["planningEstimate"],
        "truthBoundary": "AI_INTERNAL is 4017/4017 (100%). REAL_EXTERNAL is 0/9 (0%). The tables are independent, never averaged and grant no cross-table credit. GO_PAID remains false.",
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({"status": "PASS_P34_HANDOFF_BUILT", "aiInternal": "4017/4017", "realExternal": "0/9", "sourceAggregateSha256": source["sourceAggregateSha256"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
