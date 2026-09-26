import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useAdminCustomer } from "../../hooks/useAdmin";
import { formatPrice } from "../../lib/format";
import AdminOrderStatusBadge from "../../components/admin/AdminOrderStatusBadge";
import Badge from "../../components/ui/Badge";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import Panel from "../../components/ui/Panel";

const formatDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAdminCustomer(id);

  if (detail.isLoading) return <PageLoader label="Loading customer" />;
  if (detail.isError || !detail.data) {
    return <ErrorState message="Customer not found." detail="The account may have been removed." onRetry={() => detail.refetch()} />;
  }
  const { customer, recentOrders } = detail.data;

  const facts: [string, string][] = [
    ["Orders", String(customer.orders)],
    ["Spent", formatPrice(customer.spent)],
    ["Last order", customer.lastOrderAt ? formatDay(customer.lastOrderAt) : "None yet"],
    ["Joined", formatDay(customer.joinedAt)],
  ];

  return (
    <div>
      <Link to="/admin/customers" className="inline-flex items-center gap-1 text-sm font-medium text-harbor hover:underline">
        <ChevronLeft size={16} aria-hidden /> Customers
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="page-title text-ink">{customer.name}</h1>
        {customer.isAdmin && <Badge tone="info">Admin</Badge>}
        {customer.isDemo && <Badge tone="neutral">Demo account</Badge>}
      </div>
      <p className="muted mt-1 break-all">{customer.email}</p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map(([label, value]) => (
          <Panel key={label} className="p-4">
            <dt className="text-sm text-slate">{label}</dt>
            <dd className="amount mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">{value}</dd>
          </Panel>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold text-ink">Recent orders</h2>
            {customer.orders > recentOrders.length && (
              <Link to={`/admin/orders?q=${encodeURIComponent(customer.email)}`} className="text-sm font-medium text-harbor hover:underline">
                See all {customer.orders}
              </Link>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate">This customer hasn't placed an order yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs text-slate">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Order</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Placed</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Items</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${order._id}`} className="amount font-medium text-ink hover:text-harbor hover:underline">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate">{formatDay(order.placedAt)}</td>
                      <td className="amount px-3 py-3 text-right">{order.itemCount}</td>
                      <td className="amount px-3 py-3 text-right">
                        {formatPrice(order.total)}
                        {order.refunded && <span className="block text-xs text-clay">Refunded</span>}
                      </td>
                      <td className="px-4 py-3">
                        <AdminOrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="h-fit space-y-3 p-4 text-sm">
          <h2 className="text-lg font-semibold text-ink">Account</h2>
          <div className="flex items-center justify-between">
            <span className="text-slate">Email</span>
            {customer.emailVerified ? <Badge tone="positive">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate">Two-step sign-in</span>
            {customer.twoFactorEnabled ? <Badge tone="positive">On</Badge> : <Badge tone="neutral">Off</Badge>}
          </div>
          <p className="border-t border-line pt-3 text-xs text-slate">
            Admins can see who bought what, but not passwords, sessions, recovery codes or saved addresses.
          </p>
        </Panel>
      </div>
    </div>
  );
}
