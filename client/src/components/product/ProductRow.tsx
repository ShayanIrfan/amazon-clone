import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Product } from "../../lib/types";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "../ui/Skeleton";

interface Props {
  title: string;
  products: Product[] | undefined;
  /** Small pill beside the title, e.g. "Customer favourites". */
  tag?: string;
  tagTone?: "neutral" | "sale";
  id?: string;
  loading?: boolean;
}

/** A titled, horizontally scrolling rail of product cards: five across on desktop. */
export default function ProductRow({ title, products, tag, tagTone = "neutral", id, loading = false }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  if (!loading && !products?.length) return null;

  function scroll(direction: -1 | 1) {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <section id={id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="scroll-mt-36" aria-label={title}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="section-title">{title}</h2>
          {tag && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                tagTone === "sale" ? "bg-clay/10 text-clay" : "bg-mint text-harbor"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tagTone === "sale" ? "bg-clay" : "bg-harbor"}`} aria-hidden />
              {tag}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} back`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} forward`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-harbor text-white transition hover:bg-harbor-dark"
          >
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </div>
      <div ref={rowRef} className="scroll-snap-x -mx-1 flex gap-5 overflow-x-auto px-1 pt-1 pb-3">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="scroll-snap-item w-[72%] flex-none sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-5rem)/5)]">
                <ProductCardSkeleton />
              </div>
            ))
          : products!.map((p) => (
              <div key={p._id} className="scroll-snap-item w-[72%] flex-none sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-5rem)/5)]">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
    </section>
  );
}
