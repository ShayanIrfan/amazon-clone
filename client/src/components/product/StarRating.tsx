import { Star, StarHalf } from "lucide-react";

interface Props {
  rating: number;
  count?: number;
  size?: number;
  /** Show the numeric average (e.g. "4.3") before the count. */
  showValue?: boolean;
}

export default function StarRating({ rating, count, size = 14, showValue = false }: Props) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-marigold" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) return <Star key={i} size={size} fill="currentColor" strokeWidth={0} aria-hidden />;
          if (i === full && half) {
            return (
              <span key={i} className="relative" aria-hidden>
                <Star size={size} className="text-line" fill="currentColor" strokeWidth={0} />
                <StarHalf size={size} className="absolute inset-0" fill="currentColor" strokeWidth={0} />
              </span>
            );
          }
          return <Star key={i} size={size} className="text-line" fill="currentColor" strokeWidth={0} aria-hidden />;
        })}
      </div>
      {showValue && <span className="text-xs font-bold text-ink">{rating.toFixed(1)}</span>}
      {count != null && <span className="text-xs font-medium text-slate">({count.toLocaleString()})</span>}
    </div>
  );
}
