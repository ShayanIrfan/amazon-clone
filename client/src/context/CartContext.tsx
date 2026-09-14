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

type ShopperAction = Exclude<Action, { type: "REPLACE" }>;

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
  /** True until the server holds exactly `items` (signed in), or until the
   * cart has loaded at all. Anything that reads the cart server-side — the
   * checkout quote, placing an order — must wait for this to turn false. */
  syncing: boolean;
  /** Bumps whenever the server-side cart may have changed; key server reads on it. */
  version: number;
  /** Resolves once every queued server write has finished. */
  flush: () => Promise<void>;
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
  const hydratedRef = useRef(false);
  // Cart changes made before the cart has loaded (e.g. "Buy Now" clicked right
  // after opening a product link) are replayed on top of the loaded cart
  // instead of being overwritten by it.
  const queuedActions = useRef<ShopperAction[]>([]);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [version, setVersion] = useState(0);
  // Serialized form of what the server was last told (or last returned), so
  // hydration and refresh() don't echo the same cart straight back, and a
  // render can tell whether local changes still need to reach the server.
  const lastSynced = useRef<string | null>(null);
  // Writes are chained, not fired concurrently: the PUT replaces the whole
  // cart, so two in flight could land out of order and leave the older one.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    hydratedRef.current = false;
    setHydrated(false);

    function finishHydration(loaded: CartItem[]) {
      dispatch({ type: "REPLACE", items: loaded });
      for (const action of queuedActions.current) dispatch(action);
      queuedActions.current = [];
      hydratedRef.current = true;
      setHydrated(true);
      setVersion((v) => v + 1);
    }

    if (user) {
      mode.current = "auth";
      api.cart
        .get()
        .then(({ items }) => {
          if (cancelled) return;
          lastSynced.current = JSON.stringify(items);
          finishHydration(items);
        })
        .catch(() => {
          if (cancelled) return;
          // Fail open with an empty cart rather than wedge the page, but don't
          // treat that empty cart as the server's copy.
          lastSynced.current = null;
          finishHydration([]);
        });
    } else {
      mode.current = "guest";
      lastSynced.current = null;
      finishHydration(loadCart());
    }

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!hydrated) return;
    if (mode.current === "guest") {
      saveCart(items);
      return;
    }

    const serialized = JSON.stringify(items);
    if (serialized === lastSynced.current) return;
    lastSynced.current = serialized;

    setPendingWrites((n) => n + 1);
    writeChain.current = writeChain.current
      .then(() => api.cart.put(items))
      .then(
        () => undefined,
        () => {
          // Let the next change (or a later render) retry instead of assuming the server has it.
          if (lastSynced.current === serialized) lastSynced.current = null;
        },
      )
      .finally(() => {
        setPendingWrites((n) => n - 1);
        setVersion((v) => v + 1);
      });
  }, [items, hydrated]);

  const unsyncedChanges = mode.current === "auth" && hydrated && JSON.stringify(items) !== lastSynced.current;
  const syncing = !hydrated || pendingWrites > 0 || unsyncedChanges;

  const value = useMemo<CartContextValue>(() => {
    const apply = (action: ShopperAction) => {
      if (!hydratedRef.current) queuedActions.current.push(action);
      dispatch(action); // applied right away too, so the header count reacts instantly
    };
    return {
      items,
      itemCount: items.filter((i) => !i.savedForLater).reduce((sum, i) => sum + i.quantity, 0),
      addItem: (productId, quantity = 1) => apply({ type: "ADD", productId, quantity }),
      setQuantity: (productId, quantity) => apply({ type: "SET_QUANTITY", productId, quantity }),
      removeItem: (productId) => apply({ type: "REMOVE", productId }),
      saveForLater: (productId) => apply({ type: "SET_SAVED", productId, savedForLater: true }),
      moveToCart: (productId) => apply({ type: "SET_SAVED", productId, savedForLater: false }),
      refresh: async () => {
        if (mode.current !== "auth") return; // guest cart is already this browser's live copy
        await writeChain.current;
        const { items } = await api.cart.get();
        lastSynced.current = JSON.stringify(items);
        dispatch({ type: "REPLACE", items });
        setVersion((v) => v + 1);
      },
      syncing,
      version,
      flush: () => writeChain.current,
    };
  }, [items, syncing, version]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
