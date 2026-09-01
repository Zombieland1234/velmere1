import assert from "node:assert/strict";
import { createMarketAssetBinding } from "../../lib/market-integrity/market-asset-binding.ts";
import { createWalletLabelRegistryArtifact } from "../../lib/market-integrity/wallet-label-registry.ts";
import { parseBinanceOrderBook, parseCoinbaseOrderBook, parseMexcOrderBook } from "../../lib/market-integrity/market-impact-provider-adapters.ts";
import { clearServerOwnedMarketIntelligenceCachesForTests } from "../../lib/market-integrity/server-owned-market-intelligence-providers.ts";
import { runPass35A12PublicWhaleRuntime, verifyPass35A12PublicWhaleRuntime } from "../../lib/market-integrity/pass35-public-whale-runtime.ts";

let checks=0;const check=(value,message)=>{checks+=1;assert.ok(value,message);};
const now=new Date("2026-07-22T22:45:00.000Z");
const bindingSecret="a12-market-binding-secret-with-at-least-thirty-two-characters";
const labelSecret="a12-wallet-label-secret-with-at-least-thirty-two-characters";
const redactionSecret="a12-redaction-secret-with-at-least-thirty-two-characters";
const tokenAddress="0x1111111111111111111111111111111111111111";
const holderIds=Array.from({length:10},(_,i)=>`0x${String(i+10).padStart(40,"0")}`);
const binding=createMarketAssetBinding({payload:{chainId:"eip155:1",tokenAddress,tokenSymbol:"A12",quoteAsset:"USDT",venueMarkets:{binance:"A12USDT",mexc:"A12USDT",coinbase:"A12-USD"},source:"pass35-a12-test",issuedAt:new Date(now.getTime()-60_000).toISOString(),expiresAt:new Date(now.getTime()+60*60_000).toISOString(),nonce:"a12-binding-nonce-123456789"},secret:bindingSecret});
const categories=["exchange","treasury","bridge","liquidity_pool","private_whale"];
const labelArtifacts=holderIds.slice(0,6).map((holderId,index)=>createWalletLabelRegistryArtifact({payload:{assetKey:"A12",holderId,category:categories[index%categories.length],clusterId:`cluster-${index}`,providerFamily:"public_registry",sourceDigest:"a".repeat(64),confidencePercent:90-index,issuedAt:new Date(now.getTime()-60_000).toISOString(),expiresAt:new Date(now.getTime()+24*60*60_000).toISOString(),nonce:`a12-label-nonce-${index}-123456789`},secret:labelSecret}));
const rawBook={bids:[["1.99","250000"],["1.98","300000"]],asks:[["2.01","240000"],["2.02","310000"]]};
const marketSnapshots=[
  parseBinanceOrderBook({payload:rawBook,assetKey:"A12",observedAt:now.toISOString(),status:"verified_fixture",marketId:"A12USDT"}),
  parseMexcOrderBook({payload:rawBook,assetKey:"A12",observedAt:now.toISOString(),status:"verified_fixture",marketId:"A12USDT"}),
  parseCoinbaseOrderBook({payload:rawBook,assetKey:"A12",observedAt:now.toISOString(),status:"verified_fixture",productId:"A12-USD"}),
];
for(const row of marketSnapshots.filter((x)=>x.quoteCurrency!=="USD")) row.quoteToUsd={usdRate:1,observedAt:now.toISOString(),status:"verified_fixture",providerFamily:"coinbase",sourceDigest:"b".repeat(64)};

