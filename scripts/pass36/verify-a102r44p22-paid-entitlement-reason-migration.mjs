#!/usr/bin/env node
import crypto from "node:crypto";import fs from "node:fs";
const m=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-paid-entitlement-reason-migration.json","utf8"));const sha=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");const old=fs.readFileSync(m.historicalTest.path,"utf8");const cur=fs.readFileSync(m.currentPolicy.path,"utf8");const rows=[];const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("denominator",m.oldDenominator===21&&m.newDenominator===21&&m.retainedAssertions===21&&m.removedAssertions===0&&m.denominatorCollapse===false);
add("history-bound",sha(m.historicalTest.path)===m.historicalTest.sha256&&fs.statSync(m.historicalTest.path).size===m.historicalTest.byteLength);
add("current-bound",sha(m.currentPolicy.path)===m.currentPolicy.sha256&&fs.statSync(m.currentPolicy.path).size===m.currentPolicy.byteLength);
add("old-reason-retained",old.includes('spoofOnly.reason === "account_session_required"'));
add("new-reason-present",cur.includes('reason: "invitation_only_beta_account_required"'));
add("signed-account-required",cur.includes("if (!account)"));
add("no-browser-paid-header",!cur.includes('request.headers.get("x-velmere-paid-access")'));
add("no-browser-authorization",!cur.includes('request.headers.get("authorization")'));
add("advanced-fails-closed",cur.includes('paidDepth === "advanced"')&&cur.includes('reason: "product_not_for_sale"'));
add("no-promotion",m.creditBoundary.saleCredit===false&&m.creditBoundary.liveCredit===false&&m.historyRewritten===false);
const failed=rows.filter(x=>!x.passed);console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.paid-entitlement-reason-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));process.exit(failed.length?1:0);
