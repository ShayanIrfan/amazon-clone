import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Star, Store, Users, X, type LucideIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import Logo from "../layout/Logo";
import Badge from "../ui/Badge";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/customers", label: "Customers", icon: Users },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive ? "bg-mint text-harbor" : "text-slate hover:bg-paper hover:text-ink"
  }`;

/** The shared sidebar body, reused by the desktop rail and the mobile drawer. */
function SidebarNav({ email, onSignOut, onNavigate }: { email?: string; onSignOut: () => void; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={linkClasses}>
            <Icon size={18} aria-hidden /> {label}
          </NavLink>
        ))}
        <Link to="/" onClick={onNavigate} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate transition-colors hover:bg-paper hover:text-ink">
          <Store size={18} aria-hidden /> View store
        </Link>
      </nav>
      <div className="border-t border-line p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-harbor text-sm font-bold text-white" aria-hidden>
            {(email?.[0] ?? "A").toUpperCase()}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs text-slate" title={email}>
            {email}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white py-2 text-sm font-semibold text-harbor transition-colors hover:bg-paper"
        >
          <LogOut size={16} aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEscapeKey(drawerOpen, () => setDrawerOpen(false));
  useDialogFocus(drawerOpen, drawerRef);

  async function signOut() {
    // Leave first: once the session clears, RequireAdmin would redirect to /login.
    navigate("/");
    await logout();
  }

  // Close the drawer whenever the route changes.
  const routeKey = location.pathname;
  const lastRoute = useRef(routeKey);
  if (lastRoute.current !== routeKey) {
    lastRoute.current = routeKey;
    if (drawerOpen) setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <Link to="/admin" aria-label="Admin home" className="shrink-0">
            <Logo compact />
          </Link>
          <Badge tone="info">Admin</Badge>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarNav email={user?.email} onSignOut={signOut} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper"
        >
          <Menu size={22} aria-hidden />
        </button>
        <Link to="/admin" aria-label="Admin home" className="shrink-0">
          <Logo compact />
        </Link>
        <Badge tone="info">Admin</Badge>
        <Link to="/" aria-label="View store" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-slate hover:bg-paper hover:text-ink">
          <Store size={20} aria-hidden />
        </Link>
      </header>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div onClick={() => setDrawerOpen(false)} className={`absolute inset-0 bg-ink/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`} />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className={`absolute top-0 left-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-[var(--shadow-float)] transition-transform ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <div className="flex items-center gap-2">
              <Logo compact />
              <Badge tone="info">Admin</Badge>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-full text-slate hover:bg-paper hover:text-ink">
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarNav email={user?.email} onSignOut={signOut} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      </div>

      <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
