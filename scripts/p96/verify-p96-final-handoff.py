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
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

parser = argparse.ArgumentParser()
parser.add_argument("--master", required=True)
parser.add_argument("--v17", required=True)
parser.add_argument("--ledger", required=True)
parser.add_argument("--zip", required=True)
parser.add_argument("--package-verification", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
master, v17, ledger, package = map(Path, [args.master, args.v17, args.ledger, args.zip])
verification = json.loads(Path(args.package_verification).read_text())
checks = []
def check(identifier, condition, detail=None):
    checks.append({"id": identifier, "status": "PASS" if condition else "FAIL", **({} if detail is None else {"detail": detail})})

for identifier, path in (("master_exists", master), ("v17_exists", v17), ("ledger_exists", ledger), ("zip_exists", package)):
    check(identifier, path.is_file())
master_text = master.read_text(encoding="utf-8"); ledger_text = ledger.read_text(encoding="utf-8")
sections = [int(x) for x in re.findall(r"(?m)^# (\d+)\.", master_text)]
check("master_sections_0_88", sections == list(range(89)), len(sections))
check("master_start_now", "START NOW" in master_text)
check("master_end_sentinel", "END-OF-DIRECTIVE" in master_text)
check("master_revision", "V2 R1 — CHECKPOINT IDENTITY UNIQUENESS" in master_text)
check("master_checkpoint_collision_rule", "UNIQUE CHECKPOINT IDENTITY / BRANCH COLLISION" in master_text)
check("master_sha", sha(master) == "45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1", sha(master))
check("v17_sha", sha(v17) == "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05", sha(v17))
check("ledger_p96", "P96R1 / V17" in ledger_text)
check("ledger_sibling_truth", "P95-A" in ledger_text and "P95-B" in ledger_text and "P94" in ledger_text)
check("ledger_no_fake_final", "Customer FINAL: 0/20" in ledger_text and "Global: NO_GO / STOP_SELL" in ledger_text)
check("ledger_stop_local_polishing", "Local-only Risk History polishing stops at P96" in ledger_text)
check("package_verification_pass", verification.get("status") == "PASS")
check("package_name", verification.get("output") == package.name)
check("package_sha", verification["final"]["sha256"] == sha(package), sha(package))
check("package_bytes", verification["final"]["bytes"] == package.stat().st_size, package.stat().st_size)
with zipfile.ZipFile(package) as archive:
    names = archive.namelist(); bad = archive.testzip()
    check("zip_crc", bad is None, bad)
    check("zip_order", names == sorted(names))
    check("zip_no_directories", all(not n.endswith("/") for n in names))
    check("zip_fixed_time", all(i.date_time == (1980,1,1,0,0,0) for i in archive.infolist()))
    check("zip_create_system", all(i.create_system == 0 for i in archive.infolist()))
    check("zip_contains_master_v2r1", master.name in names)
    check("zip_contains_original_master", "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt" in names)
    check("zip_contains_v17", v17.name in names)
    check("zip_contains_p96_checkpoint", "artifacts/closure/p96r1/P96R1_CHECKPOINT_RECEIPT.json" in names)
    check("zip_contains_both_new_modules", "lib/market-integrity/risk-history-current-alignment.ts" in names and "lib/market-integrity/risk-history-customer-request-binding.ts" in names)
    check("zip_contains_frozen_siblings", any(n.startswith("artifacts/frozen-sibling-checkpoints/p95-a/") for n in names) and any(n.startswith("artifacts/frozen-sibling-checkpoints/p95-b/") for n in names))
    check("zip_excludes_external_ledger", ledger.name not in names)
check("ledger_package_name", package.name in ledger_text)
check("ledger_package_sha", sha(package) in ledger_text)
check("ledger_package_bytes", f"Bytes: {package.stat().st_size:,}" in ledger_text)
check("ledger_master_sha", sha(master) in ledger_text)
check("ledger_v17_sha", sha(v17) in ledger_text)
check("four_unique_files", len({master.resolve(), v17.resolve(), ledger.resolve(), package.resolve()}) == 4)
failed = [row for row in checks if row["status"] != "PASS"]
receipt = {"schemaVersion": "velmere.p96r1.final-four-file-verification.v1", "generatedAt": "2026-08-21T05:20:00.000Z", "status": "PASS" if not failed else "FAIL", "checks": {"total": len(checks), "passed": len(checks)-len(failed), "failed": len(failed), "rows": checks}, "files": [{"name": p.name, "bytes": p.stat().st_size, "sha256": sha(p)} for p in (master,v17,ledger,package)], "truthBoundary": "Exact four-file handoff identity and package integrity only; no deployed product or FINAL credit."}
Path(args.output).write_text(json.dumps(receipt, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"], "files": receipt["files"]}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
