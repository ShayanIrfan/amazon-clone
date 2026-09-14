import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import CartLineItem from "../components/cart/CartLineItem";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, saveForLater, moveToCart } = useCart();
  const productIds = [...items.map((i) => i.productId)].sort();

  const { data, isLoading, isError, refetch } = useQuery({
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
    return <PageLoader label="Loading your cart" />;
  }

  if (isError) {
    return <ErrorState message="Couldn't load your cart." onRetry={() => refetch()} />;
  }

  if (items.length === 0) {
    return (
      <div className="page-shell flex flex-col items-center gap-3 py-20 text-center">
        <ShoppingCart size={48} className="text-neutral-300" />
        <h1 className="page-title text-ink">Your cart is empty</h1>
        <p className="muted">Continue shopping to add items to your cart.</p>
        <Link to="/" className="mt-2 rounded-md bg-marigold px-6 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow">Your selection</p>
              <h1 className="page-title mt-1 text-ink">Shopping Cart</h1>
            </div>
            <span className="text-sm text-slate">Price</span>
          </div>

          {cartItems.length === 0 ? (
            <p className="surface mt-4 rounded-md py-10 text-center text-slate">
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

          <p className="border-b border-line py-4 text-right text-lg">
            Subtotal ({unitCount} {unitCount === 1 ? "item" : "items"}):{" "}
            <span className="amount font-bold">{formatPrice(subtotal)}</span>
          </p>

          <div className="mt-5 lg:hidden">
            <CartSummary
              unitCount={unitCount}
              subtotal={subtotal}
              disabled={cartItems.length === 0}
              onCheckout={() => navigate("/checkout")}
            />
          </div>

          {savedItems.length > 0 && (
            <div className="mt-8 border-t border-line pt-5">
              <h2 className="text-lg font-semibold text-ink">Saved for later ({savedItems.length})</h2>
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

        <div className="hidden h-fit lg:sticky lg:top-28 lg:block">
          <CartSummary
            unitCount={unitCount}
            subtotal={subtotal}
            disabled={cartItems.length === 0}
            onCheckout={() => navigate("/checkout")}
          />
        </div>
      </div>
    </div>
  );
}

function CartSummary({
  unitCount,
  subtotal,
  disabled,
  onCheckout,
}: {
  unitCount: number;
  subtotal: number;
  disabled: boolean;
  onCheckout: () => void;
}) {
  return (
    <section className="surface rounded-md p-5" aria-label="Cart summary">
      <p className="text-lg text-ink">
        Subtotal ({unitCount} {unitCount === 1 ? "item" : "items"}):{" "}
        <span className="amount font-bold">{formatPrice(subtotal)}</span>
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onCheckout}
        className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-50"
      >
        Proceed to checkout
      </button>
    </section>
  );
}
