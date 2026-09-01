import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Surface = {
  id: "shield" | "real-markets" | "shield-pro";
  route: string;
  ready: string;
  openers: string[];
  modal: string;
};

const surfaces: Surface[] = [
  {
    id: "shield",
    route: "/en/shield",
    ready: "body",
    openers: ["tbody tr[role='button']", "[data-pass4468-mobile-row-click-target='shield-asset-modal']"],
    modal: "[data-pass4678-screenshot-gate='shield-realmarkets-popup-geometry']",
  },
  {
    id: "real-markets",
    route: "/en/real-markets",
    ready: "[data-pass2892-playwright-realmarkets-target]",
    openers: ["tbody tr[role='button']", "[data-testid='realmarkets-row-mobile']"],
    modal: "[data-pass4678-screenshot-gate='shield-realmarkets-popup-geometry']",
  },
  {
    id: "shield-pro",
    route: "/en/shield-pro",
    ready: "[data-pass4608-shield-pro]",
    openers: ["tbody tr"],
    modal: "[data-pass4678-screenshot-gate='shield-pro-popup-geometry']",
  },
];

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.scrollIntoViewIfNeeded();
      await candidate.click();
      return selector;
    }
  }
  throw new Error(`No visible opener found: ${selectors.join(", ")}`);
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

for (const surface of surfaces) {
  test(`${surface.id} popup produces geometry, overflow, lock and Escape receipt`, async ({ page }, testInfo: TestInfo) => {
    const project = safeName(testInfo.project.name);
    const artifactDir = path.resolve("artifacts/pass4687/browser-matrix", project);
    await mkdir(artifactDir, { recursive: true });

    await page.goto(surface.route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(surface.ready).first()).toBeVisible({ timeout: 30_000 });
    const opener = await clickFirstVisible(page, surface.openers);
    const modal = page.locator(surface.modal).first();
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(250);

    const viewport = page.viewportSize();
    const box = await modal.boundingBox();
    expect(viewport).not.toBeNull();
    expect(box).not.toBeNull();
    if (!viewport || !box) throw new Error("Missing viewport or modal box");

    const measurements = await page.evaluate((modalSelector) => {
      const node = document.querySelector<HTMLElement>(modalSelector);
      if (!node) throw new Error("Modal disappeared before receipt measurement");
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      return {
        modalScrollWidth: node.scrollWidth,
        modalClientWidth: node.clientWidth,
        modalScrollHeight: node.scrollHeight,
        modalClientHeight: node.clientHeight,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        bodyOverflow: bodyStyle.overflow,
        htmlOverflow: htmlStyle.overflow,
      };
    }, surface.modal);

    const centerDeltaX = Math.abs(box.x + box.width / 2 - viewport.width / 2);
    const centerDeltaY = Math.abs(box.y + box.height / 2 - viewport.height / 2);
    const maxCenterDeltaX = Math.max(10, viewport.width * 0.08);
    const maxCenterDeltaY = Math.max(18, viewport.height * 0.12);
    const horizontalOverflow = measurements.modalScrollWidth - measurements.modalClientWidth;
    const documentHorizontalOverflow = measurements.documentScrollWidth - measurements.documentClientWidth;
    const bodyLocked = ["hidden", "clip"].includes(measurements.bodyOverflow) || ["hidden", "clip"].includes(measurements.htmlOverflow);

    const checks = {
      fitsViewportWidth: box.width <= viewport.width + 2,
      fitsViewportHeight: box.height <= viewport.height + 2,
      meaningfulWidth: box.width >= Math.min(320, viewport.width * 0.72),
      meaningfulHeight: box.height >= Math.min(420, viewport.height * 0.62),
      horizontallyCentered: centerDeltaX <= maxCenterDeltaX,
      verticallyCentered: centerDeltaY <= maxCenterDeltaY,
      noModalHorizontalOverflow: horizontalOverflow <= 2,
      noDocumentHorizontalOverflow: documentHorizontalOverflow <= 2,
      bodyScrollLocked: bodyLocked,
    };

    for (const [name, value] of Object.entries(checks)) {
      expect(value, `${surface.id}/${project}: ${name}`).toBe(true);
    }

    const pageScreenshot = path.join(artifactDir, `${surface.id}-page.png`);
    const modalScreenshot = path.join(artifactDir, `${surface.id}-modal.png`);
    await page.screenshot({ path: pageScreenshot, fullPage: false, animations: "disabled" });
    await modal.screenshot({ path: modalScreenshot, animations: "disabled" });

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden({ timeout: 10_000 });
    const bodyOverflowAfterEscape = await page.evaluate(() => getComputedStyle(document.body).overflow);
    const htmlOverflowAfterEscape = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    const escapeRestoredScroll = !["hidden", "clip"].includes(bodyOverflowAfterEscape) && !["hidden", "clip"].includes(htmlOverflowAfterEscape);
    expect(escapeRestoredScroll, `${surface.id}/${project}: Escape restores document scrolling`).toBe(true);

    const receipt = {
      schemaVersion: "velmere.pass4687.browser_matrix_cell.v1",
      surface: surface.id,
      route: surface.route,
      project: testInfo.project.name,
      opener,
      viewport,
      modalBox: box,
      centerDeltaX,
      centerDeltaY,
      maxCenterDeltaX,
      maxCenterDeltaY,
      horizontalOverflow,
      documentHorizontalOverflow,
      bodyOverflowWhileOpen: measurements.bodyOverflow,
      htmlOverflowWhileOpen: measurements.htmlOverflow,
      bodyOverflowAfterEscape,
      htmlOverflowAfterEscape,
      escapeClosedModal: true,
      escapeRestoredScroll,
      checks,
      screenshots: {
        page: path.relative(process.cwd(), pageScreenshot),
        modal: path.relative(process.cwd(), modalScreenshot),
      },
      capturedAt: new Date().toISOString(),
    };
    await writeFile(path.join(artifactDir, `${surface.id}.json`), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  });
}
