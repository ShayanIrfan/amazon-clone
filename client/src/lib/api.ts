import type {
  Category,
  ProductListResponse,
  Product,
  ReviewListResponse,
  ReviewSort,
  AuthUser,
  Address,
  AddressInput,
  Order,
  OrderQuote,
  DeliverySpeed,
  CardInput,
  WishList,
  RecentlyViewedItem,
  Review,
  PaymentProvider,
} from "./types";
import type { CartItem } from "./cartStorage";

export type AuthSuccess = { user: AuthUser };
export type AuthChallengeResponse =
  | AuthSuccess
  | { verificationRequired: true; email: string }
  | { twoFactorRequired: true; email: string };

function readCsrfToken() {
  if (typeof document === "undefined") return null;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrf-token="))?.slice("csrf-token=".length) ?? null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.method && init.method !== "GET" && init.method !== "HEAD") {
    if (!readCsrfToken()) await fetch("/api/health", { credentials: "include" });
    const csrfToken = readCsrfToken();
    if (csrfToken) headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
  }
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error ?? `Request failed: ${res.status}`) as Error & { code?: string };
    error.code = body.code;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export interface ProductQuery {
  q?: string;
  category?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
}

function toSearchParams(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.brand?.length) params.set("brand", query.brand.join(","));
  if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  if (query.minRating != null) params.set("minRating", String(query.minRating));
  if (query.inStock) params.set("inStock", "1");
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  categories: () => get<{ items: Category[] }>("/categories"),
  products: (query: ProductQuery) => get<ProductListResponse>(`/products${toSearchParams(query)}`),
  product: (id: string) => get<Product>(`/products/${id}`),
  suggestions: (q: string) => get<{ items: string[] }>(`/products/suggestions?q=${encodeURIComponent(q)}`),
  relatedProducts: (id: string) => get<{ items: Product[] }>(`/products/${id}/related`),
  productsByIds: (ids: string[]) =>
    ids.length ? get<{ items: Product[] }>(`/products/bulk?ids=${ids.join(",")}`) : Promise.resolve({ items: [] }),
  reviews: (id: string, opts: { sort?: ReviewSort; star?: number; page?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.star) params.set("star", String(opts.star));
    if (opts.page) params.set("page", String(opts.page));
    const qs = params.toString();
    return get<ReviewListResponse>(`/products/${id}/reviews${qs ? `?${qs}` : ""}`);
  },
  writeReview: (id: string, data: { rating: number; comment: string }) =>
    post<{ review: Review }>(`/products/${id}/reviews`, data),

  auth: {
    signup: (data: { name: string; email: string; password: string; guestCart?: CartItem[]; mergeKey?: string }) =>
      post<{ verificationRequired: true; email: string }>("/auth/signup", data),
    verifyEmail: (data: { email: string; code: string; guestCart: CartItem[]; mergeKey: string }) =>
      post<AuthSuccess>("/auth/verify-email", data),
    resendVerification: (email: string) => post<{ ok: true }>("/auth/resend-verification", { email }),
    login: (data: { email: string; password: string; guestCart?: CartItem[]; mergeKey?: string }) =>
      post<AuthChallengeResponse>("/auth/login", data),
    verifyLogin: (data: { email: string; code: string; guestCart: CartItem[]; mergeKey: string }) =>
      post<AuthSuccess>("/auth/verify-login", data),
    resendLoginCode: (email: string) => post<{ ok: true }>("/auth/resend-login-code", { email }),
    forgotPassword: (email: string) => post<{ ok: true }>("/auth/forgot-password", { email }),
    resetPassword: (data: { email: string; code: string; password: string }) => post<{ ok: true }>("/auth/reset-password", data),
    logout: () => post<void>("/auth/logout"),
    logoutAll: () => post<void>("/auth/logout-all"),
    security: () => get<{ twoFactorEnabled: boolean; recoveryCodesRemaining: number }>("/auth/security"),
    requestTwoFactor: (password: string) => post<{ challengeSent: true }>("/auth/2fa/enable/request", { password }),
    confirmTwoFactor: (code: string) => post<{ twoFactorEnabled: true; recoveryCodes: string[] }>("/auth/2fa/enable/confirm", { code }),
    disableTwoFactor: (data: { password: string; recoveryCode: string }) => post<{ twoFactorEnabled: false }>("/auth/2fa/disable", data),
    // 401 (not signed in) is a normal state here, not an error to throw.
    me: async () => {
      try {
        const { user } = await get<{ user: AuthUser }>("/auth/me");
        return user;
      } catch {
        return null;
      }
    },
  },

  cart: {
    get: () => get<{ items: CartItem[] }>("/cart"),
    put: (items: CartItem[]) => put<{ items: CartItem[] }>("/cart", { items }),
  },

  addresses: {
    list: () => get<{ items: Address[] }>("/addresses"),
    add: (data: AddressInput) => post<{ items: Address[] }>("/addresses", data),
    remove: (id: string) => request<{ items: Address[] }>(`/addresses/${id}`, { method: "DELETE" }),
    setDefault: (id: string) => post<{ items: Address[] }>(`/addresses/${id}/default`),
  },

  orders: {
    quote: (deliverySpeed: DeliverySpeed) => get<OrderQuote>(`/orders/quote?deliverySpeed=${deliverySpeed}`),
    // With Stripe, omit `card`: the response carries a clientSecret for Stripe.js instead.
    place: (data: { addressId: string; deliverySpeed: DeliverySpeed; card?: CardInput }) =>
      post<{ order: Order; clientSecret?: string; provider: PaymentProvider }>("/orders", data),
    confirmPayment: (id: string) => post<{ order: Order; paymentStatus?: "processing" }>(`/orders/${id}/confirm-payment`),
    list: () => get<{ items: Order[] }>("/orders"),
    get: (id: string) => get<{ order: Order }>(`/orders/${id}`),
    cancel: (id: string) => post<{ order: Order }>(`/orders/${id}/cancel`),
  },

  payments: {
    config: () => get<{ provider: PaymentProvider }>("/payments/config"),
  },

  lists: {
    list: () => get<{ items: WishList[] }>("/lists"),
    create: (name: string) => post<{ items: WishList[] }>("/lists", { name }),
    remove: (id: string) => request<{ items: WishList[] }>(`/lists/${id}`, { method: "DELETE" }),
    addItem: (listId: string, productId: string) => post<{ items: WishList[] }>(`/lists/${listId}/items`, { productId }),
    removeItem: (listId: string, productId: string) =>
      request<{ items: WishList[] }>(`/lists/${listId}/items/${productId}`, { method: "DELETE" }),
  },

  users: {
    recentlyViewed: () => get<{ items: RecentlyViewedItem[] }>("/users/recently-viewed"),
    removeRecentlyViewed: (productId: string) =>
      request<{ items: RecentlyViewedItem[] }>(`/users/recently-viewed/${productId}`, { method: "DELETE" }),
  },
};
