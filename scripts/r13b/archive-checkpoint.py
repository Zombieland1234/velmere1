#!/usr/bin/env python3
"""Archive reviewed backend delta only. Not full R12G source; no fonts or secrets."""
import hashlib,json,pathlib,subprocess,zipfile
root=pathlib.Path('.')
paths=['.gitignore','lib/checkout/runtime-payment-authority.ts','lib/stripe/server.ts','app/api/internal/r13/release/route.ts','.github/workflows/r13-infrastructure-probe.yml','.github/workflows/r13b-security-checkpoint.yml','supabase/migrations/20260916010416_r13b_restrict_finalizer_and_pin_methodology_search_path.sql']
for directory in ('scripts/r13','scripts/r13b','docs/r13','docs/r13b','supabase/functions/r13-entitlement-boundary-preview','supabase/functions/velmere-product-entitlement-bridge'):
 paths.extend(p.as_posix() for p in pathlib.Path(directory).rglob('*') if p.is_file())
rows=[]
with zipfile.ZipFile('r13b-backend-sources.zip','x',compression=zipfile.ZIP_DEFLATED) as z:
 for path in sorted(set(paths)):
  p=root/path
  if p.is_symlink() or not p.is_file() or p.suffix.lower() in ('.woff','.woff2','.ttf','.otf'):raise RuntimeError('invalid source entry')
  content=p.read_bytes();z.writestr(path,content);rows.append({'path':path,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content)})
pathlib.Path('r13b-backend-manifest.json').write_text(json.dumps({'sourceSha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'backend_delta_not_full_R12G','files':rows},indent=2)+'\n')
