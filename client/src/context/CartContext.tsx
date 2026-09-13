import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { loadCart, saveCart, type CartItem } from "../lib/cartStorage";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

type Action =
  | { type: "REPLACE"; items: CartItem[] }
  | { type: "ADD"; productId: string; quantity: number }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_SAVED"; productId: string; savedForLater: boolean };

function reducer(items: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "REPLACE":
      return action.items;
    case "ADD": {
      const existing = items.find((i) => i.productId === action.productId);
      if (existing) {
        // Re-adding a saved-for-later item moves it back into the cart, matching
        // the recon'd "Move to cart" behavior rather than leaving it stranded.
        return items.map((i) =>
          i.productId === action.productId
            ? { ...i, quantity: i.quantity + action.quantity, savedForLater: false }
            : i,
        );
      }
      return [...items, { productId: action.productId, quantity: action.quantity, savedForLater: false, addedAt: Date.now() }];
    }
    case "SET_QUANTITY":
      return items.map((i) => (i.productId === action.productId ? { ...i, quantity: action.quantity } : i));
    case "REMOVE":
      return items.filter((i) => i.productId !== action.productId);
    case "SET_SAVED":
      return items.map((i) =>
        i.productId === action.productId ? { ...i, savedForLater: action.savedForLater } : i,
      );
    default:
      return items;
  }
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  /** Re-pulls the cart from the server. Needed after placing an order: the
   * server clears purchased items from the cart as part of that request,
   * but this context has no other way to find out its local copy is stale. */
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, dispatch] = useReducer(reducer, []);
  const mode = useRef<"guest" | "auth">("guest");
  // Persistence must not run before hydration has set real data — otherwise
  // the very first render's empty `items` gets written out and wipes
  // whatever was actually in localStorage (or the server) before it's read.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (user) {
      mode.current = "auth";
      api.cart
        .get()
        .then(({ items }) => {
          if (!cancelled) {
            dispatch({ type: "REPLACE", items });
            setHydrated(true);
          }
        })
        .catch(() => {
          if (!cancelled) setHydrated(true); // fail open with an empty cart rather than wedge the page
        });
    } else {
      mode.current = "guest";
      dispatch({ type: "REPLACE", items: loadCart() });
      setHydrated(true);
    }

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!hydrated) return;
    if (mode.current === "guest") saveCart(items);
    else api.cart.put(items).catch(() => {}); // best-effort; a failed sync just retries on the next change
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.filter((i) => !i.savedForLater).reduce((sum, i) => sum + i.quantity, 0),
      addItem: (productId, quantity = 1) => dispatch({ type: "ADD", productId, quantity }),
      setQuantity: (productId, quantity) => dispatch({ type: "SET_QUANTITY", productId, quantity }),
      removeItem: (productId) => dispatch({ type: "REMOVE", productId }),
      saveForLater: (productId) => dispatch({ type: "SET_SAVED", productId, savedForLater: true }),
      moveToCart: (productId) => dispatch({ type: "SET_SAVED", productId, savedForLater: false }),
      refresh: async () => {
        if (mode.current !== "auth") return; // guest cart is already this browser's live copy
        const { items } = await api.cart.get();
        dispatch({ type: "REPLACE", items });
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
