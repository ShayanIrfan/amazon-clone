import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MessageSquareOff, Search, Star, Trash2, X } from "lucide-react";
import { useAdminReviewMutations, useAdminReviews } from "../../hooks/useAdmin";
import type { AdminReviewRow } from "../../lib/types";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Pagination from "../../components/search/Pagination";
import Badge from "../../components/ui/Badge";
import Button, { buttonClasses } from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Panel from "../../components/ui/Panel";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";

const formatWhen = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex gap-0.5 text-marigold">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} aria-hidden fill={n <= rating ? "currentColor" : "none"} strokeWidth={n <= rating ? 0 : 1.5} className={n <= rating ? "" : "text-line-strong"} />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const rating = Number(params.get("rating")) || undefined;
  const productId = params.get("productId") ?? undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || (key === "page" && value === "1")) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => setParam("q", search.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isLoading, isError, isFetching, refetch } = useAdminReviews({ q: q || undefined, rating, productId, page });
  const { remove } = useAdminReviewMutations();
  const [target, setTarget] = useState<AdminReviewRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function confirmDelete() {
    if (!target) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(target._id);
      setNotice(`Review by ${target.reviewerName} deleted. ${target.product ? `${target.product.title}'s rating was recalculated.` : ""}`);
      setTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the review.");
    }
  }

  const filtered = !!(q || rating || productId);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const focusedProduct = productId ? data?.items[0]?.product : null;

  return (
    <div>
      <h1 className="page-title text-ink">Reviews</h1>
      <p className="muted mt-1">{data ? `${data.total.toLocaleString()} ${data.total === 1 ? "review" : "reviews"}${filtered ? " match" : ""}` : "Loading reviews…"}</p>

      {notice && (
        <p role="status" className="mt-4 rounded-md border border-moss/20 bg-moss/10 px-4 py-2.5 text-sm font-medium text-moss">
          {notice}
        </p>
      )}

      <Panel className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <label htmlFor="review-search" className="mb-1 block text-sm font-medium text-ink">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate" aria-hidden />
              <input
                id="review-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Review text or reviewer name"
                className="h-10 w-full rounded-md border border-line-strong bg-white pr-3 pl-9 text-sm outline-none focus:border-harbor"
              />
            </div>
          </div>
          <Select label="Rating" value={rating ? String(rating) : ""} onChange={(event) => setParam("rating", event.target.value)} containerClassName="w-44">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "star" : "stars"}
              </option>
            ))}
          </Select>
          {isFetching && !isLoading && <span className="pb-2.5 text-xs text-slate">Updating…</span>}
        </div>

        {productId && (
          <p className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-4 py-2 text-sm text-slate">
            Showing reviews for {focusedProduct ? <strong className="text-ink">{focusedProduct.title}</strong> : "one product"}.
            <button type="button" onClick={() => setParam("productId", "")} className="inline-flex items-center gap-1 font-medium text-harbor hover:underline">
              <X size={14} aria-hidden /> Show all products
            </button>
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading reviews">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Couldn't load reviews." onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-line">
              {data.items.map((review) => (
                <li key={review._id} className="flex gap-3 px-4 py-4">
                  {review.product ? (
                    <img src={review.product.thumbnail} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md border border-line bg-white object-contain" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-md border border-line bg-paper" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars rating={review.rating} />
                      {review.product ? (
                        <Link to={`/admin/products/${review.product.id}`} className="truncate text-sm font-medium text-ink hover:text-harbor hover:underline">
                          {review.product.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate">Removed product</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink">{review.comment}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate">
                      {review.reviewerName} · {formatWhen(review.date)}
                      {review.verifiedPurchase && <Badge tone="positive">Verified purchase</Badge>}
                      {review.hasAccount && <Badge tone="info">Store customer</Badge>}
                    </p>
                  </div>
                  <Button variant="quiet" size="sm" className="self-start" onClick={() => setTarget(review)} aria-label={`Delete ${review.rating}-star review by ${review.reviewerName}`}>
                    <Trash2 size={14} aria-hidden /> Delete
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={(next) => setParam("page", String(next))} />
          </>
        ) : (
          <EmptyState
            icon={MessageSquareOff}
            title={filtered ? "No reviews match" : "No reviews yet"}
            description={filtered ? "Try a different search or rating." : "Reviews written by customers appear here."}
            action={
              filtered ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className={buttonClasses("secondary", "md")}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        )}
      </Panel>

      <ConfirmDialog
        open={!!target}
        title="Delete this review?"
        confirmLabel="Delete review"
        busy={remove.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setTarget(null);
          setDeleteError(null);
        }}
      >
        The {target?.rating}-star review by {target?.reviewerName} is removed for good, and {target?.product ? `“${target.product.title}”` : "the product"} gets a
        new average rating from the reviews that remain. The deletion is recorded in the activity log.
      </ConfirmDialog>
    </div>
  );
}
