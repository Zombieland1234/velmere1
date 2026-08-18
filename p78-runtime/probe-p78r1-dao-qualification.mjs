import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args=new Map();for(let i=2;i<process.argv.length;i+=2)args.set(process.argv[i],process.argv[i+1]);
const outDir=path.resolve(args.get('--out-dir')||'p78-out');
const analyzerPath=path.resolve(args.get('--analyzer')||'p78-runtime/current-analyzer/solidity-structured-signal.mjs');
const solcRoot=path.resolve(args.get('--solc-root')||'p78-solc');
fs.mkdirSync(outDir,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(outDir,'P78_DAO_REAL_GROUND_TRUTH_DIAGNOSTIC.json'),'utf8'));
const TARGET=base.target;
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const sha1=b=>crypto.createHash('sha1').update(b).digest('hex');
const gitBlobSha1=b=>sha1(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b]));
const normalizeHex=v=>typeof v==='string'?v.toLowerCase().replace(/^0x/,''):'';
const isHex=v=>typeof v==='string'&&/^[0-9a-fA-F]+$/.test(v)&&v.length>=100;
async function fetchResponse(url,options={},timeoutMs=15000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal,redirect:'follow',headers:{'user-agent':'velmere-p78r1-repair/1.0',...(options.headers||{})}})}finally{clearTimeout(t)}}
async function fetchBytes(url){const r=await fetchResponse(url);if(!r.ok)throw new Error(`HTTP_${r.status}`);return Buffer.from(await r.arrayBuffer())}
async function rpc(endpoint,method,params){const r=await fetchResponse(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:781,method,params})},12000);if(!r.ok)throw new Error(`HTTP_${r.status}`);const b=await r.json();if(b.error)throw new Error(`RPC_${b.error.code}:${b.error.message}`);return b.result}
function collectHexStrings(v,prefix='',rows=[]){if(typeof v==='string'){const h=normalizeHex(v);if(isHex(h))rows.push({path:prefix,hex:h});return rows}if(Array.isArray(v)){v.forEach((x,i)=>collectHexStrings(x,`${prefix}[${i}]`,rows));return rows}if(v&&typeof v==='object')for(const [k,x] of Object.entries(v))collectHexStrings(x,prefix?`${prefix}.${k}`:k,rows);return rows}

if(!base.gates?.sourceBindingPass||!base.gates?.readmeAddressBound||!base.gates?.licensePass||!base.gates?.groundTruthPass)throw new Error('P78R1 refuses to inherit non-green source/ground-truth base gates');

const sourceNames=['DAO.sol','TokenCreation.sol','Token.sol','ManagedAccount.sol'];
const sources={};for(const name of sourceNames){const url=`https://raw.githubusercontent.com/${TARGET.sourceRepo}/${TARGET.sourceCommit}/${name}`;sources[name]=(await fetchBytes(url)).toString('utf8')}

const analyzerBytes=fs.readFileSync(analyzerPath);const analyzerSha=sha256(analyzerBytes);
if(analyzerBytes.length!==22792||analyzerSha!=='16e51259f81553e0b80d62136ee43157b3db4020792e4664d92b69372ecc1f8d')throw new Error(`canonical analyzer mismatch ${analyzerBytes.length} ${analyzerSha}`);
const analyzerMod=await import(pathToFileURL(analyzerPath).href+`?sha=${analyzerSha}`);
const structured=analyzerMod.analyzeSolidityStructuredSignals(sources['DAO.sol']);
const detector={status:'PASS',analyzerSha256:analyzerSha,analyzerClass:structured.analyzerClass,signals:structured.signals,reentrancyOrderDetected:structured.signals.includes('reentrancy_order'),reentrancyModifierDetected:structured.signals.includes('reentrancy_modifier_callback'),compilerAstCredit:structured.compilerAstCredit,limitations:structured.limitations,rawDetectorPass:structured.signals.includes('reentrancy_order')||structured.signals.includes('reentrancy_modifier_callback')};

const RPCS=[
 ['publicnode','https://ethereum-rpc.publicnode.com'],
 ['flashbots','https://rpc.flashbots.net'],
 ['drpc','https://eth.drpc.org'],
 ['blockpi','https://ethereum.public.blockpi.network/v1/rpc/public'],
 ['ankr','https://rpc.ankr.com/eth'],
 ['merkle','https://eth.merkle.io'],
 ['payload','https://rpc.payload.de'],
 ['stakely','https://ethereum-json-rpc.stakely.io'],
];
const rpcEvidence=await Promise.all(RPCS.map(async([id,endpoint])=>{try{const chainId=await rpc(endpoint,'eth_chainId',[]);const code=await rpc(endpoint,'eth_getCode',[TARGET.address,'latest']);const clean=normalizeHex(code);return{id,host:new URL(endpoint).host,status:chainId==='0x1'&&clean.length>0?'PASS':'FAIL_RESPONSE',chainId,codeBytes:clean.length/2,codeSha256:clean?sha256(Buffer.from(clean,'hex')):null}}catch(e){return{id,host:new URL(endpoint).host,status:'FAIL',error:String(e?.message||e)}}}));
const groups=new Map();for(const r of rpcEvidence.filter(x=>x.status==='PASS')){if(!groups.has(r.codeSha256))groups.set(r.codeSha256,[]);groups.get(r.codeSha256).push(r)}
const quorum=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length)[0]||[null,[]];const runtimeQuorumPass=quorum[1].length>=4;const runtimeSha256=quorum[0];const runtimeBytes=quorum[1][0]?.codeBytes||0;

