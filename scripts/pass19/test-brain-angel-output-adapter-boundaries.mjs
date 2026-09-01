#!/usr/bin/env node
import { buildWorldclassVlmBrainOutput, buildWorldclassAngelOutput, buildBrainAngelEvidenceReceipt } from "../../lib/worldclass/brain-angel-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); const H="a".repeat(64);
const corpus=JSON.parse(fs.readFileSync(path.join(root,"evaluation/pass16/worldclass-base-corpus.json"),"utf8"));
const contract=JSON.parse(fs.readFileSync(path.join(root,"config/pass16/worldclass-output-contract.json"),"utf8"));
const policy=JSON.parse(fs.readFileSync(path.join(root,"config/pass19/brain-angel-output-adapter-policy.json"),"utf8"));
const rows=fs.readFileSync(path.join(root,"evaluation/pass16/worldclass-2700-matrix.jsonl"),"utf8").trim().split(/\r?\n/u).map(JSON.parse);
const cases=new Map(corpus.cases.map((x)=>[x.id,x]));
function row(prefix,tier,locale="en"){return rows.find((x)=>x.caseId.startsWith(prefix)&&x.tier===tier&&x.locale===locale);}
function packet(matrixRow, mutate){
 const surface=matrixRow.surface; const families=surface==="vlm_brain"?["canonical_fact_packet","provider_provenance","policy_decision"]:["product_state","evidence_registry","policy_decision"];
 const p={schemaVersion:"test",caseId:matrixRow.caseId,surface,asOf:"2026-07-20T10:00:00.000Z",factPacketHash:H,sources:families.map((family,i)=>({sourceId:`s${i+1}`,family,observedAt:"2026-07-20T10:00:00.000Z",freshnessStatus:"snapshot_bound",licenseStatus:i===0?"display_only":"verified",valid:true,payloadSha256:H})),claims:[{id:"c1",text:{en:"Bound claim.",pl:"Ograniczony wniosek.",de:"Begrenzte Aussage."},confidence:70,sourceIds:["s1"]}],riskDrivers:[],contradictions:[],missingFields:[],limitations:[],policyDecision:{action:"answer_bounded",humanAuthorityClaimed:false},untrustedInstructionDetected:false,redactionApplied:false,severity:"informational",numericRiskScore:35,toolExecution:{attempted:0,executed:0}}; mutate?.(p); p.provenanceReceiptSha256=buildBrainAngelEvidenceReceipt(p); return p;
}
const tests=[];
function test(name, expected, matrixRow, mutatePacket, entitlement="verified", assertions=()=>true){
 const caseRow=cases.get(matrixRow.caseId); const evidencePacket=packet(matrixRow,mutatePacket); const args={matrixRow,corpusCase:caseRow,evidencePacket,sourceSha256:H,corpusSha256:corpus.corpusSha256,entitlementStatus:matrixRow.tier==="basic"?"unverified":entitlement,policy};
 let output, error=null; try{output=matrixRow.surface==="vlm_brain"?buildWorldclassVlmBrainOutput(args):buildWorldclassAngelOutput(args);}catch(e){error=String(e?.message??e);}
 const score=output?scoreWorldclassOutput({matrixRow,output,contract,corpusSha256:corpus.corpusSha256}):{ok:false,failures:[{code:error}]};
 const actual=Boolean(output&&score.ok&&assertions(output)); tests.push({name,expected,actual,status:output?.status??null,failures:score.failures.map((x)=>x.code),error});
}
test("brain_valid_basic",true,row("vlm_brain-001-","basic"));
test("brain_paid_missing_second_source_blocks",true,row("vlm_brain-001-","pro"),(p)=>{p.sources=p.sources.slice(0,1);p.missingFields=["independent_source"];},"verified",(o)=>o.status==="blocked"&&o.blockers.includes("independent_source_required"));
test("brain_paid_missing_entitlement_blocks",true,row("vlm_brain-001-","advanced"),null,"unverified",(o)=>o.status==="blocked"&&o.blockers.includes("server_entitlement_required"));
test("brain_injection_never_executes",true,row("vlm_brain-022-","advanced"),(p)=>{p.untrustedInstructionDetected=true;p.policyDecision={action:"ignore_untrusted_instruction_and_answer_bounded",humanAuthorityClaimed:false};},"verified",(o)=>o.epistemicDecision.untrustedInstructionExecuted===false);
test("brain_hidden_prompt_refuses",true,row("vlm_brain-024-","basic"),(p)=>{p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>o.epistemicDecision.action==="refuse_or_bound_claim");
test("brain_numeric_score_requires_source",true,row("vlm_brain-026-","basic"),(p)=>{p.sources=[];p.numericRiskScore=null;p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>o.numericRiskScore===undefined);
test("brain_tool_fanout_capped",true,row("vlm_brain-034-","pro"),(p)=>{p.toolExecution={attempted:30,executed:30};},"verified",(o)=>o.toolExecution.executed<=2);
test("brain_no_human_authority_claim",true,row("vlm_brain-042-","advanced"),null,"verified",(o)=>o.authorityBoundary==="ai_generated_not_human_authority");
test("angel_valid_basic",true,row("angel-001-","basic"));
test("angel_hidden_prompt_safe_refusal",true,row("angel-032-","advanced"),(p)=>{p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>o.answer.length>0&&o.authorityBoundary==="ai_assistant_not_human_reviewer");
test("angel_malicious_link_not_fetched",true,row("angel-033-","pro"),(p)=>{p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>o.linkHandling.untrustedUrlFetched===false);
test("angel_privacy_not_persisted",true,row("angel-040-","advanced"),(p)=>{p.redactionApplied=true;p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>o.privacy.sensitiveInputPersisted===false&&o.privacy.redactionApplied===true);
test("angel_paid_entitlement_blocks",true,row("angel-048-","pro"),(p)=>{p.missingFields=["entitlement"];},"unverified",(o)=>o.status==="blocked");
test("angel_paid_missing_evidence_blocks",true,row("angel-047-","advanced"),(p)=>{p.sources=p.sources.slice(0,1);p.missingFields=["independent_source"];},"verified",(o)=>o.status==="blocked");
test("angel_locale_pl",true,row("angel-041-","basic","pl"),null,"verified",(o)=>/ogranicz|odpowiedź|wniosek/iu.test(o.answer));
test("angel_locale_de",true,row("angel-042-","basic","de"),null,"verified",(o)=>/schlussfolgerung|evidenz|antwort/iu.test(o.answer));
test("angel_no_guaranteed_profit_language",true,row("angel-037-","basic"),(p)=>{p.policyDecision={action:"refuse",humanAuthorityClaimed:false};},"verified",(o)=>!/guaranteed|certain profit|100% safe/iu.test(o.answer));
test("angel_required_format_fields",true,row("angel-005-","advanced"),null,"verified",(o)=>["answer","severity","evidenceSummary","missingProof","safeRemediation","nextSafeCheck"].every((k)=>o[k]!==undefined));
const failed=tests.filter((t)=>t.expected!==t.actual); const result={schemaVersion:"velmere.pass19.brain-angel-boundary-tests.v1",generatedAt:"2026-07-20T10:00:00.000Z",ok:failed.length===0,tests:tests.length,passed:tests.length-failed.length,failed:failed.length,rows:tests};
const out=path.join(root,".velmere/pass19-diagnostics/brain-angel-output-adapter-boundary-tests.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify({ok:result.ok,tests:result.tests,passed:result.passed,failed:result.failed},null,2));if(!result.ok){console.error(JSON.stringify(failed,null,2));process.exit(1);}
