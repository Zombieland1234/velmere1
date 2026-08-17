import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-ancient8-official-replay-out');
const ADDRESS='0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const CHAIN_ID=888888888;
const SOURCE_URL=`https://scan.ancient8.gg/api/code?address=${ADDRESS}&chainId=${CHAIN_ID}&highlight=false`;
const RPC='https://scan.ancient8.gg/rpc';
const EXPECTED_COMPILER='0.8.26+commit.8a97fa7a';
const EXPECTED_RUNTIME_BYTES=3178;
const EXPECTED_RUNTIME_SHA='sha256:435d8ffcf6c6dac190ab1d07c5c9f09d7f9ee92acd6b5c24d8149601ac12bbc1';
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
async function getJson(url){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'VelmereP74Replay/1.0'},signal:AbortSignal.timeout(20000),cache:'no-store'});const text=await r.text();if(!r.ok)throw new Error(`http_${r.status}:${text.slice(0,300)}`);return{json:JSON.parse(text),text,status:r.status,sha256:sha(Buffer.from(text))};}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:7408,method,params});const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74Replay/1.0'},body,signal:AbortSignal.timeout(20000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{throw new Error(`${method}:invalid_json:http_${r.status}`)}if(!r.ok||j?.error||j?.result===undefined||j?.result===null)throw new Error(`${method}:rpc_error:http_${r.status}:${JSON.stringify(j?.error??j).slice(0,300)}`);return{result:j.result,httpStatus:r.status,requestSha256:sha(Buffer.from(body)),responseSha256:sha(Buffer.from(text))};}
function runtimeSummary(hex){if(typeof hex!=='string'||!/^0x?(?:[0-9a-fA-F]{2})*$/.test(hex))throw new Error('invalid_runtime_hex');const clean=hex.startsWith('0x')?hex.slice(2):hex;const b=Buffer.from(clean,'hex');return{bytes:b.length,sha256:sha(b),hex:`0x${clean.toLowerCase()}`};}
function stripMetadata(hex){const clean=(hex.startsWith('0x')?hex.slice(2):hex).toLowerCase();if(clean.length<4)return clean;const metaLen=parseInt(clean.slice(-4),16)*2;const cut=clean.length-4-metaLen;return cut>=0?clean.slice(0,cut):clean;}
const result={schemaVersion:'velmere.p74.ancient8-official-multicall3-replay.v1',status:'RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainId:CHAIN_ID,address:ADDRESS,expected:{compiler:EXPECTED_COMPILER,runtimeBytes:EXPECTED_RUNTIME_BYTES,runtimeSha256:EXPECTED_RUNTIME_SHA},observations:{},checks:{},errors:[],credit:{product:0,currentRuntimeBytecode:0,sourceDeploymentIdentity:0,vulnerabilityGroundTruth:0,customerFinal:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Compiler replay can grant bounded source-to-current-runtime identity only. It does not establish independent-provider quorum, vulnerability ground truth, final customer output, rights, paid value, sale readiness, or LIVE.'};
try{
 const source=await getJson(SOURCE_URL);fs.writeFileSync(path.join(OUT,'A8SCAN_CODE_RESPONSE.json'),source.text);
 const j=source.json;
 const std=structuredClone(j.stdJsonInput);
 if(j.match!=='exact_match'||j.creationMatch!=='exact_match'||j.runtimeMatch!=='exact_match')throw new Error(`verification_not_exact:${j.match}/${j.creationMatch}/${j.runtimeMatch}`);
 if(Number(j.chainId)!==CHAIN_ID||String(j.address).toLowerCase()!==ADDRESS)throw new Error('verified_target_identity_mismatch');
 if(j.compilation?.compiler!=='solc'||j.compilation?.compilerVersion!==EXPECTED_COMPILER)throw new Error(`compiler_mismatch:${j.compilation?.compilerVersion}`);
 if(std?.language!=='Solidity'||!std?.sources?.['Multicall3.sol']?.content)throw new Error('std_json_source_missing');
 if(std?.settings?.optimizer?.enabled!==true||std?.settings?.optimizer?.runs!==200)throw new Error('optimizer_settings_mismatch');
 const originalInputSha=sha(Buffer.from(JSON.stringify(std)));
 std.settings={...(std.settings??{}),outputSelection:{'*':{'*':['abi','metadata','evm.bytecode.object','evm.deployedBytecode.object']}}};
 const inputText=JSON.stringify(std);
 fs.writeFileSync(path.join(OUT,'SOLC_STANDARD_INPUT.json'),inputText+'\n');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'velmere-p74-solc-'));
 const npm=process.platform==='win32'?'npm.cmd':'npm';
 const install=spawnSync(npm,['install','--no-audit','--no-fund','--ignore-scripts','--prefix',tmp,'solc@0.8.26'],{encoding:'utf8',timeout:180000,maxBuffer:20*1024*1024});
 fs.writeFileSync(path.join(OUT,'NPM_INSTALL_STDOUT.txt'),install.stdout??'');fs.writeFileSync(path.join(OUT,'NPM_INSTALL_STDERR.txt'),install.stderr??'');
 if(install.status!==0)throw new Error(`npm_install_solc_failed:${install.status}`);
 const pkg=JSON.parse(fs.readFileSync(path.join(tmp,'node_modules','solc','package.json'),'utf8'));
 const solcJs=path.join(tmp,'node_modules','solc','solc.js');
 const node=process.execPath;
 const ver=spawnSync(node,[solcJs,'--version'],{encoding:'utf8',timeout:30000});
 const versionText=(ver.stdout??'').trim();
 if(ver.status!==0||!versionText.includes(EXPECTED_COMPILER))throw new Error(`solc_version_failed:${versionText}:${ver.stderr}`);
 const compile=spawnSync(node,[solcJs,'--standard-json'],{input:inputText,encoding:'utf8',timeout:120000,maxBuffer:50*1024*1024});
 fs.writeFileSync(path.join(OUT,'SOLC_STDOUT.txt'),compile.stdout??'');fs.writeFileSync(path.join(OUT,'SOLC_STDERR.txt'),compile.stderr??'');
 if(compile.status!==0)throw new Error(`solc_compile_failed:${compile.status}:${(compile.stderr??'').slice(0,1000)}`);
 let outText=compile.stdout??'';const idx=outText.indexOf('{');if(idx<0)throw new Error('solc_json_output_missing');outText=outText.slice(idx);const compiled=JSON.parse(outText);
 const hardErrors=(compiled.errors??[]).filter(e=>e.severity==='error');if(hardErrors.length)throw new Error(`solc_errors:${JSON.stringify(hardErrors).slice(0,3000)}`);
 const c=compiled.contracts?.['Multicall3.sol']?.Multicall3;if(!c)throw new Error('compiled_contract_missing');
 const replay=runtimeSummary(c.evm?.deployedBytecode?.object??'');
 const [chain,head]=await Promise.all([rpc('eth_chainId'),rpc('eth_blockNumber')]);if(String(chain.result).toLowerCase()!=='0x34fb5e38')throw new Error(`chain_id_mismatch:${chain.result}`);const deployed=await rpc('eth_getCode',[ADDRESS,head.result]);const live=runtimeSummary(deployed.result);
 fs.writeFileSync(path.join(OUT,'REPLAY_RUNTIME.hex'),replay.hex+'\n');fs.writeFileSync(path.join(OUT,'LIVE_RUNTIME.hex'),live.hex+'\n');
 const replayCore=stripMetadata(replay.hex),liveCore=stripMetadata(live.hex);
 result.observations={source:{httpStatus:source.status,responseSha256:source.sha256,verifiedAt:j.verifiedAt,matchId:j.matchId,match:j.match,creationMatch:j.creationMatch,runtimeMatch:j.runtimeMatch,stdJsonInputSha256:originalInputSha,sourceBytes:Buffer.byteLength(std.sources['Multicall3.sol'].content),sourceSha256:sha(Buffer.from(std.sources['Multicall3.sol'].content)),compilation:j.compilation},toolchain:{node:process.version,npmPackageVersion:pkg.version,solcVersionOutput:versionText},replay:{bytes:replay.bytes,sha256:replay.sha256,coreBytes:replayCore.length/2,coreSha256:sha(Buffer.from(replayCore,'hex'))},live:{blockTag:head.result,bytes:live.bytes,sha256:live.sha256,coreBytes:liveCore.length/2,coreSha256:sha(Buffer.from(liveCore,'hex'),),rpcEvidence:{chain:chain.responseSha256,head:head.responseSha256,code:deployed.responseSha256}}};
 result.checks={sourceVerificationExact:j.match==='exact_match'&&j.creationMatch==='exact_match'&&j.runtimeMatch==='exact_match',compilerExact:versionText.includes(EXPECTED_COMPILER),optimizerExact:std.settings.optimizer.enabled===true&&std.settings.optimizer.runs===200,replayExpectedBytes:replay.bytes===EXPECTED_RUNTIME_BYTES,replayExpectedSha:replay.sha256===EXPECTED_RUNTIME_SHA,liveExpectedBytes:live.bytes===EXPECTED_RUNTIME_BYTES,liveExpectedSha:live.sha256===EXPECTED_RUNTIME_SHA,replayLiveByteExact:replay.hex===live.hex,replayLiveCoreExact:replayCore===liveCore};
 const pass=Object.values(result.checks).every(Boolean);
 if(pass){result.status='PASS_BOUNDED_SOURCE_TO_CURRENT_RUNTIME_IDENTITY';result.credit.currentRuntimeBytecode=1;result.credit.sourceDeploymentIdentity=1;}else result.status='FAIL_NO_PRODUCT_CREDIT';
}catch(e){result.status='BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
fs.writeFileSync(path.join(OUT,'P74_ANCIENT8_OFFICIAL_MULTICALL3_REPLAY.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checks,observations:result.observations,credit:result.credit,errors:result.errors},null,2));
