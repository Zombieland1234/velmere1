import fs from 'node:fs';
import path from 'node:path';

const sourcePath=path.resolve('p70-runtime/test-p70-real-multicall3-audit.mjs');
let source=fs.readFileSync(sourcePath,'utf8');
const oldEndpoints="const rpcEndpoints=['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com','https://eth.llamarpc.com'];";
const newEndpoints="const rpcEndpoints=['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com','https://eth.llamarpc.com','https://1rpc.io/eth','https://eth.drpc.org','https://rpc.flashbots.net'];";
if(!source.includes(oldEndpoints)) throw new Error('p70_expanded_rpc_preimage_missing');
source=source.replace(oldEndpoints,newEndpoints);
const oldGate="const successful=rpcRows.filter(r=>r.status==='PASS');\nif (successful.length<2)";
const newGate="const successful=rpcRows.filter(r=>r.status==='PASS');\nfs.writeFileSync(path.join(outDir,'P70_RPC_PROVIDER_DIAGNOSTIC.json'),JSON.stringify({capturedAt:new Date().toISOString(),providers:rpcRows},null,2)+'\\n');\nif (successful.length<2)";
if(!source.includes(oldGate)) throw new Error('p70_rpc_diagnostic_preimage_missing');
source=source.replace(oldGate,newGate);
const dataUrl=`data:text/javascript;base64,${Buffer.from(source,'utf8').toString('base64')}`;
await import(dataUrl);
