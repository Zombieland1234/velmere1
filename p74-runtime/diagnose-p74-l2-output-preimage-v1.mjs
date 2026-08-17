import fs from 'node:fs';
import path from 'node:path';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-l2-preimage-out');
const RPC='https://scan.ancient8.gg/rpc';
const CHAIN='0x34fb5e38';
const L2_BLOCK=23664600n;
const L2_TAG=`0x${L2_BLOCK.toString(16)}`;
const EXPECTED_OUTPUT_ROOT='0x2a0440424a946f6a2ce6309ab48333bdcd191a86631010a00ece069c4e47dc4e';
const MESSAGE_PASSER='0x4200000000000000000000000000000000000016';
const TARGETS={canonicalExpected:'0xca11bde05977b3631167028862be2a173976ca11',officialDocumented:'0xb76d6e8c82d06fd262ef3799db73d5a724108d4e'};
fs.mkdirSync(OUT,{recursive:true});

const MASK=(1n<<64n)-1n;
const RC=[0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const RHO=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
function rotl(x,n){const b=BigInt(n);return n===0?x&MASK:((x<<b)|(x>>(64n-b)))&MASK;}
function keccakF(s){for(const rc of RC){const c=new Array(5);for(let x=0;x<5;x++)c[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];const d=new Array(5);for(let x=0;x<5;x++)d[x]=c[(x+4)%5]^rotl(c[(x+1)%5],1);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]=(s[x+5*y]^d[x])&MASK;const b=new Array(25).fill(0n);for(let y=0;y<5;y++)for(let x=0;x<5;x++)b[y+5*((2*x+3*y)%5)]=rotl(s[x+5*y],RHO[x+5*y]);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]=(b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]))&MASK;s[0]=(s[0]^rc)&MASK;}return s;}
function keccak256(data){const input=Buffer.from(data);const rate=136;const paddedLength=Math.ceil((input.length+1)/rate)*rate||rate;const p=Buffer.alloc(paddedLength);input.copy(p);p[input.length]^=0x01;p[p.length-1]^=0x80;const s=new Array(25).fill(0n);for(let off=0;off<p.length;off+=rate){for(let i=0;i<rate;i++)s[Math.floor(i/8)]^=BigInt(p[off+i])<<BigInt((i%8)*8);keccakF(s);}const out=Buffer.alloc(32);for(let i=0;i<32;i++)out[i]=Number((s[Math.floor(i/8)]>>BigInt((i%8)*8))&0xffn);return out;}
function hexBytes(v,n=null){if(typeof v!=='string'||!/^0x[0-9a-fA-F]*$/.test(v)||v.length%2!==0)throw new Error(`invalid_hex:${String(v).slice(0,90)}`);const b=Buffer.from(v.slice(2),'hex');if(n!==null&&b.length!==n)throw new Error(`hex_length:${b.length}:expected:${n}`);return b;}
const hex=b=>`0x${Buffer.from(b).toString('hex')}`;
function assertKeccakVectors(){const empty=hex(keccak256(Buffer.alloc(0)));const abc=hex(keccak256(Buffer.from('abc')));if(empty!=='0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')throw new Error(`keccak_empty_vector_failed:${empty}`);if(abc!=='0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45')throw new Error(`keccak_abc_vector_failed:${abc}`);}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:74,method,params});const started=Date.now();const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74L2Preimage/1.0'},body,signal:AbortSignal.timeout(15000),cache:'no-store'});const text=await r.text();let j;try{j=JSON.parse(text)}catch{throw new Error(`${method}:invalid_json:http_${r.status}:${text.slice(0,180)}`)}if(!r.ok||j?.error||j?.result===undefined||j?.result===null)throw new Error(`${method}:rpc_error:http_${r.status}:${JSON.stringify(j?.error??j).slice(0,260)}`);return{result:j.result,statusCode:r.status,latencyMs:Date.now()-started,responseDigest:hex(keccak256(Buffer.from(text))),requestDigest:hex(keccak256(Buffer.from(body)))};}
function proofSummary(row){return{address:row.address??null,balance:row.balance??null,nonce:row.nonce??null,codeHash:row.codeHash?.toLowerCase?.()??null,storageHash:row.storageHash?.toLowerCase?.()??null,accountProofNodes:Array.isArray(row.accountProof)?row.accountProof.length:null,storageProofCount:Array.isArray(row.storageProof)?row.storageProof.length:null};}

