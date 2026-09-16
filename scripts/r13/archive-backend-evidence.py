#!/usr/bin/env python3
"""Archive only the reviewed R13 source delta; no environment or font files."""
import hashlib,json,pathlib,subprocess,zipfile
root=pathlib.Path('.')
paths=['.gitignore','lib/checkout/runtime-payment-authority.ts','lib/stripe/server.ts','app/api/internal/r13/release/route.ts','.github/workflows/r13-infrastructure-probe.yml']
for directory in ('scripts/r13','docs/r13','supabase/functions/r13-entitlement-boundary-preview'):
 paths.extend(p.as_posix() for p in pathlib.Path(directory).rglob('*') if p.is_file())
rows=[]
with zipfile.ZipFile('r13-backend-sources.zip','x',compression=zipfile.ZIP_DEFLATED) as z:
 for path in sorted(set(paths)):
  p=root/path
  if p.is_symlink() or not p.is_file():raise RuntimeError('invalid source entry')
  content=p.read_bytes();z.writestr(path,content);rows.append({'path':path,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content)})
pathlib.Path('r13-backend-manifest.json').write_text(json.dumps({'sourceSha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':rows},indent=2)+'\n')
# Blob identities only: permits a subsequent exact archive-vs-remote reconciliation.
items=[]
for record in subprocess.check_output(['git','ls-files','-s','-z']).split(b'\0'):
 if not record:continue
 meta,path=record.split(b'\t',1);mode,sha,stage=meta.decode().split()
 items.append({'path':path.decode(),'gitBlob':sha,'mode':mode})
pathlib.Path('r13-remote-source-index.json').write_text(json.dumps(items,indent=2)+'\n')
