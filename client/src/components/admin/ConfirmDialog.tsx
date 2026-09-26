import { useId, useRef, type ReactNode } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import Button from "../ui/Button";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  /** Shown inside the dialog when the confirmed action fails. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small modal for irreversible actions. Traps focus, closes on Escape, and returns focus to the trigger. */
export default function ConfirmDialog({ open, title, children, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(open, panelRef);
  useEscapeKey(open && !busy, onCancel);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={busy ? undefined : onCancel}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-2 text-sm text-slate">{children}</div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-clay">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
