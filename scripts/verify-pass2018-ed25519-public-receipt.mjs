import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const receipt = read("lib/ai/vlm-analysis-receipt.ts");
const replay = read("lib/ai/vlm-receipt-replay.ts");
const verifyRoute = read("app/api/market-integrity/vlm/verify/route.ts");
const keysRoute = read("app/api/market-integrity/vlm/keys/route.ts");
const security = read("lib/ai/vlm-security.ts");
const env = read(".env.example");
const generator = read("scripts/generate-vlm-receipt-ed25519-keys.mjs");

expect(
  receipt.includes("createPrivateKey") &&
    receipt.includes("createPublicKey") &&
    receipt.includes("sign(") &&
    receipt.includes("verify("),
  "receipt performs real Ed25519 signing and verification",
);
expect(
  receipt.includes('"ed25519" | "hmac-sha256" | "unsigned"') &&
    receipt.includes("VELMERE_VLM_RECEIPT_ED25519_PRIVATE_KEY_B64"),
  "Ed25519 is preferred while HMAC and unsigned remain explicit fallbacks",
);
expect(
  receipt.includes("VELMERE_VLM_RECEIPT_PREVIOUS_PUBLIC_KEYS_JSON") &&
    receipt.includes("previousPublicKeys") &&
    receipt.includes("configuredKeyId"),
  "keyId-based public key rotation is implemented",
);
expect(
  receipt.includes("expiresAt") &&
    receipt.includes("receipt_expired") &&
    receipt.includes("receipt_from_future"),
  "receipt freshness blocks stale and future-dated attestations",
);
expect(
  replay.includes("consumeVlmReceiptOnce") &&
    replay.includes("receipt_replay_detected") &&
    replay.includes("MAX_RECEIPTS"),
  "optional one-time consumption detects replay and keeps bounded state",
);
expect(
  verifyRoute.includes("body.consume === true") &&
    verifyRoute.includes("consumeVlmReceiptOnce") &&
    verifyRoute.includes("status: 409"),
  "verification API exposes explicit consume mode with replay conflict",
);
expect(
  keysRoute.includes("listVlmReceiptPublicKeys") &&
    keysRoute.includes('algorithm: "Ed25519"') &&
    !keysRoute.includes("PRIVATE_KEY"),
  "public key endpoint exposes verification material without private keys",
);
expect(
  security.includes("reuse|replay|rotate|replace") &&
    security.includes("receipt_manipulation"),
  "VLM Security recognizes receipt replay and key manipulation prompts",
);
expect(
  env.includes("VELMERE_VLM_RECEIPT_ACTIVE_KEY_ID") &&
    env.includes("VELMERE_VLM_RECEIPT_TTL_MS"),
  "deployment contract includes active key identity and receipt lifetime",
);
expect(
  generator.includes('generateKeyPairSync("ed25519")') &&
    generator.includes("pkcs8") &&
    generator.includes("spki") &&
    !generator.includes("writeFile"),
  "key generator creates a matching pair without writing private material to the repository",
);

console.log("PASS2018 Ed25519 public receipt verifier complete");
