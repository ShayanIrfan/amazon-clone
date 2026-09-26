import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, LogOut, Package, ShoppingBag, Star, Store, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../layout/Logo";
import Badge from "../ui/Badge";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// One list drives both the desktop sidebar and the mobile tab row; each admin
// phase adds its entry here when its pages exist.
const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/customers", label: "Customers", icon: Users },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-harbor/10 text-harbor" : "text-slate hover:bg-paper hover:text-ink"
  }`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-4 lg:flex-col lg:items-start lg:gap-2">
          <Link to="/admin" aria-label="Admin home" className="shrink-0">
            <Logo tone="light" compact />
          </Link>
          <Badge tone="info">Admin</Badge>
        </div>

        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:pb-0">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClasses}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate hover:bg-paper hover:text-ink lg:mt-auto"
          >
            <Store size={18} aria-hidden /> View store
          </Link>
        </nav>

        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-xs text-slate" title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={async () => {
              // Leave first: once the session clears, RequireAdmin would redirect to /login.
              navigate("/");
              await logout();
            }}
            className="mt-2 flex items-center gap-2 text-sm font-medium text-harbor hover:underline"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
