import { NavLink } from "react-router";
import { Heart, MapPin, Package, ShieldCheck, User } from "lucide-react";

const ITEMS = [
  { to: "/account", label: "Overview", icon: User, end: true },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/lists", label: "Lists", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/security", label: "Security", icon: ShieldCheck },
];

/** Horizontal pill nav shared across the account pages; scrolls on small screens. */
export default function AccountNav() {
  return (
    <nav aria-label="Account" className="scroll-snap-x -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
              isActive ? "border-harbor bg-mint text-harbor" : "border-line bg-white text-slate hover:text-ink"
            }`
          }
        >
          <Icon size={16} aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
