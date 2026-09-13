import { Link } from "react-router";
import { MapPin, Menu, ShoppingCart } from "lucide-react";
import SearchBar from "./SearchBar";
import ComingSoon from "./ComingSoon";
import Logo from "./Logo";
import { useCart } from "../../context/CartContext";
import AccountMenu from "./AccountMenu";

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-2 bg-amazon-navy px-2 py-2 text-white sm:flex-nowrap sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="flex items-center gap-1 rounded-sm border border-transparent p-2 hover:border-white sm:hidden"
      >
        <Menu size={22} />
      </button>

      <Link to="/" className="shrink-0 rounded-sm border border-transparent p-2 hover:border-white">
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

      <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
        <SearchBar />
      </div>

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
        className="flex shrink-0 items-end gap-1 rounded-sm border border-transparent p-2 hover:border-white"
      >
        <span className="relative">
          <ShoppingCart size={28} />
          <span className="absolute -top-1 -right-2 rounded-full bg-amazon-orange px-1.5 text-xs font-bold text-amazon-navy">
            {itemCount}
          </span>
        </span>
        <span className="hidden text-sm font-bold sm:inline">Cart</span>
      </Link>
    </header>
  );
}
