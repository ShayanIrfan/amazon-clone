import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useCategories } from "../../hooks/useProducts";
import { useSuggestions } from "../../hooks/useProducts";

export default function SearchBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: categoriesData } = useCategories();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [department, setDepartment] = useState(params.get("category") ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const { data: suggestions } = useSuggestions(q);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function search(term = q) {
    const next = new URLSearchParams();
    if (term.trim()) next.set("q", term.trim());
    if (department) next.set("category", department);
    navigate(`/search?${next.toString()}`);
    setOpen(false);
  }

  return (
    <form
      ref={containerRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
      className="relative flex h-10 w-full max-w-3xl rounded-md focus-within:ring-2 focus-within:ring-amazon-yellow"
    >
      <select
        aria-label="Search department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className="hidden shrink-0 rounded-l-md border-r border-neutral-300 bg-neutral-100 px-2 text-sm text-neutral-700 sm:block"
      >
        <option value="">All</option>
        {categoriesData?.items.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        type="text"
        placeholder="Search amazon-clone"
        aria-label="Search amazon-clone"
        className="min-w-0 flex-1 rounded-l-md bg-white px-3 text-sm text-neutral-900 outline-none sm:rounded-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex w-12 shrink-0 items-center justify-center rounded-r-md bg-amazon-yellow text-neutral-900 hover:bg-amazon-orange"
      >
        <Search size={20} />
      </button>

      {open && q.trim().length > 1 && !!suggestions?.items.length && (
        <ul className="absolute top-11 left-0 z-30 w-full rounded-md border border-neutral-200 bg-white py-1 text-sm text-neutral-800 shadow-lg">
          {suggestions.items.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => {
                  setQ(s);
                  search(s);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-800 hover:bg-neutral-100"
              >
                <Search size={14} className="text-neutral-400" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
