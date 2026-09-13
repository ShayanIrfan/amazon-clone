import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLists, useCreateList, useAddToList, useRemoveFromList } from "../../hooks/useLists";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { Link } from "react-router";

export default function AddToListMenu({ productId, variant = "button" }: { productId: string; variant?: "button" | "link" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useLists();
  const createList = useCreateList();
  const addToList = useAddToList();
  const removeFromList = useRemoveFromList();

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);
  useEscapeKey(open, () => setOpen(false));

  const lists = data?.items ?? [];
  const inAnyList = lists.some((l) => l.items.some((i) => i.product === productId));

  const buttonClass =
    variant === "link"
      ? `text-link hover:underline ${inAnyList ? "font-medium" : ""}`
      : `flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50 ${
          inAnyList ? "border-amazon-orange text-amazon-orange" : "border-neutral-300"
        }`;

  if (!user) {
    return variant === "link" ? (
      <Link to="/login" className="text-link hover:underline" title="Sign in to add to a list">
        Add to List
      </Link>
    ) : (
      <Link
        to="/login"
        className="flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        title="Sign in to add to a list"
      >
        <Heart size={16} /> Add to List
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClass}>
        {variant === "button" && <Heart size={16} fill={inAnyList ? "currentColor" : "none"} className="mr-1 inline" />}
        Add to List
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-64 max-w-[85vw] rounded-md border border-neutral-200 bg-white p-3 shadow-lg">
          {lists.length === 0 && <p className="mb-2 text-sm text-neutral-500">You don't have any lists yet.</p>}
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {lists.map((list) => {
              const checked = list.items.some((i) => i.product === productId);
              return (
                <li key={list._id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        checked
                          ? removeFromList.mutate({ listId: list._id, productId })
                          : addToList.mutate({ listId: list._id, productId })
                      }
                      className="accent-amazon-orange"
                    />
                    {list.name}
                  </label>
                </li>
              );
            })}
          </ul>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              createList.mutate(newName.trim(), {
                onSuccess: (res) => {
                  const created = res.items.at(-1);
                  if (created) addToList.mutate({ listId: created._id, productId });
                  setNewName("");
                },
              });
            }}
            className="mt-2 flex gap-1 border-t border-neutral-100 pt-2"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50">
              Create
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
