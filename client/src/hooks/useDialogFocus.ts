import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const head = items[0];
      const tail = items.at(-1)!;
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    }

    panel.addEventListener("keydown", trap);
    return () => {
      panel.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [open, ref]);
}
