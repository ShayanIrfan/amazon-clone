import { formatDiscount, formatPrice, listPrice } from "../../lib/format";

interface Props {
  price: number;
  discountPercentage: number;
  size?: "sm" | "lg";
}

export default function PriceTag({ price, discountPercentage, size = "sm" }: Props) {
  const hasDiscount = discountPercentage > 0;
  const list = listPrice(price, discountPercentage);

  const [dollars, cents] = price.toFixed(2).split(".");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`amount inline-flex whitespace-nowrap font-semibold leading-none tracking-[-0.04em] text-ink ${size === "lg" ? "text-4xl" : "text-2xl"}`}
          aria-label={formatPrice(price)}
        >
          <span aria-hidden="true" className="mt-[0.16em] text-[0.5em] font-medium tracking-normal">$</span>
          <span aria-hidden="true">{dollars}</span>
          <span aria-hidden="true" className="mt-[0.12em] text-[0.48em] tracking-normal">{cents}</span>
        </span>
        {hasDiscount && (
          <span className={`${size === "lg" ? "text-sm" : "text-xs"} whitespace-nowrap font-bold text-clay`}>
            {formatDiscount(discountPercentage)}% off
          </span>
        )}
      </div>
      {hasDiscount && (
        <p className="mt-1 text-xs text-slate">
          List price: <s className="amount">{formatPrice(list)}</s>
        </p>
      )}
    </div>
  );
}
