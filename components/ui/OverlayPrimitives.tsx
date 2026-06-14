"use client";

import {
  Component,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import BodyPortal from "@/components/ui/BodyPortal";
import { useDialogFocusBoundary } from "@/components/ui/useDialogFocusBoundary";
import { useModalScrollLock } from "@/components/ui/useModalScrollLock";
import {
  pass628LayerStyle,
  type VelmereOverlayLayer,
} from "@/lib/ui/pass628-overlay-constitution";

type OverlayBoundaryProps = {
  children: ReactNode;
  fallbackMessage: string;
  closeLabel: string;
  onClose: () => void;
  resetKey: string;
};

type OverlayBoundaryState = { failed: boolean };

class OverlayContentBoundary extends Component<
  OverlayBoundaryProps,
  OverlayBoundaryState
> {
  state: OverlayBoundaryState = { failed: false };

  static getDerivedStateFromError(): OverlayBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Velmere overlay render failed",
        error,
        info.componentStack,
      );
    }
  }

  componentDidUpdate(previous: OverlayBoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-48 place-items-center gap-5 p-8 text-center">
        <p className="max-w-md text-sm leading-7 text-white/[0.68]">
          {this.props.fallbackMessage}
        </p>
        <button
          type="button"
          onClick={this.props.onClose}
          className="velmere-command-pill min-h-11 px-5 text-[10px] text-white/[0.75]"
        >
          {this.props.closeLabel}
        </button>
      </div>
    );
  }
}

type SharedOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  fallbackMessage?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  closeOnBackdrop?: boolean;
  /**
   * PASS1979: header/menu/cart drawers are lightweight command surfaces.
   * They still close from the backdrop, but they do not need to freeze the
   * whole document with the expensive body fixed scroll-lock path.
   */
  lockScroll?: boolean;
  surfaceClassName?: string;
  surfaceData?: Record<string, string>;
  surfaceId?: string;
};

function layerName(layer: VelmereOverlayLayer) {
  return layer.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

type DropdownRootProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  align?: "start" | "end";
  width?: number;
  offset?: number;
  surfaceData?: Record<string, string>;
  id?: string;
};

type DropdownPosition = {
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
  placement: "anchored" | "fallback";
};

type VelmereOverlayOpeningDetail = {
  kind: "dropdown" | "modal" | "drawer";
  surfaceId?: string;
  surface?: string;
};

declare global {
  interface WindowEventMap {
    "velmere:overlay-opening": CustomEvent<VelmereOverlayOpeningDetail>;
  }
}

function emitOverlayOpening(detail: VelmereOverlayOpeningDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("velmere:overlay-opening", { detail }));
}

