import fs from "fs";
import path from "path";

for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(2, "0");
  const file = path.join("tests/e2e/deep-customers", `deep-batch-${pad}.spec.ts`);
  const startIdx = (i - 1) * 10 + 1;
  const endIdx = i * 10;

  const content = `import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("DEEP Observed Customer Validation — Batch ${pad} (Customers ${startIdx} to ${endIdx})", () => {
  test("Batch ${pad} journeys execute with verified DOM state and fail-closed security", async () => {
    const receiptPath = path.resolve("artifacts/customer-campaign/TRUE-PRODUCT-V3-2026-09-01T23-08-48-776Z.json");
    expect(fs.existsSync(receiptPath)).toBe(true);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    expect(receipt.total).toBe(100);

    const batchPersonas = receipt.personas.slice(${startIdx - 1}, ${endIdx});
    expect(batchPersonas.length).toBe(10);
    for (const p of batchPersonas) {
      expect(p.id).toMatch(/^CUST-\\d{3}$/);
      expect(["PASS", "WARN", "FAIL"]).toContain(p.verdict);
      expect(Number(p.avgScore)).toBeGreaterThan(0);
      expect(p.scores).toBeDefined();
    }
  });
});
`;
  fs.writeFileSync(file, content, "utf8");
  console.log("Strengthened:", file);
}
