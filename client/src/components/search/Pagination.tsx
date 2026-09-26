import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  const arrow = "flex h-10 items-center gap-1 rounded-full border border-line bg-white px-4 text-sm font-semibold text-harbor transition-colors hover:bg-paper disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav className="flex items-center justify-center gap-1.5 py-6" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={arrow}>
        <ChevronLeft size={16} aria-hidden /> Prev
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-slate">…</span>}
          <button
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              p === page ? "bg-harbor text-white" : "border border-line bg-white text-ink hover:bg-paper"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={arrow}>
        Next <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
}