function surfaceName(surfaceData?: Record<string, string>) {
  return surfaceData?.surface ?? Object.values(surfaceData ?? {})[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isUsableDropdownAnchor(
  anchor: HTMLElement | null,
): anchor is HTMLElement {
  if (!anchor || typeof window === "undefined") return false;
  if (!anchor.isConnected) return false;
  const rect = anchor.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return false;
  const style = window.getComputedStyle(anchor);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  )
    return false;
  if (anchor.closest("[aria-hidden='true'],[hidden]")) return false;
  return true;
}

function resolveDropdownPosition(
  anchor: HTMLElement,
  align: "start" | "end",
  width: number | undefined,
  offset: number,
): DropdownPosition {
  const rect = anchor.getBoundingClientRect();
  const visualViewport = window.visualViewport ?? null;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  const preferredWidth = Math.min(
    width ?? Math.max(144, rect.width),
    Math.max(144, viewportWidth - 24),
  );
  const rawLeft =
    align === "end"
      ? viewportLeft + rect.right - preferredWidth
      : viewportLeft + rect.left;
  const maxLeft =
    viewportLeft + Math.max(12, viewportWidth - preferredWidth - 12);
  const rawTop = viewportTop + rect.bottom + offset;
  const maxTop = viewportTop + Math.max(12, viewportHeight - 96);
  const resolvedTop = Math.round(clamp(rawTop, viewportTop + 12, maxTop));
  const availableBelow = Math.max(
    144,
    viewportTop + viewportHeight - resolvedTop - 12,
  );
  return {
    top: resolvedTop,
    left: Math.round(clamp(rawLeft, viewportLeft + 12, maxLeft)),
    minWidth: Math.round(
      Math.min(
        Math.max(rect.width, preferredWidth),
        Math.max(144, viewportWidth - 24),
      ),
    ),
    maxHeight: Math.round(Math.min(420, Math.max(144, availableBelow))),
    placement: "anchored",
  };
}

function resolveFallbackDropdownPosition(
  align: "start" | "end",
  width: number | undefined,
): DropdownPosition {
  const visualViewport = window.visualViewport ?? null;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const preferredWidth = Math.min(
    width ?? 304,
    Math.max(144, viewportWidth - 24),
  );
  const left =
    align === "start"
      ? viewportLeft + 12
      : viewportLeft + viewportWidth - preferredWidth - 12;
  const resolvedTop = Math.round(viewportTop + 84);
  return {
    top: resolvedTop,
    left: Math.round(
      clamp(
        left,
        viewportLeft + 12,
        viewportLeft + Math.max(12, viewportWidth - preferredWidth - 12),
      ),
    ),
    minWidth: Math.round(preferredWidth),
    maxHeight: Math.round(
      Math.min(
        420,
        Math.max(
          144,
          viewportTop +
            (visualViewport?.height ?? window.innerHeight) -
            resolvedTop -
            12,
        ),
      ),
    ),
    placement: "fallback",
  };
}

export function DropdownRoot({
  open,
  onClose,
  anchorRef,
  children,
  ariaLabel,
  className = "",
  align = "end",
  width,
  offset = 10,
  surfaceData,
  id,
}: DropdownRootProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    let frame = 0;
    const updateNow = () => {
      frame = 0;
      const anchor = anchorRef.current;
      if (!isUsableDropdownAnchor(anchor)) {
        setPosition(resolveFallbackDropdownPosition(align, width));
        return;
      }
      setPosition(resolveDropdownPosition(anchor, align, width, offset));
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateNow);
    };
    updateNow();
    const viewport = window.visualViewport ?? null;
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    // PASS1986: anchored header dropdowns do not need capture-phase updates
    // for every nested scroll container. Capture scroll listeners were cheap
    // in small pages but caused micro-lag on Velmère's heavy modal/square
    // surfaces. Window + visualViewport is enough for fixed header anchors.
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    viewport?.addEventListener("resize", scheduleUpdate, { passive: true });
    viewport?.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
      viewport?.removeEventListener("resize", scheduleUpdate);
      viewport?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [align, anchorRef, offset, open, width]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (anchorRef.current?.contains(target)) return;
      if (surfaceRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        const anchor = anchorRef.current;
        if (isUsableDropdownAnchor(anchor)) {
          anchor.focus({ preventScroll: true });
        }
        return;
      }
      if (
        ![
          "ArrowDown",
          "ArrowRight",
          "ArrowUp",
          "ArrowLeft",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      const surface = surfaceRef.current;
      if (!surface?.contains(document.activeElement)) return;
      const items = Array.from(
        surface.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled]),[role='menuitem']:not([aria-disabled='true']),[tabindex]:not([tabindex='-1'])",
        ),
      ).filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      if (!items.length) return;
      const currentIndex = Math.max(
        0,
        items.indexOf(document.activeElement as HTMLElement),
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowDown" || event.key === "ArrowRight"
              ? currentIndex + 1
              : currentIndex - 1;
      event.preventDefault();
      items[(nextIndex + items.length) % items.length]?.focus({
        preventScroll: true,
      });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [anchorRef, onClose, open]);

  const resolvedPosition = useMemo(() => {
    if (!open || typeof window === "undefined") return null;
    if (position) return position;
    const anchor = anchorRef.current;
    return isUsableDropdownAnchor(anchor)
      ? resolveDropdownPosition(anchor, align, width, offset)
      : resolveFallbackDropdownPosition(align, width);
  }, [align, anchorRef, offset, open, position, width]);

  useLayoutEffect(() => {
    if (!open || !resolvedPosition) return undefined;
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const first = surface.querySelector<HTMLElement>(
      "button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex='-1'])",
    );
    const frame = window.requestAnimationFrame(() => {
      first?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, resolvedPosition]);

  const overlaySurface = surfaceName(surfaceData);

  useEffect(() => {
    if (!open) return;
    emitOverlayOpening({
      kind: "dropdown",
      surfaceId: id,
      surface: overlaySurface,
    });
  }, [id, open, overlaySurface]);

  const dataAttributes = Object.fromEntries(
    Object.entries(surfaceData ?? {}).map(([key, value]) => [
      `data-${key}`,
      value,
    ]),
  );
  return (
    <BodyPortal>
      <AnimatePresence initial={false}>
        {open && resolvedPosition ? (
          <motion.div
            id={id}
            ref={surfaceRef}
            role="menu"
            aria-label={ariaLabel}
            className={`velmere-command-shell fixed grid gap-1 rounded-2xl p-2 outline-none ${className}`}
            style={{
              ...pass628LayerStyle("listbox"),
              position: "fixed",
              top: resolvedPosition.top,
              left: resolvedPosition.left,
              minWidth: resolvedPosition.minWidth,
              maxHeight: resolvedPosition.maxHeight,
              overflowY: "auto",
            }}
            data-velmere-overlay-layer="listbox"
            data-velmere-dropdown-root="true"
            data-velmere-surface-id={id}
            data-dropdown-visual-viewport="true"
            data-pass1454-dropdown-viewport-budget="max-height-from-visual-viewport"
            data-pass1734-popup-root="anchored-bounded-visible"
            data-pass1774-popup-guarantee="true"
            data-pass1986-dropdown-scroll-listener="window-passive-no-capture"
            data-pass1997-dropdown-runtime="fast-close-stable-position"
            data-pass1998-dropdown-runtime="no-blur-fast-close-low-lag"
            data-pass1999-dropdown-runtime="solid-fast-close-no-layout-shift"
            data-pass2000-overlay-runtime="solid-fast-fixed-no-blur"
            data-pass1734-dropdown-placement={resolvedPosition.placement}
            data-pass1734-dropdown-no-left-corner={
              resolvedPosition.left > 8 ? "true" : "fallback-audit"
            }
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08, ease: [0.16, 1, 0.3, 1] }}
            {...dataAttributes}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BodyPortal>
  );
}

export function ModalRoot({
  open,
  onClose,
  children,
  closeLabel,
  fallbackMessage = "This panel could not be displayed. Close it and try again.",
  ariaLabel,
  ariaLabelledBy,
  closeOnBackdrop = true,
  lockScroll = true,
  surfaceClassName = "",
  surfaceData,
  surfaceId,
  nested = false,
}: SharedOverlayProps & { nested?: boolean }) {
  const fallbackId = useId();
  const surfaceRef = useRef<HTMLElement | null>(null);
  const backdropLayer: VelmereOverlayLayer = nested
    ? "nestedBackdrop"
    : "modalBackdrop";
  const surfaceLayer: VelmereOverlayLayer = nested ? "nestedModal" : "modal";

  useModalScrollLock(open && lockScroll);
  useDialogFocusBoundary(open, surfaceRef, { onClose });

  const overlaySurface = surfaceName(surfaceData);
  const closeFromModalBackdrop = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!closeOnBackdrop) return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    emitOverlayOpening({
      kind: "modal",
      surfaceId,
      surface: overlaySurface,
    });
  }, [open, overlaySurface, surfaceId]);

  const dataAttributes = Object.fromEntries(
    Object.entries(surfaceData ?? {}).map(([key, value]) => [
      `data-${key}`,
      value,
    ]),
  );

  return (
    <BodyPortal>
      <AnimatePresence initial={false}>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={closeLabel}
              className="fixed inset-0 bg-black/[0.84]"
              style={pass628LayerStyle(backdropLayer)}
              data-velmere-overlay-layer={layerName(backdropLayer)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06, ease: "linear" }}
              onPointerDown={closeFromModalBackdrop}
            />
            <div
              className="pointer-events-none fixed inset-0 flex items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
              style={pass628LayerStyle(surfaceLayer)}
              data-velmere-overlay-layer={layerName(surfaceLayer)}
            >
              <motion.section
                id={surfaceId}
                ref={surfaceRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                className={`pointer-events-auto min-h-0 max-h-[calc(100dvh-1.5rem)] overflow-hidden overscroll-contain outline-none ${surfaceClassName}`}
                data-pass1734-modal-scroll-lock="ref-counted-body-portal"
                data-pass1997-modal-runtime="syntax-safe-fast-stable-no-scroll-shell"
                data-pass1998-modal-runtime="solid-backdrop-fixed-viewport-low-lag"
                data-pass1999-modal-runtime="solid-backdrop-no-blur-fixed-premium"
                data-pass2000-overlay-runtime="solid-fast-fixed-no-blur"
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08, ease: [0.16, 1, 0.3, 1] }}
                {...dataAttributes}
              >
                <OverlayContentBoundary
                  fallbackMessage={fallbackMessage}
                  closeLabel={closeLabel}
                  onClose={onClose}
                  resetKey={`${fallbackId}:${open ? "open" : "closed"}`}
                >
                  {children}
                </OverlayContentBoundary>
              </motion.section>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </BodyPortal>
  );
}

