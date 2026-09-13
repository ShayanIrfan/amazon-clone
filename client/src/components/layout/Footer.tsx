import ComingSoon from "./ComingSoon";

const COLUMNS: { title: string; links: string[] }[] = [
  { title: "Get to Know Us", links: ["About Us", "Careers", "Press Releases"] },
  { title: "Make Money with Us", links: ["Sell on amazon-clone", "Become an Affiliate", "Advertise Your Products"] },
  { title: "Payment Products", links: ["Business Card", "Shop with Points", "Reload Your Balance"] },
  { title: "Let Us Help You", links: ["Your Account", "Your Orders", "Returns & Replacements", "Help"] },
];

export default function Footer() {
  return (
    <footer className="mt-8 bg-amazon-navy-light text-white">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full bg-neutral-700 py-3 text-center text-sm hover:bg-neutral-600"
      >
        Back to top
      </button>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 font-bold">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((label) => (
                <li key={label}>
                  <ComingSoon className="text-left text-sm text-neutral-300 hover:underline">{label}</ComingSoon>
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
