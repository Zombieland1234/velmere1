from pathlib import Path
import subprocess, tarfile, hashlib, json, zipfile, re

out=Path('r13f-package');out.mkdir(exist_ok=True)
sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
fonts={'.woff','.woff2','.ttf','.otf','.eot','.ttc'}
archives={'.zip','.gz','.tgz','.tar','.7z','.rar','.bundle','.b64'}
proof_roots={'artifacts','reports','audit_artifacts','_velmere','_VELMERE_BACKUP','_VELMERE_BASE_AUTHORITY','VELMERE_WORLD_CLASS_VERIFICATION','evaluation','receipts'}
proof_binary={'.png','.jpg','.jpeg','.webp','.gif','.pdf','.mp4','.bin','.exe','.sst'}
included=[];excluded=[]
proc=subprocess.Popen(['git','archive','--format=tar',sha],stdout=subprocess.PIPE)
with tarfile.open(fileobj=proc.stdout,mode='r|') as archive, zipfile.ZipFile(out/'VELMERE_R13F_WORKING_SOURCE.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for member in archive:
  if member.isdir():continue
  rel=member.name;p=Path(rel);reason=None
  if not member.isfile():
   excluded.append({'path':rel,'reason':'non_regular_file'});continue
  data=archive.extractfile(member).read()
  suffix=p.suffix.lower()
  if suffix in fonts:reason='font_file_not_redistributed'
  elif suffix in archives or re.search(r'\.part[-.]?\d+$',rel):reason='historical_archive_or_transport'
  elif p.name.startswith('.env') and not p.name.endswith(('.example','.template','.sample')):reason='environment_secret_file'
  elif suffix in {'.pem','.key','.p12','.pfx'}:reason='key_material_not_exported'
  elif rel.split('/')[0] in proof_roots and suffix in proof_binary:reason='historical_binary_evidence_not_working_source'
  if data[:4] in (b'wOFF',b'wOF2',b'OTTO',b'ttcf',b'\x00\x01\x00\x00'):reason='font_signature_not_redistributed'
  row={'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
  if reason:excluded.append({**row,'reason':reason})
  else:included.append(row);z.writestr(rel,data)
assert proc.wait()==0
manifest={'schemaVersion':'velmere.r13f.immutable-working-source.v1','sourceCommit':sha,'includedCount':len(included),'excludedCount':len(excluded),'included':included,'excluded':excluded,'scope':'Exact Git commit source bytes, not the test-mutated worktree. No fonts, secret env/key files, nested archives or historical binary proof payloads. Retain your existing fonts/assets when integrating. No Git history or installed dependencies.'}
(out/'SOURCE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
zip_path=out/'VELMERE_R13F_WORKING_SOURCE.zip'
(out/'SOURCE_ZIP_SHA256.txt').write_text(hashlib.sha256(zip_path.read_bytes()).hexdigest()+'  '+zip_path.name+'\n')
print(json.dumps({'sourceCommit':sha,'included':len(included),'excluded':len(excluded),'zipBytes':zip_path.stat().st_size}))
assert zip_path.stat().st_size<500_000_000
