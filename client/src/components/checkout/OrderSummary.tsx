import type { OrderQuote } from "../../lib/types";
import { formatPrice } from "../../lib/format";

export default function OrderSummary({ quote, isLoading }: { quote: OrderQuote | undefined; isLoading: boolean }) {
  return (
    <div className="h-fit rounded-lg border border-neutral-200 p-4">
      <h2 className="font-bold text-neutral-900">Order Summary</h2>
      {isLoading || !quote ? (
        <p className="mt-2 text-sm text-neutral-500">Calculating…</p>
      ) : (
        <dl className="mt-2 space-y-1 text-sm">
          <Row label={`Items (${quote.itemCount}):`} value={formatPrice(quote.subtotal)} />
          <Row label="Shipping:" value={quote.shipping === 0 ? "FREE" : formatPrice(quote.shipping)} />
          <Row label="Estimated tax:" value={formatPrice(quote.tax)} />
          <div className="my-2 border-t border-neutral-200" />
          <Row label="Order total:" value={formatPrice(quote.total)} bold className="text-amazon-red" />
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
