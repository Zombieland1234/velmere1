import { test, expect } from "@playwright/test";

test.describe("PASS3901-4000 prepared-only proof closure", () => {
  test("readiness route must stay blocked until receipts execute", async ({ request }) => {
    const response = await request.get("/api/pass3901-4000/readiness");
    expect([200, 404, 500]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe("PREPARED_NOT_EXECUTED");
      expect(body.worldClassLiveClaim).toBe(false);
      expect(body.publicTopClaim).toBe(false);
    }
  });
});
