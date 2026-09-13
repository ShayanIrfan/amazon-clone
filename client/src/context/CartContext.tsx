import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { loadCart, saveCart, type CartItem } from "../lib/cartStorage";

type Action =
  | { type: "ADD"; productId: string; quantity: number }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_SAVED"; productId: string; savedForLater: boolean };

function reducer(items: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
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
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadCart);

  useEffect(() => saveCart(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.filter((i) => !i.savedForLater).reduce((sum, i) => sum + i.quantity, 0),
      addItem: (productId, quantity = 1) => dispatch({ type: "ADD", productId, quantity }),
      setQuantity: (productId, quantity) => dispatch({ type: "SET_QUANTITY", productId, quantity }),
      removeItem: (productId) => dispatch({ type: "REMOVE", productId }),
      saveForLater: (productId) => dispatch({ type: "SET_SAVED", productId, savedForLater: true }),
      moveToCart: (productId) => dispatch({ type: "SET_SAVED", productId, savedForLater: false }),
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
