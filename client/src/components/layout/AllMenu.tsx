import { ChevronRight, X } from "lucide-react";
import Logo from "./Logo";
import { useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useCategories } from "../../hooks/useProducts";
import { useAuth } from "../../context/AuthContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useDialogFocus } from "../../hooks/useDialogFocus";

export default function AllMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useCategories();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeKey(open, onClose);
  useDialogFocus(open, panelRef);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="All departments"
        className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-[var(--shadow-float)] transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <Logo compact />
          <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full text-slate hover:bg-paper hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <p className="px-4 pt-4 pb-1 text-xs font-bold tracking-[0.08em] text-slate uppercase">All departments</p>

        <ul className="px-2">
          {data?.items.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/search?category=${c.slug}`}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm text-ink hover:bg-paper"
              >
                <span>{c.name}</span>
                <span className="flex items-center gap-1 text-xs text-slate">
                  {c.productCount}
                  <ChevronRight size={14} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-line px-2 py-3">
          <p className="px-2 pb-1 text-xs font-bold tracking-[0.08em] text-slate uppercase">Account</p>
          {user ? (
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
                navigate("/");
              }}
              className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper"
            >
              Sign out ({user.name.split(" ")[0]})
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper">
              Sign in
            </Link>
          )}
          {user && (
            <>
              <Link to="/account" onClick={onClose} className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper">Account overview</Link>
              <Link to="/orders" onClick={onClose} className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper">Your orders</Link>
              <Link to="/account/addresses" onClick={onClose} className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper">Addresses</Link>
              <Link to="/lists" onClick={onClose} className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-paper">Saved lists</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
