#!/usr/bin/env node
import crypto from "node:crypto"; import fs from "node:fs";
const m=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-lazy-route-denominator-migration.json","utf8"));
const current=JSON.parse(fs.readFileSync(m.currentManifest.path,"utf8")); const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const rows=[]; const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("parent-hash",m.parentManifest.sha256==="86c98f75a6395f14f3ab0f9728cf63cf031173e74089d47965e2f134eb5bb3db");
add("current-hash",sha(m.currentManifest.path)===m.currentManifest.sha256);
add("old-new",m.oldDenominator===16&&m.newDenominator===17);
add("retained-added",m.retainedRoutes===16&&m.addedRoutes===1&&m.removedRoutes===0);
add("current-count",current.routes.length===17&&current.summary.routesWrapped===17);
add("added-route",current.routes.some(r=>r.route===m.addedRoute&&r.methods.length===1&&r.methods[0]==="GET"));
add("no-collapse",m.denominatorCollapse===false); add("history",m.historyRewritten===false);
const failed=rows.filter(x=>!x.passed); console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.lazy-route-denominator-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2)); process.exit(failed.length?1:0);
