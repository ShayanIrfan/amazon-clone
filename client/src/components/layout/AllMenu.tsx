import { X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useCategories } from "../../hooks/useProducts";
import { useAuth } from "../../context/AuthContext";
import ComingSoon from "./ComingSoon";

export default function AllMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useCategories();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-amazon-navy px-4 py-3 text-white">
          <span className="text-lg font-bold">Shop by Category</span>
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        <ul className="divide-y divide-neutral-100">
          {data?.items.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/search?category=${c.slug}`}
                onClick={onClose}
                className="block px-4 py-2.5 text-sm text-neutral-800 hover:bg-neutral-100"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-2 border-t border-neutral-200 py-2">
          <p className="px-4 py-1 text-xs font-bold tracking-wide text-neutral-500 uppercase">Help &amp; Settings</p>
          {user ? (
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
                navigate("/");
              }}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100"
            >
              Sign Out ({user.name.split(" ")[0]})
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100">
              Sign In
            </Link>
          )}
          <ComingSoon milestone="a later milestone" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100">
            Customer Service
          </ComingSoon>
        </div>
      </div>
    </div>
  );
}
