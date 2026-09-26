import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";

const LINKS = [
  { to: "/account", label: "Your account" },
  { to: "/orders", label: "Your orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/lists", label: "Saved lists" },
  { to: "/account/security", label: "Login and security" },
];

/** Round avatar button: the account menu when signed in, a sign-in prompt when not. */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);
  useEscapeKey(open, () => setOpen(false));

  const initial = user?.name.trim().charAt(0).toUpperCase();
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Account menu for ${user.name}` : "Account"}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-harbor text-sm font-bold text-white transition-colors hover:bg-harbor-dark"
      >
        {initial ?? <User size={18} aria-hidden />}
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-64 max-w-[85vw] rounded-2xl border border-line bg-white p-2 text-ink shadow-[var(--shadow-float)]">
          {user ? (
            <>
              <div className="px-3 pt-2 pb-3">
                <p className="font-bold">{user.name}</p>
                <p className="truncate text-xs text-slate">{user.email}</p>
              </div>
              <div className="border-t border-line py-1">
                {user.isAdmin && (
                  <Link role="menuitem" to="/admin" onClick={close} className="block rounded-lg px-3 py-2 text-sm font-semibold text-harbor hover:bg-paper">
                    Admin panel
                  </Link>
                )}
                {LINKS.map((link) => (
                  <Link key={link.to} role="menuitem" to={link.to} onClick={close} className="block rounded-lg px-3 py-2 text-sm hover:bg-paper">
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-line pt-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    close();
                    await logout();
                    navigate("/");
                  }}
                  className="w-full rounded-full border border-line py-2 text-sm font-semibold text-ink hover:border-harbor hover:bg-paper"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="p-2">
              <p className="text-sm text-slate">Sign in to see your orders, saved lists and addresses.</p>
              <Link
                role="menuitem"
                to="/login"
                onClick={close}
                className="mt-3 block w-full rounded-full bg-harbor py-2.5 text-center text-sm font-semibold text-white! hover:bg-harbor-dark"
              >
                Sign in
              </Link>
              <p className="mt-3 text-center text-xs text-slate">
                New here?{" "}
                <Link to="/signup" onClick={close} className="font-semibold text-harbor hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
