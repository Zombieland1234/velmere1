export type PendingMobileWallet = "metamask" | "phantom";

const PENDING_KEY = "velmere:pending-mobile-wallet";

export function isMobileViewport() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isMetaMaskInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /MetaMask/i.test(navigator.userAgent);
}

export function isPhantomInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Phantom/i.test(navigator.userAgent) || Boolean((window as Window & { phantom?: unknown }).phantom);
}

export function setPendingMobileWallet(kind: PendingMobileWallet) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, kind);
  } catch {}
}

export function consumePendingMobileWallet(): PendingMobileWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(PENDING_KEY) as PendingMobileWallet | null;
    window.sessionStorage.removeItem(PENDING_KEY);
    return value === "metamask" || value === "phantom" ? value : null;
  } catch {
    return null;
  }
}

function currentDappUrl() {
  if (typeof window === "undefined") return "https://velmere-store.vercel.app";
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function openMetaMaskMobileDapp() {
  if (typeof window === "undefined") return;
  setPendingMobileWallet("metamask");
  const dapp = currentDappUrl().replace(/^https?:\/\//, "");
  window.location.assign(`https://link.metamask.io/dapp/${dapp}`);
}

export function openPhantomMobileBrowser() {
  if (typeof window === "undefined") return;
  setPendingMobileWallet("phantom");
  const dapp = encodeURIComponent(currentDappUrl());
  const ref = encodeURIComponent(window.location.origin);
  window.location.assign(`https://phantom.app/ul/browse/${dapp}?ref=${ref}`);
}
