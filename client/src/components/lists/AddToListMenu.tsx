import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLists, useCreateList, useAddToList, useRemoveFromList } from "../../hooks/useLists";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { Link } from "react-router";

export default function AddToListMenu({
  productId,
  variant = "button",
  label = "Save to list",
}: {
  productId: string;
  /** "icon" is the round heart on product cards. */
  variant?: "button" | "link" | "icon";
  label?: string;
}) {
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

  const iconClass = `flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)] transition hover:scale-105 ${inAnyList ? "text-clay" : "text-line-strong hover:text-clay"}`;
  const buttonClass =
    variant === "link"
      ? `text-link hover:underline ${inAnyList ? "font-medium" : ""}`
      : variant === "icon"
        ? iconClass
        : `flex items-center gap-1.5 rounded-full px-1 py-1.5 text-sm font-medium hover:text-harbor ${inAnyList ? "text-clay" : "text-ink"}`;

  if (!user) {
    if (variant === "icon") {
      return (
        <Link to="/login" aria-label="Sign in to save this item" title="Sign in to save items" className={iconClass}>
          <Heart size={16} aria-hidden />
        </Link>
      );
    }
    return variant === "link" ? (
      <Link to="/login" className="text-link hover:underline" title="Sign in to add to a list">
        Add to List
      </Link>
    ) : (
      <Link to="/login" className="flex items-center gap-1.5 rounded-full px-1 py-1.5 text-sm font-medium text-ink hover:text-harbor" title="Sign in to save items">
        <Heart size={16} aria-hidden /> {label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={variant === "icon" ? (inAnyList ? "Saved to a list. Change lists" : "Save to a list") : undefined}
      >
        {variant !== "link" && <Heart size={16} fill={inAnyList ? "currentColor" : "none"} aria-hidden />}
        {variant !== "icon" && (variant === "link" ? "Add to List" : inAnyList ? "Saved" : label)}
      </button>

      {open && (
        <div className={`absolute top-full z-30 mt-2 w-64 max-w-[85vw] rounded-2xl border border-line bg-white p-3 text-left shadow-[var(--shadow-float)] ${variant === "icon" ? "right-0" : "left-0"}`}>
          {lists.length === 0 && <p className="mb-2 text-sm text-slate">You don't have any lists yet.</p>}
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {lists.map((list) => {
              const checked = list.items.some((i) => i.product === productId);
              return (
                <li key={list._id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-paper">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        checked
                          ? removeFromList.mutate({ listId: list._id, productId })
                          : addToList.mutate({ listId: list._id, productId })
                      }
                      className="accent-harbor"
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
            className="mt-2 flex gap-1.5 border-t border-line pt-2"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-harbor"
            />
            <button type="submit" className="rounded-full bg-harbor px-3 py-1.5 text-sm font-semibold text-white hover:bg-harbor-dark">
              Create
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
