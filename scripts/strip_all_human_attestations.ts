import fs from "node:fs";
import path from "node:path";

const targetFile = path.resolve("./lib/security/contract-audit-profiles.ts");
let content = fs.readFileSync(targetFile, "utf8");

// Remove any remaining humanReviewAttestation block
const attestationPattern = /\n\s*humanReviewAttestation:\s*\{[^}]*\},/gs;
const matches = content.match(attestationPattern);
console.log(`Found ${matches?.length ?? 0} humanReviewAttestation blocks to remove.`);
content = content.replace(attestationPattern, "");

fs.writeFileSync(targetFile, content, "utf8");
console.log("Successfully removed all humanReviewAttestation from contract-audit-profiles.ts!");
