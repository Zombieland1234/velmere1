import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, POST } from '../../app/api/internal/r13/release/route.ts';
const token='SYNTHETIC_DIAGNOSTICS_TOKEN_NOT_REAL_123456789';
const config={VERCEL_ENV:'preview',R13_DIAGNOSTICS_TOKEN:token,VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),VERCEL_GIT_REPO_OWNER:'Zombieland1234',VERCEL_GIT_REPO_SLUG:'velmere1',VERCEL_GIT_COMMIT_REF:'r13/backend-integration-20260916'};
async function run(env,credential){const before={};for(const k of Object.keys(config)){before[k]=process.env[k];delete process.env[k];}Object.assign(process.env,env);
  try{return await GET(new Request('https://preview.invalid/api/internal/r13/release',{headers:credential?{authorization:`Bearer ${credential}`}:{}}));}
  finally{for(const k of Object.keys(config)){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}}
test('production diagnostics are absent',async()=>assert.equal((await run({...config,VERCEL_ENV:'production'},token)).status,404));
test('missing token fails closed',async()=>assert.equal((await run({...config,R13_DIAGNOSTICS_TOKEN:''},token)).status,503));
test('anonymous request denied',async()=>assert.equal((await run(config)).status,401));
test('wrong token denied',async()=>assert.equal((await run(config,'x'.repeat(48))).status,401));
test('valid pinned preview gives only safe identity',async()=>{const res=await run(config,token);assert.equal(res.status,200);const b=await res.json();assert.equal(b.commit,'a'.repeat(40));assert.equal(b.releaseDecision,'NO_GO');assert.equal(JSON.stringify(b).includes(token),false);assert.match(res.headers.get('cache-control'),/no-store/);});
test('missing SHA is not manufactured',async()=>assert.equal((await run({...config,VERCEL_GIT_COMMIT_SHA:''},token)).status,503));
test('wrong repository cannot claim this identity',async()=>assert.equal((await run({...config,VERCEL_GIT_REPO_SLUG:'other'},token)).status,503));
test('mutation method rejected',async()=>assert.equal((await POST()).status,405));
