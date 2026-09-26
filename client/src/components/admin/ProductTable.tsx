import { Link } from "react-router";
import { ArchiveRestore, Archive, Pencil } from "lucide-react";
import type { AdminProduct } from "../../lib/types";
import { formatPrice } from "../../lib/format";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import InlineStockEditor from "./InlineStockEditor";

const departmentName = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  items: AdminProduct[];
  /** Id of the row whose archive/restore request is in flight. */
  busyId: string | null;
  onSetStock: (product: AdminProduct, stock: number) => Promise<unknown>;
  onToggleArchive: (product: AdminProduct) => void;
}

export default function ProductTable({ items, busyId, onSetStock, onToggleArchive }: Props) {
  return (
    // relative: the sr-only header cell is absolutely positioned, and without a positioned
    // ancestor it would escape this scroller and widen the whole page.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-line bg-paper text-xs text-slate">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Department</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Stock</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((product) => {
            const archived = !!product.archivedAt;
            const busy = busyId === product._id;
            return (
              <tr key={product._id} className={archived ? "bg-paper/60" : undefined}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-md border border-line bg-white object-contain"
                    />
                    <div className="min-w-0">
                      <Link to={`/admin/products/${product._id}`} className="line-clamp-1 font-medium text-ink hover:text-harbor hover:underline">
                        {product.title}
                      </Link>
                      <p className="truncate text-xs text-slate">
                        {[product.brand, product.sku].filter(Boolean).join(" · ") || "No brand or SKU"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate">{departmentName(product.category)}</td>
                <td className="amount px-3 py-3 text-right">
                  {formatPrice(product.price)}
                  {product.discountPercentage > 0 && (
                    <span className="block text-xs text-clay">{Math.round(product.discountPercentage)}% off</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end">
                    <InlineStockEditor
                      productId={product._id}
                      stock={product.stock}
                      productTitle={product.title}
                      onSave={(stock) => onSetStock(product, stock)}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  {archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone="positive">Active</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/admin/products/${product._id}`}
                      aria-label={`Edit ${product.title}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-harbor hover:bg-paper"
                    >
                      <Pencil size={14} aria-hidden /> Edit
                    </Link>
                    <Button
                      variant="quiet"
                      size="sm"
                      loading={busy}
                      onClick={() => onToggleArchive(product)}
                      aria-label={`${archived ? "Restore" : "Archive"} ${product.title}`}
                    >
                      {archived ? <ArchiveRestore size={14} aria-hidden /> : <Archive size={14} aria-hidden />}
                      {archived ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
