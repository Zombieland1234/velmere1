#!/usr/bin/env node
import fs from "node:fs";
const file="components/market-integrity/AnalysisCardsSection.tsx";
let src=fs.readFileSync(file,"utf8");
const replacements=[
  ["Weryfikacja sumy kontrolnej i dowodu kryptograficznego RFC 3161...","Weryfikacja lokalnej integralności pliku i skrótu SHA-256..."],
  ["Certyfikat Instytucjonalny RFC 3161</strong> z unikalnym SHA-256 Hash","Lokalny rekord integralności SHA-256</strong> (bez zewnętrznego TSA)"],
  ["Velmère RegTech Platform • Certyfikacja RFC 3161","Velmère RegTech Platform • Lokalna integralność pliku SHA-256"],
  ["Publikacja ze stemplem RFC 3161 i wykazem sygnałów","Publikacja z lokalnym skrótem SHA-256 i wykazem sygnałów"],
];
for(const [from,to] of replacements){
  if(!src.includes(from)) throw new Error(`analysiscards_truth_anchor_missing:${from.slice(0,48)}`);
  src=src.split(from).join(to);
}
if(/RFC\s*3161/i.test(src)) throw new Error("analysiscards_rfc3161_claim_remaining");
fs.writeFileSync(file,src);
console.log(JSON.stringify({status:"PASS",file,claim:"local_sha256_integrity_only",externalTsaCredit:false},null,2));
