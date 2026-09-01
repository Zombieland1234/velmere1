#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib

REV = "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT"
OUT_REL = "config/pass36/a94r2-change-set-summary.json"
DESC_REL = "config/pass36/a94r2-current-root-descendant-manifest.json"
PKG_REL = "_velmere/PASS36_A94R2_SOURCE_ONLY_MANIFEST.json"
IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log"

def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()

def excluded(rel: str) -> bool:
    if rel in {OUT_REL, DESC_REL, PKG_REL}: return True
    top = rel.split('/', 1)[0]
    if top in {'.git','.velmere','.next','.turbo','_velmere','artifacts','coverage','node_modules','dist','out','.cache','cache'} or top.startswith('.next-'):
        return True
    segments = rel.split('/')
    base = rel.rsplit('/',1)[-1]
    if '__pycache__' in segments or base.endswith('.pyc'): return True
    if base == '.env' or base.startswith('.env.'): return True
    if base == '.eslintcache' or base.endswith('.tsbuildinfo'): return True
    if base.endswith('.log') and rel != IMMUTABLE_LOG: return True
    if base.endswith(('.db','.sqlite','.sqlite3')): return True
    return False

def collect(root: pathlib.Path):
    rows = {}
    for p in root.rglob('*'):
        rel = p.relative_to(root).as_posix()
        if p.is_symlink():
            raise RuntimeError(f"symlink_forbidden:{rel}")
        if p.is_dir() or excluded(rel): continue
        if not p.is_file(): raise RuntimeError(f"special_file_forbidden:{rel}")
        data = p.read_bytes()
        rows[rel] = {'byteLength': len(data), 'sha256': sha(data), 'mode': 0o100755 if os.stat(p).st_mode & 0o111 else 0o100644}
    return rows

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--baseline', required=True); ap.add_argument('--current', required=True); args=ap.parse_args()
    baseline_root=pathlib.Path(args.baseline).resolve(); current_root=pathlib.Path(args.current).resolve()
    before=collect(baseline_root); after=collect(current_root)
    before_paths=set(before); after_paths=set(after)
    added=sorted(after_paths-before_paths); deleted=sorted(before_paths-after_paths)
    modified=sorted(p for p in before_paths & after_paths if before[p] != after[p])
    unchanged=len(before_paths & after_paths)-len(modified)
    core={
      'schemaVersion':'velmere.pass36.a94r2.change-set-summary.v1',
      'revisionId':REV,
      'parentRevisionId':'VELMERE_PASS36_A94R1_ACTION_REQUIRED_LOCAL_HARDENING_CHECKPOINT',
      'classification':'LOCAL_CHANGE_SET_NO_PASS_OR_PROMOTION_CREDIT',
      'baselineFiles':len(before),
      'currentFiles':len(after),
      'addedCount':len(added),
      'modifiedCount':len(modified),
      'deletedCount':len(deleted),
      'unchangedCount':unchanged,
      'changedPathsTotal':len(added)+len(modified)+len(deleted),
      'added':added,
      'modified':modified,
      'deleted':deleted,
      'comparisonExclusions':[OUT_REL,DESC_REL,PKG_REL,'.git/','.velmere/','.next*/','node_modules/','artifacts/','mutable logs except exact A42 fixture'],
      'truthBoundary':'This is a byte/hash comparison of the active source trees with declared control-output exclusions. It is not a PASS, exact build, browser, staging, real-data, rights, legal, customer, LIVE or sale proof.',
      'live':False,'saleEnabled':False,'productionApproved':False,'worldClassProven':False,
    }
    payload=json.dumps(core, sort_keys=True, separators=(',',':'), ensure_ascii=False).encode()
    result={**core,'summarySha256':sha(payload)}
    out=current_root/OUT_REL; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    print(json.dumps({'status':'BUILT_A94R2_CHANGE_SET_SUMMARY_NO_PROMOTION','output':OUT_REL,'baselineFiles':len(before),'currentFiles':len(after),'added':len(added),'modified':len(modified),'deleted':len(deleted),'summarySha256':result['summarySha256']}, indent=2))
if __name__=='__main__': main()
