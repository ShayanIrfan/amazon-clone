import { useState } from "react";
import { Star } from "lucide-react";
import { useWriteReview } from "../../hooks/useProductDetail";

export default function WriteReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const writeReview = useWriteReview(productId);

  const shown = hoverRating || rating;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        writeReview.mutate({ rating, comment }, { onSuccess: onDone });
      }}
      className="rounded-lg border border-neutral-200 p-4"
    >
      <h3 className="font-bold text-neutral-900">Write a customer review</h3>

      <div className="mt-2 flex gap-1" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => setRating(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star size={24} className={star <= shown ? "text-amazon-orange" : "text-neutral-300"} fill="currentColor" strokeWidth={0} />
          </button>
        ))}
      </div>

      <textarea
        required
        minLength={1}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you like or dislike? What did you use this product for?"
        rows={4}
        className="mt-3 w-full rounded border border-neutral-300 p-2 text-sm focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
      />

      {writeReview.isError && (
        <p className="mt-2 text-sm text-amazon-red">
          {writeReview.error instanceof Error ? writeReview.error.message : "Couldn't submit your review."}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={rating === 0 || writeReview.isPending}
          className="rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-50"
        >
          Submit
        </button>
        <button type="button" onClick={onDone} className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
