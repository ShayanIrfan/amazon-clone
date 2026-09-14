import { useHome } from "../hooks/useProducts";
import HeroCarousel from "../components/home/HeroCarousel";
import CategoryGrid, { pickThumbnails } from "../components/home/CategoryGrid";
import ProductRow from "../components/product/ProductRow";
import PageLoader from "../components/ui/PageLoader";
import ErrorState from "../components/ui/ErrorState";

export default function HomePage() {
  const { data, isLoading, isError } = useHome();

  if (isLoading) {
    return <PageLoader label="Loading the marketplace" />;
  }

  if (isError || !data) {
    return <ErrorState message="Couldn't load the marketplace." detail="Check your connection and try again." />;
  }

  const thumbnails = pickThumbnails([...data.bestSellers, ...data.newArrivals, ...data.topRated]);

  return (
    <div className="flex flex-col gap-2 pb-8">
      <HeroCarousel categories={data.categories} />
      <CategoryGrid categories={data.categories} thumbnails={thumbnails} />
      <div className="page-shell flex flex-col gap-5">
        <ProductRow title="Today's Deals" products={data.dealsOfTheDay} />
        <ProductRow title="Best Sellers" products={data.bestSellers} />
        <ProductRow title="Top Rated" products={data.topRated} />
        <ProductRow title="New Arrivals" products={data.newArrivals} />
      </div>
    </div>
  );
}
