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
  "from-sky-700 to-sky-500",
  "from-amber-700 to-amber-500",
  "from-emerald-700 to-emerald-500",
  "from-rose-700 to-rose-500",
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
    <div className="relative h-56 w-full overflow-hidden sm:h-72 md:h-96">
      <Link
        to={slide.category ? `/search?category=${slide.category}` : "/search"}
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-r px-4 text-center text-white ${slide.bg}`}
      >
        <h2 className="text-2xl font-bold sm:text-4xl">{slide.title}</h2>
        <p className="text-sm sm:text-lg">{slide.subtitle}</p>
      </Link>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/70 p-1 hover:bg-white"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/70 p-1 hover:bg-white"
          >
            <ChevronRight />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.title}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
