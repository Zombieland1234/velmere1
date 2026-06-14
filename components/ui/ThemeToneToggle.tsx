"use client";

/**
 * Legacy safety stub.
 *
 * Older Velmère builds still imported ThemeToneToggle from the header.
 * The light/white theme toggle was intentionally removed because it broke
 * visual contrast and produced stale Tailwind opacity classes on Vercel.
 * Keeping this no-op component makes old imports safe while rendering nothing.
 */
export default function ThemeToneToggle() {
  return null;
}
