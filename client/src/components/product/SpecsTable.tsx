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
          <tr key={label} className="border-b border-neutral-100 odd:bg-neutral-50">
            <th scope="row" className="w-1/3 px-3 py-2 text-left font-medium text-neutral-600">
              {label}
            </th>
            <td className="px-3 py-2 text-neutral-800">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
