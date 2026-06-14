import fs from "node:fs";
const read=(file)=>fs.readFileSync(file,"utf8");
const client=read("components/search/VelmereIntelligenceSearchClient.tsx");
const route=read("app/api/search/lens-report/route.ts");
const css=read("app/globals.css");
const checks=[
 ["one exact detail result", client.includes("selectLensDetailResult") && client.includes("items.slice(0, 1)")],
 ["server canonical report request", client.includes("format=json") && client.includes("canonicalPayload.report")],
 ["server builds canonical report", route.includes("isCanonicalLensRequest") && route.includes("buildLensReport(")],
 ["same report drives pdf", client.includes("body: JSON.stringify(report)")],
 ["no artificial forge delay", !client.includes("minimumForgeMs")],
 ["shared body portal", client.includes('import BodyPortal from "@/components/ui/BodyPortal"') && !client.includes("function BodyPortal")],
 ["single-result public layout", css.includes("PASS768–771 · Lens single-result")],
 ["scroll containment", css.includes(".velmere-lens-modal-root") && css.includes("overscroll-behavior: contain")],
];
const failed=checks.filter(([,ok])=>!ok); if(failed.length){for(const [label] of failed) console.error(`FAIL: ${label}`);process.exit(1)}
console.log("PASS768–771 Lens/PDF PASS");
