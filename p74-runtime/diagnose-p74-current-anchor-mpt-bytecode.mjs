import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-current-anchor-mpt-out');
const RPC='https://scan.ancient8.gg/rpc';
const CHAIN_ID='0x34fb5e38';
const L2_BLOCK=39655449n;
const L2_TAG=`0x${L2_BLOCK.toString(16)}`;
const FINALIZED_ANCHOR_ROOT='0x0c22130348bd1270e877e267bb280f78eb0c2f105060863989d81dc3fb989398';
const ANCHOR_GAME='0x19bb0cd43f7dd737964169cfc8223c2132140591';
const ANCHOR_EVIDENCE_RUN='32054831168';
const MESSAGE_PASSER='0x4200000000000000000000000000000000000016';
const P70_CANONICAL_RUNTIME_SHA256='2756d7c52baee85cacb504f6ee1df7aad6809ac8d94a4a111d76991f90d36d6e';
const TARGETS=Object.freeze({
  canonicalExpected:'0xca11bde05977b3631167028862be2a173976ca11',
  officialDocumented:'0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',
});
fs.mkdirSync(OUT,{recursive:true});

const MASK=(1n<<64n)-1n;
const RC=[0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const RHO=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
function rotl(x,n){const b=BigInt(n);return n===0?x&MASK:((x<<b)|(x>>(64n-b)))&MASK;}
function keccakF(s){for(const rc of RC){const c=new Array(5);for(let x=0;x<5;x++)c[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];const d=new Array(5);for(let x=0;x<5;x++)d[x]=c[(x+4)%5]^rotl(c[(x+1)%5],1);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]=(s[x+5*y]^d[x])&MASK;const b=new Array(25).fill(0n);for(let y=0;y<5;y++)for(let x=0;x<5;x++)b[y+5*((2*x+3*y)%5)]=rotl(s[x+5*y],RHO[x+5*y]);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]=(b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]))&MASK;s[0]=(s[0]^rc)&MASK;}return s;}
function keccak256(data){const input=Buffer.from(data);const rate=136;const paddedLength=Math.ceil((input.length+1)/rate)*rate||rate;const p=Buffer.alloc(paddedLength);input.copy(p);p[input.length]^=0x01;p[p.length-1]^=0x80;const s=new Array(25).fill(0n);for(let off=0;off<p.length;off+=rate){for(let i=0;i<rate;i++)s[Math.floor(i/8)]^=BigInt(p[off+i])<<BigInt((i%8)*8);keccakF(s);}const out=Buffer.alloc(32);for(let i=0;i<32;i++)out[i]=Number((s[Math.floor(i/8)]>>BigInt((i%8)*8))&0xffn);return out;}
const hex=b=>`0x${Buffer.from(b).toString('hex')}`;
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function hexBytes(v,n=null){if(typeof v!=='string'||!/^0x[0-9a-fA-F]*$/.test(v)||v.length%2!==0)throw new Error(`invalid_hex:${String(v).slice(0,90)}`);const b=Buffer.from(v.slice(2),'hex');if(n!==null&&b.length!==n)throw new Error(`hex_length:${b.length}:expected:${n}`);return b;}
function nibbles(buf){const out=[];for(const byte of buf){out.push(byte>>4,byte&15);}return out;}
function compactPath(buf){const ns=nibbles(buf);if(ns.length<2)throw new Error('mpt_compact_path_too_short');const flag=ns[0];if(flag>3)throw new Error(`mpt_compact_flag:${flag}`);const leaf=(flag&2)!==0;const odd=(flag&1)!==0;if(!odd&&ns[1]!==0)throw new Error('mpt_compact_even_padding_nonzero');return{leaf,path:ns.slice(odd?1:2)};}
function readLen(buf,start,n){if(n<=0||start+n>buf.length)throw new Error('rlp_length_oob');let value=0;for(let i=0;i<n;i++)value=value*256+buf[start+i];if(value<56)throw new Error('rlp_noncanonical_long_length');return value;}
function rlpAt(buf,offset=0){if(offset>=buf.length)throw new Error('rlp_offset_oob');const p=buf[offset];if(p<=0x7f)return{value:buf.subarray(offset,offset+1),next:offset+1};if(p<=0xb7){const len=p-0x80,start=offset+1,end=start+len;if(end>buf.length)throw new Error('rlp_short_string_oob');if(len===1&&buf[start]<=0x7f)throw new Error('rlp_noncanonical_single_byte');return{value:buf.subarray(start,end),next:end};}if(p<=0xbf){const ll=p-0xb7,len=readLen(buf,offset+1,ll),start=offset+1+ll,end=start+len;if(end>buf.length)throw new Error('rlp_long_string_oob');return{value:buf.subarray(start,end),next:end};}if(p<=0xf7){const len=p-0xc0,start=offset+1,end=start+len;if(end>buf.length)throw new Error('rlp_short_list_oob');const list=[];let cur=start;while(cur<end){const row=rlpAt(buf,cur);list.push(row.value);cur=row.next;}if(cur!==end)throw new Error('rlp_short_list_boundary');return{value:list,next:end};}const ll=p-0xf7,len=readLen(buf,offset+1,ll),start=offset+1+ll,end=start+len;if(end>buf.length)throw new Error('rlp_long_list_oob');const list=[];let cur=start;while(cur<end){const row=rlpAt(buf,cur);list.push(row.value);cur=row.next;}if(cur!==end)throw new Error('rlp_long_list_boundary');return{value:list,next:end};}
function rlp(buf){const row=rlpAt(buf,0);if(row.next!==buf.length)throw new Error('rlp_trailing_bytes');return row.value;}
function isBuf(v){return Buffer.isBuffer(v)||v instanceof Uint8Array;}
function same(a,b){return Buffer.from(a).equals(Buffer.from(b));}
function verifyAccountProof(stateRoot,address,proofHex){if(!Array.isArray(proofHex)||proofHex.length===0)throw new Error('mpt_account_proof_missing');const key=nibbles(keccak256(hexBytes(address,20)));let pos=0;let expected=Buffer.from(stateRoot);let terminal=null;let used=0;for(const encoded of proofHex){const raw=hexBytes(encoded);used++;if(expected.length===32){if(!same(keccak256(raw),expected))throw new Error(`mpt_hash_ref_mismatch:${used}`);}else{if(!same(raw,expected))throw new Error(`mpt_inline_ref_mismatch:${used}`);}const node=rlp(raw);if(!Array.isArray(node))throw new Error(`mpt_node_not_list:${used}`);if(node.length===17){if(pos===key.length){if(!isBuf(node[16])||node[16].length===0)throw new Error('mpt_branch_terminal_empty');terminal=Buffer.from(node[16]);break;}const child=node[key[pos++]];if(!isBuf(child)||child.length===0)throw new Error(`mpt_branch_child_empty:${used}`);expected=Buffer.from(child);continue;}if(node.length===2){if(!isBuf(node[0])||!isBuf(node[1]))throw new Error(`mpt_kv_node_invalid:${used}`);const cp=compactPath(Buffer.from(node[0]));for(let i=0;i<cp.path.length;i++){if(pos+i>=key.length||key[pos+i]!==cp.path[i])throw new Error(`mpt_path_mismatch:${used}:${i}`);}pos+=cp.path.length;if(cp.leaf){if(pos!==key.length)throw new Error(`mpt_leaf_path_incomplete:${pos}:${key.length}`);terminal=Buffer.from(node[1]);break;}if(node[1].length===0)throw new Error(`mpt_extension_child_empty:${used}`);expected=Buffer.from(node[1]);continue;}throw new Error(`mpt_node_arity:${node.length}`);}if(!terminal)throw new Error('mpt_no_terminal_value');if(used!==proofHex.length)throw new Error(`mpt_unused_nodes:${used}:${proofHex.length}`);const account=rlp(terminal);if(!Array.isArray(account)||account.length!==4||!account.every(isBuf))throw new Error('mpt_account_rlp_invalid');const storageRoot=Buffer.from(account[2]),codeHash=Buffer.from(account[3]);if(storageRoot.length!==32||codeHash.length!==32)throw new Error('mpt_account_hash_length');return{usedNodes:used,nonce:hex(account[0]),balance:hex(account[1]),storageRoot:hex(storageRoot),codeHash:hex(codeHash)};}
function assertVectors(){if(hex(keccak256(Buffer.alloc(0)))!=='0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')throw new Error('keccak_empty_vector_failed');if(hex(keccak256(Buffer.from('abc')))!=='0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45')throw new Error('keccak_abc_vector_failed');const enc=Buffer.from('c88363617483646f67','hex');const decoded=rlp(enc);if(!Array.isArray(decoded)||decoded.length!==2||Buffer.from(decoded[0]).toString()!=='cat'||Buffer.from(decoded[1]).toString()!=='dog')throw new Error('rlp_vector_failed');}
async function rpc(method,params=[]){const body=JSON.stringify({jsonrpc:'2.0',id:7404,method,params});const started=Date.now();const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'VelmereP74AnchorMPT/1.0'},body,signal:AbortSignal.timeout(20000),cache:'no-store'});const text=await response.text();let json;try{json=JSON.parse(text)}catch{throw new Error(`${method}:invalid_json:http_${response.status}:${text.slice(0,180)}`)}if(!response.ok||json?.error||json?.result===undefined||json?.result===null)throw new Error(`${method}:rpc_error:http_${response.status}:${JSON.stringify(json?.error??json).slice(0,260)}`);return{result:json.result,statusCode:response.status,latencyMs:Date.now()-started,responseSha256:sha256(Buffer.from(text)),requestSha256:sha256(Buffer.from(body))};}

