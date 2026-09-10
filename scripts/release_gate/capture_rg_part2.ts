import { BASE_URL, DIR, dismissCookie } from "./capture_rg_part1";

export async function captureRgShieldAndMarkets(browser: any) {
  const shieldPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await shieldPage.goto(`${BASE_URL}/en/shield`, { waitUntil: "domcontentloaded" });
  await dismissCookie(shieldPage);
  await shieldPage.waitForSelector('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]', { timeout: 15000 });
  await shieldPage.waitForTimeout(1500);
  await shieldPage.screenshot({ path: `${DIR}/shield_desktop_real_table_25coins.png` });

  const btcRow = shieldPage.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  await btcRow.click();
  await shieldPage.waitForTimeout(1500);
  await shieldPage.screenshot({ path: `${DIR}/shield_desktop_btc_asset_modal.png` });
  await shieldPage.close();

  const proPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await proPage.goto(`${BASE_URL}/en/shield-pro`, { waitUntil: "domcontentloaded" });
  await dismissCookie(proPage);
  await proPage.waitForTimeout(2500);
  await proPage.screenshot({ path: `${DIR}/shield_pro_desktop_real_table.png` });

  const ethRow = proPage.locator('tr:has-text("ETH")').first();
  if (await ethRow.isVisible()) {
    await ethRow.click();
    await proPage.waitForTimeout(1500);
    await proPage.screenshot({ path: `${DIR}/shield_pro_desktop_eth_asset_modal.png` });
  }
  await proPage.close();

  const rmPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await rmPage.goto(`${BASE_URL}/en/real-markets`, { waitUntil: "domcontentloaded" });
  await dismissCookie(rmPage);
  await rmPage.waitForTimeout(3000);
  await rmPage.screenshot({ path: `${DIR}/real_markets_desktop_real_table.png` });

  const aaplRow = rmPage.locator('div:has-text("Apple"):has-text("AAPL")').first();
  if (await aaplRow.isVisible()) {
    await aaplRow.click();
    await rmPage.waitForTimeout(1500);
    await rmPage.screenshot({ path: `${DIR}/real_markets_desktop_aapl_modal.png` });
  }
  await rmPage.close();

  const mapPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await mapPage.goto(`${BASE_URL}/en/shield-map`, { waitUntil: "domcontentloaded" });
  await dismissCookie(mapPage);
  await mapPage.waitForTimeout(2000);
  await mapPage.screenshot({ path: `${DIR}/shield_map_desktop_topology.png` });
  await mapPage.close();

  const angelPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await angelPage.goto(`${BASE_URL}/en/shield`, { waitUntil: "domcontentloaded" });
  await dismissCookie(angelPage);
  await angelPage.evaluate(() => { window.dispatchEvent(new Event("velmere:angel:open")); });
  await angelPage.waitForTimeout(1500);
  await angelPage.screenshot({ path: `${DIR}/angel_desktop_drawer_conversation.png` });
  await angelPage.close();

  const m1 = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await m1.goto(`${BASE_URL}/en/shield`, { waitUntil: "domcontentloaded" });
  await dismissCookie(m1);
  await m1.waitForTimeout(2500);
  await m1.screenshot({ path: `${DIR}/shield_mobile_375px_populated.png` });
  await m1.close();

  const m2 = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await m2.goto(`${BASE_URL}/en/real-markets`, { waitUntil: "domcontentloaded" });
  await dismissCookie(m2);
  await m2.waitForTimeout(2500);
  await m2.screenshot({ path: `${DIR}/real_markets_mobile_375px_populated.png` });
  await m2.close();
}
