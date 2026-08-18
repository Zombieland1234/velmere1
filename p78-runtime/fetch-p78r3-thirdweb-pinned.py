from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

REPOSITORY = "thirdweb-dev/contracts"
VULNERABLE_COMMIT = "745afa8537dbc577f72bfa75a718a2b781d0379d"
FIXED_COMMIT = "efd2218ff9cbbfe326c33ce661042d7c19c17317"

ROWS = [
    ("vulnerable-Multicall.sol", VULNERABLE_COMMIT, "contracts/extension/Multicall.sol", "d3507b964169c50f878881b1fbafc87b8316616994bc8e85312cab578eff4f81"),
    ("vulnerable-TWFactory.sol", VULNERABLE_COMMIT, "contracts/infra/TWFactory.sol", "d270d7968366c8fec8ed404536778093080c139ad22923cb6915f2e7834f1e8f"),
    ("fixed-Multicall.sol", FIXED_COMMIT, "contracts/extension/Multicall.sol", "78167133f656827b1b76bf6c86456fe917dc7b60d3c27ccd8e4c3169085e5e9c"),
    ("fixed-TWFactory.sol", FIXED_COMMIT, "contracts/infra/TWFactory.sol", "816c1896093f70680f37a0a5c8a4a254cd3794fabf4cfcddfb3ca184e3ce46cf"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    receipt_rows = []
    for name, commit, rel, expected in ROWS:
        url = f"https://raw.githubusercontent.com/{REPOSITORY}/{commit}/{rel}"
        request = urllib.request.Request(url, headers={"User-Agent": "Velmere-P78R3-Pinned-GroundTruth/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
        observed = hashlib.sha256(raw).hexdigest()
        if observed != expected:
            raise SystemExit(f"pinned thirdweb mismatch:{name}:{observed}:{expected}")
        (out / name).write_bytes(raw)
        receipt_rows.append({"name": name, "commit": commit, "repositoryPath": rel, "bytes": len(raw), "sha256": observed})

    receipt = {
        "schemaVersion": "velmere.p78r3.thirdweb-pinned-source-transport.v1",
        "status": "PASS",
        "repository": REPOSITORY,
        "vulnerableCommit": VULNERABLE_COMMIT,
        "fixedCommit": FIXED_COMMIT,
        "files": receipt_rows,
        "creditClass": "PINNED_HISTORICAL_SOURCE_TRANSPORT_ONLY",
        "truthBoundary": "This receipt proves exact historical source retrieval for the pinned vulnerable/fixed pair only. It does not itself prove detector accuracy, deployed reachability, runtime exploitability, customer FINAL or current production risk.",
    }
    receipt_path = Path(args.receipt)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
