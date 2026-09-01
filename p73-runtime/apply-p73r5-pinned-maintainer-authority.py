from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

REL='lib/security/audit-adjudicated-authority-evidence.ts'
BASE_COUNT=1598
BASE_PAYLOAD=21015520
BASE_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'
BASE_AGG='d0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377'
BEFORE_BYTES=19749
BEFORE_SHA='0d9ad2b771ad4d19c61853ed5d5562f54c2549b07493690f28edc5383aff6521'
PINNED_COMMIT='b667d67ecfa5361a81e8f110234ce242613b0012'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def replace_once(s:str,old:str,new:str,label:str)->str:
    n=s.count(old)
    if n!=1: raise SystemExit(f'P73R5 anchor mismatch:{label}:{n}')
    return s.replace(old,new,1)
def identity(rows):
    ordered=sorted(rows,key=lambda r:r['path']);payload=sum(int(r['byteLength']) for r in ordered)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in ordered).encode()).hexdigest();h=hashlib.sha256()
    for r in ordered:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(ordered),payload,pathset,h.hexdigest(),ordered

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m['projection']
observed=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if observed!=(BASE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit(f'P73R5 parent identity mismatch:{observed}')
rows={r['path']:dict(r) for r in m['files']};f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R5 source preimage mismatch:{len(b)}:{sha(b)}')
row=rows.get(REL)
if not row or int(row['byteLength'])!=BEFORE_BYTES or row['sha256']!=BEFORE_SHA:raise SystemExit('P73R5 manifest preimage mismatch')
s=b.decode('utf-8')

s=replace_once(s,
'    maintainerAuthorityUrl: "https://api.github.com/repos/mds1/multicall3/issues/comments/2495504312",',
f'    maintainerAuthorityUrl: "https://raw.githubusercontent.com/mds1/multicall3/{PINNED_COMMIT}/README.md",',
'maintainer-url')

s=replace_once(s,
'''function sourceRepoFromGithubApiUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "api.github.com") return null;
  const match = parsed.pathname.match(/^\\/repos\\/([^/]+)\\/([^/]+)\\/issues\\/comments\\/\\d+$/);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}''',
'''function pinnedRawGithubSource(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "raw.githubusercontent.com") return null;
  const match = parsed.pathname.match(/^\\/([^/]+)\\/([^/]+)\\/([a-fA-F0-9]{40})\\/README\\.md$/);
  return match ? { repo: `${match[1]}/${match[2]}`.toLowerCase(), commit: match[3]!.toLowerCase() } : null;
}''',
'raw-url-parser')

s=replace_once(s,
'    if (sourceRepoFromGithubApiUrl(maintainerUrl) !== reference.sourceRepo.toLowerCase()) throw new Error("project_maintainer_repository_mismatch");',
'''    const pinnedMaintainer = pinnedRawGithubSource(maintainerUrl);
    if (!pinnedMaintainer || pinnedMaintainer.repo !== reference.sourceRepo.toLowerCase() || pinnedMaintainer.commit !== reference.sourceCommit.toLowerCase()) throw new Error("project_maintainer_repository_or_commit_mismatch");''',
'pinned-repo-commit-guard')

s=replace_once(s,
'      fetchAuthority(maintainerUrl, "audit_authority_project_maintainer", ["api.github.com"]),',
'      fetchAuthority(maintainerUrl, "audit_authority_project_maintainer", ["raw.githubusercontent.com"]),',
'raw-host-allowlist')

old_parse='''    let maintainerJson: Record<string, unknown>;
    try { maintainerJson = JSON.parse(maintainer.text) as Record<string, unknown>; }
    catch { throw new Error("maintainer_json_invalid"); }
    const user = maintainerJson.user && typeof maintainerJson.user === "object" && !Array.isArray(maintainerJson.user) ? maintainerJson.user as Record<string, unknown> : {};
    const body = String(maintainerJson.body ?? "");
    const bodyLower = body.toLowerCase();
    const authorAssociation = String(maintainerJson.author_association ?? "").toUpperCase();
    const maintainerBound = authorAssociation === "OWNER"
      && String(user.login ?? "").trim().length > 0
      && bodyLower.includes(reference.projectName.toLowerCase())
      && bodyLower.includes(chain)
      && bodyLower.includes(contractAddress)
      && /compromis(?:ed|e)|different contract|wrong contract/.test(bodyLower)
      && /cannot be deployed|can not be deployed|unable to deploy|regular multicall3/.test(bodyLower);
    if (!maintainerBound) throw new Error("project_maintainer_adverse_statement_not_bound");'''
new_parse='''    const maintainerLower = maintainer.text.toLowerCase();
    const maintainerBound = maintainerLower.includes(reference.projectName.toLowerCase())
      && maintainerLower.includes(chain)
      && maintainerLower.includes(contractAddress)
      && maintainerLower.includes("has been compromised")
      && (maintainerLower.includes("custom contract being deployed to the multicall3 address on ancient8")
        || maintainerLower.includes("only the ancient8 deployment is known to be incorrect"));
    if (!maintainerBound) throw new Error("project_maintainer_pinned_readme_adverse_statement_not_bound");'''
s=replace_once(s,old_parse,new_parse,'maintainer-parser')

old_ts='''    const sourceTimestamp = typeof maintainerJson.updated_at === "string" && Number.isFinite(Date.parse(maintainerJson.updated_at))
      ? new Date(Date.parse(maintainerJson.updated_at)).toISOString()
      : typeof maintainerJson.created_at === "string" && Number.isFinite(Date.parse(maintainerJson.created_at))
        ? new Date(Date.parse(maintainerJson.created_at)).toISOString()
        : maintainer.sourceTimestamp;'''
s=replace_once(s,old_ts,'    const sourceTimestamp = maintainer.sourceTimestamp;','maintainer-timestamp')

s=replace_once(s,
'''      providerId: `github-owner:${reference.sourceRepo}`,
      providerFamily: "project_maintainer_authority",
      upstreamRoot: "api.github.com",''',
'''      providerId: `github-pinned-readme:${reference.sourceRepo}@${reference.sourceCommit}`,
      providerFamily: "project_maintainer_repository_authority",
      upstreamRoot: "raw.githubusercontent.com",''',
'maintainer-receipt-root')

s=replace_once(s,
'''        `repository:${reference.sourceRepo}`,
        `author_association:${authorAssociation}`,
        `project:${reference.projectName}`,''',
'''        `repository:${reference.sourceRepo}`,
        `source_commit:${reference.sourceCommit}`,
        `project:${reference.projectName}`,''',
'maintainer-assertions')

out=s.encode('utf-8');f.write_bytes(out);after_sha=sha(out)
row['byteLength']=len(out);row['sha256']=after_sha;rows[REL]=row
ident=identity(list(rows.values()));m['files']=ident[4]
m['projection']['fileCount']=ident[0];m['projection']['payloadBytes']=ident[1];m['projection']['pathSetSha256']=ident[2];m['projection']['sourceContentAggregateSha256']=ident[3]
truth='P73R5 replaces the failing GitHub API-comment authority dependency with an exact repository+commit-bound raw README from the official Multicall3 repository. The second authority root remains independent from Ancient8 official docs. Current runtime bytecode stays explicitly unverified, Pro/Advanced remain isolated, and no vulnerability/exploitability or customer FINAL/PDF/rights/value/sale/LIVE credit is granted by this repair alone.'
m['p73r5Delta']={'classification':'PINNED_PROJECT_MAINTAINER_AUTHORITY_TRANSPORT_REPAIR','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':after_sha,'beforeBytes':BEFORE_BYTES,'afterBytes':len(out)}],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p73r5.pinned-maintainer-authority-repair.v1','status':'PASS','parentAggregateSha256':BASE_AGG,'path':REL,'beforeBytes':BEFORE_BYTES,'beforeSha256':BEFORE_SHA,'afterBytes':len(out),'afterSha256':after_sha,'pinnedMaintainerRepo':'mds1/multicall3','pinnedMaintainerCommit':PINNED_COMMIT,'maintainerAuthorityHost':'raw.githubusercontent.com','fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
