import { Link } from "react-router";
import { MapPin, Menu, ShoppingCart } from "lucide-react";
import SearchBar from "./SearchBar";
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
    <header className="sticky top-0 z-40 bg-harbor-dark text-white shadow-sm">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="flex shrink-0 items-center rounded-md border border-transparent p-2 hover:border-white sm:hidden"
        >
          <Menu size={22} />
        </button>

        <Link to="/" className="shrink-0 rounded-md border border-transparent p-1.5 hover:border-white sm:p-2">
          <Logo />
        </Link>

        <div className="hidden shrink-0 flex-col items-start p-2 text-left leading-tight lg:flex">
          <span className="flex items-center gap-1 text-xs text-neutral-300">
            <MapPin size={14} /> Delivery options
          </span>
          <span className="text-sm font-bold">Choose at checkout</span>
        </div>

        <div className="hidden flex-1 sm:block">
          <SearchBar />
        </div>

        {/* Spacer so Account/Cart pin to the right on mobile, where the search
            bar (which normally fills this space) has moved to its own row. */}
        <div className="flex-1 sm:hidden" />

        <AccountMenu />

        <Link
          to="/orders"
          className="hidden shrink-0 flex-col items-start rounded-md border border-transparent p-2 text-left leading-tight hover:border-white lg:flex"
        >
          <span className="text-xs">Returns</span>
          <span className="text-sm font-bold">&amp; Orders</span>
        </Link>

        <Link
          to="/cart"
          aria-label="Cart"
          className="flex shrink-0 items-end gap-1 rounded-md border border-transparent p-1.5 hover:border-white sm:p-2"
        >
          <span className="relative">
            <ShoppingCart size={26} className="sm:size-7" />
            <span className="absolute -top-1 -right-2 rounded-full bg-marigold px-1.5 text-xs font-bold text-harbor-dark">
              {itemCount}
            </span>
          </span>
          <span className="hidden text-sm font-bold lg:inline">Cart</span>
        </Link>
      </div>

      <div className="mx-auto max-w-[1440px] px-2 pb-2 sm:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
