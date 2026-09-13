import { getRequestConfig } from "next-intl/server";
import deMessages from "./messages/de.json";
import deReleaseOverrides from "./messages/release-overrides/de.json";
import enMessages from "./messages/en.json";
import plMessages from "./messages/pl.json";
import plReleaseOverrides from "./messages/release-overrides/pl.json";
import { mergeMessages } from "./lib/i18n/merge-messages.mjs";
import { routing } from "./routing";

// A42: keep the locale catalog statically bound. Next 16/Turbopack no longer
// needs to resolve a template-literal JSON import inside every server worker.
// Release overrides are explicit runtime inputs and are audited by PASS23 using
// the same mergeMessages implementation; they do not change legal/merchant GO.
const MESSAGE_CATALOG = {
  pl: mergeMessages(plMessages, plReleaseOverrides),
  en: enMessages,
  de: mergeMessages(deMessages, deReleaseOverrides),
} as const;
Object.freeze(MESSAGE_CATALOG);

export default getRequestConfig(async ({ requestLocale }: { requestLocale: Promise<string | undefined> }) => {
  const requested = await requestLocale;
  const locale = typeof requested === "string" && (routing.locales as readonly string[]).includes(requested)
    ? requested as keyof typeof MESSAGE_CATALOG
    : routing.defaultLocale;

  return {
    locale,
    messages: MESSAGE_CATALOG[locale],
  };
});
