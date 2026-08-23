from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PATH = "lib/network/safe-egress.ts"
BEFORE_BYTES = 21591
BEFORE_SHA256 = "032123359552bac43fae900ca719f19cce4301790ba5aef8a79fe5b4424fe93b"
AFTER_BYTES = 21622
AFTER_SHA256 = "b2e51f5f218716ba64ccd4bb6ec812731b8778d96bdf82deb063b3d8730ee939"
OLD_LINE = "      rejectUnauthorized: true,\n      lookup: pinnedLookup,\n"
NEW_LINE = "      rejectUnauthorized: true,\n      autoSelectFamily: false,\n      lookup: pinnedLookup,\n"

INPUT_FILE_COUNT = 1597
INPUT_PAYLOAD_BYTES = 20972925
INPUT_PATHSET_SHA256 = "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73"
INPUT_AGGREGATE_SHA256 = "5454819675a912e9791e143d48d61385622e1ab3f494253ea28c6a9a10895d71"

OUTPUT_FILE_COUNT = 1597
OUTPUT_PAYLOAD_BYTES = 20972956
OUTPUT_PATHSET_SHA256 = INPUT_PATHSET_SHA256
OUTPUT_AGGREGATE_SHA256 = "ace1ec8b7e836d20098e20510b00eeaada8ed8636557fcb4da907990070dbf08"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def aggregate(files: list[dict]) -> tuple[int, str]:
    h = hashlib.sha256()
    total = 0
    for row in files:
        total += int(row["byteLength"])
        h.update(f'{row["path"]}\0{row["byteLength"]}\0{row["sha256"]}\n'.encode("utf-8"))
    return total, h.hexdigest()


ap = argparse.ArgumentParser()
ap.add_argument("--source-root", required=True)
ap.add_argument("--manifest", required=True)
ap.add_argument("--output-manifest", required=True)
ap.add_argument("--receipt", required=True)
args = ap.parse_args()

source_root = Path(args.source_root)
manifest_path = Path(args.manifest)
out_manifest_path = Path(args.output_manifest)
receipt_path = Path(args.receipt)

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
projection = manifest.get("projection", {})
expected_input = {
    "fileCount": INPUT_FILE_COUNT,
    "payloadBytes": INPUT_PAYLOAD_BYTES,
    "pathSetSha256": INPUT_PATHSET_SHA256,
    "sourceContentAggregateSha256": INPUT_AGGREGATE_SHA256,
}
for key, value in expected_input.items():
    if projection.get(key) != value:
        raise SystemExit(f"P69R1 input projection mismatch: {key}={projection.get(key)!r} expected={value!r}")

source_path = source_root / PATH
before = source_path.read_bytes()
if len(before) != BEFORE_BYTES or sha256_bytes(before) != BEFORE_SHA256:
    raise SystemExit(f"safe-egress preimage mismatch: {len(before)} {sha256_bytes(before)}")
text = before.decode("utf-8")
if text.count(OLD_LINE) != 1:
    raise SystemExit(f"safe-egress Node24 insertion preimage count mismatch: {text.count(OLD_LINE)}")
if "autoSelectFamily: false" in text:
    raise SystemExit("safe-egress already contains autoSelectFamily:false")
text = text.replace(OLD_LINE, NEW_LINE, 1)
after = text.encode("utf-8")
if len(after) != AFTER_BYTES or sha256_bytes(after) != AFTER_SHA256:
    raise SystemExit(f"safe-egress repaired identity mismatch: {len(after)} {sha256_bytes(after)}")
source_path.write_bytes(after)

rows = manifest.get("files")
if not isinstance(rows, list):
    raise SystemExit("manifest files missing")
matching = [row for row in rows if row.get("path") == PATH]
if len(matching) != 1:
    raise SystemExit(f"safe-egress manifest row count mismatch: {len(matching)}")
row = matching[0]
if row.get("byteLength") != BEFORE_BYTES or row.get("sha256") != BEFORE_SHA256:
    raise SystemExit("safe-egress manifest preimage mismatch")
row["byteLength"] = AFTER_BYTES
row["sha256"] = AFTER_SHA256

payload, agg = aggregate(rows)
if payload != OUTPUT_PAYLOAD_BYTES or agg != OUTPUT_AGGREGATE_SHA256:
    raise SystemExit(f"P69R1 aggregate mismatch: payload={payload} agg={agg}")
manifest["projection"]["fileCount"] = OUTPUT_FILE_COUNT
manifest["projection"]["payloadBytes"] = OUTPUT_PAYLOAD_BYTES
manifest["projection"]["pathSetSha256"] = OUTPUT_PATHSET_SHA256
manifest["projection"]["sourceContentAggregateSha256"] = OUTPUT_AGGREGATE_SHA256
manifest["p69r1Node24PinnedEgressRepair"] = {
    "status": "PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR",
    "path": PATH,
    "beforeBytes": BEFORE_BYTES,
    "beforeSha256": BEFORE_SHA256,
    "afterBytes": AFTER_BYTES,
    "afterSha256": AFTER_SHA256,
    "repair": "Disable Node24 automatic address-family selection for the already DNS-pinned single-address HTTPS request so the pinned lookup remains a single-address lookup contract.",
    "securityBoundary": "DNS resolution, public-address validation, TLS hostname verification, redirect validation and the pinned lookup remain active. This repair does not relax SSRF or host allow-list controls.",
    "customerFinalOutputCredit": 0,
    "rightsCredit": 0,
    "saleCredit": 0,
    "live": False,
}
manifest["truthBoundary"] = (
    "P69R1 carries the P69 ECB reference-rate lane plus a one-file Node24 pinned-egress compatibility repair. "
    "Exact Windows engineering and current public-network route/source/rights evidence are required separately; no customer-final, paid-value, sale, LIVE or WORLD_CLASS credit is granted by this patch alone."
)
out_manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

receipt = {
    "schemaVersion": "velmere.p69r1.node24-pinned-egress-repair.v1",
    "status": "PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR_NO_PROMOTION",
    "changedFile": {
        "path": PATH,
        "beforeBytes": BEFORE_BYTES,
        "beforeSha256": BEFORE_SHA256,
        "afterBytes": AFTER_BYTES,
        "afterSha256": AFTER_SHA256,
    },
    "inputProjection": expected_input,
    "outputProjection": {
        "fileCount": OUTPUT_FILE_COUNT,
        "payloadBytes": OUTPUT_PAYLOAD_BYTES,
        "pathSetSha256": OUTPUT_PATHSET_SHA256,
        "sourceContentAggregateSha256": OUTPUT_AGGREGATE_SHA256,
    },
    "diagnosedFailure": "Node24 pinned custom lookup reached automatic address-family selection and produced Invalid IP address: undefined even though direct ECB fetch succeeded.",
    "repair": "autoSelectFamily:false on the pinned https.request options",
    "securityBoundary": "No public/private-IP validation, DNS pinning, redirect, TLS or host-policy guard was removed or weakened.",
    "customerFinalOutputCredit": 0,
    "rightsCredit": 0,
    "saleCredit": 0,
    "live": False,
}
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
