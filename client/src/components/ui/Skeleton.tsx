export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden />;
}

/** Placeholder matching ProductCard's shape, for grids/rows while data loads. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-2 h-5 w-1/2" />
    </div>
  );
}
