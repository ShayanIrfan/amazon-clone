import { Link } from "react-router";

const COLUMNS = [
  { title: "Shop", links: [{ label: "All products", to: "/search" }, { label: "Today's deals", to: "/#todays-deals" }] },
  { title: "Your purchases", links: [{ label: "Cart", to: "/cart" }, { label: "Orders", to: "/orders" }] },
  { title: "Your account", links: [{ label: "Account overview", to: "/account" }, { label: "Addresses", to: "/account/addresses" }] },
  { title: "Saved for later", links: [{ label: "Lists", to: "/lists" }, { label: "Recently viewed", to: "/account" }] },
];

export default function Footer() {
  return (
    <footer className="mt-12 bg-harbor-dark text-white">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full bg-harbor py-3 text-center text-sm hover:bg-harbor-dark"
      >
        Back to top
      </button>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-6 py-12 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 font-bold">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-left text-sm text-neutral-300 hover:text-white hover:underline">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-700 py-6 text-center text-xs text-neutral-400">
        A rebuild built for the 8x assignment — not affiliated with Amazon.com, Inc.
      </div>
    </footer>
  );
}
