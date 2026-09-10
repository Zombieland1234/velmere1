import fs from "node:fs";
import path from "node:path";

interface TargetInfo {
  index: number;
  dir: string;
  symbol: string;
  name: string;
  address: string;
  network: string;
  chainId: string;
}

const evidenceDir = path.resolve(process.cwd(), "evidence");
const results: TargetInfo[] = [];

for (let i = 1; i <= 20; i++) {
  const prefix = `AUD-CONTRACT-${String(i).padStart(2, "0")}`;
  const matched = fs.readdirSync(evidenceDir).filter((d) => d.startsWith(prefix));
  if (matched.length > 0) {
    const d = matched[0];
    const repPath = path.join(evidenceDir, d, "report.json");
    if (fs.existsSync(repPath)) {
      const rep = JSON.parse(fs.readFileSync(repPath, "utf8"));
      results.push({
        index: i,
        dir: d,
        symbol: rep.target.symbol,
        name: rep.target.name,
        address: rep.target.addressOrId,
        network: rep.target.networkOrExchange,
        chainId: rep.target.networkOrExchange === "BSC" ? "56" : rep.target.networkOrExchange === "Arbitrum" ? "42161" : "1",
      });
    }
  }
}

console.log(JSON.stringify(results, null, 2));