const exactUrl='https://raw.githubusercontent.com/argotorg/solc-bin/3f69ed88a3edb44f0d45648269e23a190a4ccefb/bin/soljson-v0.3.1-nightly.2016.4.12%2Bcommit.3ad5e82.js';
let compilerReplay={status:'FAIL_NOT_RUN'};
try{
 const exactBytes=await fetchBytes(exactUrl);const exactPath=path.join(solcRoot,'soljson-v0.3.1-nightly.2016.4.12+commit.3ad5e82.js');fs.writeFileSync(exactPath,exactBytes);
 const requireFromSolc=createRequire(path.join(solcRoot,'package.json'));let wrapper;try{wrapper=requireFromSolc('solc/wrapper')}catch{wrapper=requireFromSolc('solc/wrapper.js')}
 const soljson=requireFromSolc(exactPath);const solc=wrapper(soljson);const version=String(solc.version());
 const output=solc.compile({sources},1);const contracts=output?.contracts||{};const daoKey=Object.keys(contracts).find(k=>k==='DAO'||k.endsWith(':DAO'))||null;const dao=daoKey?contracts[daoKey]:null;const candidates=collectHexStrings(dao||{}).sort((a,b)=>b.hex.length-a.hex.length);const matches=runtimeSha256?candidates.filter(c=>sha256(Buffer.from(c.hex,'hex'))===runtimeSha256):[];
 compilerReplay={status:'PASS_COMPILE',solcBinRepo:'argotorg/solc-bin',solcBinCommit:'3f69ed88a3edb44f0d45648269e23a190a4ccefb',solcSourceCommit:'3ad5e821f25d9c389b29370705d4df5d1014b2bd',soljsonPath:'bin/soljson-v0.3.1-nightly.2016.4.12+commit.3ad5e82.js',soljsonBytes:exactBytes.length,soljsonSha256:sha256(exactBytes),soljsonGitBlobSha1:gitBlobSha1(exactBytes),compilerVersion:version,compilerVersionExact:/0\.3\.1.*3ad5e82/i.test(version),optimizerEnabled:true,compileArgument:1,daoKey,outputErrors:output?.errors||[],hexCandidates:candidates.slice(0,8).map(c=>({path:c.path,bytes:c.hex.length/2,sha256:sha256(Buffer.from(c.hex,'hex'))})),exactRuntimeMatchPaths:matches.map(c=>c.path),exactRuntimeMatch:matches.length>0};
}catch(e){compilerReplay={status:'FAIL',error:String(e?.stack||e)}}
const compilerExactPass=compilerReplay.status==='PASS_COMPILE'&&compilerReplay.compilerVersionExact&&compilerReplay.exactRuntimeMatch;
const gates={sourceBindingPass:true,readmeAddressBound:true,licensePass:true,groundTruthPass:true,runtimeQuorumPass,rawDetectorPass:detector.rawDetectorPass,compilerExactPass};
const status=runtimeQuorumPass&&compilerExactPass?(detector.rawDetectorPass?'PASS_P78R1_DAO_REAL_GROUND_TRUTH_RUNTIME_COMPILER_DETECTOR':'PASS_P78R1_DAO_REAL_GROUND_TRUTH_RUNTIME_COMPILER_DETECTOR_GAP'):'FAIL_P78R1_DAO_QUALIFICATION';
const receipt={schemaVersion:'velmere.p78r1.dao-real-ground-truth-repair-diagnostic.v1',generatedAt:new Date().toISOString(),status,target:TARGET,baseDiagnosticIntegritySha256:base.integritySha256,inheritedExternalGroundTruth:base.vulnerabilityGroundTruth,inheritedSourceBinding:base.source,currentRuntime:{quorumRequired:4,quorumObserved:quorum[1].length,pass:runtimeQuorumPass,runtimeSha256,runtimeBytes,agreeingProviders:quorum[1].map(x=>x.id),rpcEvidence},currentVelmereDetector:detector,compilerReplay,gates,zeroFakeCredit:{customerFinal:'0/20',auditFinalPdf:'0/3',rights:'2/203',paidValue:'0/10',saleEligible:'0/20',live:false},truthBoundary:'P78R1 remains diagnostic. Exact historical vulnerability ground truth, current runtime quorum and exact compiler replay do not by themselves grant Customer FINAL, Audit FINAL PDF, paid-value, sale, LIVE or world-class credit. Detector result is independently measured and any detector repair requires negative controls.'};receipt.integritySha256=sha256(Buffer.from(JSON.stringify(receipt)));fs.writeFileSync(path.join(outDir,'P78R1_DAO_QUALIFICATION_DIAGNOSTIC.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status,gates,currentRuntime:receipt.currentRuntime,currentVelmereDetector:detector,compilerReplay,integritySha256:receipt.integritySha256},null,2));
if(!runtimeQuorumPass||!compilerExactPass)process.exit(2);
