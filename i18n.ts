import { getRequestConfig } from "next-intl/server";
import finalTranslations from "./config/pass23/i18n-final-translations.json";
import supplementalTranslations from "./config/pass23/i18n-supplemental-value-map.json";
import deMessages from "./messages/de.json";
import deReleaseOverrides from "./messages/release-overrides/de.json";
import enMessages from "./messages/en.json";
import plMessages from "./messages/pl.json";
import plReleaseOverrides from "./messages/release-overrides/pl.json";
import { applyTranslationKeyValueMap, applyTranslationWave, mergeMessages } from "./lib/i18n/merge-messages.mjs";
import { routing } from "./routing";

// A42: keep the locale catalog statically bound. Next 16/Turbopack no longer
// needs to resolve a template-literal JSON import inside every server worker.
// Both translation waves are model-assisted drafts and remain subject to native-
// language review. Release overrides are explicit runtime inputs. PASS23 audits
// this same effective catalog and does not promote legal/merchant GO.
const plPrimaryDraft = applyTranslationWave(plMessages, finalTranslations.translations, "pl");
const dePrimaryDraft = applyTranslationWave(deMessages, finalTranslations.translations, "de");
const plDraftMessages = applyTranslationKeyValueMap(plPrimaryDraft, supplementalTranslations, "pl");
const deDraftMessages = applyTranslationKeyValueMap(dePrimaryDraft, supplementalTranslations, "de");
const MESSAGE_CATALOG = {
  pl: mergeMessages(plDraftMessages, plReleaseOverrides),
  en: enMessages,
  de: mergeMessages(deDraftMessages, deReleaseOverrides),
} as const;
Object.freeze(MESSAGE_CATALOG);

export default getRequestConfig(async ({ requestLocale }: { requestLocale: Promise<string | undefined> }) => {
  const requested = await requestLocale;
  const locale = typeof requested === "string" && (routing.locales as readonly string[]).includes(requested)
    ? requested as keyof typeof MESSAGE_CATALOG
    : routing.defaultLocale;
  return { locale, messages: MESSAGE_CATALOG[locale] };
});
