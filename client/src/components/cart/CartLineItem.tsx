import { Link } from "react-router";
import type { Product } from "../../lib/types";
import type { CartItem } from "../../lib/cartStorage";
import { formatPrice } from "../../lib/format";
import QuantitySelector from "../product/QuantitySelector";
import AddToListMenu from "../lists/AddToListMenu";

interface Props {
  item: CartItem;
  product: Product;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  onMoveToCart: () => void;
}

export default function CartLineItem({ item, product, onSetQuantity, onRemove, onSaveForLater, onMoveToCart }: Props) {
  const outOfStock = product.stock <= 0;
  const quantityExceedsStock = !outOfStock && item.quantity > product.stock;

  return (
    <li className="flex gap-3 border-b border-line py-5 sm:gap-4">
      <Link to={`/product/${product._id}`} className="h-20 w-20 shrink-0 rounded-md bg-white sm:h-28 sm:w-28">
        <img src={product.thumbnail} alt={product.title} className="h-full w-full object-contain" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link to={`/product/${product._id}`} className="text-sm font-medium text-ink hover:text-harbor hover:underline">
            {product.title}
          </Link>
          <p className="amount mt-1 text-base font-medium sm:text-lg">{formatPrice(product.price)}</p>
          {outOfStock ? (
            <p className="text-sm font-medium text-clay">No longer in stock</p>
          ) : quantityExceedsStock ? (
            <p className="text-sm font-medium text-clay">Only {product.stock} left — quantity reduced at checkout</p>
          ) : (
            <p className="text-sm text-moss">In Stock</p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {!item.savedForLater && !outOfStock && (
            <QuantitySelector quantity={item.quantity} max={product.stock} onChange={onSetQuantity} />
          )}
          <span className="text-line-strong">·</span>
          <button type="button" onClick={onRemove} className="text-link hover:underline">
            Delete
          </button>
          <span className="text-line-strong">·</span>
          {item.savedForLater ? (
            <button type="button" onClick={onMoveToCart} className="text-link hover:underline">
              Move to Cart
            </button>
          ) : (
            <button type="button" onClick={onSaveForLater} className="text-link hover:underline">
              Save for later
            </button>
          )}
          <span className="text-line-strong">·</span>
          <AddToListMenu productId={product._id} variant="link" />
        </div>
      </div>

      {!item.savedForLater && (
        <p className="amount shrink-0 text-right text-base font-medium sm:text-lg">{formatPrice(product.price * item.quantity)}</p>
      )}
    </li>
  );
}
