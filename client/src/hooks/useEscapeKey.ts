import { useEffect } from "react";

/** Calls `onEscape` when Escape is pressed while `active`. For drawers,
 * dropdowns and popovers, so closing one doesn't require a mouse. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, onEscape]);
}
