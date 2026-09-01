#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildDynamicMarketDenominator, buildProviderCatalogSnapshot } from '../../lib/market-integrity/pass35-market-runtime-coverage.mjs';
import { buildPass35A13TokenBinding, buildPass35A13WhaleTokenDenominator, verifyPass35A13WhaleTokenDenominator } from '../../lib/market-integrity/pass35-whale-supported-token-denominator.mjs';

let checks=0;const check=(value,message)=>{checks+=1;assert.ok(value,message);};
const sha=(value)=>`sha256:${createHash('sha256').update(String(value)).digest('hex')}`;
const now='2026-07-22T20:30:00.000Z';
const assets=Array.from({length:120},(_,index)=>`T${String(index+1).padStart(3,'0')}`);
const snapshots=['binance','mexc','coinbase'].map((providerId)=>buildProviderCatalogSnapshot({providerId,providerFamily:providerId,providerState:'LIVE',observedAt:now,rawPayloadDigest:sha(providerId),termsMode:'PUBLIC_FREE_UNVERIFIED',instruments:assets.map((symbol,index)=>({providerInstrumentId:`${symbol}-${providerId}`,canonicalAssetId:`crypto:${symbol}`,assetClass:'crypto',symbol,baseSymbol:symbol,quoteSymbol:'USDT',venue:providerId,marketType:'spot',status:'ACTIVE',sourceRef:`${providerId}:${index}`}))}));
const denominator=buildDynamicMarketDenominator({snapshots,evaluatedAt:now,maxSnapshotAgeSeconds:900});
const bindings=assets.slice(0,60).map((symbol,index)=>buildPass35A13TokenBinding({canonicalAssetId:`crypto:${symbol}`,symbol,chainId:1,address:`0x${String(index+1).padStart(40,'0')}`,source:'SIGNED_FIXTURE_REGISTRY',verifiedAt:new Date(Date.parse(now)-60_000).toISOString(),expiresAt:new Date(Date.parse(now)+86_400_000).toISOString()}));
const evidence=[];
for(let index=0;index<60;index+=1){
  const canonicalAssetId=`crypto:${assets[index]}`;
  evidence.push({canonicalAssetId,capability:'holders',status:'AVAILABLE',observedAt:now,maxAgeSeconds:3600,receiptDigest:sha(`${canonicalAssetId}:holders`)});
  evidence.push({canonicalAssetId,capability:'transfers',status:'AVAILABLE',observedAt:now,maxAgeSeconds:3600,receiptDigest:sha(`${canonicalAssetId}:transfers`)});
  if(index<40)evidence.push({canonicalAssetId,capability:'labels',status:'AVAILABLE',observedAt:now,maxAgeSeconds:86_400,receiptDigest:sha(`${canonicalAssetId}:labels`)});
  if(index<20)evidence.push({canonicalAssetId,capability:'market_impact',status:'AVAILABLE',observedAt:now,maxAgeSeconds:60,receiptDigest:sha(`${canonicalAssetId}:impact`)});
}
const receipt=buildPass35A13WhaleTokenDenominator({marketDenominator:denominator,bindings,evidence,evaluatedAt:now});
check(verifyPass35A13WhaleTokenDenominator(receipt),'receipt verify');
check(receipt.assetDenominator===120,'all active assets counted');
check(receipt.boundTokenCount===60&&receipt.bindingCoverageBps===5000,'binding denominator');
check(receipt.basicEligibleCount===60,'basic eligible');
check(receipt.proEligibleCount===40,'pro eligible');
check(receipt.advancedEligibleCount===20,'advanced eligible');
check(receipt.rows.filter((row)=>!row.chainBound).every((row)=>row.blockers.includes('exact_chain_address_binding_missing')),'unbound explicit');
check(receipt.rows.every((row)=>row.sellEnabled===false),'billing lock rows');
check(receipt.sellEnabled===false&&!receipt.paidDeliveryEligible&&!receipt.liveClaimed,'global lock');
const staleEvidence=structuredClone(evidence);staleEvidence[0].observedAt='2026-07-01T00:00:00.000Z';
const stale=buildPass35A13WhaleTokenDenominator({marketDenominator:denominator,bindings,evidence:staleEvidence,evaluatedAt:now});
check(stale.basicEligibleCount===59,'stale evidence removed eligibility');
const badBinding=structuredClone(bindings[0]);badBinding.address='0x2222222222222222222222222222222222222222';
const bad=buildPass35A13WhaleTokenDenominator({marketDenominator:denominator,bindings:[badBinding,...bindings.slice(1)],evidence,evaluatedAt:now});
check(bad.boundTokenCount===59,'tampered binding rejected');
const tampered=structuredClone(receipt);tampered.boundTokenCount=120;check(!verifyPass35A13WhaleTokenDenominator(tampered),'receipt tamper rejected');
assert.throws(()=>buildPass35A13TokenBinding({canonicalAssetId:'crypto:BAD',symbol:'BAD',chainId:56,address:'0x1111111111111111111111111111111111111111',verifiedAt:now,expiresAt:new Date(Date.parse(now)+1000).toISOString()}),/token_binding_invalid/u);checks+=1;
console.log(JSON.stringify({status:'PASS_A13_WHALE_TOKEN_DENOMINATOR',checks,assetDenominator:receipt.assetDenominator,boundTokens:receipt.boundTokenCount,basicEligible:receipt.basicEligibleCount,proEligible:receipt.proEligibleCount,advancedEligible:receipt.advancedEligibleCount,bindingCoverageBps:receipt.bindingCoverageBps,allUnboundAssetsExplicitlyUnavailable:true,visualChangesMade:false,paidDeliveryEligible:false,liveClaimed:false},null,2));
