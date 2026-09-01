/**
 * PASS12 test-only next-intl/routing compatibility surface.
 * Production code never imports this path directly; the offline loader maps it
 * only when the real dependency is unavailable during isolated source replay.
 */
export function defineRouting(configuration) {
  return Object.freeze({ ...configuration, locales: Object.freeze([...configuration.locales]) });
}
