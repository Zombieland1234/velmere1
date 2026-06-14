import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const publicDer = publicKey.export({ type: "spki", format: "der" });
const fingerprint = createHash("sha256").update(publicDer).digest("hex");
const keyId = `vlmed_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}_${randomBytes(4).toString("hex")}`;

console.log(JSON.stringify({
  keyId,
  algorithm: "Ed25519",
  publicKeyFingerprint: fingerprint,
  environment: {
    VELMERE_VLM_RECEIPT_ACTIVE_KEY_ID: keyId,
    VELMERE_VLM_RECEIPT_ED25519_PRIVATE_KEY_B64: Buffer.from(privatePem).toString("base64"),
    VELMERE_VLM_RECEIPT_ED25519_PUBLIC_KEY_B64: Buffer.from(publicPem).toString("base64"),
  },
  warning: "Store the private key only in the server secret manager. Never commit it or expose it to NEXT_PUBLIC variables.",
}, null, 2));
