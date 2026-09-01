#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("components/security/SecurityAuditsCleanPage.tsx","utf8");
const modal=fs.readFileSync("components/security/AuditPaidPreviewModal.tsx","utf8");
const css=fs.readFileSync("app/styles/audit-one-screen.css","utf8");
const route=fs.readFileSync("app/api/security/audit-watch/paid-preview/route.ts","utf8");
const handler=fs.readFileSync("lib/server/lazy-route-modules/security--audit-watch--paid-preview.ts","utf8");
const checks=[];
const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error?.message??String(error)});}};

check("page:imports-preview-modal",()=>assert.match(page,/AuditPaidPreviewModal/));
check("page:fetches-redacted-route",()=>assert.match(page,/\/api\/security\/audit-watch\/paid-preview\?tier=/));
check("page:bounded-json",()=>assert.match(page,/readJsonResponseBounded<AuditPaidPreviewResponse>\(response,\s*128 \* 1024\)/));
check("page:does-not-store-preview",()=>{assert.doesNotMatch(page,/localStorage\.setItem\([^\n]*preview/);assert.doesNotMatch(page,/sessionStorage\.setItem\([^\n]*preview/);});
check("page:paid-card-opens-preview",()=>assert.match(page,/void openPaidPreview\(tier\.id, event\.currentTarget\)/));
check("page:basic-remains-selection",()=>assert.match(page,/setSelectedTier\("basic"\)/));
check("modal:dialog-semantics",()=>{assert.match(modal,/role="dialog"/);assert.match(modal,/aria-modal="true"/);});
check("modal:escape",()=>assert.match(modal,/event\.key === "Escape"/));
check("modal:focus-trap",()=>{assert.match(modal,/event\.key !== "Tab"/);assert.match(modal,/focusable/);});
check("modal:restores-no-body-scroll",()=>{assert.match(modal,/document\.body\.style\.overflow = "hidden"/);assert.match(modal,/priorOverflow/);});
check("modal:preview-truth-markers",()=>{assert.match(modal,/data-preview-only="true"/);assert.match(modal,/data-full-content-present="false"/);});
check("modal:pdf-link-safe",()=>{assert.match(modal,/rel="noopener noreferrer external"/);assert.match(modal,/referrerPolicy="no-referrer"/);});
check("modal:no-dangerous-html",()=>assert.doesNotMatch(modal,/dangerouslySetInnerHTML/));
check("route:lazy-get-only",()=>{assert.match(route,/invokeLazyRouteHandler/);assert.match(route,/method:\s*"GET"/);assert.doesNotMatch(route,/POST\s*\(/);});
check("handler:no-store",()=>assert.match(handler,/private, no-store/));
check("handler:strict-query-allowlist",()=>{assert.match(handler,/ALLOWED_QUERY_KEYS/);assert.match(handler,/preview_query_key_forbidden/);assert.match(handler,/preview_query_duplicate/);});
check("handler:rate-limit",()=>assert.match(handler,/applyApiRateLimit/));
check("handler:csp",()=>assert.match(handler,/frame-ancestors 'none'/));
check("handler:no-entitlement",()=>assert.match(handler,/entitlementGranted:\s*false/));
check("css:mobile",()=>assert.match(css,/audit-r44p22-preview-dialog[\s\S]*@media\(max-width:720px\)/));
check("css:focus-visible",()=>assert.match(css,/audit-r44p22-preview-dialog>header button:focus-visible/));
check("css:reduced-motion",()=>assert.match(css,/prefers-reduced-motion:reduce/));

const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.preview-ui-contract.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks},null,2));
process.exit(failed.length?1:0);
