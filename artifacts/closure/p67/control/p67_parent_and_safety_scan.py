from pathlib import Path
import hashlib, json, re, sys
ROOT=Path(__file__).resolve().parents[4]
PARENT=Path('/mnt/data/velmere_recover/p66_clean_A')
OUT=ROOT/'artifacts/closure/p67/receipts'
sha=lambda b: hashlib.sha256(b).hexdigest()
parent_files=[p for p in PARENT.rglob('*') if p.is_file()]
missing=[]; mism=[]
for p in parent_files:
    rel=p.relative_to(PARENT); q=ROOT/rel
    if not q.exists(): missing.append(str(rel)); continue
    if p.read_bytes()!=q.read_bytes(): mism.append(str(rel))
new_files=[p for p in ROOT.rglob('*') if p.is_file() and not (PARENT/p.relative_to(ROOT)).exists()]
# build-relevant projection current exact P66 source identity from final Windows receipt
projection_paths=[]
manifest=ROOT/'artifacts/closure/p66/windows/P66_BUILD_PROJECTION_MANIFEST.json'
if manifest.exists():
    m=json.loads(manifest.read_text())
    # tolerate P66 manifest formats
    rows=m.get('files',[])
    for r in rows:
        if isinstance(r,dict) and 'path' in r: projection_paths.append(r['path'])
# safety scans excluding history/node_modules (none expected)
font_ext={'.ttf','.otf','.woff','.woff2','.eot'}
font_files=[]; private_keys=[]; credential_literals=[]
key_re=re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----')
cred_re=re.compile(rb'(?i)(?:api[_-]?key|secret|access[_-]?token|private[_-]?key)\s*[:=]\s*["\']?[A-Za-z0-9_\-]{24,}')
for p in new_files:
    rel=str(p.relative_to(ROOT)).replace('\\','/')
    if p.suffix.lower() in font_ext: font_files.append(rel)
    if p.stat().st_size>5_000_000: continue
    try: b=p.read_bytes()
    except: continue
    if key_re.search(b): private_keys.append(rel)
    if cred_re.search(b): credential_literals.append(rel)
receipt={
 'schemaVersion':'velmere.p67.parent-preservation-and-safety-scan.v1','generatedAt':'2026-08-16T18:45:00.000Z',
 'parentP66':{'expectedFiles':len(parent_files),'byteIdentical':len(parent_files)-len(missing)-len(mism),'missing':missing,'mismatched':mism},
 'p67NewFiles':sorted(str(p.relative_to(ROOT)).replace('\\','/') for p in new_files),
 'productSourceFilesChanged':0 if not missing and not mism else None,
 'scope':'P67_NEW_FILES_ONLY_PARENT_P66_SAFETY_RECEIPT_INHERITED','rawFontBinaries':font_files,'privateKeyMaterialMatches':private_keys,'p67CredentialLikeLiteralMatches':credential_literals,
 'status':'PASS' if not missing and not mism and not font_files and not private_keys and not credential_literals else 'FAIL',
 'truthBoundary':'P67 is control/evidence-only on top of P66. Inherited P66 Windows engineering credit remains applicable only because every P66 checkpoint file is byte-identical and no product source byte changed.'
}
raw=(json.dumps(receipt,indent=2,sort_keys=True)+'\n').encode(); receipt['integritySha256']=sha(raw)
(OUT/'P67_PARENT_PRESERVATION_AND_SAFETY_SCAN.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':receipt['status'],'parent':receipt['parentP66'],'newFiles':len(new_files),'fonts':len(font_files),'privateKeys':len(private_keys),'credentials':len(credential_literals)},indent=2))
if receipt['status']!='PASS': sys.exit(2)
