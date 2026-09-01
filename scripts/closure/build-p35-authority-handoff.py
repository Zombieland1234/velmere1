#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p35"
OUT = ART / "CURRENT_AUTHORITY_P35.json"
HANDOFF = ART / "P35_HANDOFF_MANIFEST.json"

METHOD = ROOT / "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V13_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY_2026-08-13.txt"
GROWTH = ROOT / "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R11_EVIDENCE_AVAILABILITY_VAULT_2026-08-13.txt"
REQUIREMENT_R2 = ROOT / "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R2_2026-08-13.txt"
REQUIREMENT_R3 = ROOT / "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R3_CURRENT_SOURCE_MAPPING_2026-08-13.txt"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def evidence(path: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": sha(path),
        "byteLength": path.stat().st_size,
    }


def canonical_sha(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def main() -> int:
    source = load(ART / "source-identity.json")
    matrix = load(ART / "current-evidence-availability-matrix.json")
    summary = load(ART / "internal-ai-availability-artifact-summary.json")
    verifier = load(ART / "internal-ai-availability-ledger-verifier-receipt.json")
    paid = load(ART / "paid-readiness-matrix.json")
    static = load(ART / "P35_STATIC_SCREEN.json")
    diff = load(ART / "p34-vs-p35-current-diff.json")
    release = load(ART / "release-target-control.json")

    artifacts = [
        METHOD,
        GROWTH,
        REQUIREMENT_R2,
        REQUIREMENT_R3,
        ART / "source-identity.json",
        ART / "current-evidence-availability-matrix.json",
        ART / "internal-ai-availability-artifact-summary.json",
        ART / "internal-ai-availability-ledger-verifier-receipt.json",
        ART / "paid-readiness-matrix.json",
        ART / "P35_STATIC_SCREEN.json",
        ART / "p34-vs-p35-current-diff.json",
        ART / "release-target-control.json",
        ART / "P35_REPORT_IN_PROGRESS.txt",
        ART / "P35_STATUS.json",
        ART / "P35_PROGRESS_DELTA.json",
    ]
    missing = [str(path.relative_to(ROOT)) for path in artifacts if not path.is_file()]
    if missing:
        raise SystemExit(f"missing_authority_artifacts:{','.join(missing)}")

    authority = {
        "schemaVersion": "velmere.p35.current-authority.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "revision": "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY",
        "source": {
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "pathSetSha256": source["pathSetSha256"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
            "identityReceipt": evidence(ART / "source-identity.json"),
        },
        "authorityFiles": {
            "methodology": evidence(METHOD),
            "growthIntel": evidence(GROWTH),
            "requirementR2": evidence(REQUIREMENT_R2),
            "requirementR3CurrentMapping": evidence(REQUIREMENT_R3),
        },
        "execution": {
            "internalAiRows": summary["rowsExecuted"],
            "internalAiDenominator": summary["rowDenominator"],
            "internalAiCoveragePercent": summary["executionCoveragePercent"],
            "cohorts": summary["cohortCount"],
            "profilesCovered": summary["profilesCovered"],
            "dynamicEligibilityProfiles": matrix["denominator"],
            "analysisEligibleProfiles": matrix["analysisEligibleProfileCount"],
            "saleEligibleProfiles": matrix["saleEligibleProfileCount"],
            "falsePromotionMutationsDetected": verifier["checks"]["mutationsDetected"],
            "falsePromotionMutationDenominator": verifier["checks"]["mutationDenominator"],
            "staticScreen": static["status"],
        },
        "paidReadiness": {
            "axisCount": paid["axisCount"],
            "internalPass": paid["internalInfrastructurePassCount"],
            "releasePass": paid["releasePassCount"],
            "goPaidAllowed": paid["goPaidAllowed"],
            "planningEstimatePercentRange": paid["planningEstimatePercentRange"],
        },
        "releaseTargets": release["targets"],
        "parentDiff": {
            "parentArchiveSha256": diff.get("parentArchiveSha256"),
            "onlyParent": len(diff.get("onlyParent", [])),
            "onlyCurrent": len(diff.get("onlyCurrent", [])),
            "changed": len(diff.get("changed", [])),
        },
        "openTruth": {
            "finalTierValueHoldoutsClosed": 0,
            "finalTierValueHoldoutDenominator": 33,
            "realExternalTracksClosed": 0,
            "realExternalTrackDenominator": 9,
            "goInternal": False,
            "goPaid": False,
            "saleEnabled": False,
            "productionApproved": False,
            "worldClassProven": False,
        },
        "truthBoundary": "This pointer binds current P35 source, methodology, Growth Intel, requirement mapping and compact receipts. Internal AI 100%, deterministic eligibility and PDF byte parity do not grant final holdout, clean build/staging, real-customer, professional legal, provider-rights, GO_PAID, LIVE or world-class credit.",
    }
    authority["integritySha256"] = canonical_sha(authority)
    OUT.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + "\n", "utf-8")

    handoff = {
        "schemaVersion": "velmere.p35.handoff-manifest.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "requiredUserArtifacts": [
            evidence(METHOD),
            evidence(GROWTH),
            {
                "path": "VELMERE_R44P46_METHOD_V13_P35_EVIDENCE_AVAILABILITY_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip",
                "sha256": None,
                "status": "GENERATED_BY_DETERMINISTIC_PACKAGER_AFTER_THIS_HANDOFF_RECEIPT",
            },
        ],
        "embeddedAuthority": evidence(OUT),
        "embeddedReceipts": [evidence(path) for path in artifacts[4:]],
        "rule": "Every handoff returns exactly methodology, Growth Intel and the newest current SOURCE_ONLY archive; SOURCE is the final link.",
        "truthBoundary": authority["truthBoundary"],
    }
    handoff["integritySha256"] = canonical_sha(handoff)
    HANDOFF.write_text(json.dumps(handoff, indent=2, ensure_ascii=False) + "\n", "utf-8")

    print(json.dumps({
        "status": "PASS_P35_AUTHORITY_HANDOFF_BUILT",
        "sourceAggregateSha256": source["sourceAggregateSha256"],
        "internalAi": f'{summary["rowsExecuted"]}/{summary["rowDenominator"]}',
        "eligibility": f'{matrix["analysisEligibleProfileCount"]}/{matrix["denominator"]} analysis; {matrix["saleEligibleProfileCount"]}/{matrix["denominator"]} sale',
        "staticScreen": static["status"],
        "authoritySha256": sha(OUT),
        "handoffSha256": sha(HANDOFF),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
