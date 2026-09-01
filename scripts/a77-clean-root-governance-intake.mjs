#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, REVISION, sha256, validateGenesis, validateGovernance, writeJsonAtomic } from "./pass36/a77-clean-root-migration-lib.mjs";
const root=process.cwd();
const arg=(name)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
const fixtureMode=process.argv.includes("--fixture");
const policy=readJson(root,"config/pass36/a77-clean-root-migration-policy.json");
const genesis=readJson(root,policy.cleanRoot.genesisPath);
const genesisValidation=validateGenesis(root,genesis,policy);
const trustPath=path.resolve(root,process.env.VELMERE_A77_TRUST_ROOTS_JSON??arg("--trust-roots")??"");
const attestationPath=path.resolve(root,process.env.VELMERE_A77_ATTESTATION_JSON??arg("--attestation")??"");
const expectedTrustSha=String(process.env.VELMERE_A77_TRUST_ROOTS_SHA256??arg("--trust-roots-sha")??"").toLowerCase();
const output=path.join(root,"artifacts/pass36/a77/PASS36_A77_CLEAN_ROOT_GOVERNANCE.json");
let decision=policy.governance.blockedDecision;let governance=null;let fatalError=null;
if(!genesisValidation.passed){decision=policy.governance.rejectedDecision;fatalError="clean_root_genesis_invalid";}
else if(fs.existsSync(trustPath)&&fs.existsSync(attestationPath)){
 try{
  const trustRoots=JSON.parse(fs.readFileSync(trustPath,"utf8"));
  const attestation=JSON.parse(fs.readFileSync(attestationPath,"utf8"));
  governance=validateGovernance({policy,genesis,trustRoots,expectedTrustRootsSha256:expectedTrustSha,attestation});
  decision=governance.passed?policy.governance.verifiedDecision:policy.governance.rejectedDecision;
 }catch(error){decision=policy.governance.rejectedDecision;fatalError=error instanceof Error?error.message:String(error);}
}
if(fixtureMode&&decision===policy.governance.verifiedDecision)decision="FIXTURE_PASS";
const receipt={schemaVersion:"velmere.pass36.a77.clean-root-governance-receipt.v1",revisionId:REVISION,generatedAt:new Date().toISOString(),fixtureMode,decision,genesisDigestSha256:genesis.genesisDigestSha256,payloadAggregateSha256:genesis.payload.aggregateSha256,trustRootsSha256:fs.existsSync(trustPath)?sha256(fs.readFileSync(trustPath)):null,governanceSummary:governance?{checks:governance.checks.length,passed:governance.checks.filter((r)=>r.passed).length,failed:governance.checks.filter((r)=>!r.passed).length,payloadSha256:governance.payloadSha256}:null,fatalError,historicalArtifactsRecovered:false,cleanRootGovernanceApproved:decision===policy.governance.verifiedDecision,productionApproved:false,liveProven:false,saleEnabled:false,truthBoundary:policy.truthBoundary};
writeJsonAtomic(output,receipt);
console.log(JSON.stringify(receipt,null,2));
if(![policy.governance.verifiedDecision,"FIXTURE_PASS"].includes(decision))process.exitCode=1;
