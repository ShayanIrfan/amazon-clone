import { formatPrice } from "../../lib/format";

interface Day {
  date: string;
  orders: number;
  revenue: number;
}

const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Orders per day as plain bars. No chart library: the data is one series, and
 * this keeps the admin bundle small. The bars are a picture (role="img" with a
 * summary), and a visually hidden table carries the same numbers for screen readers.
 */
export default function OrdersChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.orders));
  const total = days.reduce((sum, d) => sum + d.orders, 0);
  const peak = days.reduce((best, d) => (d.orders > best.orders ? d : best), days[0]);
  const summary = total
    ? `Orders per day from ${label(days[0].date)} to ${label(days.at(-1)!.date)}: ${total} in total, busiest on ${label(peak.date)} with ${peak.orders}.`
    : `No orders from ${label(days[0].date)} to ${label(days.at(-1)!.date)}.`;

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="flex h-44 flex-col justify-between text-right text-xs text-slate" aria-hidden>
          <span className="amount">{max}</span>
          <span className="amount">0</span>
        </div>
        <div role="img" aria-label={summary} className="flex h-44 flex-1 items-end gap-px border-b border-line-strong">
          {days.map((day) => (
            <div key={day.date} className="group relative flex h-full flex-1 items-end" title={`${label(day.date)}: ${day.orders} ${day.orders === 1 ? "order" : "orders"}, ${formatPrice(day.revenue)}`}>
              <div
                className={`w-full rounded-t-sm transition-colors ${day.orders ? "bg-harbor group-hover:bg-harbor-dark" : "bg-line"}`}
                style={{ height: day.orders ? `${Math.max(4, (day.orders / max) * 100)}%` : "2px" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-8 text-xs text-slate" aria-hidden>
        <span>{label(days[0].date)}</span>
        <span>{label(days[Math.floor(days.length / 2)].date)}</span>
        <span>{label(days.at(-1)!.date)}</span>
      </div>
      <table className="sr-only">
        <caption>Orders per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Orders</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{label(day.date)}</th>
              <td>{day.orders}</td>
              <td>{formatPrice(day.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
