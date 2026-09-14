import { Menu } from "lucide-react";
import { Link } from "react-router";

const LINKS = [
  { label: "Today's Deals", to: "/#todays-deals" },
  { label: "Best Sellers", to: "/#best-sellers" },
  { label: "Top Rated", to: "/#top-rated" },
  { label: "New Arrivals", to: "/#new-arrivals" },
  { label: "Shop All", to: "/search" },
];

export default function SecondaryNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <nav className="hidden items-center gap-4 overflow-x-auto bg-harbor px-4 py-2 text-sm text-white sm:flex">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex shrink-0 items-center gap-1 rounded-md border border-transparent px-1 py-0.5 font-bold hover:border-white"
      >
        <Menu size={18} /> All
      </button>
      {LINKS.map((link) => (
        <Link key={link.label} to={link.to} className="shrink-0 rounded-md border border-transparent px-1 py-0.5 hover:border-white">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
