import { Link } from "react-router";
import type { Product } from "../../lib/types";
import StarRating from "./StarRating";
import PriceTag from "./PriceTag";
import { estimatedDelivery } from "../../lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;

  return (
    <Link
      to={`/product/${product._id}`}
      className="group flex h-full w-full flex-col rounded-md border border-transparent p-2 transition hover:border-line hover:bg-white sm:p-3"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-white">
        <img
          src={product.thumbnail}
          alt={product.title}
          loading="lazy"
          className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-ink group-hover:text-harbor">{product.title}</p>
      <div className="mt-1">
        <StarRating rating={product.rating} count={product.ratingCount} />
      </div>
      <div className="mt-1">
        <PriceTag price={product.price} discountPercentage={product.discountPercentage} />
      </div>
      {outOfStock ? (
        <p className="mt-1 text-sm font-medium text-clay">Out of stock</p>
      ) : (
        <p className="mt-1 text-xs text-neutral-600">
          FREE delivery <span className="font-medium text-neutral-800">{estimatedDelivery()}</span>
        </p>
      )}
    </Link>
  );
}
