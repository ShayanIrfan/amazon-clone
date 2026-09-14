import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { clearCartMergeKey, getCartMergeKey, loadCart, saveCart } from "../lib/cartStorage";
import type { AuthUser } from "../lib/types";
import type { AuthChallengeResponse } from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthChallengeResponse>;
  signup: (name: string, email: string, password: string) => Promise<{ verificationRequired: true; email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyLogin: (email: string, code: string) => Promise<void>;
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
  async function withGuestCartMerge<T>(action: (guestCart: ReturnType<typeof loadCart>, mergeKey: string) => Promise<T>) {
    const guestCart = loadCart();
    const result = await action(guestCart, getCartMergeKey());
    if (typeof result === "object" && result !== null && "user" in result && result.user) {
      saveCart([]);
      clearCartMergeKey();
      setUser(result.user as AuthUser);
    }
    return result;
  }

  const value: AuthContextValue = {
    user,
    isLoading,
    login: (email, password) => withGuestCartMerge((guestCart, mergeKey) => api.auth.login({ email, password, guestCart, mergeKey })),
    signup: (name, email, password) =>
      api.auth.signup({ name, email, password, guestCart: loadCart(), mergeKey: getCartMergeKey() }),
    verifyEmail: (email, code) =>
      withGuestCartMerge(async (guestCart, mergeKey) => api.auth.verifyEmail({ email, code, guestCart, mergeKey })).then(() => undefined),
    resendVerification: (email) => api.auth.resendVerification(email).then(() => undefined),
    verifyLogin: (email, code) =>
      withGuestCartMerge(async (guestCart, mergeKey) => api.auth.verifyLogin({ email, code, guestCart, mergeKey })).then(() => undefined),
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
