import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sourceRoot=process.env.P69_SOURCE_ROOT||process.cwd();
const out=process.env.P69_RESULT_DIR||path.resolve(sourceRoot,'../p69-out');
fs.mkdirSync(out,{recursive:true});
const u=(p)=>pathToFileURL(path.join(sourceRoot,p)).href;
const sha=(b)=>`sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
const utf8=(s)=>Buffer.from(s,'utf8');
const {handleRealMarketsGet}=await import(u('lib/market-integrity/real-markets-route-orchestrator.ts'));
const hydration=await import(u('lib/market-integrity/real-markets-quote-hydration.ts'));

const symbols=['EURUSD=X','EURPLN=X','EURGBP=X','EURTRY=X','USDPLN=X','JPY=X'];
const requestUrl=`http://localhost/api/market-integrity/real-markets?referenceFx=1&symbols=${encodeURIComponent(symbols.join(','))}`;
const response=await handleRealMarketsGet(new Request(requestUrl,{method:'GET'}));
const routeRaw=await response.text();
const payload=JSON.parse(routeRaw);
if(response.status!==200||payload.ok!==true||payload.mode!=='ecb_reference_only') throw new Error(`reference_route_not_available:${response.status}:${payload?.pass69EcbOfficialFxReferenceEnvelope?.state}`);
if(JSON.stringify(payload.fields)!==JSON.stringify(['market.reference_rate','market.reference_date'])) throw new Error('reference_field_contract_mismatch');
if(payload.referenceOnly!==true||payload.executableQuote!==false||payload.marketPriceFieldEligible!==false||payload.riskVerdictEligible!==false||payload.paidValueEligible!==false) throw new Error('reference_boundary_mismatch');
const env=payload.pass69EcbOfficialFxReferenceEnvelope;
if(!env||env.state!=='available'||env.sourceId!=='ecb_statistics'||env.attribution!=='Source: ECB statistics.'||env.statisticsModified!==false||env.directPublishedPairsOnly!==true) throw new Error('reference_envelope_mismatch');
if(env.sourceDataUrl!==hydration.PASS69_ECB_REFERENCE_DATA_URL||env.sourceUsagePolicyUrl!==hydration.PASS69_ECB_REUSE_POLICY_URL) throw new Error('reference_source_url_mismatch');
if(env.references.length!==4) throw new Error(`direct_reference_count:${env.references.length}`);
const expectedDirect=new Set(['EURUSD=X','EURPLN=X','EURGBP=X','EURTRY=X']);
for(const ref of env.references){
 if(!expectedDirect.has(ref.providerSymbol)) throw new Error(`unexpected_direct_pair:${ref.providerSymbol}`);
 if(!Number.isFinite(ref.referenceRate)||ref.referenceRate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(ref.referenceDate)) throw new Error(`invalid_reference_value:${ref.providerSymbol}`);
 if(ref.fieldId!=='market.reference_rate'||ref.dateFieldId!=='market.reference_date'||ref.referenceOnly!==true||ref.executableQuote!==false||ref.marketPriceFieldEligible!==false||ref.intradayFreshnessEligible!==false||ref.derivedRate!==false||ref.attribution!=='Source: ECB statistics.') throw new Error(`reference_semantics:${ref.providerSymbol}`);
}
if(env.references.some((ref)=>ref.providerSymbol==='USDPLN=X'||ref.providerSymbol==='JPY=X')) throw new Error('derived_cross_rate_leak');

async function fetchText(url,accept){
 const r=await fetch(url,{headers:{accept,'user-agent':'Velmere-P69-Exact-Windows-Evidence/1.0'},cache:'no-store',redirect:'follow'});
 if(!r.ok) throw new Error(`evidence_fetch_${r.status}:${url}`);
 const text=await r.text();
 if(Buffer.byteLength(text)>4*1024*1024) throw new Error(`evidence_too_large:${url}`);
 return {status:r.status,finalUrl:r.url,text,bytes:Buffer.byteLength(text),sha256:sha(utf8(text))};
}
const [dataReceipt,policyReceipt]=await Promise.all([
 fetchText(hydration.PASS69_ECB_REFERENCE_DATA_URL,'text/csv,application/vnd.sdmx.data+csv'),
 fetchText(hydration.PASS69_ECB_REUSE_POLICY_URL,'text/html,application/xhtml+xml'),
]);
if(env.responseSha256!==dataReceipt.sha256||env.responseBytes!==dataReceipt.bytes) throw new Error('route_data_byte_binding_mismatch');
const policyLower=policyReceipt.text.toLowerCase().replace(/\s+/g,' ');
const policyAnchors={
 freeReuse:policyLower.includes('free reuse'),
 freeOfCharge:policyLower.includes('free of charge'),
 sourceQuoted:policyLower.includes('source is quoted')||policyLower.includes('source should be quoted')||policyLower.includes('source must be quoted')||policyLower.includes('indicate the source'),
 notModified:policyLower.includes('not modified'),
 thirdPartyExcluded:policyLower.includes('third-party data'),
};
if(!Object.values(policyAnchors).every(Boolean)) throw new Error(`policy_anchor_missing:${JSON.stringify(policyAnchors)}`);

