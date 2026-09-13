import { Link } from "react-router";
import { MapPin, Menu, ShoppingCart } from "lucide-react";
import SearchBar from "./SearchBar";
import ComingSoon from "./ComingSoon";
import Logo from "./Logo";
import { useCart } from "../../context/CartContext";
import AccountMenu from "./AccountMenu";

// Two explicit rows rather than one flex-wrap row with order tricks: on
// mobile the top row is just hamburger + logo + cart (guaranteed to fit,
// nothing else competes for the space), and search gets its own full-width
// row underneath. At sm+ the search bar rejoins the top row and the second
// row disappears.
export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-amazon-navy text-white">
      <div className="flex items-center gap-1 px-1 py-2 sm:gap-2 sm:px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="flex shrink-0 items-center rounded-sm border border-transparent p-2 hover:border-white sm:hidden"
        >
          <Menu size={22} />
        </button>

        <Link to="/" className="shrink-0 rounded-sm border border-transparent p-1.5 hover:border-white sm:p-2">
          <Logo />
        </Link>

        <ComingSoon
          milestone="a later milestone"
          className="hidden shrink-0 flex-col items-start rounded-sm border border-transparent p-2 text-left leading-tight hover:border-white lg:flex"
        >
          <span className="flex items-center gap-1 text-xs text-neutral-300">
            <MapPin size={14} /> Deliver to
          </span>
          <span className="text-sm font-bold">New York 10001</span>
        </ComingSoon>

        <div className="hidden flex-1 sm:block">
          <SearchBar />
        </div>

        {/* Spacer so Account/Cart pin to the right on mobile, where the search
            bar (which normally fills this space) has moved to its own row. */}
        <div className="flex-1 sm:hidden" />

        <AccountMenu />

        <Link
          to="/orders"
          className="hidden shrink-0 flex-col items-start rounded-sm border border-transparent p-2 text-left leading-tight hover:border-white md:flex"
        >
          <span className="text-xs">Returns</span>
          <span className="text-sm font-bold">&amp; Orders</span>
        </Link>

        <Link
          to="/cart"
          aria-label="Cart"
          className="flex shrink-0 items-end gap-1 rounded-sm border border-transparent p-1.5 hover:border-white sm:p-2"
        >
          <span className="relative">
            <ShoppingCart size={26} className="sm:size-7" />
            <span className="absolute -top-1 -right-2 rounded-full bg-amazon-orange px-1.5 text-xs font-bold text-amazon-navy">
              {itemCount}
            </span>
          </span>
          <span className="hidden text-sm font-bold sm:inline">Cart</span>
        </Link>
      </div>

      <div className="px-2 pb-2 sm:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
