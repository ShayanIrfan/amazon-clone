import type { Product } from "../../lib/types";
import ProductCard from "./ProductCard";

export default function ProductRow({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-bold text-neutral-900">{title}</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p._id} className="w-44 flex-none sm:w-48">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
