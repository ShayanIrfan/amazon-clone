import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { HomeData } from "../../hooks/useProducts";

interface Panel {
  tag: string;
  title: string;
  text: string;
  cta: string;
  to: string;
  tint: string;
  /** Department whose picture sits in the panel. */
  slug: string;
}

const PANELS: Panel[] = [
  {
    tag: "Fresh picks",
    title: "Restock the pantry",
    text: "Fruit, dairy and everyday kitchen staples, delivered free.",
    cta: "Shop groceries",
    to: "/search?category=groceries",
    tint: "bg-tint-butter",
    slug: "groceries",
  },
  {
    tag: "Tech deals",
    title: "Phones and accessories",
    text: "Unlocked smartphones, earbuds and the cases and chargers to go with them.",
    cta: "Shop phones",
    to: "/search?category=smartphones",
    tint: "bg-tint-sky",
    slug: "smartphones",
  },
];

/** Two side-by-side promo panels. A panel is skipped if its department has no picture. */
export default function PromoPanels({ categories }: { categories: HomeData["categories"] }) {
  const pictureFor = (slug: string) => categories.find((c) => c.slug === slug)?.thumbnail;

  return (
    <section aria-label="Featured departments" className="grid gap-6 md:grid-cols-2">
      {PANELS.map((panel) => {
        const picture = pictureFor(panel.slug);
        return (
          <article key={panel.slug} className={`relative flex min-h-64 flex-col justify-center gap-6 overflow-hidden rounded-2xl p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10 ${panel.tint}`}>
            <div className="relative z-10 min-w-0 sm:flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.6875rem] font-bold tracking-wider text-slate uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-harbor" aria-hidden />
                {panel.tag}
              </span>
              <h2 className="mt-4 text-2xl leading-tight font-extrabold tracking-[-0.03em] text-harbor sm:text-3xl">{panel.title}</h2>
              <p className="mt-2 text-sm text-slate">{panel.text}</p>
              <Link
                to={panel.to}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-harbor px-6 text-sm font-semibold text-white! transition-colors hover:bg-harbor-dark"
              >
                {panel.cta} <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            {picture && (
              <div aria-hidden className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl bg-white/80 p-4 shadow-[var(--shadow-card)] sm:h-44 sm:w-44 sm:p-5 lg:h-48 lg:w-48">
                <img src={picture} alt="" loading="lazy" className="max-h-full max-w-full object-contain mix-blend-multiply" />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
