import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Plus } from "lucide-react";
import type { Product } from "../../lib/types";
import { formatPrice, listPrice } from "../../lib/format";
import { useCart } from "../../context/CartContext";
import AddToListMenu from "../lists/AddToListMenu";
import StarRating from "./StarRating";

const LOW_STOCK = 10;

/**
 * The storefront product card. The image and title link to the product; the
 * heart and the round "+" are separate buttons (never nested inside the link),
 * so each has its own keyboard stop and accessible name.
 */
export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0 || !!product.archivedAt;
  const discount = Math.round(product.discountPercentage);
  const href = `/product/${product._id}`;

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <article className="group flex h-full flex-col rounded-2xl bg-white p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative mb-3.5 aspect-square overflow-hidden rounded-xl bg-paper">
        <Link to={href} tabIndex={-1} aria-hidden className="flex h-full w-full items-center justify-center p-5">
          <img
            src={product.thumbnail}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-clay px-2.5 py-1 text-xs font-bold text-white">-{discount}%</span>
        )}
        <div className="absolute top-2.5 right-2.5">
          <AddToListMenu productId={product._id} variant="icon" />
        </div>
        {(soldOut || product.stock < LOW_STOCK) && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-clay/10 px-2.5 py-1 text-[0.6875rem] font-bold text-clay">
            {product.archivedAt ? "No longer available" : soldOut ? "Out of stock" : `Only ${product.stock} left`}
          </span>
        )}
        {!soldOut && (
          <button
            type="button"
            onClick={() => {
              addItem(product._id, 1);
              setAdded(true);
            }}
            aria-label={added ? `${product.title} added to cart` : `Add ${product.title} to cart`}
            className={`absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full text-white shadow transition hover:scale-105 ${
              added ? "bg-moss" : "bg-harbor hover:bg-harbor-dark"
            }`}
          >
            {added ? <Check size={18} aria-hidden /> : <Plus size={19} aria-hidden />}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1">
        {/* Always one line tall, so titles and prices line up across cards with and without a brand. */}
        <span className="mb-1 block h-4 truncate text-xs font-semibold tracking-wider text-slate uppercase">{product.brand}</span>
        <h3 className="mb-2 line-clamp-2 text-sm leading-snug font-medium text-ink">
          <Link to={href} className="transition-colors group-hover:text-harbor">
            {product.title}
          </Link>
        </h3>
        <StarRating rating={product.rating} count={product.ratingCount} />
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
          <span className="amount text-lg font-extrabold tracking-[-0.01em] text-ink">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <span className="amount text-xs text-slate line-through">{formatPrice(listPrice(product.price, product.discountPercentage))}</span>
          )}
        </div>
      </div>
    </article>
  );
}