const rawRouteBytes=utf8(routeRaw);
fs.writeFileSync(path.join(out,'P69_ECB_REFERENCE_ROUTE_RESPONSE.json'),rawRouteBytes);
const customerEnvelope={
 schemaVersion:'velmere.p69.current-public-ecb-reference-customer-envelope.v1',
 capturedAt:new Date().toISOString(),
 httpStatus:response.status,
 requestUrl,
 routeResponseBytes:rawRouteBytes.length,
 routeResponseSha256:sha(rawRouteBytes),
 fields:payload.fields,
 sourceId:env.sourceId,
 sourceDataUrl:env.sourceDataUrl,
 sourceUsagePolicyUrl:env.sourceUsagePolicyUrl,
 sourceAttribution:env.attribution,
 sourceResponseSha256:env.responseSha256,
 sourceResponseBytes:env.responseBytes,
 references:env.references,
 referenceOnly:true,
 executableQuote:false,
 marketPriceFieldEligible:false,
 riskVerdictEligible:false,
 paidValueEligible:false,
 customerFinalOutputCredit:0,
 saleCredit:0,
 live:false,
 truthBoundary:'This is a real current public-network customer-visible reference sub-envelope from direct ECB-published EUR statistics. It is not the full Real Markets final customer output and grants no quote/risk/paid-value/sale/LIVE credit.'
};
fs.writeFileSync(path.join(out,'P69_ECB_REFERENCE_CUSTOMER_ENVELOPE.json'),JSON.stringify(customerEnvelope,null,2)+'\n','utf8');
const receipt={
 schemaVersion:'velmere.p69.current-public-ecb-reference-rights-truth-receipt.v1',
 capturedAt:new Date().toISOString(),
 status:'PASS_P69_ECB_REFERENCE_PUBLIC_NETWORK_FREE_DISPLAY_BOUNDED',
 runtime:{platform:process.platform,node:process.version},
 route:{httpStatus:response.status,responseBytes:rawRouteBytes.length,responseSha256:sha(rawRouteBytes),mode:payload.mode},
 officialData:{url:dataReceipt.finalUrl,httpStatus:dataReceipt.status,bytes:dataReceipt.bytes,sha256:dataReceipt.sha256,routeByteBound:env.responseSha256===dataReceipt.sha256},
 officialReusePolicy:{url:policyReceipt.finalUrl,httpStatus:policyReceipt.status,bytes:policyReceipt.bytes,sha256:policyReceipt.sha256,anchors:policyAnchors,reviewedAt:env.usagePolicyReviewedAt,validUntil:env.usagePolicyValidUntil},
 truth:{directPublishedReferenceCount:env.references.length,derivedCrossRatesExposed:0,statisticsModified:false,attributionExact:env.attribution==='Source: ECB statistics.',marketPriceEligible:false,executableQuote:false},
 rightsMeasurement:{priorUniqueRightsObligations:199,addedUniqueRightsObligations:4,currentUniqueRightsObligations:203,passed:2,withheld:201,passedScopeIds:['FREE_PUBLIC_DISPLAY:market.reference_rate','FREE_PUBLIC_DISPLAY:market.reference_date'],withheldNewScopeIds:['PAID_CUSTOMER_DISPLAY:market.reference_rate','PAID_CUSTOMER_DISPLAY:market.reference_date'],paidReason:'No authenticated paid customer-output execution is bound in P69; permission eligibility alone does not earn output-level paid rights credit.'},
 productCredit:{realMarketsFinalCustomerOutputs:0,realMarketsFinalRows:'0/3',globalFinalCustomerOutputs:'0/20',paidValueTransitions:'0/10',saleEligibleRows:'0/20',live:false,worldClassProven:false},
 truthBoundary:'Two new FREE_PUBLIC_DISPLAY rights obligations pass only for the exact ECB direct-reference rate/date sub-envelope because current official source bytes, exact attribution, and official reuse-policy anchors are bound. Paid display and every final product/release credit remain withheld.'
};
fs.writeFileSync(path.join(out,'P69_ECB_REFERENCE_PUBLIC_NETWORK_RIGHTS_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n','utf8');
console.log(JSON.stringify({status:receipt.status,references:env.references.length,routeSha256:receipt.route.responseSha256,dataSha256:dataReceipt.sha256,policySha256:policyReceipt.sha256,rights:'2/203',finalOutputs:'0/20'},null,2));
