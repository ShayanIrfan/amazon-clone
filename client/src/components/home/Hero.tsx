import { Link } from "react-router";
import { ArrowDown, ArrowRight, Lock, RotateCcw, Truck } from "lucide-react";

interface Props {
  totals: { products: number; categories: number };
  /** Up to three product pictures for the collage (a phone, a scent, a kitchen item, whatever the catalog leads with). */
  pictures: string[];
}

const PROMISES = [
  { icon: Lock, label: "Secure card payments" },
  { icon: Truck, label: "Free standard delivery" },
  { icon: RotateCcw, label: "Cancel for a full refund until it ships" },
];

/** The mint hero panel: headline, catalog facts from the API, two actions, and a picture collage. */
export default function Hero({ totals, pictures }: Props) {
  const [top, main, bottom] = pictures; // order: behind (top right), front (centre), beside (bottom left)

  return (
    <section aria-label="Welcome" className="relative overflow-hidden rounded-2xl bg-mint p-8 shadow-[var(--shadow-card)] sm:p-12 lg:p-14">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-harbor/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-white/60 blur-2xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-12">
        <div className="z-10 flex flex-col items-start lg:col-span-7">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.6875rem] font-bold tracking-wider text-slate uppercase shadow-[var(--shadow-card)]">
            <span className="h-2 w-2 rounded-full bg-harbor motion-safe:animate-pulse" aria-hidden />
            Free standard delivery on every order
          </span>
          <h1 className="mb-5 max-w-xl text-[2.25rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-harbor sm:text-[3.5rem] sm:leading-[1.1]">
            Everything you need, one market.
          </h1>
          <p className="mb-8 max-w-lg text-base leading-relaxed text-ink">
            {totals.products.toLocaleString()} products across {totals.categories} departments, from the pantry to the latest phones.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              to="/search"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-harbor px-8 text-sm font-semibold text-white! shadow-sm transition-colors hover:bg-harbor-dark"
            >
              Shop all departments <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#price-drops" className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor underline underline-offset-4 hover:opacity-80">
              See today's price drops <ArrowDown size={16} aria-hidden />
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {PROMISES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-semibold text-slate">
                <Icon size={17} className="text-harbor" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Collage: three round frames. Decorative, so hidden from assistive tech. */}
        <div aria-hidden className="relative mx-auto hidden h-[22rem] w-full max-w-md lg:col-span-5 lg:block">
          {top && (
            <div className="hero-float hero-float-delay absolute top-0 right-0 flex h-40 w-40 items-center justify-center rounded-full bg-white p-6 shadow-[var(--shadow-lift)]">
              <img src={top} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
            </div>
          )}
          {main && (
            <div className="hero-float absolute top-[4.5rem] right-12 flex h-56 w-56 items-center justify-center rounded-full bg-white p-8 shadow-[var(--shadow-lift)]">
              <img src={main} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
            </div>
          )}
          {bottom && (
            <div className="hero-float hero-float-slow hero-float-delay-2 absolute bottom-0 left-0 flex h-44 w-44 items-center justify-center rounded-full bg-white p-7 shadow-[var(--shadow-lift)]">
              <img src={bottom} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
            </div>
          )}
          <span className="absolute top-6 left-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-[var(--shadow-card)]">
            <Truck size={13} className="text-harbor" /> Free standard delivery
          </span>
          <span className="absolute right-0 bottom-6 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-[var(--shadow-card)]">
            <Lock size={13} className="text-harbor" /> Secure checkout
          </span>
        </div>
      </div>
    </section>
  );
}
