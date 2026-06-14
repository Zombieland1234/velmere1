import fs from "node:fs";
const read=(file)=>fs.readFileSync(file,"utf8");
const map=read("components/market-integrity/ShieldMapClient.tsx");
const css=read("app/globals.css");
const checks=[
 ["seven evidence groups", ["sources","market","liquidity","holders","contract","conflicts","missing"].every((id)=>map.includes(`[\"${id}\"`))],
 ["shared right drawer", map.includes("<DrawerRoot") && !map.includes("atlasDrawerRef")],
 ["mobile list alternative", map.includes('data-mobile-evidence-list="sources-to-next-checks"')],
 ["slow continuous core", css.includes("shieldHoloCore360 64s linear infinite")],
 ["slow continuous orbits", css.includes("shieldHoloOrbitB 80s linear infinite")],
 ["reduced motion", css.includes("will-change: auto")],
 ["no drawer-local scroll lock", !map.includes("useModalScrollLock(atlasDrawerOpen)")],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [label] of failed) console.error(`FAIL: ${label}`);process.exit(1)}
console.log("PASS765–767 Shield Map PASS");
