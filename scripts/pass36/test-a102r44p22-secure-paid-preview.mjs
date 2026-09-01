#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildAuditPaidTierPreview,
  validateAuditPaidTierPreview,
} from "../../lib/security/audit-tier-preview.ts";
import { buildAuditPaidTierPreviewPdf } from "../../lib/security/audit-tier-preview-pdf.ts";
import { GET as previewGet } from "../../lib/server/lazy-route-modules/security--audit-watch--paid-preview.ts";

const checks=[];
const check=async(id,fn)=>{try{await fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error?.message??String(error)});}};
const locales=["pl","en","de"];
const tiers=["pro","advanced"];
const forbiddenSerialized=[
  /0x[a-f0-9]{40}/iu,
  /vlm_pdf_/iu,
  /bearer\s+[a-z0-9._~+/=-]{8,}/iu,
  /(?:^|[/\\])(?:src|contracts?|fixtures?)[/\\]/iu,
  /reportId|auditCaseRef|entitlementId|accountId|sourceCode|privatePayload/iu,
];

for(const locale of locales){
  for(const tier of tiers){
    const preview=buildAuditPaidTierPreview({tier,locale});
    await check(`${locale}:${tier}:valid`,()=>assert.equal(validateAuditPaidTierPreview(preview),preview));
    await check(`${locale}:${tier}:truth-boundary`,()=>{
      assert.equal(preview.previewOnly,true);
      assert.equal(preview.fullContentIncluded,false);
      assert.equal(preview.hiddenFullContentPresent,false);
      assert.equal(preview.criticalDetailsWithheld,true);
      assert.equal(preview.watermark,"PREVIEW");
      assert.equal(preview.publicPrice,null);
      assert.equal(preview.publicCheckoutAllowed,false);
      assert.equal(preview.saleEnabled,false);
      assert.equal(preview.humanReviewIncluded,false);
    });
    await check(`${locale}:${tier}:material-delta`,()=>{
      assert.ok(preview.structure.includedInBasic.length>=3);
      assert.ok(preview.structure.additionalSectionCount>=4);
      assert.equal(preview.structure.additionalSectionCount,preview.structure.additionalSections.length);
      assert.ok(preview.structure.professionalWorkflow.length>=3);
      assert.ok(preview.provenanceClasses.includes("PUBLIC_BLOCKCHAIN_DIRECT"));
      assert.ok(preview.limitations.length>=4);
    });
    await check(`${locale}:${tier}:no-paid-material`,()=>{
      const serialized=JSON.stringify(preview);
      for(const pattern of forbiddenSerialized) assert.equal(pattern.test(serialized),false,pattern.source);
      assert.equal(serialized.includes("WITHHELD_FROM_PREVIEW"),true);
    });
    const {pdf}=buildAuditPaidTierPreviewPdf({tier,locale});
    await check(`${locale}:${tier}:pdf-bounded`,()=>{
      assert.ok(pdf.byteLength>20_000 && pdf.byteLength<1_000_000);
      const ascii=pdf.toString("latin1");
      for(const marker of ["/JavaScript","/OpenAction","/Launch","/EmbeddedFile","/XFA","/Encrypt"]) assert.equal(ascii.includes(marker),false,marker);
    });
  }
}

const request=async(pathname)=>previewGet(new Request(`http://localhost${pathname}`,{headers:{"x-forwarded-for":"127.0.0.1","user-agent":"r44p22-preview-test"}}));

await check("route:json-success",async()=>{
  const response=await request("/api/security/audit-watch/paid-preview?tier=pro&locale=pl&format=json");
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control")??"",/no-store/);
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  assert.equal(response.headers.get("x-frame-options"),"DENY");
  assert.equal(response.headers.get("cross-origin-resource-policy"),"same-origin");
  assert.equal(response.headers.get("set-cookie"),null);
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.preview.previewOnly,true);
  assert.equal(body.security.fullReportEndpointExposed,false);
  assert.equal(body.security.entitlementGranted,false);
  const serialized=JSON.stringify(body);
  for(const pattern of forbiddenSerialized) assert.equal(pattern.test(serialized),false,pattern.source);
});

await check("route:pdf-success-and-watermark",async()=>{
  const response=await request("/api/security/audit-watch/paid-preview?tier=advanced&locale=en&format=pdf");
  assert.equal(response.status,200);
  assert.equal(response.headers.get("content-type"),"application/pdf");
  assert.match(response.headers.get("content-disposition")??"",/velmere-advanced-en-preview\.pdf/);
  assert.match(response.headers.get("cache-control")??"",/no-store/);
  const bytes=Buffer.from(await response.arrayBuffer());
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vlm-r44p22-preview-"));
  try{
    const pdfPath=path.join(dir,"preview.pdf");
    const textPath=path.join(dir,"preview.txt");
    fs.writeFileSync(pdfPath,bytes);
    const tool=spawnSync("pdftotext",[pdfPath,textPath],{encoding:"utf8",timeout:30_000});
    if(tool.error?.code!=="ENOENT"){
      assert.equal(tool.status,0,tool.stderr);
      const text=fs.readFileSync(textPath,"utf8");
      assert.match(text,/PREVIEW/);
      assert.match(text,/not the full report/i);
      assert.doesNotMatch(text,/0x[a-f0-9]{40}/iu);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

const rejected=[
  ["basic-tier","?tier=basic&locale=en&format=json"],
  ["unknown-tier","?tier=enterprise&locale=en&format=json"],
  ["unknown-locale","?tier=pro&locale=fr&format=json"],
  ["unknown-format","?tier=pro&locale=en&format=html"],
  ["report-id","?tier=pro&locale=en&format=json&reportId=secret"],
  ["target","?tier=pro&locale=en&format=json&target=0x1111111111111111111111111111111111111111"],
  ["token","?tier=pro&locale=en&format=json&token=secret"],
  ["duplicate-tier","?tier=pro&tier=advanced&locale=en&format=json"],
];
for(const [id,query] of rejected){
  await check(`route:reject-${id}`,async()=>{
    const response=await request(`/api/security/audit-watch/paid-preview${query}`);
    assert.ok(response.status>=400 && response.status<500,response.status);
    assert.match(response.headers.get("cache-control")??"",/no-store/);
  });
}

await check("route:reject-oversized-url",async()=>{
  const response=await request(`/api/security/audit-watch/paid-preview?tier=pro&locale=en&format=json&${"x".repeat(1100)}`);
  assert.equal(response.status,414);
});

await check("source:public-shell-is-lazy-and-get-only",()=>{
  const route=fs.readFileSync("app/api/security/audit-watch/paid-preview/route.ts","utf8");
  assert.match(route,/invokeLazyRouteHandler/);
  assert.match(route,/method:\s*"GET"/);
  assert.match(route,/force-dynamic/);
  assert.doesNotMatch(route,/POST\s*\(/);
});

const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({
  schemaVersion:"velmere.pass36.a102r44p22.secure-paid-preview-test.v1",
  status:failed.length?"FAIL":"PASS",
  checks:checks.length,
  passed:checks.length-failed.length,
  failed:failed.length,
  rows:checks,
},null,2));
process.exit(failed.length?1:0);
