import { useState } from "react";

export default function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const gallery = images.length ? images : ["/placeholder.svg"];
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-paper p-8 sm:p-12">
        <img src={gallery[active]} alt={title} className="max-h-full max-w-full object-contain mix-blend-multiply" />
      </div>

      {gallery.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${gallery.length}`}
              aria-pressed={i === active}
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper p-2 transition-shadow ${
                i === active ? "ring-2 ring-harbor" : "ring-1 ring-line hover:ring-line-strong"
              }`}
            >
              <img src={src} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
