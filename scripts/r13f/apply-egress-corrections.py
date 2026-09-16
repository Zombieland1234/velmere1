from pathlib import Path
import hashlib,json
root=Path.cwd()
expected={
 'lib/server/market-integrity-route-modules/search.ts':'0fb75889f5d6b2774c2ccda5b3659504a7eb29e4e5bb6618f673f02cd4f9357c',
 'lib/server/market-integrity-route-modules/market-intelligence.ts':'0c69768a0ad2930b783d02f97498d10bd413300f9679fb307db930f2f1ef7363',
 'scripts/r13f/qualify.py':'6a6cdc67d4fd63b9a9c2ff9f84333b40addb934815d3204782f13930fdebea5c',
 'scripts/r13f/http-contract.mjs':'d34941da2cc008d7c33d0032d3c6b032ce0a95f6a7f8709ece2f1c3ef9a3c5cf',
}
for p,h in expected.items():assert hashlib.sha256((root/p).read_bytes()).hexdigest()==h,'Unexpected bytes: '+p
changes={}
def save(p,s):
 old=(root/p).read_bytes();new=s.encode()
 changes[p]={'beforeSha256':hashlib.sha256(old).hexdigest(),'afterSha256':hashlib.sha256(new).hexdigest()}
 (root/p).write_bytes(new)
p='lib/server/market-integrity-route-modules/search.ts';s=(root/p).read_text()
s=s.replace('import { publicApiError } from "@/lib/security/api-error-envelope";\n','')
a=s.index('  const url = new URL(request.url);');b=s.index('    return securityJson(toShieldBasicCustomerSafeWithheld("search"), { status: 503 });',a)
s=s[:a]+'''  if (!rightsPreflight.customerDeliveryAllowed || !rightsPreflight.providerNetworkAllowed) {
'''+s[b:]
a=s.index('    if (isReferenceDelivery) {');b=s.index('    const projected = projectShieldBasicCustomerDelivery',a);s=s[:a]+s[b:]
s=s.replace('  } catch (error) {','  } catch {');save(p,s)
p='lib/server/market-integrity-route-modules/market-intelligence.ts';s=(root/p).read_text()
a=s.index('  const isDevOrLive = ');b=s.index('  const customerOwnedEvidenceMode',a);s=s[:a]+s[b:]
s=s.replace('const deliveryPreflight = (customerOwnedEvidenceMode || isProAuthorized)','const deliveryPreflight = customerOwnedEvidenceMode')
s=s.replace('    && !isProAuthorized\n','')
s=s.replace('    const isPro = isProAuthorized;\n','')
a=s.index('      : isPro\n');b=s.index('      : {\n          schemaVersion:',a+10);s=s[:a]+s[b:]
s=s.replace('    if (selectedDepth !== "basic" && !isPro) {','    if (selectedDepth !== "basic" && !publication.scorePublished) {')
s=s.replace('    if (customerOwnedAuthorization || isProAuthorized) {','    if (customerOwnedAuthorization) {');save(p,s)
p='scripts/r13f/qualify.py';s=(root/p).read_text()
s=s.replace('import subprocess, os, json, time, signal, urllib.request','import subprocess, os, json, time, signal, urllib.request, tempfile, shutil')
s=s.replace(" with (out/(name+'.log')).open('w') as log:"," with tempfile.NamedTemporaryFile(mode='w', prefix='velmere-r13f-', suffix='.log', delete=False) as log:")
a=" row={'name':name,'command':command";assert a in s
s=s.replace(a," shutil.copyfile(log.name, out/(name+'.log'))\n os.unlink(log.name)\n"+a)
s=s.replace("run('typescript-all-partitions',['npm','run','typecheck'],timeout=900)","run('typescript-all-partitions',['npm','run','typecheck'],timeout=900)\nts_receipt=Path('artifacts/pass13/PASS13_PARTITIONED_TYPESCRIPT.json')\nif ts_receipt.exists(): shutil.copyfile(ts_receipt, out/'TYPESCRIPT_RECEIPT.json')")
s=s.replace("extra_env={'BASE_URL':'http://127.0.0.1:3000'}","extra_env={'BASE_URL':'http://localhost:3000'}");save(p,s)
p='scripts/r13f/http-contract.mjs';s=(root/p).read_text()
s=s.replace("const base = process.env.BASE_URL || 'http://127.0.0.1:3000';","const base = process.env.BASE_URL || 'http://localhost:3000';");save(p,s)
out=root/'r13f-evidence';out.mkdir(exist_ok=True)
(out/'EGRESS_EDIT_MANIFEST.json').write_text(json.dumps(changes,indent=2)+'\n')
print(json.dumps(changes))
