from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

FILES = {
    "authority_evidence": {
        "path": "lib/security/audit-adjudicated-authority-evidence.ts",
        "sha256": "242868a1a746a6d256c01ce6f902929d964b97e42102644517d6e5b0bb042b54",
        "bytes": 19142,
    },
    "report_assembler": {
        "path": "lib/security/audit-report-assembler.ts",
        "sha256": "8ca934e68c0d432479f9faf25d5bcd1f54a157abeab80082bc89d9a6f3b171f0",
        "bytes": 26736,
    },
    "qa_release_matrix": {
        "path": "lib/security/audit-evidence-qa-release-gate-matrix.ts",
        "sha256": "f7723e3daf9d70c881a39008d8f440f3927d541135f42533b384afae54f006fa",
        "bytes": 27154,
    },
}

SIGNALS = {
    "vulnerability": r"vulnerab",
    "exploitability": r"exploitab",
    "severity": r"severity",
    "remediation": r"remediat",
    "retest": r"retest",
    "ground_truth": r"ground.?truth|adjudicat",
    "runtime_bytecode": r"runtime.?bytecode|bytecode",
    "evidence": r"evidence",
    "freshness": r"fresh|stale|ttl",
    "rights": r"rights|licen[cs]e|commercial.?use",
    "customer_final": r"customer.?final|final.?customer",
    "audit_final_pdf": r"audit.?final.?pdf|final.?pdf",
    "immutable_snapshot": r"immutable.?snapshot|snapshot",
    "human_review": r"human.?review|primary_reviewer|operatorFinalSign|mark_ready",
    "fail_closed": r"fail.?closed|blocked|withheld|not_for_sale",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def line_hits(text: str, pattern: str, limit: int = 12) -> list[dict[str, object]]:
    rx = re.compile(pattern, re.IGNORECASE)
    hits: list[dict[str, object]] = []
    for idx, line in enumerate(text.splitlines(), start=1):
        if rx.search(line):
            hits.append({"line": idx, "text": line.strip()[:500]})
            if len(hits) >= limit:
                break
    return hits


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--print-source", action="store_true")
    args = ap.parse_args()

    root = Path(args.source_root)
    result: dict[str, object] = {
        "schemaVersion": "velmere.p78.three-file-exact-source-audit.v1",
        "status": "PASS",
        "parent": {
            "revision": "P77R3/V17",
            "projectionFiles": 1601,
            "projectionBytes": 21037233,
            "projectionAggregateSha256": "354ec7229eb61dd55cccdae90c4a94576967f1c3beb9bad67909d847ccf1e032",
        },
        "files": {},
        "crossFileObservations": [],
        "releaseCredit": {
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
        "truthBoundary": "Diagnostic audit only. Exact-byte inspection does not itself prove vulnerability/exploitability ground truth, Customer FINAL, Audit FINAL PDF, rights, paid value, sale eligibility, LIVE or WORLD_CLASS.",
    }

    for key, spec in FILES.items():
        path = root / str(spec["path"])
        if not path.is_file():
            raise SystemExit(f"missing exact audit file: {spec['path']}")
        data = path.read_bytes()
        observed_sha = sha256(data)
        if observed_sha != spec["sha256"] or len(data) != spec["bytes"]:
            raise SystemExit(
                f"exact byte mismatch {spec['path']}: bytes={len(data)}/{spec['bytes']} sha={observed_sha}/{spec['sha256']}"
            )
        text = data.decode("utf-8")
        signals = {
            name: {
                "count": len(re.findall(pattern, text, flags=re.IGNORECASE)),
                "hits": line_hits(text, pattern),
            }
            for name, pattern in SIGNALS.items()
        }
        exports = [
            {"line": idx, "text": line.strip()[:500]}
            for idx, line in enumerate(text.splitlines(), start=1)
            if re.search(r"\bexport\s+(?:async\s+)?(?:function|const|type|interface|class)\b", line)
        ]
        result["files"][key] = {
            "path": spec["path"],
            "bytes": len(data),
            "sha256": observed_sha,
            "lineCount": len(text.splitlines()),
            "exports": exports,
            "signals": signals,
        }
        print(f"P78 EXACT FILE {key} path={spec['path']} bytes={len(data)} sha256={observed_sha}")
        if args.print_source:
            print(f"===== P78 SOURCE BEGIN {spec['path']} =====")
            for idx, line in enumerate(text.splitlines(), start=1):
                print(f"{idx:05d}: {line}")
            print(f"===== P78 SOURCE END {spec['path']} =====")

    authority = result["files"]["authority_evidence"]["signals"]
    assembler = result["files"]["report_assembler"]["signals"]
    qa = result["files"]["qa_release_matrix"]["signals"]

    observations = result["crossFileObservations"]
    if authority["runtime_bytecode"]["count"] > 0:
        observations.append("Authority layer explicitly models runtime-bytecode state; inspect whether current quorum can be satisfied before exploitability promotion.")
    if authority["exploitability"]["count"] == 0:
        observations.append("Authority file contains no explicit exploitability semantic; deployment identity must not be promoted as exploitability without a separate ground-truth lane.")
    if assembler["remediation"]["count"] == 0 or assembler["retest"]["count"] == 0:
        observations.append("Report assembler does not visibly bind both remediation and retest semantics in this three-file slice; P78 must verify the end-to-end finding→fix→retest chain elsewhere or repair it.")
    if qa["customer_final"]["count"] == 0:
        observations.append("QA release matrix has no literal Customer FINAL marker; P78 must verify that final eligibility is nevertheless derived from deterministic evidence/artifact gates rather than a cosmetic status flag.")
    if qa["human_review"]["count"] > 0:
        observations.append("Legacy human/operator wording remains present in QA matrix; verify it is compatibility/observability only and never eligibility authority.")

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
