import type { Product } from "../../lib/types";

export default function SpecsTable({ product }: { product: Product }) {
  const rows: [string, string][] = [
    ["Brand", product.brand || "—"],
    ["Category", product.category],
    ["SKU", product.sku || "—"],
    ...(product.weight ? ([["Weight", `${product.weight} oz`]] as [string, string][]) : []),
    ...(product.dimensions
      ? ([
          [
            "Dimensions",
            `${product.dimensions.width} x ${product.dimensions.height} x ${product.dimensions.depth} inches`,
          ],
        ] as [string, string][])
      : []),
    ...(product.warrantyInformation ? ([["Warranty", product.warrantyInformation]] as [string, string][]) : []),
    ...(product.shippingInformation ? ([["Shipping", product.shippingInformation]] as [string, string][]) : []),
    ...(product.returnPolicy ? ([["Return Policy", product.returnPolicy]] as [string, string][]) : []),
    ...(product.minimumOrderQuantity && product.minimumOrderQuantity > 1
      ? ([["Minimum Order Quantity", String(product.minimumOrderQuantity)]] as [string, string][])
      : []),
  ];

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-t border-line first:border-t-0">
            <th scope="row" className="w-1/3 py-3 pr-4 text-left align-top font-semibold text-slate">
              {label}
            </th>
            <td className="py-3 text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
