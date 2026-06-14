import { expect, test, type Page } from "@playwright/test";

async function assertVisibleAboveBackdrop(page: Page, surfaceSelector: string) {
  const surface = page.locator(surfaceSelector).last();
  await expect(surface).toBeVisible();
  const state = await surface.evaluate((element) => {
    const backdrop = document.querySelector<HTMLElement>('[data-velmere-overlay-layer$="backdrop"]');
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, surfaceZ: Number(getComputedStyle(element).zIndex || 0), backdropZ: Number(backdrop ? getComputedStyle(backdrop).zIndex || 0 : 0) };
  });
  expect(state.width).toBeGreaterThan(120); expect(state.height).toBeGreaterThan(120); expect(state.surfaceZ).toBeGreaterThan(state.backdropZ);
}
for (const locale of ["pl", "en", "de"] as const) {
  test(`${locale} Square unauthenticated composer responds`, async ({ page }) => {
    await page.goto(`/${locale}/square`, { waitUntil: "domcontentloaded" });
    const name = locale === "pl" ? "Utwórz sygnał Square" : locale === "de" ? "Square-Signal erstellen" : "Create Square signal";
    await page.getByRole("button", { name }).click();
    await expect(page.getByRole("status")).toBeVisible();
  });
}
test("Square composer is visible, locks body and restores focus", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("velmere:account-session", "active"); localStorage.setItem("velmere:account-profile", JSON.stringify({ displayName: "QA Member" })); });
  await page.goto("/pl/square", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: "Utwórz sygnał Square" }); await trigger.focus(); await trigger.click();
  await assertVisibleAboveBackdrop(page, '[data-square-composer="visible"]');
  await expect(page.locator("html")).toHaveAttribute("data-velmere-scroll-locked", "true");
  await page.keyboard.press("Escape"); await expect(page.locator('[data-square-composer="visible"]')).toHaveCount(0); await expect(trigger).toBeFocused();
});
test("Square post modal renders above backdrop", async ({ page }) => {
  await page.goto("/pl/square", { waitUntil: "domcontentloaded" }); const post = page.locator("article button").first(); await post.focus(); await post.click();
  await assertVisibleAboveBackdrop(page, '[data-square-post-modal="visible"]'); await page.keyboard.press("Escape"); await expect(post).toBeFocused();
});
test("header menu and cart expose visible dialogs", async ({ page }) => {
  await page.goto("/pl", { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: "Open menu" }).click(); await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open cart" }).click(); await expect(page.getByRole("dialog").last()).toBeVisible();
});
