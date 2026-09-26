import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useCategories, useSuggestions } from "../../hooks/useProducts";

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

  const departmentName = categoriesData?.items.find((c) => c.slug === department)?.name;

  return (
    <form
      ref={containerRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
      className="relative flex h-12 w-full items-center gap-2 rounded-full border border-line bg-paper p-1 pl-4 transition-colors focus-within:border-harbor focus-within:bg-white focus-within:ring-3 focus-within:ring-harbor/12"
    >
      {/* The visible label and chevron sit on top of a transparent native select, so it stays keyboard- and screen-reader-friendly. */}
      <span className="relative hidden shrink-0 items-center gap-1.5 border-r border-line pr-3 text-sm font-semibold text-slate hover:text-ink md:flex">
        <LayoutGrid size={15} aria-hidden />
        <span className="max-w-32 truncate">{departmentName ?? "All departments"}</span>
        <ChevronDown size={14} aria-hidden />
        <select
          aria-label="Search department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="">All departments</option>
          {categoriesData?.items.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </span>
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
        placeholder="Search groceries, tech, fashion, home…"
        aria-label="Search Harbor Market"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !!suggestions?.items.length}
        aria-controls="search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-harbor text-white hover:bg-harbor-dark"
      >
        <Search size={19} aria-hidden />
      </button>

      {open && q.trim().length > 1 && !!suggestions?.items.length && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-[3.25rem] left-0 z-30 w-full overflow-hidden rounded-2xl border border-line bg-white py-1.5 text-sm text-ink shadow-[var(--shadow-float)]"
        >
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
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-ink ${activeIndex === index ? "bg-paper" : "hover:bg-paper"}`}
              >
                <Search size={14} className="text-slate" aria-hidden />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
