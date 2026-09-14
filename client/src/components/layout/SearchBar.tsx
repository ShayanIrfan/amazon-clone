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
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const { data: suggestions } = useSuggestions(q);

  useEffect(() => setActiveIndex(-1), [q]);

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
      className="relative flex h-10 w-full max-w-3xl rounded-md focus-within:ring-2 focus-within:ring-marigold"
    >
      <select
        aria-label="Search department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className="hidden shrink-0 rounded-l-md border-r border-line bg-paper px-2 text-sm text-ink sm:block"
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
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          const items = suggestions?.items ?? [];
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, items.length - 1));
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            setQ(items[activeIndex]);
            search(items[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        type="text"
        placeholder="Search amazon-clone"
        aria-label="Search amazon-clone"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !!suggestions?.items.length}
        aria-controls="search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
        className="min-w-0 flex-1 rounded-l-md bg-white px-3 text-sm text-ink outline-none sm:rounded-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex w-12 shrink-0 items-center justify-center rounded-r-md bg-marigold text-harbor-dark hover:bg-marigold-dark"
      >
        <Search size={20} />
      </button>

      {open && q.trim().length > 1 && !!suggestions?.items.length && (
        <ul id="search-suggestions" role="listbox" className="absolute top-11 left-0 z-30 w-full rounded-md border border-line bg-white py-1 text-sm text-ink shadow-lg">
          {suggestions.items.map((s, index) => (
            <li key={s}>
              <button
                id={`search-suggestion-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                type="button"
                onClick={() => {
                  setQ(s);
                  search(s);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-ink ${activeIndex === index ? "bg-paper" : "hover:bg-paper"}`}
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
