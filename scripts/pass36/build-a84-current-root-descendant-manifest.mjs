#!/usr/bin/env node
import fs from "node:fs";
import { createHash } from "node:crypto";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
const REV="VELMERE_PASS36_A84R0_SHIELD_FULL_CATALOG_TIER_MATRIX_AND_PROVIDER_TRUTH_LEDGER";
const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const cj=(v)=>Array.isArray(v)?`[${v.map(cj).join(",")}]`:v&&typeof v==="object"?`{${Object.keys(v).sort().map((k)=>`${JSON.stringify(k)}:${cj(v[k])}`).join(",")}}`:JSON.stringify(v);
const sha=(v)=>createHash("sha256").update(v).digest("hex");
const policy=read("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json");
const parent=read(policy.parentDescendantManifestPath); const pc={...parent}; delete pc.manifestDigestSha256;
if(parent.manifestDigestSha256!==sha(cj(pc)))throw new Error("a84_parent_manifest_invalid");
const excluded=new Set(policy.descendantManifestExclusions); const inv=collectPass35Inventory(process.cwd());
if(inv.unknownCount!==0)throw new Error(`a84_unknown_inventory:${inv.unknownCount}`);
const rows=inv.entries.filter((r)=>r.sourceIncluded&&!excluded.has(r.path)).map((r)=>({path:r.path,byteLength:r.byteLength,sha256:r.sha256,mode:r.mode})).sort((a,b)=>a.path.localeCompare(b.path,"en"));
const payload={fileCount:rows.length,byteLength:rows.reduce((s,r)=>s+r.byteLength,0),pathSetSha256:sha(rows.map((r)=>r.path).join("\n")),aggregateSha256:sha(rows.map((r)=>`${r.path}\0${r.byteLength}\0${r.sha256}\0${r.mode}`).join("\n"))};
const receipt=read("config/pass36/a84-test-receipt.json");
const core={schemaVersion:"velmere.pass36.a84.current-root-descendant-manifest.v1",revisionId:REV,parentRevisionId:policy.parentRevisionId,parentDescendantManifestDigestSha256:parent.manifestDigestSha256,generatedAt:policy.deterministicEpoch,payload,exclusions:[...excluded].sort(),claims:{shieldFullCatalogTierMatrixImplemented:true,activeAssets:receipt.fixtureDenominators.activeAssets,activeListings:receipt.fixtureDenominators.activeListings,observationRows:receipt.fixtureDenominators.observationRows,tierPackets:receipt.fixtureDenominators.tierPackets,popupRows:receipt.fixtureDenominators.popupRows,semanticMutations:receipt.fixtureDenominators.semanticMutations,mutationKilled:receipt.fixtureDenominators.mutationKilled,realFullCatalogSnapshotsVerified:0,rightsApprovedAssets:0,productionBrowserAssets:0,customerValueLabeledAssets:0,paidGateEligible:false,liveProven:false,saleEnabled:false}};
const manifest={...core,manifestDigestSha256:sha(cj(core))}; fs.writeFileSync(policy.descendantManifestPath,`${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({status:"PASS_A84_DESCENDANT_MANIFEST_BUILD",output:policy.descendantManifestPath,payload,manifestDigestSha256:manifest.manifestDigestSha256},null,2));
