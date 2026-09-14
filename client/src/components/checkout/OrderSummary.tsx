import type { OrderQuote } from "../../lib/types";
import { formatPrice } from "../../lib/format";

export default function OrderSummary({ quote, isLoading }: { quote: OrderQuote | undefined; isLoading: boolean }) {
  return (
    <div className="surface h-fit rounded-md p-5 lg:sticky lg:top-28">
      <h2 className="text-lg font-semibold text-ink">Order Summary</h2>
      {isLoading || !quote ? (
        <p className="mt-2 text-sm text-neutral-500">Calculating…</p>
      ) : (
        <dl className="amount mt-2 space-y-1 text-sm">
          <Row label={`Items (${quote.itemCount}):`} value={formatPrice(quote.subtotal)} />
          <Row label="Shipping:" value={quote.shipping === 0 ? "FREE" : formatPrice(quote.shipping)} />
          <Row label="Estimated tax:" value={formatPrice(quote.tax)} />
          <div className="my-2 border-t border-neutral-200" />
          <Row label="Order total:" value={formatPrice(quote.total)} bold className="text-clay" />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
