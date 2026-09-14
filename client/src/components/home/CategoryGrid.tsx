import { Link } from "react-router";
import type { Category, Product } from "../../lib/types";

interface Props {
  categories: Category[];
  thumbnails: Record<string, string>;
}

export default function CategoryGrid({ categories, thumbnails }: Props) {
  return (
    <section className="page-shell grid grid-cols-2 gap-3 py-6 sm:grid-cols-4 lg:gap-4">
      {categories.map((c) => (
        <Link
          key={c.slug}
          to={`/search?category=${c.slug}`}
          className="surface surface-hover flex flex-col gap-3 rounded-md p-3 sm:p-4"
        >
          <h3 className="min-h-10 font-semibold text-ink">{c.name}</h3>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-paper">
            {thumbnails[c.slug] ? (
              <img src={thumbnails[c.slug]} alt={c.name} className="h-full w-full object-contain mix-blend-multiply" />
            ) : (
              <span className="text-xs text-slate">Explore category</span>
            )}
          </div>
          <span className="text-sm font-semibold text-harbor">Shop now <span aria-hidden>→</span></span>
        </Link>
      ))}
    </section>
  );
}

export function pickThumbnails(products: Product[]): Record<string, string> {
  const thumbnails: Record<string, string> = {};
  for (const p of products) thumbnails[p.category] ??= p.thumbnail;
  return thumbnails;
}
