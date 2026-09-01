import { test, expect } from '@playwright/test';

test.describe('PASS3201-3300 public-claim fail-closed gates', () => {
  test('public top/world-class claim remains blocked without L5 receipts', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const response = await request.get('/api/market-integrity/public-claim-transparency');
    expect(response.ok()).toBe(true);
    const payload = await response.json() as {
      publicClaimStatus?: string;
      canClaimWorldClassLive?: boolean;
      canShowGreenProductionBadge?: boolean;
      canUseMarketingCopyAsProof?: boolean;
    };
    expect(payload.publicClaimStatus).toBe('NO_GO_PUBLIC_RECEIPTS_REQUIRED');
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canShowGreenProductionBadge).toBe(false);
    expect(payload.canUseMarketingCopyAsProof).toBe(false);
  });
});
