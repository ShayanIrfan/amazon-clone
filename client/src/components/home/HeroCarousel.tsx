import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { Category } from "../../lib/types";

interface Slide {
  title: string;
  subtitle: string;
  category?: string;
  bg: string;
}

const SLIDE_STYLES = [
  "bg-harbor",
  "bg-clay",
  "bg-moss",
  "bg-harbor-dark",
];

export default function HeroCarousel({ categories }: { categories: Category[] }) {
  const slides: Slide[] = categories.slice(0, 4).map((c, i) => ({
    title: `Shop ${c.name}`,
    subtitle: `${c.productCount} items to explore`,
    category: c.slug,
    bg: SLIDE_STYLES[i % SLIDE_STYLES.length],
  }));

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[index];

  return (
    <div className="relative mx-auto h-64 w-full max-w-[1440px] overflow-hidden sm:h-80 lg:h-[360px]">
      <Link
        to={slide.category ? `/search?category=${slide.category}` : "/search"}
        className={`flex h-full w-full flex-col items-start justify-end gap-3 px-16 pb-14 text-left text-white sm:px-20 sm:pb-16 lg:px-24 ${slide.bg}`}
      >
        <span className="eyebrow !text-white/70">The marketplace edit</span>
        <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] !text-white sm:text-5xl">{slide.title}</h2>
        <p className="max-w-md text-sm !text-white/80 sm:text-base">{slide.subtitle}. Find useful things for the way you live, work, and play.</p>
        <span className="mt-1 inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-harbor-dark">Explore collection</span>
      </Link>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-md bg-white/85 p-2 text-harbor-dark hover:bg-white"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-white/85 p-2 text-harbor-dark hover:bg-white"
          >
            <ChevronRight />
          </button>
          <div className="absolute bottom-5 left-16 flex gap-1.5 sm:left-20 lg:left-24">
            {slides.map((s, i) => (
              <button
                key={s.title}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-8 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
