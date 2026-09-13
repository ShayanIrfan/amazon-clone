export interface CartItem {
  productId: string;
  quantity: number;
  savedForLater: boolean;
  addedAt: number;
}

const KEY = "amazon-clone:cart:v1";

// localStorage can throw (private browsing, quota, blocked site data) or
// simply not persist — callers must keep working with an empty cart either way.
export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        i && typeof i.productId === "string" && typeof i.quantity === "number" && i.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // best-effort only
  }
}