const result={schemaVersion:'velmere.p74.l2-output-preimage-diagnostic.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainIdDecimal:888888888,l2BlockNumber:L2_BLOCK.toString(),l2BlockTag:L2_TAG,expectedOutputRoot:EXPECTED_OUTPUT_ROOT,observations:{},checks:{},errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,sale:0,live:false},truthBoundary:'Control-only L2 output-preimage diagnostic. It recomputes OP output root and code hashes, but does not yet independently verify Merkle-Patricia account proofs against stateRoot. Therefore it grants zero product/release credit even on PASS.'};
try{
 assertKeccakVectors();result.checks.keccakKnownVectors=true;
 const [chain,block,msg,canonicalProof,officialProof,canonicalCode,officialCode]=await Promise.all([
   rpc('eth_chainId'),rpc('eth_getBlockByNumber',[L2_TAG,false]),rpc('eth_getProof',[MESSAGE_PASSER,[],L2_TAG]),rpc('eth_getProof',[TARGETS.canonicalExpected,[],L2_TAG]),rpc('eth_getProof',[TARGETS.officialDocumented,[],L2_TAG]),rpc('eth_getCode',[TARGETS.canonicalExpected,L2_TAG]),rpc('eth_getCode',[TARGETS.officialDocumented,L2_TAG])
 ]);
 if(String(chain.result).toLowerCase()!==CHAIN)throw new Error(`chain_id_mismatch:${chain.result}`);
 const b=block.result;if(!b||typeof b!=='object')throw new Error('block_object_missing');if(BigInt(b.number)!==L2_BLOCK)throw new Error(`block_number_mismatch:${b.number}`);
 const stateRoot=hexBytes(b.stateRoot,32),blockHash=hexBytes(b.hash,32),withdrawalRoot=hexBytes(msg.result.storageHash,32);const version=Buffer.alloc(32);
 const computedOutputRoot=hex(keccak256(Buffer.concat([version,stateRoot,withdrawalRoot,blockHash])));
 const cCode=hexBytes(canonicalCode.result),oCode=hexBytes(officialCode.result);const cCodeHash=hex(keccak256(cCode)),oCodeHash=hex(keccak256(oCode));
 result.observations={chainId:chain.result,block:{number:b.number,hash:b.hash,stateRoot:b.stateRoot,timestamp:b.timestamp},messagePasser:proofSummary(msg.result),canonicalExpected:{proof:proofSummary(canonicalProof.result),runtimeBytes:cCode.length,runtimeKeccak256:cCodeHash},officialDocumented:{proof:proofSummary(officialProof.result),runtimeBytes:oCode.length,runtimeKeccak256:oCodeHash},computedOutputRoot};
 result.checks={...result.checks,outputRootMatchesL1:computedOutputRoot===EXPECTED_OUTPUT_ROOT,canonicalCodeHashMatchesProof:cCodeHash===String(canonicalProof.result.codeHash).toLowerCase(),officialCodeHashMatchesProof:oCodeHash===String(officialProof.result.codeHash).toLowerCase(),canonicalRuntimeNonEmpty:cCode.length>0,officialRuntimeNonEmpty:oCode.length>0,runtimesDiffer:cCodeHash!==oCodeHash,messagePasserProofPresent:Array.isArray(msg.result.accountProof)&&msg.result.accountProof.length>0,canonicalProofPresent:Array.isArray(canonicalProof.result.accountProof)&&canonicalProof.result.accountProof.length>0,officialProofPresent:Array.isArray(officialProof.result.accountProof)&&officialProof.result.accountProof.length>0};
 const pass=Object.values(result.checks).every(Boolean);result.status=pass?'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
}catch(e){result.status='DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(e instanceof Error?`${e.name}:${e.message}`:String(e));}
fs.writeFileSync(path.join(OUT,'P74_L2_OUTPUT_PREIMAGE_V1.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checks,observations:result.observations,errors:result.errors},null,2));
