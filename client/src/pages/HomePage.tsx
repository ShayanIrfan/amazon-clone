import { useHome } from "../hooks/useProducts";
import HeroCarousel from "../components/home/HeroCarousel";
import CategoryGrid, { pickThumbnails } from "../components/home/CategoryGrid";
import ProductRow from "../components/product/ProductRow";

export default function HomePage() {
  const { data, isLoading, isError } = useHome();

  if (isLoading) {
    return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  }

  if (isError || !data) {
    return <div className="p-8 text-center text-amazon-red">Couldn't load the home page. Is the API running?</div>;
  }

  const thumbnails = pickThumbnails([...data.bestSellers, ...data.newArrivals, ...data.topRated]);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeroCarousel categories={data.categories} />
      <CategoryGrid categories={data.categories} thumbnails={thumbnails} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2">
        <ProductRow title="Today's Deals" products={data.dealsOfTheDay} />
        <ProductRow title="Best Sellers" products={data.bestSellers} />
        <ProductRow title="Top Rated" products={data.topRated} />
        <ProductRow title="New Arrivals" products={data.newArrivals} />
      </div>
    </div>
  );
}
