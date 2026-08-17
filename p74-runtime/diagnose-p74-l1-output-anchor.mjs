import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-l1-anchor-out');
const L2OO='0xb09dc08428c8b4efb4ff9c0827386cdf34277996';
const MESSAGE_PASSER='0x4200000000000000000000000000000000000016';
const A8='https://scan.ancient8.gg/rpc';
const ETH=[
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://cloudflare-eth.com',
  'https://eth.drpc.org',
  'https://1rpc.io/eth',
  'https://rpc.flashbots.net',
  'https://rpc.ankr.com/eth',
];
const SEL={latestBlockNumber:'0x4599c788',latestOutputIndex:'0x69f16eec',getL2Output:'0xa25ae557'};
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function q64(n){return BigInt(n).toString(16).padStart(64,'0');}
function wordHex(v){if(typeof v!=='string'||!/^0x[0-9a-fA-F]*$/.test(v))throw new Error(`invalid_hex:${v}`);return v.slice(2);}
function asUint(v){return BigInt(v);}
function decodeOutput(raw){const h=wordHex(raw);if(h.length<192)throw new Error(`short_output:${h.length}`);return{outputRoot:`0x${h.slice(0,64)}`.toLowerCase(),timestamp:BigInt(`0x${h.slice(64,128)}`).toString(10),l2BlockNumber:BigInt(`0x${h.slice(128,192)}`).toString(10)};}
async function rpcOnce(url,method,params=[],attempt=1){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const started=Date.now();try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74L1Anchor/2.0'},body,signal:AbortSignal.timeout(12000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{return{status:'FAIL',url,method,attempt,httpStatus:r.status,error:`invalid_json:${text.slice(0,180)}`,latencyMs:Date.now()-started}};if(!r.ok||j?.error||j?.result===undefined||j?.result===null)return{status:'FAIL',url,method,attempt,httpStatus:r.status,error:JSON.stringify(j?.error??j).slice(0,260),latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text))};return{status:'PASS',url,method,attempt,httpStatus:r.status,result:j.result,latencyMs:Date.now()-started,responseDigest:sha(Buffer.from(text)),requestDigest:sha(Buffer.from(body))};}catch(e){return{status:'FAIL',url,method,attempt,error:e instanceof Error?`${e.name}:${e.message}`:String(e),latencyMs:Date.now()-started};}}
async function rpc(url,method,params=[]){const attempts=[];for(let i=1;i<=3;i++){const x=await rpcOnce(url,method,params,i);attempts.push(x);if(x.status==='PASS')return{...x,attempts};if(i<3)await sleep([250,800][i-1]);}return{...attempts.at(-1),attempts};}
async function ethProvider(url){const [chain,head]=await Promise.all([rpc(url,'eth_chainId'),rpc(url,'eth_blockNumber')]);return{url,chain,head};}
async function main(){
 const result={schemaVersion:'velmere.p74.l1-output-anchor-discovery.v2',status:'DISCOVERY_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),l1:{chain:'ethereum',oracle:L2OO,providers:ETH},l2:{chain:'ancient8',chainId:888888888,rpc:'scan.ancient8.gg/rpc',messagePasser:MESSAGE_PASSER},observations:{},anchor:null,errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Control-only L1/L2 anchor discovery. No product/release credit. At least two independent Ethereum providers must agree at one exact L1 block. L2 data remain observations until the OP output-root commitment and state/account proofs are independently recomputed and matched.'};
 try{
  const identities=await Promise.all(ETH.map(ethProvider));result.observations.ethereumIdentities=identities;
  const good=identities.filter(x=>x.chain.status==='PASS'&&x.head.status==='PASS'&&String(x.chain.result).toLowerCase()==='0x1');
  result.observations.ethereumProviderSummary={total:identities.length,identityAndHeadPass:good.length,passHosts:good.map(x=>new URL(x.url).hostname),failures:identities.filter(x=>!good.includes(x)).map(x=>({host:new URL(x.url).hostname,chain:x.chain.status==='PASS'?String(x.chain.result):x.chain.error,head:x.head.status==='PASS'?String(x.head.result):x.head.error}))};
  if(good.length<2)throw new Error(`ethereum_provider_quorum_insufficient:${good.length}`);
  const heads=good.map(x=>BigInt(x.head.result));let min=heads[0];for(const n of heads)if(n<min)min=n;if(min<16n)throw new Error('ethereum_head_too_low');const l1Block=min-12n,l1Tag=`0x${l1Block.toString(16)}`;
  const oracleRows=await Promise.all(good.map(async p=>{const [code,latestBlockRaw,latestIndexRaw]=await Promise.all([rpc(p.url,'eth_getCode',[L2OO,l1Tag]),rpc(p.url,'eth_call',[{to:L2OO,data:SEL.latestBlockNumber},l1Tag]),rpc(p.url,'eth_call',[{to:L2OO,data:SEL.latestOutputIndex},l1Tag])]);let decoded=null,error=null;try{if(code.status!=='PASS'||latestBlockRaw.status!=='PASS'||latestIndexRaw.status!=='PASS')throw new Error(`oracle_call_failed:code=${code.status}:latestBlock=${latestBlockRaw.status}:latestIndex=${latestIndexRaw.status}`);const latestBlock=asUint(latestBlockRaw.result),latestIndex=asUint(latestIndexRaw.result);const outputRaw=await rpc(p.url,'eth_call',[{to:L2OO,data:`${SEL.getL2Output}${q64(latestIndex)}`},l1Tag]);if(outputRaw.status!=='PASS')throw new Error(`getL2Output_failed:${outputRaw.error??'unknown'}`);decoded={latestBlockNumber:latestBlock.toString(10),latestOutputIndex:latestIndex.toString(10),output:decodeOutput(outputRaw.result),oracleCodeSha256:sha(Buffer.from(wordHex(code.result),'hex')),oracleCodeBytes:Buffer.from(wordHex(code.result),'hex').length,getL2Output:outputRaw};}catch(e){error=e instanceof Error?e.message:String(e);}return{provider:p.url,l1BlockTag:l1Tag,code,latestBlockRaw,latestIndexRaw,decoded,error};}));
  result.observations.oracleRows=oracleRows;
  const proved=oracleRows.filter(x=>x.decoded&&x.decoded.oracleCodeBytes>0);result.observations.oracleSummary={l1BlockNumber:l1Block.toString(10),l1BlockTag:l1Tag,provedCount:proved.length,provedHosts:proved.map(x=>new URL(x.provider).hostname),failures:oracleRows.filter(x=>!x.decoded).map(x=>({host:new URL(x.provider).hostname,error:x.error,code:x.code.error??null,latestBlock:x.latestBlockRaw.error??null,latestIndex:x.latestIndexRaw.error??null}))};
  if(proved.length<2)throw new Error(`oracle_provider_quorum_insufficient:${proved.length}`);
  const identitiesKey=proved.map(x=>JSON.stringify({code:x.decoded.oracleCodeSha256,latest:x.decoded.latestBlockNumber,index:x.decoded.latestOutputIndex,root:x.decoded.output.outputRoot,block:x.decoded.output.l2BlockNumber}));
  if(new Set(identitiesKey).size!==1)throw new Error('oracle_provider_disagreement');
  const selected=proved[0].decoded;const l2Block=BigInt(selected.output.l2BlockNumber),l2Tag=`0x${l2Block.toString(16)}`;
  const [l2Chain,l2BlockRow,msgProof,canonicalProof,officialProof,canonicalCode,officialCode]=await Promise.all([
    rpc(A8,'eth_chainId'),rpc(A8,'eth_getBlockByNumber',[l2Tag,false]),rpc(A8,'eth_getProof',[MESSAGE_PASSER,[],l2Tag]),rpc(A8,'eth_getProof',['0xca11bde05977b3631167028862be2a173976ca11',[],l2Tag]),rpc(A8,'eth_getProof',['0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',[],l2Tag]),rpc(A8,'eth_getCode',['0xca11bde05977b3631167028862be2a173976ca11',l2Tag]),rpc(A8,'eth_getCode',['0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',l2Tag])
  ]);
  result.observations.l2={l2Chain,l2Block:l2BlockRow,messagePasserProof:msgProof,canonicalProof,officialProof,canonicalCode,officialCode};
  if(l2Chain.status!=='PASS'||String(l2Chain.result).toLowerCase()!=='0x34fb5e38')throw new Error(`l2_chain_mismatch:${l2Chain.result}`);
  if(l2BlockRow.status!=='PASS'||!l2BlockRow.result||typeof l2BlockRow.result!=='object')throw new Error(`l2_block_unavailable:${l2BlockRow.error??'unknown'}`);
  if(msgProof.status!=='PASS'||canonicalProof.status!=='PASS'||officialProof.status!=='PASS')throw new Error(`l2_eth_getProof_unavailable:msg=${msgProof.status}:canonical=${canonicalProof.status}:official=${officialProof.status}`);
  if(canonicalCode.status!=='PASS'||officialCode.status!=='PASS')throw new Error('l2_code_unavailable_at_output_block');
  const block=l2BlockRow.result;const proofSummary=(x)=>({address:x.result?.address??null,accountProofNodes:Array.isArray(x.result?.accountProof)?x.result.accountProof.length:null,balance:x.result?.balance??null,codeHash:x.result?.codeHash??null,nonce:x.result?.nonce??null,storageHash:x.result?.storageHash??null,storageProofCount:Array.isArray(x.result?.storageProof)?x.result.storageProof.length:null});
  const codeSummary=(x)=>{const hex=wordHex(x.result);const b=Buffer.from(hex,'hex');return{byteLength:b.length,sha256:sha(b),empty:b.length===0};};
  result.anchor={l1BlockNumber:l1Block.toString(10),l1BlockTag:l1Tag,l2OutputOracle:L2OO,l2Output:selected.output,l2BlockNumber:l2Block.toString(10),l2BlockHash:block.hash??null,l2StateRoot:block.stateRoot??null,messagePasser:proofSummary(msgProof),canonicalExpected:{...proofSummary(canonicalProof),runtime:codeSummary(canonicalCode)},officialDocumented:{...proofSummary(officialProof),runtime:codeSummary(officialCode)},oracleEthereumProviderCount:proved.length,oracleEthereumProviders:proved.map(x=>new URL(x.provider).hostname)};
  result.status='DISCOVERY_PASS_NO_PRODUCT_CREDIT';
 }catch(e){result.status='DISCOVERY_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
 fs.writeFileSync(path.join(OUT,'P74_L1_OUTPUT_ANCHOR_DISCOVERY.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{const fail={schemaVersion:'velmere.p74.l1-output-anchor-harness-failure.v2',status:'HARNESS_FAILURE_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),error:e instanceof Error?`${e.name}:${e.message}`:String(e),credit:{product:0,currentRuntimeBytecode:0,sale:0,live:false}};fs.writeFileSync(path.join(OUT,'P74_L1_OUTPUT_ANCHOR_HARNESS_FAILURE.json'),JSON.stringify(fail,null,2)+'\n');console.log(JSON.stringify(fail,null,2));process.exitCode=1;});
