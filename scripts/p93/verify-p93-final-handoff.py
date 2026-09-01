#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", required=True)
    parser.add_argument("--v17", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--zip", required=True)
    parser.add_argument("--package-verification", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    master = Path(args.master)
    v17 = Path(args.v17)
    ledger = Path(args.ledger)
    source = Path(args.zip)
    package = json.loads(Path(args.package_verification).read_text(encoding="utf-8"))
    checks = []

    def check(identifier: str, condition: bool, detail=None) -> None:
        checks.append({"id": identifier, "status": "PASS" if condition else "FAIL", "detail": detail})
        if not condition:
            raise AssertionError(f"{identifier}:{detail}")

    check("master_exists", master.is_file())
    check("master_bytes", master.stat().st_size == 38_471, master.stat().st_size)
    check("master_sha", sha(master) == "9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53", sha(master))
    master_text = master.read_text(encoding="utf-8")
    sections = [int(value) for value in re.findall(r"^# (\d+)\.", master_text, flags=re.MULTILINE)]
    check("master_sections", sections == list(range(89)))
    check("master_start", "START NOW" in master_text)
    check("master_sentinel", "END-OF-DIRECTIVE" in master_text)
    check("v17_exists", v17.is_file())
    check("v17_bytes", v17.stat().st_size == 66_416, v17.stat().st_size)
    check("v17_sha", sha(v17) == "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05", sha(v17))
    check("ledger_exists", ledger.is_file())
    ledger_text = ledger.read_text(encoding="utf-8")
    check("ledger_p93", "P93R1" in ledger_text)
    check("ledger_zero_final", "Customer FINAL: 0/20" in ledger_text)
    check("ledger_pdf_final", "Audit FINAL PDF: 0/3" in ledger_text)
    check("ledger_rights", "Rights: 2/203 inherited only" in ledger_text)
    check("ledger_no_go", "NO_GO / STOP_SELL" in ledger_text)
    check("ledger_package_hash", package["final"]["sha256"] in ledger_text)
    check("ledger_canonical_alias", "ambiguous aliases can no longer mix histories" in ledger_text)
    check("source_exists", source.is_file())
    check("source_bytes", source.stat().st_size == package["final"]["bytes"], source.stat().st_size)
    check("source_sha", sha(source) == package["final"]["sha256"], sha(source))
    with zipfile.ZipFile(source) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        names_set = set(names)
        check("zip_entries", len(infos) == package["final"]["entryCount"], len(infos))
        check("zip_crc", archive.testzip() is None)
        check("zip_sorted", names == sorted(names))
        check("zip_no_dirs", not any(info.is_dir() or info.filename.endswith("/") for info in infos))
        check("zip_timestamp", all(info.date_time == (1980, 1, 1, 0, 0, 0) for info in infos))
        check("zip_create_system", all(info.create_system == 0 for info in infos))
        check("zip_master", master.name in names_set)
        check("zip_v17", v17.name in names_set)
        check("zip_no_ledger", ledger.name not in names_set)
        check("zip_identity", "artifacts/closure/p93r1/P93R1_TREE_IDENTITY_EXCLUDING_SELF.json" in names_set)
        check("zip_checkpoint", "artifacts/closure/p93r1/P93R1_CHECKPOINT_RECEIPT.json" in names_set)
        check("zip_boundary", "artifacts/closure/p93r1/P93R1_RISK_HISTORY_CANONICAL_PUBLIC_BOUNDARY.json" in names_set)
        check("zip_failure", "artifacts/closure/p93r1/P93R1_FAILURE_ADJUDICATION.json" in names_set)
        check("zip_product_contract", "lib/market-integrity/risk-history-contract.ts" in names_set)
        check("zip_shared_reader", "lib/market-integrity/risk-ledger.ts" in names_set)
        check("zip_public_route", "lib/server/market-integrity-route-modules/history.ts" in names_set)
        check("zip_migration", "supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql" in names_set)
        check("zip_active_pass", archive.read("VELMERE_ACTIVE_PASS.txt").decode("utf-8").strip() == "P93R1")
    check("package_status", package["status"] == "PASS")
    check("deterministic_2_2", package["deterministicRebuild"] == "2/2 BYTE_IDENTICAL")
    check("secret_scan", package["privateKeySecretScan"]["matches"] == 0)
    check("binary_scan", package["unexpectedCurrentBinaryScan"]["matches"] == 0)
    check("manifest_exact", package["packageContentManifest"]["verifiedExact"] is True)
    check("clean_unpack", package["final"]["cleanUnpack"] == "PASS_PATH_AND_CONTENT_IDENTITY")
    payload = {
        "schemaVersion": "velmere.p93r1.final-four-file-verification.v1",
        "status": "PASS",
        "checks": {"total": len(checks), "passed": len(checks), "failed": 0, "rows": checks},
        "files": {
            "master": {"path": str(master), "bytes": master.stat().st_size, "sha256": sha(master)},
            "v17": {"path": str(v17), "bytes": v17.stat().st_size, "sha256": sha(v17)},
            "ledger": {"path": str(ledger), "bytes": ledger.stat().st_size, "sha256": sha(ledger)},
            "sourceOnly": {"path": str(source), "bytes": source.stat().st_size, "sha256": sha(source), "entries": package["final"]["entryCount"]},
        },
        "truthBoundary": "Four-file handoff identity and package integrity only. It grants no PostgreSQL, deployed HTTP, Browser, exact-Windows, Risk Indicator FINAL or Customer FINAL credit.",
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": payload["status"], "passed": payload["checks"]["passed"], "total": payload["checks"]["total"], "files": payload["files"]}, indent=2))


if __name__ == "__main__":
    main()
