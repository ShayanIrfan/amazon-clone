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
    <div className="page-shell max-w-4xl py-6">
      <p className="eyebrow">Saved products</p>
      <h1 className="page-title mt-1 text-ink">Your Lists</h1>
      <p className="mt-2 text-sm text-slate">Keep products together for later comparison.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          createList.mutate(newName.trim(), { onSuccess: () => setNewName("") });
        }}
        className="surface mt-6 flex gap-2 rounded-md p-3"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name"
          className="h-10 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
        />
        <button type="submit" disabled={!newName.trim() || createList.isPending} className="rounded-md bg-marigold px-4 py-2 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-50">
          Create list
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="surface mt-6 flex flex-col items-center gap-2 rounded-md p-16 text-center text-slate">
          <Heart size={40} className="text-neutral-300" />
          <p>You haven't created any lists yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {lists.map((list) => (
            <div key={list._id} className="surface rounded-md p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">
                  {list.name} <span className="font-normal text-neutral-500">({list.items.length})</span>
                </h2>
                <button type="button" onClick={() => deleteList.mutate(list._id)} className="text-xs text-link hover:underline">
                  Delete list
                </button>
              </div>

              {list.items.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No items yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-neutral-100">
                  {list.items.map((item) => {
                    const product = productsById.get(item.product);
                    if (!product) return null;
                    return (
                      <li key={item._id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                        <Link to={`/product/${product._id}`} className="h-14 w-14 shrink-0 bg-white">
                          <img src={product.thumbnail} alt={product.title} className="h-full w-full object-contain" />
                        </Link>
                        <div className="min-w-36 flex-1 text-sm">
                          <Link to={`/product/${product._id}`} className="hover:text-link hover:underline">
                            {product.title}
                          </Link>
                          <p className="amount text-neutral-600">{formatPrice(product.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(product._id);
                            navigate("/cart");
                          }}
                          className="rounded-md border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-harbor hover:bg-paper"
                        >
                          Move to cart
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromList.mutate({ listId: list._id, productId: product._id })}
                          className="text-xs text-link hover:underline"
                        >
                          Remove
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
