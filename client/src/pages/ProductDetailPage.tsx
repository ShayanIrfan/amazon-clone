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
import { estimatedDelivery } from "../lib/format";
import type { ReviewSort } from "../lib/types";

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

  const { data: reviewData } = useReviews(id, { sort: reviewSort, star: starFilter ?? undefined, page: reviewPage });

  if (isLoading) return <div className="p-16 text-center text-neutral-500">Loading…</div>;
  if (isError || !product) {
    return (
      <div className="flex flex-col items-center gap-2 p-16 text-center">
        <p className="text-amazon-red">Product not found.</p>
        <Link to="/search" className="text-link hover:underline">
          Back to search
        </Link>
      </div>
    );
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
    <div className="mx-auto max-w-6xl px-4 py-4">
      <nav className="mb-3 flex items-center gap-1 text-xs text-neutral-500">
        <Link to="/" className="hover:text-link hover:underline">
          Home
        </Link>
        <ChevronRight size={12} />
        <Link to={`/search?category=${product.category}`} className="hover:text-link hover:underline">
          {categoryLabel(product.category)}
        </Link>
      </nav>

      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px]">
        <div className="sm:col-span-1">
          <ImageGallery images={product.images} title={product.title} />
        </div>

        <div className="sm:col-span-1">
          <h1 className="text-xl font-medium text-neutral-900">{product.title}</h1>
          <p className="mt-1 text-sm text-link hover:underline">Visit the {product.brand} Store</p>
          <div className="mt-1">
            <StarRating rating={product.rating} count={product.ratingCount} />
          </div>

          <div className="mt-3 border-t border-neutral-200 pt-3">
            <PriceTag price={product.price} discountPercentage={product.discountPercentage} size="lg" />
          </div>

          {bullets.length > 0 && (
            <div className="mt-4">
              <h2 className="font-bold text-neutral-900">About this item</h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h2 className="mb-2 font-bold text-neutral-900">Specifications</h2>
            <SpecsTable product={product} />
          </div>
        </div>

        <div className="sm:col-span-1">
          <div className="rounded-lg border border-neutral-200 p-4">
            <PriceTag price={product.price} discountPercentage={product.discountPercentage} size="lg" />
            {product.stock > 0 ? (
              <>
                <p className="mt-2 text-sm text-neutral-700">
                  FREE delivery <span className="font-medium text-neutral-900">{estimatedDelivery(4)}</span>
                </p>
                <p className="mt-2 text-lg font-medium text-green-700">In Stock</p>
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
              className="mt-4 w-full rounded-full bg-amazon-yellow px-4 py-2 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-50"
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
                navigate("/cart");
              }}
              title="Checkout isn't built yet (milestone 5) — this adds the item and takes you to the cart"
              className="mt-2 w-full rounded-full bg-amazon-orange px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
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

      <div className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">Customer Reviews</h2>
        <div className="grid gap-8 sm:grid-cols-[240px_1fr]">
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
