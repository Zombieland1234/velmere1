import { expect, test, type Page } from "@playwright/test";

const widths = [320, 360, 390, 430] as const;

type PerformanceSnapshot = {
  cls: number;
  maxLongTaskMs: number;
  longTaskCount: number;
  maxInteractionMs: number | null;
  maxAnimationFrameMs: number | null;
  activeWebglScenes: number;
  hiddenScenesFrozen: boolean;
  horizontalOverflowPx: number;
};

async function installPerformanceObservers(page: Page) {
  await page.addInitScript(() => {
    const state = {
      cls: 0,
      longTasks: [] as number[],
      interactions: [] as number[],
      animationFrames: [] as number[],
    };
    Object.defineProperty(window, "__velmerePass645", { value: state, configurable: true });
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!entry.hadRecentInput) state.cls += entry.value ?? 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
      }).observe({ type: "longtask", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { interactionId?: number }>) {
          if ((entry.interactionId ?? 0) > 0) state.interactions.push(entry.duration);
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {}
    let previous = performance.now();
    let frames = 0;
    const sampleFrame = (now: number) => {
      state.animationFrames.push(now - previous);
      if (state.animationFrames.length > 180) state.animationFrames.shift();
      previous = now;
      frames += 1;
      if (frames < 240) requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
  });
}

async function snapshot(page: Page): Promise<PerformanceSnapshot> {
  return page.evaluate(() => {
    const state = (window as Window & { __velmerePass645?: { cls: number; longTasks: number[]; interactions: number[]; animationFrames: number[] } }).__velmerePass645;
    const visibleNeuralScenes = [...document.querySelectorAll<HTMLElement>("[data-pass602-neural-evidence-topology]")]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
    const hiddenScenes = [...document.querySelectorAll<HTMLElement>("[data-pass602-neural-evidence-topology]")]
      .filter((node) => !visibleNeuralScenes.includes(node));
    return {
      cls: state?.cls ?? 0,
      maxLongTaskMs: Math.max(0, ...(state?.longTasks ?? [])),
      longTaskCount: state?.longTasks.length ?? 0,
      maxInteractionMs: state?.interactions.length ? Math.max(...state.interactions) : null,
      maxAnimationFrameMs: state?.animationFrames.length ? Math.max(...state.animationFrames.slice(10)) : null,
      activeWebglScenes: visibleNeuralScenes.length,
      hiddenScenesFrozen: hiddenScenes.every((node) =>
        node.getAttribute("data-pass603-rendering-mode") !== "webgl" ||
        node.getAttribute("data-pass604-motion-active") === "false" ||
        node.getAttribute("aria-hidden") === "true"
      ),
      horizontalOverflowPx: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
    };
  });
}

for (const width of widths) {
  test(`${width}px · Shield mobile interaction budget`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await installPerformanceObservers(page);
    await page.goto("/en/market-integrity", { waitUntil: "domcontentloaded" });
    const firstControl = page.locator("button:visible, a:visible").first();
    if (await firstControl.count()) {
      await firstControl.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(500);
    const result = await snapshot(page);
    expect(result.horizontalOverflowPx).toBeLessThanOrEqual(4);
    expect(result.cls).toBeLessThanOrEqual(0.1);
    expect(result.activeWebglScenes).toBeLessThanOrEqual(1);
    expect(result.hiddenScenesFrozen).toBe(true);
    if (result.maxInteractionMs !== null) expect(result.maxInteractionMs).toBeLessThanOrEqual(200);
    expect(result.maxLongTaskMs).toBeLessThanOrEqual(150);
  });
}

test("reduced motion freezes decorative loops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installPerformanceObservers(page);
  await page.goto("/en/market-integrity/shield-map", { waitUntil: "domcontentloaded" });
  const contract = await page.evaluate(() => ({
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    infiniteAnimations: [...document.getAnimations()].filter((animation) => animation.effect?.getTiming().iterations === Infinity && animation.playState === "running").length,
  }));
  expect(contract.reduced).toBe(true);
  expect(contract.infiniteAnimations).toBe(0);
});