process.env.ETHERSCAN_API_KEY="a12-free-tier-key";
process.env.ALCHEMY_ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/a12-test";
function etherscanRows(){
  const supply="1000000000000000000000000";
  const top=holderIds.map((holderId,index)=>({TokenHolderAddress:holderId,TokenHolderQuantity:String(140000-index*10000)}));
  const tx=Array.from({length:30},(_,i)=>({blockNumber:String(20_000_000+i),blockHash:`0x${(i+100).toString(16).padStart(64,"0")}`,confirmations:String(100+i),contractAddress:tokenAddress,hash:`0x${String(i+1).padStart(64,"a")}`,logIndex:String(i),from:i%7===0?"0x0000000000000000000000000000000000000000":holderIds[i%holderIds.length],to:i%9===0?"0x0000000000000000000000000000000000000000":holderIds[(i+1)%holderIds.length],value:String((1000+i*20)*10**6)+"000000000000",tokenDecimal:"18",timeStamp:String(Math.floor((now.getTime()-i*60_000)/1000))}));
  return {supply,top,tx};
}
const data=etherscanRows();
let alchemyFails=false;let fetchCalls=0;
const fakeFetch=async(input,init)=>{
  fetchCalls+=1;const url=new URL(String(input));
  if(url.hostname==="api.etherscan.io"){
    const action=url.searchParams.get("action");
    if(action==="tokeninfo")return new Response(JSON.stringify({status:"1",result:[{divisor:"18",totalSupply:data.supply,tokenPriceUSD:"2.00"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(action==="topholders")return new Response(JSON.stringify({status:"1",result:data.top}),{status:200,headers:{"content-type":"application/json"}});
    if(action==="tokentx")return new Response(JSON.stringify({status:"1",result:data.tx}),{status:200,headers:{"content-type":"application/json"}});
  }
  if(url.hostname.endsWith("g.alchemy.com")){
    if(alchemyFails)return new Response(JSON.stringify({error:"temporary"}),{status:503,headers:{"content-type":"application/json"}});
    const body=JSON.parse(String(init?.body??"{}"));check(body.method==="alchemy_getAssetTransfers","alchemy method");
    const transfers=data.tx.slice(0,20).map((row,i)=>({blockNum:`0x${BigInt(row.blockNumber).toString(16)}`,blockHash:row.blockHash,confirmations:Number(row.confirmations),hash:row.hash,uniqueId:`${row.hash}:log:0x${i.toString(16)}`,from:row.from,to:row.to,value:1000+i*20,metadata:{blockTimestamp:new Date(now.getTime()-i*60_000).toISOString()},rawContract:{address:tokenAddress,decimal:"0x12",value:`0x${BigInt(row.value).toString(16)}`}}));
    return new Response(JSON.stringify({jsonrpc:"2.0",id:1,result:{transfers}}),{status:200,headers:{"content-type":"application/json"}});
  }
  return new Response(JSON.stringify({error:"unexpected"}),{status:404,headers:{"content-type":"application/json"}});
};

clearServerOwnedMarketIntelligenceCachesForTests();
const runtime=await runPass35A12PublicWhaleRuntime({assetKey:"A12",bindingArtifact:binding,bindingSecret,walletLabelArtifacts:labelArtifacts,walletLabelSecret:labelSecret,redactionSecret,marketImpactSnapshots:marketSnapshots,fallbackPriceUsd:2,fetchImpl:fakeFetch,now});
check(verifyPass35A12PublicWhaleRuntime(runtime),"runtime integrity");
check(runtime.executionMode==="INJECTED_FIXTURE"&&!runtime.liveClaimed&&!runtime.realPublicWhaleExecution,"fixture truth");
check(runtime.sourceEvidence.holders.length===10,"holder count");
check(runtime.sourceEvidence.transfers.length>=30,"merged transfer sources");
check(runtime.sourceEvidence.transfers.every((row)=>row.eventId.startsWith("evm-log:")&&row.chainId==="eip155:1"&&row.contractAddress===tokenAddress&&Number.isInteger(row.logIndex)&&row.reorgState==="canonical"),"canonical transfer identity");
check(runtime.sourceEvidence.capabilityReceipts.some((x)=>x.providerFamily==="alchemy"),"alchemy receipt");
check(runtime.sourceEvidence.capabilityReceipts.some((x)=>x.providerFamily==="etherscan"&&x.capability==="transfer_history"),"etherscan transfer fallback receipt");
check(runtime.verifiedLabelArtifactCount===6&&runtime.labelCoveragePercent>=60,"label coverage");
check(runtime.result!==null&&runtime.result.holderCount===10,"whale result");
check(runtime.result.flowWindows.length===3&&runtime.result.holderExitStress.length>0,"flows and exit stress");
check(runtime.tierPackets.basic!==null&&runtime.tierPackets.pro!==null&&runtime.tierPackets.advanced!==null,"tier packets");
check(runtime.tierPackets.basic.paidDeliveryEligible===false&&runtime.tierPackets.advanced.sellEnabled===false,"billing lock");
check(runtime.result.providerFamilies.includes("etherscan")&&runtime.result.providerFamilies.includes("alchemy")&&runtime.result.providerFamilies.includes("public-registry"),"provider families");

clearServerOwnedMarketIntelligenceCachesForTests();alchemyFails=true;
const fallback=await runPass35A12PublicWhaleRuntime({assetKey:"A12",bindingArtifact:binding,bindingSecret,walletLabelArtifacts:labelArtifacts,walletLabelSecret:labelSecret,redactionSecret,marketImpactSnapshots:marketSnapshots,fallbackPriceUsd:2,fetchImpl:fakeFetch,now:new Date(now.getTime()+1000)});
check(verifyPass35A12PublicWhaleRuntime(fallback),"fallback integrity");
check(fallback.sourceEvidence.transfers.length===30,"etherscan transfer fallback survived alchemy outage");
check(fallback.sourceEvidence.providerReceipts.some((x)=>x.providerFamily==="alchemy"&&x.state==="failed"),"alchemy outage receipt");
check(!fallback.blockers.includes("transfer_history_required"),"fallback removes transfer blocker");

const badLabel=structuredClone(labelArtifacts[0]);badLabel.payload.category="exchange";badLabel.signature="0".repeat(64);
clearServerOwnedMarketIntelligenceCachesForTests();alchemyFails=false;
const rejected=await runPass35A12PublicWhaleRuntime({assetKey:"A12",bindingArtifact:binding,bindingSecret,walletLabelArtifacts:[...labelArtifacts,badLabel],walletLabelSecret:labelSecret,redactionSecret,marketImpactSnapshots:marketSnapshots,fallbackPriceUsd:2,fetchImpl:fakeFetch,now:new Date(now.getTime()+2000)});
check(rejected.rejectedLabelArtifactCount===1,"bad label rejected");
check(verifyPass35A12PublicWhaleRuntime(rejected),"rejected label runtime integrity");

const tampered=structuredClone(runtime);tampered.labelCoveragePercent=100;check(!verifyPass35A12PublicWhaleRuntime(tampered),"tamper rejected");
check(fetchCalls>0,"provider calls happened");
console.log(JSON.stringify({status:"PASS_A12_PUBLIC_WHALE_RUNTIME",checks,holders:runtime.sourceEvidence.holders.length,transfers:runtime.sourceEvidence.transfers.length,verifiedLabels:runtime.verifiedLabelArtifactCount,labelCoveragePercent:runtime.labelCoveragePercent,alchemyOutageFallbackProven:true,etherscanTransferFallbackProven:true,tierPackets:3,visualChangesMade:false,paidDeliveryEligible:false,liveClaimed:false},null,2));
