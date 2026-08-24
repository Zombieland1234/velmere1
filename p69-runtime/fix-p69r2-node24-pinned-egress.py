from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PATH = "lib/network/safe-egress.ts"
BEFORE_BYTES = 21591
BEFORE_SHA256 = "032123359552bac43fae900ca719f19cce4301790ba5aef8a79fe5b4424fe93b"
AFTER_BYTES = 21775
AFTER_SHA256 = "e51547802dfcdb1724ce0f63e355808204337eeb8dd5235865af6eda91ee5752"

OLD_IMPORT = 'import { request as httpsRequest } from "node:https";'
NEW_IMPORT = 'import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from "node:https";'
OLD_REQUEST = '''    const request = httpsRequest({
      protocol: "https:",
      hostname: target.url.hostname,
      servername: target.url.hostname,
      port: 443,
      path: `${target.url.pathname}${target.url.search}`,
      method,
      headers: Object.fromEntries(headers.entries()),
      rejectUnauthorized: true,
      lookup: pinnedLookup,
    }, (incoming) => {'''
NEW_REQUEST = '''    const pinnedRequestOptions: HttpsRequestOptions & { autoSelectFamily?: boolean } = {
      protocol: "https:",
      hostname: target.url.hostname,
      servername: target.url.hostname,
      port: 443,
      path: `${target.url.pathname}${target.url.search}`,
      method,
      headers: Object.fromEntries(headers.entries()),
      rejectUnauthorized: true,
      autoSelectFamily: false,
      lookup: pinnedLookup,
    };
    const request = httpsRequest(pinnedRequestOptions, (incoming) => {'''

INPUT_FILE_COUNT = 1597
INPUT_PAYLOAD_BYTES = 20972925
INPUT_PATHSET_SHA256 = "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73"
INPUT_AGGREGATE_SHA256 = "5454819675a912e9791e143d48d61385622e1ab3f494253ea28c6a9a10895d71"
OUTPUT_FILE_COUNT = 1597
OUTPUT_PAYLOAD_BYTES = 20973109
OUTPUT_PATHSET_SHA256 = INPUT_PATHSET_SHA256
OUTPUT_AGGREGATE_SHA256 = "e0b5f045c7c20f87c0704b6c8fff8be70655ec98e69c5cf2f4f588207b0bab6f"


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
manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
projection = manifest.get("projection", {})
expected_input = {
    "fileCount": INPUT_FILE_COUNT,
    "payloadBytes": INPUT_PAYLOAD_BYTES,
    "pathSetSha256": INPUT_PATHSET_SHA256,
    "sourceContentAggregateSha256": INPUT_AGGREGATE_SHA256,
}
for key, value in expected_input.items():
    if projection.get(key) != value:
        raise SystemExit(f"P69R2 input projection mismatch: {key}={projection.get(key)!r} expected={value!r}")

source_path = source_root / PATH
before = source_path.read_bytes()
if len(before) != BEFORE_BYTES or sha256_bytes(before) != BEFORE_SHA256:
    raise SystemExit(f"safe-egress preimage mismatch: {len(before)} {sha256_bytes(before)}")
text = before.decode("utf-8")
if text.count(OLD_IMPORT) != 1 or text.count(OLD_REQUEST) != 1:
    raise SystemExit(f"safe-egress repair preimage mismatch import={text.count(OLD_IMPORT)} request={text.count(OLD_REQUEST)}")
text = text.replace(OLD_IMPORT, NEW_IMPORT, 1).replace(OLD_REQUEST, NEW_REQUEST, 1)
after = text.encode("utf-8")
if len(after) != AFTER_BYTES or sha256_bytes(after) != AFTER_SHA256:
    raise SystemExit(f"safe-egress repaired identity mismatch: {len(after)} {sha256_bytes(after)}")
source_path.write_bytes(after)

rows = manifest.get("files")
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
    raise SystemExit(f"P69R2 aggregate mismatch: payload={payload} agg={agg}")
manifest["projection"]["fileCount"] = OUTPUT_FILE_COUNT
manifest["projection"]["payloadBytes"] = OUTPUT_PAYLOAD_BYTES
manifest["projection"]["pathSetSha256"] = OUTPUT_PATHSET_SHA256
manifest["projection"]["sourceContentAggregateSha256"] = OUTPUT_AGGREGATE_SHA256
manifest["p69r2Node24PinnedEgressRepair"] = {
    "status": "PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR",
    "path": PATH,
    "beforeBytes": BEFORE_BYTES,
    "beforeSha256": BEFORE_SHA256,
    "afterBytes": AFTER_BYTES,
    "afterSha256": AFTER_SHA256,
    "repair": "Use a typed HTTPS RequestOptions variable carrying autoSelectFamily:false for the already DNS-pinned single-address request. This avoids Node24 multi-address lookup mode while remaining compatible with the repository's current Node type declarations.",
    "failedAttemptAdjudication": "P69R1 direct object-literal autoSelectFamily:false repair was runtime-correct in intent but failed semantic TypeScript because the pinned @types/node RequestOptions did not declare that property. It receives zero engineering/product promotion.",
    "securityBoundary": "DNS resolution, public-address validation, TLS hostname verification, redirect validation, allow-listing and the pinned lookup remain active. No SSRF guard is relaxed.",
    "customerFinalOutputCredit": 0,
    "rightsCredit": 0,
    "saleCredit": 0,
    "live": False,
}
manifest["truthBoundary"] = (
    "P69R2 carries the P69 ECB reference-rate lane plus the TypeScript-valid Node24 pinned-egress compatibility repair. "
    "Exact Windows engineering and current public-network route/source/rights evidence remain separate gates; no final customer, paid-value, sale, LIVE or WORLD_CLASS credit is granted by this source patch alone."
)
Path(args.output_manifest).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
receipt = {
    "schemaVersion": "velmere.p69r2.node24-pinned-egress-repair.v1",
    "status": "PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR_NO_PROMOTION",
    "changedFile": {"path": PATH, "beforeBytes": BEFORE_BYTES, "beforeSha256": BEFORE_SHA256, "afterBytes": AFTER_BYTES, "afterSha256": AFTER_SHA256},
    "inputProjection": expected_input,
    "outputProjection": {"fileCount": OUTPUT_FILE_COUNT, "payloadBytes": OUTPUT_PAYLOAD_BYTES, "pathSetSha256": OUTPUT_PATHSET_SHA256, "sourceContentAggregateSha256": OUTPUT_AGGREGATE_SHA256},
    "rootCause": "Node24 automatic address-family selection is incompatible with the intentionally single-address custom pinned lookup path and produced Invalid IP address: undefined, while direct ECB HTTPS was reachable.",
    "repair": "typed HttpsRequestOptions intersection variable + autoSelectFamily:false",
    "p69r1FailedAttempt": "WITHHELD_TYPESCRIPT_SEMANTIC_FAILURE",
    "securityBoundary": "No DNS pinning, public-IP validation, redirect, TLS, allow-list or host-policy control was removed or weakened.",
    "customerFinalOutputCredit": 0,
    "rightsCredit": 0,
    "saleCredit": 0,
    "live": False,
}
Path(args.receipt).parent.mkdir(parents=True, exist_ok=True)
Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
