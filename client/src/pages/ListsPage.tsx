import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { useLists, useCreateList, useDeleteList, useRemoveFromList } from "../hooks/useLists";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import ErrorState from "../components/common/ErrorState";

export default function ListsPage() {
  const { data, isLoading, isError } = useLists();
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

  if (isLoading) return <div className="p-16 text-center text-neutral-500">Loading…</div>;
  if (isError) return <ErrorState message="Couldn't load your lists." />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <h1 className="text-2xl font-medium text-neutral-900">Your Lists</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          createList.mutate(newName.trim(), { onSuccess: () => setNewName("") });
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name"
          className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95">
          Create list
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-16 text-center text-neutral-500">
          <Heart size={40} className="text-neutral-300" />
          <p>You haven't created any lists yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {lists.map((list) => (
            <div key={list._id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-neutral-900">
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
                      <li key={item._id} className="flex items-center gap-3 py-2">
                        <Link to={`/product/${product._id}`} className="h-14 w-14 shrink-0 bg-white">
                          <img src={product.thumbnail} alt={product.title} className="h-full w-full object-contain" />
                        </Link>
                        <div className="flex-1 text-sm">
                          <Link to={`/product/${product._id}`} className="hover:text-link hover:underline">
                            {product.title}
                          </Link>
                          <p className="text-neutral-600">{formatPrice(product.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(product._id);
                            navigate("/cart");
                          }}
                          className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50"
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