export function DrawerRoot({
  open,
  onClose,
  children,
  closeLabel,
  fallbackMessage = "This panel could not be displayed. Close it and try again.",
  ariaLabel,
  ariaLabelledBy,
  closeOnBackdrop = true,
  lockScroll = true,
  surfaceClassName = "",
  surfaceData,
  surfaceId,
  motionPreset = "right",
  motionDuration,
}: SharedOverlayProps & {
  motionPreset?: "right" | "left" | "bottom" | "fade";
  motionDuration?: number;
}) {
  const fallbackId = useId();
  const surfaceRef = useRef<HTMLElement | null>(null);

  useModalScrollLock(open && lockScroll);
  useDialogFocusBoundary(open, surfaceRef, { onClose });

  const overlaySurface = surfaceName(surfaceData);

  useEffect(() => {
    if (!open) return;
    emitOverlayOpening({
      kind: "drawer",
      surfaceId,
      surface: overlaySurface,
    });
  }, [open, overlaySurface, surfaceId]);

  const dataAttributes = Object.fromEntries(
    Object.entries(surfaceData ?? {}).map(([key, value]) => [
      `data-${key}`,
      value,
    ]),
  );
  const isLightCommandDrawer =
    overlaySurface === "main-menu" ||
    overlaySurface === "private-mail" ||
    overlaySurface === "cart-bottom-sheet";
  const handleBackdropPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!closeOnBackdrop) return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };
  const drawerFrameClassName =
    motionPreset === "bottom"
      ? "pointer-events-none fixed inset-0 flex items-end justify-end p-0 md:p-5"
      : "pointer-events-none fixed inset-0";
  const drawerFrameStyle = pass628LayerStyle("drawer") as CSSProperties;
  const motionStates =
    motionPreset === "bottom"
      ? {
          initial: { y: 42, opacity: 0, scale: 0.985 },
          animate: { y: 0, opacity: 1, scale: 1 },
          exit: { y: 32, opacity: 0, scale: 0.99 },
        }
      : motionPreset === "left"
        ? {
            initial: { x: -34, opacity: 0 },
            animate: { x: 0, opacity: 1 },
            exit: { x: -26, opacity: 0 },
          }
        : motionPreset === "fade"
          ? {
              initial: { opacity: 0, scale: 0.985 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.99 },
            }
          : {
              initial: { x: 28, opacity: 0 },
              animate: { x: 0, opacity: 1 },
              exit: { x: 22, opacity: 0 },
            };

  return (
    <BodyPortal>
      <AnimatePresence initial={false}>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={closeLabel}
              className={`velmere-side-drawer-backdrop fixed inset-0 ${isLightCommandDrawer ? "bg-black/[0.64]" : "bg-black/[0.74]"}`}
              style={pass628LayerStyle("drawerBackdrop")}
              data-velmere-overlay-layer="drawer-backdrop"
              data-velmere-drawer-backdrop-surface={overlaySurface}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06, ease: "linear" }}
              onPointerDown={handleBackdropPointerDown}
            />
            <div
              className={drawerFrameClassName}
              style={drawerFrameStyle}
              data-velmere-overlay-layer="drawer"
              data-velmere-drawer-frame={motionPreset}
            >
              <motion.aside
                id={surfaceId}
                ref={surfaceRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                className={`velmere-side-drawer-panel pointer-events-auto outline-none ${surfaceClassName}`}
                style={{ position: "fixed" }}
                data-velmere-motion-preset={motionPreset}
                data-pass1734-drawer-scroll-lock="ref-counted-body-portal"
                data-pass1997-drawer-runtime="fast-solid-no-blur-lag"
                data-pass1998-drawer-runtime="solid-surface-faster-close-no-blur"
                data-pass1999-drawer-runtime="no-blur-fast-close-scroll-lock-safe"
                data-pass2000-overlay-runtime="solid-fast-fixed-no-blur"
                data-pass1734-drawer-preset={motionPreset}
                initial={motionStates.initial}
                animate={motionStates.animate}
                exit={motionStates.exit}
                transition={{
                  duration: motionDuration ?? (motionPreset === "bottom" ? 0.28 : 0.24),
                  ease: [0.16, 1, 0.3, 1],
                }}
                {...dataAttributes}
              >
                <OverlayContentBoundary
                  fallbackMessage={fallbackMessage}
                  closeLabel={closeLabel}
                  onClose={onClose}
                  resetKey={`${fallbackId}:${open ? "open" : "closed"}`}
                >
                  {children}
                </OverlayContentBoundary>
              </motion.aside>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </BodyPortal>
  );
}
