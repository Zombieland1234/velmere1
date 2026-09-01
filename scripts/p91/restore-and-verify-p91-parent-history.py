#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
P91_PREFIXES=("receipts/p91/","artifacts/p91/","artifacts/closure/p91r1/")
def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def aggregate(rows:list[dict])->str:
    h=hashlib.sha256()
    for row in rows:
        h.update(row["path"].encode());h.update(b"\0");h.update(row["sha256"].encode());h.update(b"\n")
    return h.hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--parent-zip",required=True);ap.add_argument("--restore",action="store_true")
    args=ap.parse_args(); parent=Path(args.parent_zip)
    parent_sha=sha(parent.read_bytes())
    restored=[]; mismatches=[]; missing=[]
    expected=set(); rows=[]
    with zipfile.ZipFile(parent) as z:
        infos=[i for i in z.infolist() if not i.is_dir() and i.filename.startswith(("receipts/","artifacts/"))]
        for info in infos:
            expected.add(info.filename); data=z.read(info); expected_sha=sha(data); target=ROOT/info.filename
            actual_sha=sha(target.read_bytes()) if target.exists() else None
            if actual_sha!=expected_sha:
                if not target.exists(): missing.append(info.filename)
                else: mismatches.append({"path":info.filename,"expected":expected_sha,"actual":actual_sha})
                if args.restore:
                    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);restored.append(info.filename);actual_sha=expected_sha
            rows.append({"path":info.filename,"bytes":len(data),"sha256":expected_sha})
    unexpected=[]
    for base in (ROOT/"receipts",ROOT/"artifacts"):
        if not base.exists():continue
        for target in base.rglob("*"):
            if not target.is_file():continue
            rel=target.relative_to(ROOT).as_posix()
            if rel in expected or rel.startswith(P91_PREFIXES):continue
            unexpected.append(rel)
    post=[]
    for row in rows:
        target=ROOT/row["path"]
        if not target.exists() or sha(target.read_bytes())!=row["sha256"]:post.append(row["path"])
    receipt={
      "schemaVersion":"velmere.p91.parent-history-immutability.v1",
      "generatedAt":"2026-08-20T19:05:00.000Z",
      "status":"PASS_BYTE_IDENTICAL" if not post and not unexpected else "FAIL",
      "parent":{"zipName":parent.name,"zipSha256":parent_sha,"historyFiles":len(rows),"historyAggregateSha256":aggregate(rows)},
      "preRestore":{"mismatchedFiles":len(mismatches),"missingFiles":len(missing)},
      "restoration":{"enabled":args.restore,"restoredFiles":len(restored)},
      "postRestore":{"differences":len(post),"unexpectedHistoricalFiles":len(unexpected)},
      "details":{"restored":restored,"postDifferences":post,"unexpectedHistoricalFiles":unexpected},
      "truthBoundary":"Only parent receipts and artifacts are checked against the canonical P90 SOURCE_ONLY. Explicit P91 receipts/artifacts are excluded as current additions; source-code changes are verified separately by the source-delta manifest.",
    }
    for target in [ROOT/'receipts/p91/P91_PARENT_HISTORY_IMMUTABILITY.json',ROOT/'artifacts/p91/P91_PARENT_HISTORY_IMMUTABILITY.json']:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({k:receipt[k] for k in ("status","parent","preRestore","restoration","postRestore")},indent=2))
    raise SystemExit(0 if receipt["status"]=="PASS_BYTE_IDENTICAL" else 1)
if __name__=="__main__":main()
