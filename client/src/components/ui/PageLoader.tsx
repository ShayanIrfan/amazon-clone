import Skeleton from "./Skeleton";

export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="page-shell py-10" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="surface rounded-md p-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
