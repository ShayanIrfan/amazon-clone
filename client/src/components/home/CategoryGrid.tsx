import { Link } from "react-router";
import type { Category, Product } from "../../lib/types";

interface Props {
  categories: Category[];
  thumbnails: Record<string, string>;
}

export default function CategoryGrid({ categories, thumbnails }: Props) {
  return (
    <section className="grid grid-cols-2 gap-4 bg-neutral-100 p-4 sm:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.slug}
          to={`/search?category=${c.slug}`}
          className="flex flex-col gap-3 bg-white p-4 shadow-sm hover:shadow-md"
        >
          <h3 className="font-bold text-neutral-900">{c.name}</h3>
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-neutral-50">
            {thumbnails[c.slug] && (
              <img src={thumbnails[c.slug]} alt={c.name} className="max-h-full max-w-full object-contain" />
            )}
          </div>
          <span className="text-sm text-link">Shop now</span>
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
