#!/usr/bin/env node
import crypto from "node:crypto"; import fs from "node:fs";
const b=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-current-visual-freeze-baseline.json","utf8")); const m=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-visual-freeze-migration.json","utf8"));
const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); const rows=[]; const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("denominator",b.files.length===12&&b.oldDenominator===12&&b.newDenominator===12);
for(const row of b.files) add(`file:${row.path}`,fs.existsSync(row.path)&&fs.statSync(row.path).size===row.bytes&&sha(row.path)===row.sha256,row);
add("retained-changed",b.retainedPathCount===11&&b.changedPathCount===1&&b.changedPaths.length===1&&b.changedPaths[0]==="app/styles/audit-one-screen.css",b.changedPaths);
add("migration-denominator",m.oldDenominator===12&&m.newDenominator===12&&m.removedPaths===0&&m.addedPaths===0);
add("migration-parent",sha(m.parentBaseline.path)===m.parentBaseline.sha256);
add("migration-current",sha(m.currentBaseline.path)===m.currentBaseline.sha256);
add("no-promotion",b.globalDecision==="NO_GO"&&b.live===false&&b.saleEnabled===false&&b.productionApproved===false&&b.worldClassProven===false);
const failed=rows.filter(x=>!x.passed); console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.current-visual-freeze-verification.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2)); process.exit(failed.length?1:0);
