import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import StarRating from "../components/product/StarRating";
import PriceTag from "../components/product/PriceTag";

// Minimal placeholder for milestone 1 (browse/search must link somewhere real).
// Full gallery, variants, specs and reviews land in milestone 2.
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.product(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  if (isError || !product) {
    return (
      <div className="p-8 text-center">
        <p className="text-amazon-red">Product not found.</p>
        <Link to="/search" className="text-link hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:grid-cols-2">
      <div className="flex aspect-square items-center justify-center bg-white p-4">
        <img src={product.thumbnail} alt={product.title} className="max-h-full max-w-full object-contain" />
      </div>
      <div>
        <h1 className="text-xl font-medium text-neutral-900">{product.title}</h1>
        <p className="text-sm text-neutral-500">Brand: {product.brand}</p>
        <div className="mt-2">
          <StarRating rating={product.rating} count={product.ratingCount} />
        </div>
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <PriceTag price={product.price} discountPercentage={product.discountPercentage} size="lg" />
        </div>
        <p className="mt-3 text-sm text-neutral-700">{product.description}</p>
        <p className="mt-3 text-sm">
          {product.stock > 0 ? (
            <span className="font-medium text-green-700">In Stock</span>
          ) : (
            <span className="font-medium text-amazon-red">Out of Stock</span>
          )}
        </p>
        <button
          type="button"
          disabled
          title="Coming in milestone 3 (cart)"
          className="mt-4 w-full rounded-full bg-amazon-yellow px-4 py-2 font-medium text-neutral-900 opacity-60"
        >
          Add to Cart — coming soon
        </button>
      </div>
    </div>
  );
}
