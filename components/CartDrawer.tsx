"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/navigation";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { formatMoney } from "@/lib/products/catalog";
import { getStripeClient } from "@/lib/stripe/client";
import { useUiSounds } from "@/lib/audio/useUiSounds";
import { useMounted } from "@/lib/hooks/useMounted";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import { DrawerRoot } from "@/components/ui/OverlayPrimitives";

const SIZES = ["XS", "S", "M", "L", "XL"];
export default function CartDrawer() {
  const t = useTranslations("Cart");
  const common = useTranslations("Common");
  const trust = useTranslations("Trust");
  const pathname = usePathname();
  const locale = useLocale();
  const {
    items,
    isOpen,
    hasHydrated,
    closeCart,
    removeItem,
    updateSize,
    addItem,
    subtotal,
    itemCount,
    currency,
  } = useCart();
  const walletUi = useWalletUiStore();
  const mounted = useMounted();
  const [checkoutState, setCheckoutState] = useState<
    "idle" | "loading" | "failed"
  >("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [agreedPolicies, setAgreedPolicies] = useState(false);
  const { playClick } = useUiSounds();
  const hasStripePublishableKey = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );

  const checkoutAllowed =
    items.length > 0 &&
    hasStripePublishableKey &&
    agreedPolicies &&
    checkoutState !== "loading";

  const closeCartRef = useRef(closeCart);
  const pathnameCloseArmedRef = useRef(false);
  useEffect(() => {
    closeCartRef.current = closeCart;
  }, [closeCart]);
  useEffect(() => {
    if (!pathnameCloseArmedRef.current) {
      pathnameCloseArmedRef.current = true;
      return;
    }
    closeCartRef.current();
  }, [pathname]);
  useEffect(() => {
    if (!isOpen) {
      setCheckoutError(null);
      setCheckoutState("idle");
    }
  }, [isOpen]);

  const haptic = () => navigator.vibrate?.(35);

  const startCheckout = async () => {
    if (!checkoutAllowed) return;
    playClick();
    haptic();
    setCheckoutState("loading");
    setCheckoutError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          walletAddress: walletUi.connected ? walletUi.fullAddress : null,
          items: items.map((item) => ({
            productId: item.id,
            variantId: item.variantId,
            size: item.size,
            selectedSize: item.size,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.sessionId)
        throw new Error(data.error ?? t("checkoutFailed"));

      const stripe = await getStripeClient();
      if (!stripe) {
        if (data.url) {
          window.location.assign(data.url);
          return;
        }
        throw new Error(t("paymentConfigRequired"));
      }
      const redirect = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
      if (redirect.error)
        throw new Error(redirect.error.message ?? t("checkoutFailed"));
    } catch (error) {
      setCheckoutState("failed");
      setCheckoutError(
        error instanceof Error ? error.message : t("checkoutFailed"),
      );
    }
  };

  if (!mounted) return null;

  return (
    <DrawerRoot
      open={isOpen}
      onClose={closeCart}
      closeLabel={common("close")}
      ariaLabel={t("orderBook")}
      motionPreset="bottom"
      motionDuration={0.36}
      lockScroll
      surfaceId="velmere-cart-bottom-sheet"
      surfaceClassName="velmere-command-shell velmere-cart-bottom-sheet flex w-[calc(100vw-2rem)] max-w-[58rem] flex-col overflow-hidden rounded-[1.45rem] text-white outline-none shadow-[0_-34px_120px_rgba(0,0,0,0.72)]"
      surfaceData={{
        surface: "cart-bottom-sheet",
        "pass1454-cart": "bottom-sheet-safe-area-only",
        "pass1734-cart": "bottom-sheet-visible-scroll-owned",
        "pass1774-cart": hasHydrated
          ? "persist-hydrated"
          : "force-open-before-persist-hydration",
        "pass1814-cart": "hard-open-local-state-or-store",
        "pass1934-cart": "runtime-click-proof-visible",
        "pass2009-cart": "scroll-lock-subtotal-tax-at-address-truth",
        testid: "velmere-cart-bottom-sheet",
      }}
    >
      <div
        className="mx-auto mt-3 h-1 w-14 rounded-full bg-white/[0.20] md:hidden"
        aria-hidden="true"
      />
      <header
        className="flex items-center justify-between border-b border-white/[0.10] px-4 py-4 md:px-5 md:py-5"
        data-pass1934-cart-header="visible-after-pointer-click-keyboard"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-velmere-gold/[0.80]">
            {t("kicker")}
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-[0.08em] text-white md:text-3xl">
            {t("orderBook")}
          </h2>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/[0.35]">
            {itemCount} {t("units")}
          </p>
        </div>
        <button
          type="button"
          onClick={closeCart}
          aria-label={common("close")}
          className="velmere-command-pill velmere-interaction-pulse flex h-11 w-11 items-center justify-center px-0 text-white/[0.62]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div
        data-modal-scroll-region="true"
        data-pass1454-cart-scroll-owner="cart-items-only"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch px-0 py-0 luxury-scrollbar"
      >
        {items.length === 0 ? (
          <div
            className="velmere-empty-state flex h-full min-h-[18rem] flex-col items-center justify-center px-6 py-8 text-center"
            data-testid="velmere-cart-empty-state"
            data-pass1934-empty-cart="visible-public-order-book"
          >
            <div className="velmere-readout-card flex h-16 w-16 items-center justify-center rounded-2xl">
              <ShoppingBag
                className="h-7 w-7 text-white/[0.38]"
                aria-hidden="true"
              />
            </div>
            <p className="mt-5 max-w-[15rem] font-mono text-[10px] uppercase leading-6 tracking-[0.18em] text-white/[0.42] md:max-w-xs md:text-[11px] md:leading-7 md:tracking-[0.22em]">
              {t("emptyLong")}
            </p>
            <Link
              href="/shop"
              onClick={closeCart}
              className="velmere-command-pill velmere-interaction-pulse mt-8 min-h-12 px-6 text-[10px] text-white/[0.70]"
            >
              {t("continueShopping")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {items.map((item) => (
              <li
                key={`${item.id}-${item.size}`}
                className="grid gap-4 border-b border-white/[0.05] px-5 py-5"
              >
                <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4">
                  <div className="velmere-readout-card relative h-24 overflow-hidden rounded-xl bg-black/[0.40] p-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover contrast-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/[0.05]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-100/[0.64]">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-cyan-200/[0.72]"
                        aria-hidden="true"
                      />
                      {t("itemAdded")}
                    </div>
                    <h3 className="break-words font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-white">
                      {item.name}
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.42]">
                      <span>
                        {t("size")}:{" "}
                        <b className="font-normal text-white/[0.72]">
                          {item.size}
                        </b>
                      </span>
                      <span>
                        {t("qty")}:{" "}
                        <b className="font-normal tabular-nums text-white/[0.72]">
                          {item.quantity}
                        </b>
                      </span>
                      <span className="col-span-2 break-all">
                        {t("price")}:{" "}
                        <b className="font-normal tabular-nums text-white/[0.72]">
                          {formatMoney(
                            {
                              amount: item.price * item.quantity,
                              currency: item.currency,
                            },
                            locale,
                          )}
                        </b>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        haptic();
                        updateSize(item.id, item.size, size);
                      }}
                      className={`velmere-command-pill velmere-interaction-pulse flex h-9 min-w-9 px-2 text-[10px] ${item.size === size ? "text-black" : "text-white/[0.52] hover:text-white"}`}
                      data-tone={item.size === size ? "gold" : undefined}
                    >
                      {size}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label={t("decreaseQuantity")}
                    onClick={() => removeItem(item.id, item.size)}
                    className="velmere-command-pill velmere-interaction-pulse ml-auto flex h-9 w-9 items-center justify-center px-0 text-white/[0.50] hover:text-white"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="velmere-readout-card flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-mono text-[10px] text-white/[0.70]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={t("increaseQuantity")}
                    onClick={() => {
                      haptic();
                      addItem({ ...item, quantity: 1 });
                    }}
                    className="velmere-command-pill velmere-interaction-pulse flex h-9 w-9 items-center justify-center px-0 text-white/[0.50] hover:text-white"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer
        data-modal-scroll-region="true"
        className="max-h-[50dvh] shrink-0 overflow-y-auto overscroll-contain border-t border-white/[0.10] bg-[#151517] px-4 py-4 safe-pb luxury-scrollbar md:max-h-none md:overflow-visible md:px-5 md:py-5"
      >
        {items.length === 0 ? (
          <div className="velmere-readout-card flex items-center justify-between gap-4 rounded-xl px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.40]">
            <span>{t("noAllocation")}</span>
            <span className="text-[#c8a96a]/[0.70]">0.00 EUR</span>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <span className="velmere-command-pill justify-start px-4 py-3 text-[9px] text-white/[0.48]">
                {trust("securePayment")}
              </span>
              <span className="velmere-command-pill justify-start px-4 py-3 text-[9px] text-white/[0.48]">
                {trust("trackedShipping")}
              </span>
              <span className="velmere-command-pill justify-start px-4 py-3 text-[9px] text-white/[0.48]">
                {trust("madeAfterOrder")}
              </span>
              <span className="velmere-command-pill justify-start px-4 py-3 text-[9px] text-white/[0.48]">
                {trust("support")}
              </span>
            </div>
            <div className="velmere-readout-card mt-4 space-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.42] md:mt-5">
              <div className="flex items-center justify-between gap-3 text-white/[0.70]">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums text-white">
                  {formatMoney({ amount: subtotal, currency }, locale)}
                </span>
              </div>
              <p className="border-t border-white/[0.07] pt-3 text-[9px] normal-case tracking-normal text-white/[0.42]">
                {t("taxAtAddress")}
              </p>
            </div>
            <div className="velmere-readout-card mt-3 grid gap-2 font-mono text-[9px] leading-5 text-white/[0.54] md:mt-4 md:gap-3 md:text-[10px]">
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={agreedPolicies}
                  onChange={(event) => setAgreedPolicies(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-velmere-gold"
                />
                <span>
                  {t("acceptTermsPrefix")}{" "}
                  <Link
                    href="/terms"
                    className="text-velmere-gold underline-offset-4 hover:underline"
                  >
                    {t("terms")}
                  </Link>{" "}
                  {t("and")}{" "}
                  <Link
                    href="/returns"
                    className="text-velmere-gold underline-offset-4 hover:underline"
                  >
                    {t("refundPolicy")}
                  </Link>
                  .
                </span>
              </label>
            </div>
            <div className="velmere-readout-card mt-3 grid gap-2 text-[11px] leading-5 text-white/[0.56]">
              <p>{t("shippingNote")}</p>
              <p>{t("returnsNote")}</p>
              <p className="text-velmere-gold/[0.78]">{t("vlmOptional")}</p>
            </div>
            <button
              type="button"
              disabled={!checkoutAllowed}
              onClick={startCheckout}
              className="velmere-command-pill velmere-interaction-pulse mt-4 flex min-h-13 w-full items-center justify-center gap-2 px-6 text-[10px] text-white/[0.34] enabled:cursor-pointer enabled:bg-white enabled:text-black enabled:hover:bg-velmere-gold disabled:cursor-not-allowed disabled:opacity-40 md:mt-5 md:min-h-14 md:text-[11px] md:tracking-[0.2em]"
            >
              {checkoutState === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {hasStripePublishableKey
                ? `${t("checkout")} (${itemCount})`
                : t("paymentConfigRequired")}
            </button>
            {checkoutError ? (
              <p
                className="velmere-readout-card mt-3 font-mono text-[10px] leading-5 text-white/[0.64]"
                data-tone="gold"
              >
                {checkoutError}
              </p>
            ) : null}
          </>
        )}
      </footer>
    </DrawerRoot>
  );
}
