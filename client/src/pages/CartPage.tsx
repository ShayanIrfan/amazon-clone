import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import CartLineItem from "../components/cart/CartLineItem";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, saveForLater, moveToCart } = useCart();
  const productIds = [...items.map((i) => i.productId)].sort();

  const { data, isLoading } = useQuery({
    queryKey: ["cartProducts", productIds],
    queryFn: () => api.productsByIds(productIds),
    enabled: productIds.length > 0,
  });

  const productsById = new Map((data?.items ?? []).map((p) => [p._id, p]));

  // A cart id can point at a product that no longer exists (e.g. the catalog
  // was reseeded with new ids while this browser's cart still held old ones).
  // Prune those instead of leaving a phantom count in the header badge forever.
  useEffect(() => {
    if (!data) return;
    for (const id of productIds) if (!productsById.has(id)) removeItem(id);
    // Deliberately keyed on `data` only: productIds/productsById are derived
    // from it each render, and including them would just re-run this on
    // every render without changing what it does.
  }, [data]);

  const cartItems = items.filter((i) => !i.savedForLater && productsById.has(i.productId));
  const savedItems = items.filter((i) => i.savedForLater && productsById.has(i.productId));

  const subtotal = cartItems.reduce((sum, i) => sum + (productsById.get(i.productId)?.price ?? 0) * i.quantity, 0);
  const unitCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (isLoading) {
    return <div className="p-16 text-center text-neutral-500">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <ShoppingCart size={48} className="text-neutral-300" />
        <h1 className="text-xl font-bold text-neutral-900">Your cart is empty</h1>
        <p className="text-neutral-600">Continue shopping to add items to your cart.</p>
        <Link to="/" className="mt-2 rounded-full bg-amazon-yellow px-6 py-2 text-sm font-medium text-neutral-900 hover:brightness-95">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="grid gap-6 sm:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-baseline justify-between border-b border-neutral-200 pb-2">
            <h1 className="text-2xl font-medium text-neutral-900">Shopping Cart</h1>
            <span className="text-sm text-neutral-500">Price</span>
          </div>

          {cartItems.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">
              Your cart is empty. Everything below is saved for later.
            </p>
          ) : (
            <ul>
              {cartItems.map((item) => (
                <CartLineItem
                  key={item.productId}
                  item={item}
                  product={productsById.get(item.productId)!}
                  onSetQuantity={(q) => setQuantity(item.productId, q)}
                  onRemove={() => removeItem(item.productId)}
                  onSaveForLater={() => saveForLater(item.productId)}
                  onMoveToCart={() => moveToCart(item.productId)}
                />
              ))}
            </ul>
          )}

          <p className="py-4 text-right text-lg">
            Subtotal ({unitCount} {unitCount === 1 ? "item" : "items"}):{" "}
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </p>

          {savedItems.length > 0 && (
            <div className="mt-8 border-t border-neutral-200 pt-4">
              <h2 className="text-lg font-bold text-neutral-900">Saved for later ({savedItems.length})</h2>
              <ul>
                {savedItems.map((item) => (
                  <CartLineItem
                    key={item.productId}
                    item={item}
                    product={productsById.get(item.productId)!}
                    onSetQuantity={(q) => setQuantity(item.productId, q)}
                    onRemove={() => removeItem(item.productId)}
                    onSaveForLater={() => saveForLater(item.productId)}
                    onMoveToCart={() => moveToCart(item.productId)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="h-fit rounded-lg border border-neutral-200 p-4">
          <p className="text-lg">
            Subtotal ({unitCount} {unitCount === 1 ? "item" : "items"}):{" "}
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </p>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={() => navigate("/checkout")}
            className="mt-3 w-full rounded-full bg-amazon-yellow px-4 py-2 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-50"
          >
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
