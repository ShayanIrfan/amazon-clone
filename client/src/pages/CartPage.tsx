import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Lock, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useHome } from "../hooks/useProducts";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import CartLineItem from "../components/cart/CartLineItem";
import ProductRow from "../components/product/ProductRow";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";

const PROMISES = [
  { icon: Truck, label: "Free standard delivery" },
  { icon: Lock, label: "Secure card payments" },
  { icon: RotateCcw, label: "Cancel for a full refund until it ships" },
];

export default function CartPage() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, saveForLater, moveToCart } = useCart();
  const { data: home } = useHome();
  const productIds = [...items.map((i) => i.productId)].sort();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cartProducts", productIds],
    queryFn: () => api.productsByIds(productIds),
    enabled: productIds.length > 0,
  });

  const productsById = new Map((data?.items ?? []).map((p) => [p._id, p]));

  useEffect(() => {
    if (!data) return;
    for (const id of productIds) if (!productsById.has(id)) removeItem(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const cartItems = items.filter((i) => !i.savedForLater && productsById.has(i.productId));
  const savedItems = items.filter((i) => i.savedForLater && productsById.has(i.productId));
  const subtotal = cartItems.reduce((sum, i) => sum + (productsById.get(i.productId)?.price ?? 0) * i.quantity, 0);
  const unitCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (isLoading) {
    return (
      <div className="page-shell py-8">
        <Skeleton className="h-9 w-48" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Panel className="p-5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="mb-4 h-24 w-full" />
            ))}
          </Panel>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Couldn't load your cart." onRetry={() => refetch()} />;
  }

  if (items.length === 0) {
    return (
      <div className="page-shell py-8">
        <Panel className="p-4 sm:p-8">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Browse the catalog and add something you like — free standard delivery on every order."
            action={
              <Link to="/search" className="flex h-11 items-center gap-2 rounded-full bg-harbor px-6 text-sm font-semibold text-white! hover:bg-harbor-dark">
                Start shopping <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />
        </Panel>
        {home?.topRated?.length ? (
          <div className="mt-14">
            <ProductRow title="Top rated" products={home.topRated} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-shell py-8">
      <PageHeader title="Your cart" description={`${unitCount} ${unitCount === 1 ? "item" : "items"}`} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {cartItems.length === 0 ? (
            <Panel className="p-8 text-center text-sm text-slate">Your cart is empty. Everything below is saved for later.</Panel>
          ) : (
            <Panel className="divide-y divide-line px-5 sm:px-6">
              {cartItems.map((item) => (
                <CartLineItem
                  key={item.productId}
                  item={item}
                  product={productsById.get(item.productId)!}
                  onSetQuantity={(q) => setQuantity(item.productId, q)}
                  onRemove={() => removeItem(item.productId)}
                  onSaveForLater={() => saveForLater(item.productId)}
                />
              ))}
            </Panel>
          )}

          {savedItems.length > 0 && (
            <div className="mt-10">
              <h2 className="section-title mb-4 text-xl!">Saved for later ({savedItems.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {savedItems.map((item) => {
                  const product = productsById.get(item.productId)!;
                  return (
                    <div key={item.productId} className="flex gap-3 rounded-2xl border border-line p-3">
                      <Link to={`/product/${product._id}`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-paper p-2">
                        <img src={product.thumbnail} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link to={`/product/${product._id}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-harbor">
                          {product.title}
                        </Link>
                        <span className="amount mt-1 text-sm font-extrabold text-ink">{formatPrice(product.price)}</span>
                        <div className="mt-auto flex items-center gap-3 pt-2 text-xs font-semibold">
                          <button type="button" onClick={() => moveToCart(item.productId)} className="text-harbor hover:underline">
                            Move to cart
                          </button>
                          <button type="button" onClick={() => removeItem(item.productId)} className="text-slate hover:text-clay">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-36 lg:h-fit">
          <Panel className="p-5 sm:p-6" aria-label="Cart summary">
            <h2 className="text-base font-bold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate">Subtotal ({unitCount} {unitCount === 1 ? "item" : "items"})</dt>
                <dd className="amount font-semibold text-ink">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">Delivery</dt>
                <dd className="font-semibold text-moss">Free</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink">Estimated total</dt>
                <dd className="amount text-lg font-extrabold text-ink">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-slate">Tax is calculated at checkout.</p>
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => navigate("/checkout")}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-50"
            >
              Proceed to checkout <ArrowRight size={16} aria-hidden />
            </button>
            <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
              {PROMISES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-xs font-medium text-slate">
                  <Icon size={15} className="shrink-0 text-harbor" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
