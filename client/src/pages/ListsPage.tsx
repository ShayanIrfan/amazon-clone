import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { useLists, useCreateList, useDeleteList, useRemoveFromList } from "../hooks/useLists";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";
import AccountNav from "../components/account/AccountNav";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

export default function ListsPage() {
  const { data, isLoading, isError, refetch } = useLists();
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const removeFromList = useRemoveFromList();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");

  const lists = data?.items ?? [];
  const allProductIds = [...new Set(lists.flatMap((l) => l.items.map((i) => i.product)))].sort();

  const { data: productsData } = useQuery({
    queryKey: ["listProducts", allProductIds],
    queryFn: () => api.productsByIds(allProductIds),
    enabled: allProductIds.length > 0,
  });
  const productsById = new Map((productsData?.items ?? []).map((p) => [p._id, p]));

  if (isLoading) return <PageLoader label="Loading your lists" />;
  if (isError) return <ErrorState message="Couldn't load your lists." onRetry={() => refetch()} />;

  return (
    <div className="page-shell max-w-4xl py-8">
      <PageHeader eyebrow="Saved products" title="Your lists" description="Keep products together for later." />
      <div className="mt-6"><AccountNav /></div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          createList.mutate(newName.trim(), { onSuccess: () => setNewName("") });
        }}
        className="surface flex gap-2 rounded-2xl p-3"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong px-4 text-sm outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10"
        />
        <button type="submit" disabled={!newName.trim() || createList.isPending} className="h-11 shrink-0 rounded-full bg-harbor px-5 text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-50">
          Create list
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="surface mt-6 rounded-2xl p-4"><EmptyState icon={Heart} title="No lists yet" description="Create a list above, then save products to it from any product." /></div>
      ) : (
        <div className="mt-6 space-y-6">
          {lists.map((list) => (
            <div key={list._id} className="surface rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">{list.name} <span className="font-normal text-slate">({list.items.length})</span>
                </h2>
                <button type="button" onClick={() => deleteList.mutate(list._id)} className="text-xs font-semibold text-slate hover:text-clay">Delete list
                </button>
              </div>

              {list.items.length === 0 ? (
                <p className="mt-2 text-sm text-slate">No items yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {list.items.map((item) => {
                    const product = productsById.get(item.product);
                    if (!product) return null;
                    return (
                      <li key={item._id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                        <Link to={`/product/${product._id}`} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper p-2">
                          <img src={product.thumbnail} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                        </Link>
                        <div className="min-w-36 flex-1 text-sm">
                          <Link to={`/product/${product._id}`} className="hover:text-harbor hover:underline">
                            {product.title}
                          </Link>
                          <p className="amount text-slate">{formatPrice(product.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(product._id);
                            navigate("/cart");
                          }}
                          className="h-9 rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                        >
                          Move to cart
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromList.mutate({ listId: list._id, productId: product._id })}
                          className="text-xs font-semibold text-slate hover:text-clay">Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
