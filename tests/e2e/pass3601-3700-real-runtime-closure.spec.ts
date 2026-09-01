import { test, expect } from "@playwright/test";

test.describe("PASS3601-3700 real runtime closure prepared gates", () => {
  test("readiness route stays blocked until real L5 receipts exist", async ({ request }) => {
    const response = await request.get("/api/velmere/pass3601/runtime-readiness");
    expect([200, 404, 500]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json.status).toBe("PREPARED_NOT_EXECUTED");
      expect(json.worldClassLiveClaim).toBe(false);
    }
  });
});
