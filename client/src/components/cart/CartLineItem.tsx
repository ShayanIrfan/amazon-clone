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
    <li className="flex gap-3 border-b border-neutral-200 py-4 sm:gap-4">
      <Link to={`/product/${product._id}`} className="h-20 w-20 shrink-0 bg-white sm:h-28 sm:w-28">
        <img src={product.thumbnail} alt={product.title} className="h-full w-full object-contain" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link to={`/product/${product._id}`} className="text-sm text-neutral-800 hover:text-link hover:underline">
            {product.title}
          </Link>
          <p className="mt-1 text-base font-medium sm:text-lg">{formatPrice(product.price)}</p>
          {outOfStock ? (
            <p className="text-sm font-medium text-amazon-red">No longer in stock</p>
          ) : quantityExceedsStock ? (
            <p className="text-sm font-medium text-amazon-red">Only {product.stock} left — quantity reduced at checkout</p>
          ) : (
            <p className="text-sm text-green-700">In Stock</p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {!item.savedForLater && !outOfStock && (
            <QuantitySelector quantity={item.quantity} max={product.stock} onChange={onSetQuantity} />
          )}
          <span className="text-neutral-300">|</span>
          <button type="button" onClick={onRemove} className="text-link hover:underline">
            Delete
          </button>
          <span className="text-neutral-300">|</span>
          {item.savedForLater ? (
            <button type="button" onClick={onMoveToCart} className="text-link hover:underline">
              Move to Cart
            </button>
          ) : (
            <button type="button" onClick={onSaveForLater} className="text-link hover:underline">
              Save for later
            </button>
          )}
          <span className="text-neutral-300">|</span>
          <AddToListMenu productId={product._id} variant="link" />
        </div>
      </div>

      {!item.savedForLater && (
        <p className="shrink-0 text-right text-base font-medium sm:text-lg">{formatPrice(product.price * item.quantity)}</p>
      )}
    </li>
  );
}
