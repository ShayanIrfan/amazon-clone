import { Link } from "react-router";
import { Lock, RotateCcw, Truck } from "lucide-react";
import { LogoMark } from "./Logo";

// Every link goes somewhere real in the app.
const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/search" },
      { label: "Price drops", to: "/search?sort=discount" },
      { label: "Groceries", to: "/search?category=groceries" },
      { label: "Phones", to: "/search?category=smartphones" },
      { label: "Home and kitchen", to: "/search?category=kitchen-accessories" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Account overview", to: "/account" },
      { label: "Saved lists", to: "/lists" },
      { label: "Addresses", to: "/account/addresses" },
      { label: "Login and security", to: "/account/security" },
    ],
  },
  {
    title: "Orders and cancellations",
    links: [
      { label: "Your orders", to: "/orders" },
      { label: "Your cart", to: "/cart" },
    ],
  },
];

const PROMISES = [
  { icon: Truck, title: "Free standard delivery", detail: "On every order, no minimum" },
  { icon: Lock, title: "Secure card payments", detail: "Encrypted checkout through Stripe" },
  { icon: RotateCcw, title: "Cancel for a full refund", detail: "Any time until your order ships" },
];

export default function Footer() {
  return (
    <footer className="mt-16">
      <section aria-label="Our promises" className="border-t border-line bg-white">
        <ul className="mx-auto grid max-w-[1280px] gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {PROMISES.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-harbor">
                <Icon size={19} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{title}</span>
                <span className="block text-xs text-slate">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="bg-harbor text-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Harbor Market home">
              <LogoMark size={34} />
              <span className="text-xl font-extrabold tracking-[-0.035em]">
                Harbor<span className="font-medium"> Market</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/70">Everyday essentials, tech and home goods, delivered free.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-base font-bold text-mint">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-white/75 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <p className="border-t border-white/15 py-6 text-xs text-white/60">
            Harbor Market is a demo store. Card payments run in Stripe test mode, so no real money is charged.
          </p>
        </div>
      </div>
    </footer>
  );
}
