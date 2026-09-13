import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import ComingSoon from "./ComingSoon";

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

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 flex-col items-start rounded-sm border border-transparent p-2 text-left leading-tight hover:border-white"
      >
        <span className="text-xs">{user ? `Hello, ${user.name.split(" ")[0]}` : "Hello, sign in"}</span>
        <span className="text-sm font-bold">Account &amp; Lists</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 w-64 rounded-md border border-neutral-200 bg-white p-4 text-neutral-900 shadow-lg">
          {user ? (
            <>
              <p className="border-b border-neutral-100 pb-3 text-sm text-neutral-500">Signed in as</p>
              <p className="border-b border-neutral-100 pb-3 font-medium">{user.email}</p>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await logout();
                  navigate("/");
                }}
                className="mt-3 w-full rounded-full border border-neutral-300 py-1.5 text-sm hover:bg-neutral-50"
              >
                Sign Out
              </button>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link to="/orders" onClick={() => setOpen(false)} className="hover:underline">
                    Your Orders
                  </Link>
                </li>
                <li>
                  <ComingSoon milestone="milestone 6 (lists)" className="text-left hover:underline">
                    Your Lists
                  </ComingSoon>
                </li>
              </ul>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block w-full rounded-full bg-amazon-yellow py-1.5 text-center text-sm font-medium text-neutral-900 hover:brightness-95"
              >
                Sign in
              </Link>
              <p className="mt-3 text-center text-xs">
                New customer?{" "}
                <Link to="/login" onClick={() => setOpen(false)} className="text-link hover:underline">
                  Create your account
                </Link>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
