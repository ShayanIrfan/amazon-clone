import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Check, Lock, RotateCcw, Truck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useProduct, useRelatedProducts, useReviews } from "../hooks/useProductDetail";
import ImageGallery from "../components/product/ImageGallery";
import StarRating from "../components/product/StarRating";
import QuantitySelector from "../components/product/QuantitySelector";
import SpecsTable from "../components/product/SpecsTable";
import RatingBreakdown from "../components/product/RatingBreakdown";
import ReviewList from "../components/product/ReviewList";
import ProductRow from "../components/product/ProductRow";
import AddToListMenu from "../components/lists/AddToListMenu";
import WriteReviewForm from "../components/product/WriteReviewForm";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import { formatPrice, listPrice } from "../lib/format";
import type { ReviewSort } from "../lib/types";

const PROMISES = [
  { icon: Truck, label: "Free standard delivery" },
  { icon: Lock, label: "Secure card payments" },
  { icon: RotateCcw, label: "Cancel for a full refund until it ships" },
];

function categoryLabel(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(id);
  const { data: related } = useRelatedProducts(id);
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("recent");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: reviewData } = useReviews(id, { sort: reviewSort, star: starFilter ?? undefined, page: reviewPage });

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) {
    return <ErrorState message="Product not found." detail="This product may have been removed from the catalog." />;
  }

  const archived = !!product.archivedAt;
  const canBuy = product.stock > 0 && !archived;
  const discount = Math.round(product.discountPercentage);

  const bullets = product.description
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  function changeReviewSort(sort: ReviewSort) {
    setReviewSort(sort);
    setReviewPage(1);
  }
  function changeStarFilter(star: number | null) {
    setStarFilter(star);
    setReviewPage(1);
  }
  function add() {
    addItem(product!._id, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div className="page-shell py-8">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "Home", to: "/" },
          { label: categoryLabel(product.category), to: `/search?category=${product.category}` },
          { label: product.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} title={product.title} />

        <div className="flex flex-col">
          {product.brand && <p className="eyebrow mb-2">{product.brand}</p>}
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-3xl">{product.title}</h1>

          <a href="#reviews" className="mt-3 inline-flex w-fit items-center gap-1.5 hover:opacity-80">
            <StarRating rating={product.rating} count={product.ratingCount} showValue />
            <span className="text-sm font-semibold text-harbor underline underline-offset-2">See reviews</span>
          </a>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="amount text-3xl font-extrabold tracking-[-0.02em] text-ink">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <>
                <span className="amount text-base text-slate line-through">{formatPrice(listPrice(product.price, product.discountPercentage))}</span>
                <span className="rounded-full bg-clay px-2.5 py-1 text-xs font-bold text-white">-{discount}%</span>
              </>
            )}
          </div>

          <p className={`mt-3 text-sm font-semibold ${canBuy ? "text-moss" : "text-clay"}`}>
            {archived ? "No longer available" : !canBuy ? "Out of stock" : product.stock <= 10 ? `Only ${product.stock} left — order soon` : "In stock"}
          </p>

          {canBuy && (
            <div className="mt-6">
              <QuantitySelector quantity={quantity} max={product.stock} onChange={setQuantity} />
            </div>
          )}

          <div className="mt-6 flex items-stretch gap-3">
            <button
              type="button"
              disabled={!canBuy}
              onClick={add}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                justAdded ? "bg-moss" : "bg-harbor hover:bg-harbor-dark"
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={18} aria-hidden /> Added to cart
                </>
              ) : (
                "Add to cart"
              )}
            </button>
            <div className="flex items-center">
              <AddToListMenu productId={product._id} variant="icon" />
            </div>
          </div>
          <button
            type="button"
            disabled={!canBuy}
            onClick={() => {
              addItem(product._id, quantity);
              navigate("/checkout");
            }}
            className="mt-3 h-12 w-full rounded-full border border-line-strong bg-white text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
          >
            Buy now
          </button>

          <ul className="mt-6 space-y-3 rounded-2xl bg-paper p-5">
            {PROMISES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm font-medium text-ink">
                <Icon size={18} className="shrink-0 text-harbor" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Description + specs */}
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        {bullets.length > 0 && (
          <section>
            <h2 className="section-title mb-4 text-xl!">About this item</h2>
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-harbor" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="section-title mb-4 text-xl!">Specifications</h2>
          <Panel className="p-5 sm:p-6">
            <SpecsTable product={product} />
          </Panel>
        </section>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-14 scroll-mt-32 border-t border-line pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title text-xl!">Customer reviews</h2>
          {product.canReview?.eligible && !showReviewForm && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="h-10 rounded-full border border-line-strong bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            >
              Write a review
            </button>
          )}
          {product.canReview?.alreadyReviewed && <p className="text-sm text-slate">You've reviewed this item.</p>}
        </div>

        {showReviewForm && (
          <div className="mt-5">
            <WriteReviewForm productId={product._id} onDone={() => setShowReviewForm(false)} />
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
          <RatingBreakdown
            average={product.rating}
            total={reviewData?.total ?? product.ratingCount}
            breakdown={reviewData?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }}
            selectedStar={starFilter}
            onSelectStar={changeStarFilter}
          />
          {reviewData && (
            <ReviewList
              reviews={reviewData.items}
              total={reviewData.total}
              page={reviewData.page}
              limit={reviewData.limit}
              sort={reviewSort}
              starFilter={starFilter}
              onSortChange={changeReviewSort}
              onPageChange={setReviewPage}
              onClearStarFilter={() => changeStarFilter(null)}
            />
          )}
        </div>
      </section>

      {!!related?.items.length && (
        <div className="mt-16">
          <ProductRow title="You may also like" products={related.items} />
        </div>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="page-shell py-8">
      <Skeleton className="mb-6 h-4 w-64" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-10 w-32" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
