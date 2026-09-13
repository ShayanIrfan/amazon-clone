import { Menu } from "lucide-react";
import ComingSoon from "./ComingSoon";

const LINKS = ["Today's Deals", "Customer Service", "Registry", "Gift Cards", "Sell"];

export default function SecondaryNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <nav className="hidden items-center gap-4 overflow-x-auto bg-amazon-navy-light px-4 py-1.5 text-sm text-white sm:flex">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex shrink-0 items-center gap-1 rounded-sm border border-transparent px-1 py-0.5 font-bold hover:border-white"
      >
        <Menu size={18} /> All
      </button>
      {LINKS.map((label) => (
        <ComingSoon key={label} className="shrink-0 rounded-sm border border-transparent px-1 py-0.5 hover:border-white">
          {label}
        </ComingSoon>
      ))}
    </nav>
  );
}
