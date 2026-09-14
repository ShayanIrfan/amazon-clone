import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ChevronRight, CircleCheck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useProduct, useRelatedProducts, useReviews } from "../hooks/useProductDetail";
import ImageGallery from "../components/product/ImageGallery";
import StarRating from "../components/product/StarRating";
import PriceTag from "../components/product/PriceTag";
import QuantitySelector from "../components/product/QuantitySelector";
import SpecsTable from "../components/product/SpecsTable";
import RatingBreakdown from "../components/product/RatingBreakdown";
import ReviewList from "../components/product/ReviewList";
import ProductRow from "../components/product/ProductRow";
import AddToListMenu from "../components/lists/AddToListMenu";
import WriteReviewForm from "../components/product/WriteReviewForm";
import { estimatedDelivery } from "../lib/format";
import type { ReviewSort } from "../lib/types";
import PageLoader from "../components/ui/PageLoader";
import ErrorState from "../components/ui/ErrorState";

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

  if (isLoading) return <PageLoader label="Loading product details" />;
  if (isError || !product) {
    return <ErrorState message="Product not found." detail="This product may have been removed from the catalog." />;
  }

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

  return (
    <div className="page-shell py-6">
      <nav className="mb-5 flex items-center gap-1 text-xs text-slate">
        <Link to="/" className="hover:text-link hover:underline">
          Home
        </Link>
        <ChevronRight size={12} />
        <Link to={`/search?category=${product.category}`} className="hover:text-link hover:underline">
          {categoryLabel(product.category)}
        </Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] lg:gap-8">
        <div className="md:col-span-1">
          <ImageGallery images={product.images} title={product.title} />
        </div>

        <div className="md:col-span-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-3xl">{product.title}</h1>
          <p className="mt-2 text-sm font-semibold text-harbor hover:underline">Visit the {product.brand} Store</p>
          <div className="mt-1">
            <StarRating rating={product.rating} count={product.ratingCount} />
          </div>
          <div className="mt-3">
            <AddToListMenu productId={product._id} />
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <PriceTag price={product.price} discountPercentage={product.discountPercentage} size="lg" />
          </div>

          {bullets.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-ink">About this item</h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
              <h2 className="mb-2 text-lg font-semibold text-ink">Specifications</h2>
            <SpecsTable product={product} />
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <div className="surface rounded-md p-4 lg:sticky lg:top-28">
            <PriceTag price={product.price} discountPercentage={product.discountPercentage} size="lg" />
            {product.stock > 0 ? (
              <>
                <p className="mt-2 text-sm text-neutral-700">
                  FREE delivery <span className="font-medium text-neutral-900">{estimatedDelivery(4)}</span>
                </p>
                <p className="mt-3 text-sm font-semibold text-moss">In Stock</p>
                {product.stock <= 10 && (
                  <p className="text-sm text-amazon-red">Only {product.stock} left — order soon.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-lg font-medium text-amazon-red">Out of Stock</p>
            )}

            {product.stock > 0 && (
              <div className="mt-3">
                <QuantitySelector quantity={quantity} max={product.stock} onChange={setQuantity} />
              </div>
            )}

            <button
              type="button"
              disabled={product.stock === 0}
              onClick={() => {
                addItem(product._id, quantity);
                setJustAdded(true);
                setTimeout(() => setJustAdded(false), 2500);
              }}
              className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-50"
            >
              Add to Cart
            </button>
            {justAdded && (
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-700">
                <CircleCheck size={16} /> Added to Cart
              </p>
            )}
            <button
              type="button"
              disabled={product.stock === 0}
              onClick={() => {
                addItem(product._id, quantity);
                navigate("/checkout");
              }}
              className="mt-2 w-full rounded-md bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
            >
              Buy Now
            </button>

            {product.returnPolicy && <p className="mt-3 text-xs text-neutral-600">{product.returnPolicy}</p>}
            {product.shippingInformation && (
              <p className="mt-1 text-xs text-neutral-600">{product.shippingInformation}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-ink">Customer Reviews</h2>
          {product.canReview?.eligible && !showReviewForm && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="rounded-md border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-harbor hover:bg-paper"
            >
              Write a customer review
            </button>
          )}
          {product.canReview?.alreadyReviewed && (
            <p className="text-sm text-neutral-500">You've reviewed this item.</p>
          )}
        </div>

        {showReviewForm && (
          <div className="mt-4">
            <WriteReviewForm productId={product._id} onDone={() => setShowReviewForm(false)} />
          </div>
        )}

        <div className="mt-4 grid gap-8 sm:grid-cols-[240px_1fr]">
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
      </div>

      {!!related?.items.length && (
        <div className="mt-10">
          <ProductRow title="Related products" products={related.items} />
        </div>
      )}
    </div>
  );
}