const result={schemaVersion:'velmere.p74.current-finalized-anchor-mpt-bytecode-diagnostic.v1',status:'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',generatedAt:new Date().toISOString(),chain:'ancient8',chainIdDecimal:888888888,l2BlockNumber:L2_BLOCK.toString(),l2BlockTag:L2_TAG,finalizedAnchorRoot:FINALIZED_ANCHOR_ROOT,anchorGame:ANCHOR_GAME,anchorEvidenceRun:ANCHOR_EVIDENCE_RUN,p70CanonicalRuntimeSha256:`sha256:${P70_CANONICAL_RUNTIME_SHA256}`,targets:TARGETS,observations:{},checks:{},errors:[],credit:{product:0,currentRuntimeBytecode:0,vulnerabilityGroundTruth:0,customerFinal:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Control-only cryptographic diagnostic. PASS requires the exact L2 block output root to equal the separately L1-finalized fault-proof anchor, account proofs to verify independently against stateRoot, and runtime bytes to hash to the proven account codeHash. Even PASS grants zero product/release credit until integrated into exact product source and exact-Windows/live regression evidence.'};
try{
  assertVectors();result.checks.keccakAndRlpKnownVectors=true;
  const [chain,block,msgProof,canonicalProof,officialProof,canonicalCode,officialCode]=await Promise.all([
    rpc('eth_chainId'),rpc('eth_getBlockByNumber',[L2_TAG,false]),rpc('eth_getProof',[MESSAGE_PASSER,[],L2_TAG]),rpc('eth_getProof',[TARGETS.canonicalExpected,[],L2_TAG]),rpc('eth_getProof',[TARGETS.officialDocumented,[],L2_TAG]),rpc('eth_getCode',[TARGETS.canonicalExpected,L2_TAG]),rpc('eth_getCode',[TARGETS.officialDocumented,L2_TAG]),
  ]);
  if(String(chain.result).toLowerCase()!==CHAIN_ID)throw new Error(`chain_id_mismatch:${chain.result}`);
  const b=block.result;if(!b||typeof b!=='object')throw new Error('block_missing');if(BigInt(b.number)!==L2_BLOCK)throw new Error(`block_number_mismatch:${b.number}`);
  const stateRoot=hexBytes(b.stateRoot,32),blockHash=hexBytes(b.hash,32);
  const msgAccount=verifyAccountProof(stateRoot,MESSAGE_PASSER,msgProof.result.accountProof);
  const canonicalAccount=verifyAccountProof(stateRoot,TARGETS.canonicalExpected,canonicalProof.result.accountProof);
  const officialAccount=verifyAccountProof(stateRoot,TARGETS.officialDocumented,officialProof.result.accountProof);
  const canonicalBytes=hexBytes(canonicalCode.result),officialBytes=hexBytes(officialCode.result);
  const canonicalCodeKeccak=hex(keccak256(canonicalBytes)),officialCodeKeccak=hex(keccak256(officialBytes));
  const canonicalCodeSha=sha256(canonicalBytes),officialCodeSha=sha256(officialBytes);
  const computedOutputRoot=hex(keccak256(Buffer.concat([Buffer.alloc(32),stateRoot,hexBytes(msgAccount.storageRoot,32),blockHash])));
  result.observations={chainId:chain.result,block:{number:b.number,hash:b.hash,stateRoot:b.stateRoot,timestamp:b.timestamp},messagePasser:{account:msgAccount,rpcStorageHash:String(msgProof.result.storageHash).toLowerCase()},canonicalExpected:{account:canonicalAccount,rpcCodeHash:String(canonicalProof.result.codeHash).toLowerCase(),runtimeBytes:canonicalBytes.length,runtimeKeccak256:canonicalCodeKeccak,runtimeSha256:`sha256:${canonicalCodeSha}`},officialDocumented:{account:officialAccount,rpcCodeHash:String(officialProof.result.codeHash).toLowerCase(),runtimeBytes:officialBytes.length,runtimeKeccak256:officialCodeKeccak,runtimeSha256:`sha256:${officialCodeSha}`},computedOutputRoot};
  result.checks={...result.checks,
    chainIdExact:String(chain.result).toLowerCase()===CHAIN_ID,
    blockExact:BigInt(b.number)===L2_BLOCK,
    messagePasserProofVerified:true,
    canonicalAccountProofVerified:true,
    officialAccountProofVerified:true,
    messagePasserStorageRootMatchesRpc:msgAccount.storageRoot===String(msgProof.result.storageHash).toLowerCase(),
    canonicalCodeHashMatchesProof:canonicalCodeKeccak===canonicalAccount.codeHash&&canonicalAccount.codeHash===String(canonicalProof.result.codeHash).toLowerCase(),
    officialCodeHashMatchesProof:officialCodeKeccak===officialAccount.codeHash&&officialAccount.codeHash===String(officialProof.result.codeHash).toLowerCase(),
    canonicalRuntimeNonEmpty:canonicalBytes.length>0,
    officialRuntimeNonEmpty:officialBytes.length>0,
    runtimesDiffer:canonicalCodeKeccak!==officialCodeKeccak,
    outputRootMatchesFinalizedL1Anchor:computedOutputRoot===FINALIZED_ANCHOR_ROOT,
    officialDeploymentMatchesP70CanonicalRuntime:officialCodeSha===P70_CANONICAL_RUNTIME_SHA256,
    canonicalExpectedDoesNotMatchP70CanonicalRuntime:canonicalCodeSha!==P70_CANONICAL_RUNTIME_SHA256,
  };
  result.status=Object.values(result.checks).every(Boolean)?'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT':'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
}catch(error){result.status='DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';result.errors.push(error instanceof Error?`${error.name}:${error.message}`:String(error));}
fs.writeFileSync(path.join(OUT,'P74_CURRENT_FINALIZED_ANCHOR_MPT_BYTECODE_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checks,observations:result.observations,errors:result.errors,credit:result.credit},null,2));
