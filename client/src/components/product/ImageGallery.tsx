import { useRef, useState } from "react";

export default function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const gallery = images.length ? images : ["/placeholder.svg"];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {gallery.length > 1 && (
        <div className="flex gap-2 sm:flex-col">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 bg-white ${
                i === active ? "border-amazon-orange" : "border-neutral-200"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <div
        ref={frameRef}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setZoom(null)}
        className="relative flex aspect-square flex-1 items-center justify-center overflow-hidden bg-white"
      >
        <img
          src={gallery[active]}
          alt={title}
          className="max-h-full max-w-full object-contain"
          style={
            zoom
              ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%`, cursor: "zoom-in" }
              : undefined
          }
        />
      </div>
    </div>
  );
}
