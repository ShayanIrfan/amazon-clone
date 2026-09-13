import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { loadCart, saveCart, type CartItem } from "../lib/cartStorage";
import type { AuthUser } from "../lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  // Snapshots the guest cart, sends it along so the server can merge it into
  // the account's own cart, then retires the local copy — CartContext reacts
  // to `user` changing and takes over from the server cart from here.
  async function withGuestCartMerge(action: (guestCart: CartItem[]) => Promise<{ user: AuthUser }>) {
    const guestCart = loadCart();
    const { user: signedInUser } = await action(guestCart);
    saveCart([]);
    setUser(signedInUser);
  }

  const value: AuthContextValue = {
    user,
    isLoading,
    login: (email, password) => withGuestCartMerge((guestCart) => api.auth.login({ email, password, guestCart })),
    signup: (name, email, password) =>
      withGuestCartMerge((guestCart) => api.auth.signup({ name, email, password, guestCart })),
    loginDemo: () => withGuestCartMerge((guestCart) => api.auth.demo({ guestCart })),
    logout: async () => {
      await api.auth.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
