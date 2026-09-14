export interface CartItem {
  productId: string;
  quantity: number;
  savedForLater: boolean;
  addedAt: number;
}

const KEY = "amazon-clone:cart:v1";
const MERGE_KEY = "amazon-clone:cart-merge-key:v1";

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

export function getCartMergeKey(): string {
  try {
    const existing = localStorage.getItem(MERGE_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(MERGE_KEY, created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function clearCartMergeKey() {
  try {
    localStorage.removeItem(MERGE_KEY);
  } catch {
    // best-effort only
  }
}
