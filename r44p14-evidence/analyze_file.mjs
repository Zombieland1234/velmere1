import fs from "node:fs";
import { analyzeSolidityStructuredSignals } from "./analyzer.mjs";

const target = process.argv[2];
if (!target) throw new Error("source path required");
const source = fs.readFileSync(target, "utf8");
process.stdout.write(`${JSON.stringify(analyzeSolidityStructuredSignals(source))}\n`);
