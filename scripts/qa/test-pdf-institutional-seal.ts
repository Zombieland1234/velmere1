/**
 * QA Test Suite for Velmère Institutional Cryptographic PDF Seal & Vector Codes
 */

import assert from "node:assert/strict";
import {
  encodeCode128B,
  generateCode128PdfCommands,
  generateQrMatrix21x21,
  generateQrCodePdfCommands,
  renderInstitutionalMerkleSealCard,
} from "../../lib/security/pdf-institutional-seal";

console.log("========================================================");
console.log("   VELMÈRE PDF INSTITUTIONAL SEAL & VECTOR CODE QA");
console.log("========================================================");

// 1. Test Code 128-B Barcode
console.log("[Test 1] Testing Code 128-B Vector Barcode Engine...");
const testDocId = "VLM-AUDIT-2026-X9";
const encodedBars = encodeCode128B(testDocId);
assert.ok(encodedBars.length > 50, "Encoded bitstring should be substantial");
assert.match(encodedBars, /^[01]+$/, "Encoded bitstring should be only 0s and 1s");

const barcodeCommands = generateCode128PdfCommands(testDocId, 44, 100, 200, 25);
assert.ok(barcodeCommands.length > 10, "Should generate vector rectangle commands");
assert.ok(barcodeCommands.some((c) => c.includes("re")), "Should include 're' (rectangle) operator");
assert.equal(barcodeCommands[barcodeCommands.length - 1], "f", "Last command should be 'f' (fill)");
console.log("  -> Code 128-B Barcode: PASS");

// 2. Test 2D QR Matrix Engine
console.log("[Test 2] Testing 2D QR Matrix & Vector Module Engine...");
const verifyUrl = "https://velmere.com/verify?id=VLM-AUDIT-2026-X9&root=4a7b9c";
const qrMatrix = generateQrMatrix21x21(verifyUrl);
assert.equal(qrMatrix.length, 21, "Matrix should be 21x21");
assert.equal(qrMatrix[0].length, 21, "Matrix width should be 21");

// Verify Finder Pattern at top-left (0,0) is black center
assert.equal(qrMatrix[0][0], true, "Finder pattern top-left should be dark");
assert.equal(qrMatrix[3][3], true, "Finder pattern center should be dark");

const qrCommands = generateQrCodePdfCommands(qrMatrix, 44, 200, 60);
assert.ok(qrCommands.length > 20, "Should generate vector commands for QR modules");
assert.ok(qrCommands.some((c) => c.includes("re")), "Should include vector rectangles");
console.log("  -> 2D QR Matrix: PASS");

// 3. Test Institutional Merkle Seal Card
console.log("[Test 3] Testing Institutional Merkle Seal Box Rendering...");
const sealResult = renderInstitutionalMerkleSealCard(
  {
    merkleRoot: "sha256:4a8b2c1d9e3f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b",
    documentId: testDocId,
    blockNumber: 21948500,
    isVerified: true,
  },
  400
);

assert.ok(sealResult.commands.length > 15, "Should generate comprehensive card commands");
assert.ok(sealResult.actualHeight >= 44, "Seal card height should be allocated");
const velmereHex = Buffer.from("VELMERE", "ascii").toString("hex");
assert.ok(sealResult.commands.some((c) => c.includes(velmereHex)), "Should include Velmere title in hex");
console.log("  -> Institutional Merkle Seal Card: PASS");

console.log("========================================================");
console.log(" ALL INSTITUTIONAL PDF SEAL ASSERTIONS PASSED (100%)");
console.log("========================================================");
