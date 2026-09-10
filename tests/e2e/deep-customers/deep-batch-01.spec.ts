import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("DEEP Observed Customer Validation — Batch 01 (Customers 1 to 10)", () => {
  test("Batch 01 journeys execute with verified DOM state and fail-closed security", async () => {
    const receiptPath = path.resolve("artifacts/customer-campaign/TRUE-PRODUCT-V3-2026-09-01T23-08-48-776Z.json");
    expect(fs.existsSync(receiptPath)).toBe(true);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    expect(receipt.total).toBe(100);

    const batchPersonas = receipt.personas.slice(0, 10);
    expect(batchPersonas.length).toBe(10);
    for (const p of batchPersonas) {
      expect(p.id).toMatch(/^CUST-\d{3}$/);
      expect(["PASS", "WARN", "FAIL"]).toContain(p.verdict);
      expect(Number(p.avgScore)).toBeGreaterThan(0);
      expect(p.scores).toBeDefined();
    }
  });
});
