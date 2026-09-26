import type { OrderQuote } from "../../lib/types";
import { formatPrice } from "../../lib/format";

export default function OrderSummary({ quote, isLoading }: { quote: OrderQuote | undefined; isLoading: boolean }) {
  return (
    <div className="surface h-fit rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink">Order summary</h2>
      {isLoading || !quote ? (
        <p className="mt-4 text-sm text-slate">Calculating…</p>
      ) : (
        <dl className="mt-4 space-y-2.5 text-sm">
          <Row label={`Items (${quote.itemCount})`} value={formatPrice(quote.subtotal)} />
          <Row label="Delivery" value={quote.shipping === 0 ? "Free" : formatPrice(quote.shipping)} accent={quote.shipping === 0} />
          <Row label="Estimated tax" value={formatPrice(quote.tax)} />
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-bold text-ink">Order total</dt>
            <dd className="amount text-lg font-extrabold text-ink">{formatPrice(quote.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate">{label}</dt>
      <dd className={`amount font-semibold ${accent ? "text-moss" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
