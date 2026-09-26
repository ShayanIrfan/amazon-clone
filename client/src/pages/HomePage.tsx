import { useHome } from "../hooks/useProducts";
import Hero from "../components/home/Hero";
import DepartmentGrid from "../components/home/DepartmentGrid";
import PromoPanels from "../components/home/PromoPanels";
import ProductRow from "../components/product/ProductRow";
import ErrorState from "../components/ui/ErrorState";
import Skeleton from "../components/ui/Skeleton";

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useHome();

  if (isError) {
    return <ErrorState message="Couldn't load the marketplace." detail="Check your connection and try again." onRetry={() => refetch()} />;
  }

  // Hero collage: a phone in front, a fragrance behind it, a kitchen item beside. If a department is
  // missing (say it was archived), the next departments' pictures fill in.
  const pictureOf = (slug: string) => data?.categories.find((c) => c.slug === slug)?.thumbnail ?? null;
  const spare = (data?.categories ?? []).map((c) => c.thumbnail).filter((t): t is string => !!t);
  const collage = [pictureOf("fragrances"), pictureOf("smartphones"), pictureOf("kitchen-accessories")].map((p, i) => p ?? spare[i] ?? "").filter(Boolean);

  return (
    <div className="page-shell flex flex-col gap-14 py-8" aria-busy={isLoading || undefined}>
      {data ? (
        <Hero totals={data.totals} pictures={collage} />
      ) : (
        <Skeleton className="h-[26rem] w-full rounded-2xl" />
      )}

      {data ? (
        <DepartmentGrid categories={data.categories} total={data.totals.categories} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      <ProductRow id="price-drops" title="Today's price drops" tag="Biggest discounts" tagTone="sale" products={data?.dealsOfTheDay} loading={isLoading} />
      {data && <PromoPanels categories={data.categories} />}
      <ProductRow id="top-rated" title="Top rated" tag="Customer favorites" products={data?.topRated} loading={isLoading} />
      <ProductRow id="best-sellers" title="Best sellers" products={data?.bestSellers} loading={isLoading} />
      <ProductRow id="new-arrivals" title="New arrivals" products={data?.newArrivals} loading={isLoading} />
    </div>
  );
}
