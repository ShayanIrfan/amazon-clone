import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { HomeData } from "../../hooks/useProducts";
import { departmentIcon, departmentTint } from "./departments";

/** "Shop by department": tinted tiles with the department's icon, item count and a product picture. */
export default function DepartmentGrid({ categories, total }: { categories: HomeData["categories"]; total: number }) {
  return (
    <section aria-labelledby="departments-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold tracking-[0.08em] text-slate uppercase">Catalog explorer</p>
          <h2 id="departments-title" className="section-title">
            Shop by department
          </h2>
        </div>
        <Link to="/search" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-harbor hover:underline">
          See all {total} departments <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((category, index) => {
          const Icon = departmentIcon(category.slug);
          return (
            <li key={category.slug}>
              <Link
                to={`/search?category=${category.slug}`}
                className={`group flex aspect-square flex-col justify-between rounded-2xl p-4 transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-5 ${departmentTint(index)}`}
              >
                <span className="flex items-start justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-harbor shadow-[var(--shadow-card)] transition-colors group-hover:bg-white">
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-slate">{category.productCount} items</span>
                </span>
                <span className="my-auto flex items-center justify-center py-2" aria-hidden>
                  {category.thumbnail && (
                    <img
                      src={category.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20"
                    />
                  )}
                </span>
                <span className="text-base leading-tight font-bold text-ink">{category.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
