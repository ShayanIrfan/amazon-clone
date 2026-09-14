import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../../lib/types";
import ProductCard from "./ProductCard";

export default function ProductRow({ title, products }: { title: string; products: Product[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  if (!products.length) return null;

  function scroll(direction: -1 | 1) {
    rowRef.current?.scrollBy({ left: direction * Math.min(rowRef.current.clientWidth * 0.8, 640), behavior: "smooth" });
  }

  return (
    <section id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="surface scroll-mt-32 rounded-md p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="rounded-md border border-line bg-white p-1.5 text-harbor hover:bg-paper">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="rounded-md border border-line bg-white p-1.5 text-harbor hover:bg-paper">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={rowRef} className="scroll-snap-x flex gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p._id} className="scroll-snap-item w-44 flex-none sm:w-52">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
