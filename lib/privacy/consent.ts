export type ConsentChoice = {
  version: string;
  decidedAt: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_STORAGE_KEY = "velmere_cookie_consent_v1";
export const CONSENT_VERSION = "2026-05-26";

export function createConsentChoice(choice: "accepted" | "declined"): ConsentChoice {
  return {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    analytics: choice === "accepted",
    marketing: choice === "accepted",
  };
}

export function parseConsent(value: string | null): ConsentChoice | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ConsentChoice;
    if (parsed.version !== CONSENT_VERSION || parsed.necessary !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}
