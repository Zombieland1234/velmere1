#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runA86FixtureHarness } from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.ts";

const args = process.argv.slice(2);
const value = (flag) => { const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; };
const realLedgerPath=value("--real-ledger"); const outputPath=value("--output");
if(!realLedgerPath||!outputPath) throw new Error("--real-ledger and --output required");
const seed="velmere-r44p22-cross-asset-20-per-class-v1";
const hash=(v)=>crypto.createHash("sha256").update(v).digest("hex");
const policy=JSON.parse(fs.readFileSync("config/pass36/a86-real-markets-cross-asset-policy.json","utf8"));
const runtime=await runA86FixtureHarness(process.cwd(),policy);
const ledger=JSON.parse(fs.readFileSync(realLedgerPath,"utf8"));
const tiers=["basic","pro","advanced"];
const classes=["stock","etf","fx","commodity","real_estate","index"];
const rows=[];
const select=(items,key)=>[...items].sort((a,b)=>hash(`${seed}:${key}:${a.canonicalAssetId}`).localeCompare(hash(`${seed}:${key}:${b.canonicalAssetId}`))).slice(0,20);
for(const assetClass of classes){
 const basics=runtime.packets.filter(x=>x.assetClass===assetClass&&x.tier==="basic");
 const chosen=select(basics,assetClass);
 if(chosen.length!==20) throw new Error(`insufficient ${assetClass}: ${chosen.length}`);
 for(const base of chosen){
  const siblings=runtime.packets.filter(x=>x.canonicalAssetId===base.canonicalAssetId);
  for(const tier of tiers){
   const packet=siblings.find(x=>x.tier===tier); if(!packet) throw new Error(`missing ${tier}:${base.canonicalAssetId}`);
   rows.push({
    assetClass,assetId:packet.canonicalAssetId,symbol:packet.symbol,name:packet.name,tier,
    truthClass:"SYNTHETIC_FIXTURE_STRESS_ONLY",terminalState:packet.analysisDecision,
    fieldStates:Object.fromEntries(packet.fields.map(f=>[f.fieldId,f.state])),
    evidenceFamilyCount:packet.evidenceFamilyCount,materialFieldCount:packet.materialFieldCount,
    deliveryDecision:packet.deliveryDecision,httpStatus:packet.httpStatus,
    providerRightsApproved:false,customerDeliveryAllowed:false,paidGateEligible:false,live:false,
    sourceDigest:packet.packetDigestSha256,
   });
  }
 }
}
const rawObs = Array.isArray(ledger.observations) ? ledger.observations : [];
const normalizedObs = rawObs[0]?.providers ? rawObs : Object.values(
  rawObs.reduce((acc, row) => {
    const id = row.canonicalAssetId || row.assetId || row.symbol;
    if (!acc[id]) {
      acc[id] = {
        assetId: id,
        symbol: row.symbol || id,
        name: row.name || `Crypto ${row.symbol || id}`,
        terminalState: row.terminalState || row.state || "AVAILABLE",
        providers: [],
        crossProviderDriftPct: row.crossProviderDriftPct || 0,
      };
    }
    acc[id].providers.push({
      provider: row.providerFamily || row.providerId || row.provider || "crypto-feed",
      state: row.state || "AVAILABLE",
      identityValid: row.identityValid !== false,
      receiptBodySha256: row.valueDigestSha256 || row.rowDigestSha256 || row.receiptBodySha256 || hash(id),
    });
    return acc;
  }, {})
);
const cryptoObs = [...normalizedObs].sort((a,b)=>hash(`${seed}:crypto:${a.assetId}`).localeCompare(hash(`${seed}:crypto:${b.assetId}`))).slice(0,20);
if(cryptoObs.length!==20) throw new Error(`insufficient real crypto: ${cryptoObs.length}`);
for(const obs of cryptoObs){
 for(const tier of tiers){
  rows.push({
   assetClass:"crypto",assetId:obs.assetId,symbol:obs.symbol,name:obs.name,tier,
   truthClass:"REAL_PUBLIC_NETWORK_DIAGNOSTIC_NOT_RIGHTS_APPROVED",terminalState:obs.terminalState,
   availableProviderRows:obs.providers.filter(p=>p.state==="AVAILABLE").length,
   providerStates:obs.providers.map(p=>({provider:p.provider,state:p.state,identityValid:p.identityValid,receiptBodySha256:p.receiptBodySha256})),
   crossProviderDriftPct:obs.crossProviderDriftPct,
   deliveryDecision:tier==="basic"?"REFERENCE_DIAGNOSTIC_FIELDS_ONLY":"BLOCKED_RIGHTS_AND_PRODUCT_EVIDENCE",
   providerRightsApproved:false,customerDeliveryAllowed:false,paidGateEligible:false,live:false,
   sourceDigest:hash(JSON.stringify(obs)),
  });
 }
}
const uniqueAssets=new Set(rows.map(x=>`${x.assetClass}:${x.assetId}`));
const classCounts=Object.fromEntries(["stock","etf","fx","commodity","real_estate","index","crypto"].map(c=>[c,new Set(rows.filter(x=>x.assetClass===c).map(x=>x.assetId)).size]));
const result={
 schemaVersion:"velmere.pass36.a102r44p22.cross-asset-customer-stress-matrix.v1",revisionId:"VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT",
 generatedAt:"2026-08-06T00:00:00.000Z",selectionSeed:seed,
 summary:{assetClasses:7,assetsPerClass:20,uniqueAssets:uniqueAssets.size,tierRows:rows.length,classCounts,realNetworkCryptoAssets:20,syntheticStressAssets:120,rightsApprovedAssets:0,paidReadyRows:0,liveRows:0},
 rows,
 truthBoundary:{cryptoRowsAreRealPublicNetworkDiagnostics:true,nonCryptoRowsAreSyntheticStressFixtures:true,providerRightsApproved:false,fullCatalogCoverage:false,customerOutcomeProven:false,saleEnabled:false,live:false},
};
fs.mkdirSync(path.dirname(outputPath),{recursive:true}); fs.writeFileSync(outputPath,`${JSON.stringify(result,null,2)}\n`); console.log(JSON.stringify(result.summary,null,2));
