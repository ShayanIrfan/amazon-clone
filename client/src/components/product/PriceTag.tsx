import { formatPrice, listPrice } from "../../lib/format";

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
    <div className="flex items-baseline gap-2">
      <span className={size === "lg" ? "text-2xl font-medium" : "text-lg font-medium"}>
        {hasDiscount && <sup className="text-xs align-super">-{Math.round(discountPercentage)}%</sup>}
        <span className="ml-0.5">
          <sup className="text-[0.6em] align-super mr-px">$</sup>
          {dollars}
          <sup className="text-[0.6em] align-super ml-px">{cents}</sup>
        </span>
      </span>
      {hasDiscount && (
        <span className="text-xs text-neutral-500">List: {formatPrice(list)}</span>
      )}
    </div>
  );
}
