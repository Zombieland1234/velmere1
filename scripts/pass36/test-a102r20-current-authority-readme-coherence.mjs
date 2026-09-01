#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A102R20_ACTION_REQUIRED_SINGLE_CURRENT_AUTHORITY_README_HISTORY_LABEL_STALE_POINTER_AND_PLANNING_ESTIMATE_COHERENCE_MINIMALISM_NO_REAL_CREDIT";
const PARENT="VELMERE_PASS36_A102R19_ACTION_REQUIRED_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM_NO_REAL_CREDIT";
const MANIFEST="config/pass36/a102r20-current-root-descendant-manifest.json";
const PROGRAM="config/pass36/a102r20-world-class-completion-program.json";
const EXPECTED_FILES=1833;
const EXPECTED_AGGREGATE="c32e0a04f4eed273df473166dbc3ac0d4e56008e21f96461f30981cd54c6e835";
const root=process.cwd(), failures=[]; let passed=0;
const check=(id,condition,detail=null)=>condition?passed+=1:failures.push({id,detail});
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const readJson=(p)=>JSON.parse(read(p));
const sha=(v)=>crypto.createHash("sha256").update(v).digest("hex");
function applicationSurface(){
 const rows=[];
 function walk(abs,rel){
  for(const entry of fs.readdirSync(abs,{withFileTypes:true}).sort((a,b)=>Buffer.from(a.name).compare(Buffer.from(b.name)))){
   const r=`${rel}/${entry.name}`,a=path.join(abs,entry.name),st=fs.lstatSync(a);
   if(st.isSymbolicLink())throw new Error(`application_surface_symlink:${r}`);
   if(entry.isDirectory())walk(a,r); else if(entry.isFile()){const b=fs.readFileSync(a);rows.push({path:r,byteLength:b.length,sha256:sha(b)});}
  }
 }
 for(const top of ["app","components","lib"])walk(path.join(root,top),top);
 rows.sort((a,b)=>Buffer.from(a.path).compare(Buffer.from(b.path)));
 return {rows,byteLength:rows.reduce((s,r)=>s+r.byteLength,0),aggregate:sha(rows.map((r)=>`${r.path}\0${r.byteLength}\0${r.sha256}`).join("\n"))};
}
function passLiteralCandidates(){
 const rows=[],re=/["'`]PASS\d{3,}/gu;
 function walk(abs){for(const e of fs.readdirSync(abs,{withFileTypes:true})){const a=path.join(abs,e.name);if(e.isDirectory())walk(a);else if(e.isFile()&&/\.(?:js|jsx|ts|tsx)$/u.test(e.name)){const m=fs.readFileSync(a,"utf8").match(re)??[];if(m.length)rows.push({path:path.relative(root,a).replaceAll("\\","/"),count:m.length});}}}
 for(const top of ["app","components"])walk(path.join(root,top));
 return rows;
}
const active=read("VELMERE_ACTIVE_PASS.txt").trim(), authority=readJson("config/pass36/current-release-authority.json"),mirror=readJson("config/pass35/current-revision.json"),legacy=readJson("config/current-release.json"),a58=readJson("config/pass36/a58-release-integrity-policy.json"),state=readJson("config/pass36/a102r20-action-required-current-state.json"),program=readJson(PROGRAM),pkg=readJson("package.json"),readme=read("README.md"),clean=read("CLEAN_SAFE_README.md"),patch=read("VELMERE_A102R20_PATCH.txt"),surface=applicationSurface(),candidates=passLiteralCandidates();
const candidateCount=candidates.reduce((s,r)=>s+r.count,0),readmeHeadings=readme.match(/^#{1,6}\s+Current checkpoint\b/gmu)??[],cleanHeadings=clean.match(/^#{1,6}\s+Current checkpoint\b/gmu)??[],compat=authority.compatibilityPointers?.slice(1,3)??[];
check("active",active===REV,active);
check("package-revision",pkg.velmerePass===REV&&pkg.velmerePatch==="VELMERE_A102R20_PATCH.txt");
check("package-parent",pkg.velmere?.currentRevisionParentId===PARENT);
check("package-program",pkg.velmereWorldClassCompletionProgramPass===REV&&pkg.velmereWorldClassCompletionProgramPath===PROGRAM);
check("package-manifest",pkg.velmereCurrentRootDescendantManifestPath===MANIFEST&&pkg.velmere?.currentRootDescendantManifestPath===MANIFEST);
check("authority-revision",authority.authorityRevisionId===REV&&authority.parentRevisionId===PARENT);
check("authority-current",authority.currentSource?.revisionId===REV&&authority.currentSource?.parentRevisionId===PARENT);
check("authority-manifest",authority.currentRootDescendantManifestRevisionId===REV&&authority.currentRootDescendantManifestPath===MANIFEST);
check("authority-program",authority.worldClassCompletionProgramRevisionId===REV&&authority.worldClassCompletionProgramPath===PROGRAM);
check("authority-plane",authority.planes?.a102r20LocalClosure?.revisionId===REV&&authority.planes?.a102r20LocalClosure?.singleCurrentAuthorityCoherent===true);
check("authority-truth",authority.truthBoundary.includes("A102R20")&&!authority.truthBoundary.includes("A102R18 removes"),authority.truthBoundary);
check("authority-claims",authority.claims?.currentRevisionId===REV&&authority.claims?.parentRevisionId===PARENT);
check("authority-closed",authority.claims?.decision==="NO_GO"&&authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false&&authority.claims?.productionApproved===false&&authority.claims?.worldClassProven===false);
check("compat-count",compat.length===2,compat);
check("compat-revision",compat.every((r)=>r.declaredRevisionId===REV),compat);
check("compat-no-stale",compat.every((r)=>!r.reason.includes("A102R12")&&r.reason.includes("A102R20")),compat);
check("mirror-revision",mirror.sourceRevisionId===REV&&mirror.parentSourceRevisionId===PARENT&&mirror.currentReleaseAuthorityRevisionId===REV);
check("mirror-manifest",mirror.currentRootDescendantManifestRevisionId===REV&&mirror.currentRootDescendantManifestPath===MANIFEST);
check("mirror-program",mirror.worldClassCompletionProgramRevisionId===REV&&mirror.worldClassCompletionProgramPath===PROGRAM);
check("mirror-planning",mirror.worldClassCompletionRemainingPasses===11&&mirror.worldClassCompletionProgramRemainingPasses===31);
check("legacy-authority",legacy.authoritativeCurrentSourceRevisionId===REV&&legacy.authoritativeCurrentSourceParentRevisionId===PARENT&&legacy.currentReleaseAuthorityRevisionId===REV);
check("legacy-manifest",legacy.currentRootDescendantManifestRevisionId===REV&&legacy.currentRootDescendantManifestPath===MANIFEST);
check("legacy-program",legacy.worldClassCompletionProgramRevisionId===REV&&legacy.worldClassCompletionProgramPath===PROGRAM);
check("a58-current",a58.currentCheckpointRevisionId===REV&&a58.currentCheckpointParentRevisionId===PARENT);
check("a58-manifest",a58.currentDescendantManifestPath===MANIFEST&&a58.archiveManifestPath==="_velmere/PASS36_A102R20_SOURCE_ONLY_MANIFEST.json");
check("a58-verifier",a58.currentAuthorityVerifierPath==="scripts/pass36/verify-a102r20-action-required-authority.mjs"&&a58.currentAuthorityVerifierExpectedStatus==="PASS_A102R20_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_LEGAL_OR_SALE_CREDIT");
check("a58-truth",a58.truthBoundary.includes("A102R20")&&!a58.truthBoundary.includes("active A102R18"),a58.truthBoundary);
check("state-identity",state.revisionId===REV&&state.parentRevisionId===PARENT&&state.completedThrough===89);
check("state-planning",state.estimatedRemainingCheckpoints?.minimum===6&&state.estimatedRemainingCheckpoints?.mostLikely===11&&state.estimatedRemainingCheckpoints?.withRevisions===18);
check("state-open-debt",state.newRoadmapGaps?.some((r)=>r.id==="A102R20-GAP-06"&&r.status==="OPEN_NEXT_REVISION"));
check("state-product",state.localImplementation?.applicationSurfaceFilesChangedFromA102R19===0&&state.localImplementation?.widerVisiblePassJargonInventoryClosed===false);
check("program-identity",program.revisionId===REV&&program.parentRevisionId===PARENT&&program.formalRemainingEntries===31);
check("program-planning",program.estimatedRemainingCheckpoints?.minimum===6&&program.estimatedRemainingCheckpoints?.mostLikely===11&&program.estimatedRemainingCheckpoints?.withRevisions===18);
check("program-precedence",program.roadmapPrecedence.startsWith("A102R20 is the only current local source truth"),program.roadmapPrecedence);
check("program-open-debt",program.newRoadmapGaps?.some((r)=>r.id==="A102R20-GAP-06"&&r.status==="OPEN_NEXT_REVISION"));
check("readme-current",readme.startsWith("# Current checkpoint — A102R20")&&readmeHeadings.length===1,readmeHeadings);
check("readme-no-stale",!readme.includes("# Velmère — current source truth")&&!readme.includes("is the current SOURCE_ONLY authority"));
check("readme-history",readme.includes("Historical checkpoint index — non-authoritative")&&readme.includes("A102R10")&&readme.includes("A102R19"));
check("clean-current",clean.startsWith("# Current checkpoint — A102R20")&&cleanHeadings.length===1,cleanHeadings);
check("clean-no-stale",!clean.includes("# Velmère — current source truth")&&!clean.includes("is the current SOURCE_ONLY authority"));
check("clean-history",clean.includes("Historical A102R10–A102R19 notes are retained only as a non-authoritative index"));
check("surface-count",surface.rows.length===EXPECTED_FILES,surface.rows.length);
check("surface-aggregate",surface.aggregate===EXPECTED_AGGREGATE,surface.aggregate);
check("no-runtime-proof-leftover",!fs.existsSync(path.join(root,"lib/security/runtime-proof-operator-gate.ts"))&&!fs.existsSync(path.join(root,"scripts/pass36/test-a102r20-public-runtime-proof-operator-boundary.ts")));
check("pass-debt-measured",candidateCount>0&&candidates.length>0,{candidateCount,files:candidates.slice(0,8)});
check("patch",patch.startsWith(REV)&&patch.includes("OPEN_NEXT_REVISION"));
const r19=spawnSync(process.execPath,["scripts/pass36/test-a102r19-css-customer-minimalism-boundary.mjs"],{encoding:"utf8",maxBuffer:16*1024*1024,env:{...process.env,TERM:"dumb"}});
check("r19-regression",r19.status===0&&r19.stdout.includes("PASS_A102R19_ACTIVE_CSS_CUSTOMER_MINIMALISM_BOUNDARY_LOCAL_ONLY"),{status:r19.status,stdout:r19.stdout.slice(-600),stderr:r19.stderr.slice(-300)});
check("credit-false",state.passCredit?.A102===false&&program.promotion?.live===false&&authority.a102r20ExactReleaseCredit===false);
const output={status:failures.length?"FAIL_A102R20_CURRENT_AUTHORITY_README_COHERENCE":"PASS_A102R20_CURRENT_AUTHORITY_README_COHERENCE_LOCAL_ONLY",assertions:passed+failures.length,passed,failed:failures.length,failures,measurements:{readmeCurrentHeadingCount:readmeHeadings.length,cleanReadmeCurrentHeadingCount:cleanHeadings.length,applicationSurfaceFiles:surface.rows.length,applicationSurfaceBytes:surface.byteLength,applicationSurfaceAggregateSha256:surface.aggregate,applicationSurfaceFilesChangedFromParent:surface.aggregate===EXPECTED_AGGREGATE?0:null,quotedPassLiteralCandidates:candidateCount,quotedPassLiteralCandidateFiles:candidates.length,planningMinimum:6,planningMostLikely:11,planningWithRevisions:18,formalRemainingEntries:31,exactBrowserRows:0},truth:{singleCurrentAuthorityCoherent:failures.length===0,historicalReadmeLabelsNonAuthoritative:true,applicationSurfaceUnchangedFromA102R19:surface.aggregate===EXPECTED_AGGREGATE,widerVisiblePassJargonInventoryClosed:false,exactBuildBrowserProven:false,stagingProven:false,liveProven:false,saleEnabled:false}};
console.log(JSON.stringify(output,null,2));if(failures.length)process.exitCode=1;
