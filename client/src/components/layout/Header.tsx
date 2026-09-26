import { Link, NavLink, useLocation } from "react-router";
import { Heart, MapPin, Menu, ShoppingBag } from "lucide-react";
import SearchBar from "./SearchBar";
import Logo from "./Logo";
import AccountMenu from "./AccountMenu";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAddresses } from "../../hooks/useAddresses";

// Department shortcuts under the search bar. Each is a real search, so every
// link lands on live results rather than a static landing page.
const NAV_LINKS = [
  { label: "Price drops", to: "/search?sort=discount" },
  { label: "Best sellers", to: "/search?sort=bestseller" },
  { label: "New arrivals", to: "/search?sort=newest" },
  { label: "Groceries", to: "/search?category=groceries" },
  { label: "Phones", to: "/search?category=smartphones" },
  { label: "Home and kitchen", to: "/search?category=kitchen-accessories" },
  { label: "Beauty", to: "/search?category=beauty" },
];

/** "Deliver to <city>" from the shopper's default address; hidden until they have one. */
function DeliveryChip() {
  const { user } = useAuth();
  const { data } = useAddresses(!!user);
  const address = data?.items.find((a) => a.isDefault) ?? data?.items[0];
  if (!user || !address) return null;
  return (
    <Link
      to="/account/addresses"
      className="hidden items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-ink transition-colors hover:bg-mint-strong xl:flex"
      title="Change delivery address"
    >
      <MapPin size={17} className="text-harbor" aria-hidden />
      <span className="flex flex-col leading-none">
        <span className="text-[0.625rem] font-bold tracking-[0.08em] text-slate uppercase">Deliver to</span>
        <span className="mt-0.5 max-w-28 truncate text-[0.8125rem] font-bold">{address.city}</span>
      </span>
    </Link>
  );
}

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const current = location.pathname + location.search;

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-white shadow-[0_1px_8px_rgb(0_0_0/4%)]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:h-20 sm:gap-5 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-paper lg:hidden"
        >
          <Menu size={22} aria-hidden />
        </button>

        <Link to="/" aria-label="Harbor Market home" className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <div className="hidden max-w-2xl flex-1 md:block">
          <SearchBar />
        </div>
        <div className="flex-1 md:hidden" />

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <DeliveryChip />
          <Link
            to="/lists"
            aria-label="Saved lists"
            title="Saved lists"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-slate transition-colors hover:bg-paper hover:text-ink sm:flex"
          >
            <Heart size={21} aria-hidden />
          </Link>
          {!user && (
            <Link to="/login" className="hidden px-2 text-sm font-semibold text-slate transition-colors hover:text-ink sm:block">
              Sign in
            </Link>
          )}
          <Link
            to="/cart"
            aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-harbor transition-colors hover:bg-paper"
          >
            <ShoppingBag size={23} aria-hidden />
            <span className="amount absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-harbor px-1 text-[0.6875rem] font-bold text-white ring-2 ring-white">
              {itemCount}
            </span>
          </Link>
          <AccountMenu />
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pb-3 md:hidden">
        <SearchBar />
      </div>

      <nav aria-label="Departments" className="border-t border-line/40">
        <div className="mx-auto flex h-11 max-w-[1280px] items-center gap-6 overflow-x-auto px-4 whitespace-nowrap [scrollbar-width:none] sm:gap-8 sm:px-6">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-ink hover:text-harbor"
          >
            <Menu size={16} aria-hidden /> All departments
          </button>
          {NAV_LINKS.map((link) => {
            const active = current === link.to;
            return (
              <NavLink
                key={link.label}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 text-[0.8125rem] transition-colors ${
                  active ? "font-bold text-harbor" : "font-medium text-slate hover:text-ink"
                }`}
              >
                {link.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
