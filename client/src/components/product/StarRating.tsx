import { Star, StarHalf } from "lucide-react";

interface Props {
  rating: number;
  count?: number;
  size?: number;
}

export default function StarRating({ rating, count, size = 14 }: Props) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-marigold-dark" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) return <Star key={i} size={size} fill="currentColor" strokeWidth={0} />;
          if (i === full && half) return <StarHalf key={i} size={size} fill="currentColor" strokeWidth={0} />;
          return <Star key={i} size={size} className="text-neutral-300" fill="currentColor" strokeWidth={0} />;
        })}
      </div>
      {count != null && (
        <span className="text-xs text-harbor hover:underline">
          {count.toLocaleString()}
        </span>
      )}
    </div>
  );
}
