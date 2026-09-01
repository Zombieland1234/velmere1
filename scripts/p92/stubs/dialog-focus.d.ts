import type { RefObject } from "react";
export function useDialogFocusBoundary(active: boolean, rootRef: RefObject<HTMLElement | null>, options?: { onClose?: () => void; initialFocus?: RefObject<HTMLElement | null>; returnFocus?: boolean; closeOnOutsidePointerDown?: boolean }): void;
