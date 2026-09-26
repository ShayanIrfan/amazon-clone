import { Link } from "react-router";
import type { Product } from "../../lib/types";
import type { CartItem } from "../../lib/cartStorage";
import { formatPrice } from "../../lib/format";
import QuantitySelector from "../product/QuantitySelector";

interface Props {
  item: CartItem;
  product: Product;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater: () => void;
}

export default function CartLineItem({ item, product, onSetQuantity, onRemove, onSaveForLater }: Props) {
  const archived = !!product.archivedAt;
  const outOfStock = product.stock <= 0 || archived;
  const quantityExceedsStock = !outOfStock && item.quantity > product.stock;

  return (
    <li className="flex gap-4 py-5">
      <Link to={`/product/${product._id}`} className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-paper p-2.5">
        <img src={product.thumbnail} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {product.brand && <span className="mb-0.5 block text-xs font-semibold tracking-wider text-slate uppercase">{product.brand}</span>}
            <Link to={`/product/${product._id}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-harbor">
              {product.title}
            </Link>
          </div>
          <span className="amount shrink-0 text-base font-extrabold text-ink">{formatPrice(product.price * item.quantity)}</span>
        </div>

        {outOfStock ? (
          <p className="mt-1 text-xs font-semibold text-clay">{archived ? "No longer available" : "No longer in stock"}</p>
        ) : quantityExceedsStock ? (
          <p className="mt-1 text-xs font-semibold text-clay">Only {product.stock} left — quantity reduced at checkout</p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-moss">In stock</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
          {!outOfStock && <QuantitySelector quantity={item.quantity} max={product.stock} onChange={onSetQuantity} />}
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={onSaveForLater} className="font-semibold text-slate hover:text-harbor">
              Save for later
            </button>
            <span className="text-line-strong" aria-hidden>
              ·
            </span>
            <button type="button" onClick={onRemove} className="font-semibold text-slate hover:text-clay">
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
