#!/usr/bin/env node
import fs from 'node:fs';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
const args=process.argv.slice(2);const arg=(n)=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
const proofPath=arg('--proof'),checkpointsPath=arg('--checkpoints'),expectedEnvironment=arg('--environment'),expectedAudience=arg('--audience'),trustedFingerprint=arg('--trusted-fingerprint');
if(!proofPath||!checkpointsPath){console.error('usage: verify-release-trust-consistency.mjs --proof proof.json --checkpoints checkpoints.json [--environment production] [--audience ...] [--trusted-fingerprint sha256]');process.exit(2)}
const sha=v=>createHash('sha256').update(v).digest('hex');
const stable=value=>{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`};
const proof=JSON.parse(fs.readFileSync(proofPath,'utf8')),checkpoints=JSON.parse(fs.readFileSync(checkpointsPath,'utf8'));
const fail=m=>{throw new Error(m)};
if(proof.schemaVersion!=='velmere.release-trust-consistency-proof.v1')fail('consistency_schema_invalid');
if(!Array.isArray(checkpoints)||checkpoints.length<2)fail('consistency_checkpoints_invalid');
const first=checkpoints[0],last=checkpoints.at(-1),p=proof.payload;
if(expectedEnvironment&&p.environment!==expectedEnvironment)fail('consistency_environment_mismatch');
if(expectedAudience&&p.audienceHash!==sha(expectedAudience))fail('consistency_audience_mismatch');
if(p.fromCheckpointDigest!==first.checkpointDigest||p.toCheckpointDigest!==last.checkpointDigest)fail('consistency_endpoint_mismatch');
if(JSON.stringify(p.checkpointDigests)!==JSON.stringify(checkpoints.map(c=>c.checkpointDigest)))fail('consistency_digest_chain_mismatch');
for(let i=1;i<checkpoints.length;i++){const prev=checkpoints[i-1],cur=checkpoints[i];if(cur.payload.previousCheckpointDigest!==prev.checkpointDigest||cur.payload.sequence!==prev.payload.sequence+1)fail('consistency_checkpoint_gap')}
const keyMap=new Map(last.payload.keys.map(k=>[k.keyId,k]));let active=0;const seen=new Set();
if(proof.signatures.length<p.signatureThreshold)fail('consistency_threshold_not_met');
for(const s of proof.signatures){if(seen.has(s.keyId))fail('consistency_duplicate_signer');seen.add(s.keyId);const k=keyMap.get(s.keyId);if(!k||k.status==='revoked')fail('consistency_signer_revoked');if(k.status==='active')active++;const pub=createPublicKey(k.publicKeyPem);if(!cryptoVerify(null,Buffer.from(stable(p)),pub,Buffer.from(s.signature,'base64url')))fail('consistency_signature_invalid')}
if(active<1)fail('consistency_active_signer_required');
const signatures=[...proof.signatures].sort((a,b)=>a.keyId.localeCompare(b.keyId));if(proof.proofDigest!==sha(stable({payload:p,signatures})))fail('consistency_proof_digest_invalid');
if(trustedFingerprint){const activeKeys=last.payload.keys.filter(k=>k.status==='active');if(!activeKeys.some(k=>k.fingerprint===trustedFingerprint))fail('consistency_trusted_fingerprint_missing')}
console.log(JSON.stringify({schemaVersion:'velmere.release-trust-consistency-independent-verifier.v1',ok:true,proofDigest:proof.proofDigest,fromSequence:p.fromSequence,toSequence:p.toSequence,mode:p.mode,checkpointCount:p.checkpointDigests.length},null,2));
