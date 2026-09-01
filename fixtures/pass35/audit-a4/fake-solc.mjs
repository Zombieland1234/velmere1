#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const forbiddenEnvironment = ["NODE_OPTIONS", "NODE_PATH", "PYTHONPATH", "LD_PRELOAD", "STRIPE_SECRET_KEY"]
  .filter((name) => typeof process.env[name] === "string");
if (forbiddenEnvironment.length) {
  process.stderr.write(`forbidden environment inherited: ${forbiddenEnvironment.join(",")}`);
  process.exit(91);
}
if (path.resolve(process.env.PATH || "") !== path.dirname(process.execPath)) {
  process.stderr.write("PATH is not the private execution image directory");
  process.exit(93);
}
if (path.basename(process.cwd()) !== "work" || !path.basename(path.dirname(process.cwd())).startsWith("velmere-external-command-")) {
  process.stderr.write("compiler fixture did not receive isolated working directory");
  process.exit(92);
}

if (process.argv.includes("--version")) {
  process.stdout.write("solc, the solidity compiler commandline interface\nVersion: 0.8.24+commit.e11b9ed9.Linux.g++\n");
  process.exit(0);
}
if (!process.argv.includes("--standard-json")) {
  process.stderr.write("unsupported arguments\n");
  process.exit(2);
}
const input = JSON.parse(readFileSync(0, "utf8"));
const sourcePath = "contracts/RiskyUpgradeableVault.sol";
if (!input?.sources?.[sourcePath]?.content) {
  process.stdout.write(JSON.stringify({ errors: [{ severity: "error", type: "ParserError", formattedMessage: "missing source" }] }));
  process.exit(0);
}
const compiledRuntime = "60016002aaaa600355a1647465737441000008";
const output = {
  contracts: {
    [sourcePath]: {
      RiskyUpgradeableVault: {
        abi: [],
        metadata: JSON.stringify({ compiler: { version: "0.8.24+commit.e11b9ed9" }, settings: input.settings }),
        evm: {
          bytecode: { object: "60006000", linkReferences: {} },
          deployedBytecode: {
            object: compiledRuntime,
            linkReferences: {},
            immutableReferences: { "42": [{ start: 4, length: 2 }] }
          }
        }
      }
    }
  },
  sources: { [sourcePath]: { id: 0 } },
  errors: [{ severity: "warning", type: "Warning", formattedMessage: "synthetic fixture compiler" }]
};
process.stdout.write(JSON.stringify(output));
