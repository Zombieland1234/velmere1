from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
REL='lib/commerce/vlm-current-evidence-availability-matrix.ts'
BEFORE_BYTES=12770;BEFORE_SHA='5e7476289a5c6fc9c3ea28fe96f08f5a025038bcc6d095892ed8fe0abde993d6'
AFTER_BYTES=12774;AFTER_SHA='bb96400560eb229ced1e99573b7cd192d419c184b2dd14b05eeda77516775f92'
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.source_root)/REL;b=p.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P72 support preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode();old='{ product: "shield-pro", policyAdapterFamily: "shield", canonicalFamily: "shield-pro", standaloneProduct: false }';new='{ product: "shield-pro", policyAdapterFamily: "shield-pro", canonicalFamily: "shield-pro", standaloneProduct: false }'
if s.count(old)!=1:raise SystemExit('P72 support anchor mismatch')
out=s.replace(old,new,1).encode()
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA:raise SystemExit(f'P72 support output mismatch:{len(out)}:{sha(out)}')
p.write_bytes(out);r={'schemaVersion':'velmere.p72.supporting-closure-matrix.v1','status':'PASS','path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES,'creditClass':'CLOSURE_MEASUREMENT_SUPPORT_ONLY','truthBoundary':'Shield Pro uses its independent owner-bound policy adapter in closure evidence. This non-build-projection repair grants no engineering, final-output, rights, value, sale or LIVE credit.'};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
