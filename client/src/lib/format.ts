export function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDiscount(discountPercentage: number): string {
  return discountPercentage.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// DummyJSON's discountPercentage is applied to `price` to get the current
// price, so the pre-discount "list price" is derived, not stored.
export function listPrice(price: number, discountPercentage: number): number {
  if (!discountPercentage) return price;
  return price / (1 - discountPercentage / 100);
}

export function estimatedDelivery(daysFromNow = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
