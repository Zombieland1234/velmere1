#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root=process.cwd(); const baseline=JSON.parse(fs.readFileSync(path.join(root,"config/pass28-visual-freeze-baseline.json"),"utf8"));
const sha256=(v)=>createHash("sha256").update(v).digest("hex"); const changed=[]; const rows=[];
for(const expected of baseline.files){const file=path.join(root,expected.path); if(!fs.existsSync(file)){changed.push({path:expected.path,reason:"missing"});continue;} const bytes=fs.readFileSync(file);const actual=sha256(bytes);rows.push(`${expected.path}\0${bytes.length}\0${actual}`);if(bytes.length!==expected.bytes||actual!==expected.sha256) changed.push({path:expected.path,reason:"hash_or_size_mismatch",expectedSha256:expected.sha256,actualSha256:actual});}
const aggregateSha256=sha256(rows.join("\n")); if(aggregateSha256!==baseline.aggregateSha256) changed.push({path:"<aggregate>",reason:"aggregate_mismatch",expectedSha256:baseline.aggregateSha256,actualSha256:aggregateSha256});
console.log(JSON.stringify({schemaVersion:"velmere.pass28.visual-freeze-verification.v1",status:changed.length?"FAIL":"STATIC-PROVEN",fileCount:rows.length,aggregateSha256,changed,truthBoundary:"Hash parity for UI source/static assets. Browser screenshot comparison was NOT EXECUTED."},null,2)); if(changed.length) process.exit(1);
