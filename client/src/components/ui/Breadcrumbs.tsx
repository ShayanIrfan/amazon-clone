import { Fragment } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

/** A breadcrumb trail. The last crumb is the current page and is never a link. */
export default function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center gap-1.5">
                {item.to && !last ? (
                  <Link to={item.to} className="transition-colors hover:text-harbor">
                    {item.label}
                  </Link>
                ) : (
                  <span className={last ? "max-w-[16rem] truncate font-semibold text-ink" : undefined} aria-current={last ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && <ChevronRight size={14} className="text-line-strong" aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
