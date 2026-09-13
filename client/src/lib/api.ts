import type { Category, ProductListResponse, Product, ReviewListResponse, ReviewSort, AuthUser } from "./types";
import type { CartItem } from "./cartStorage";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
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

  auth: {
    checkEmail: (email: string) => post<{ exists: boolean }>("/auth/check-email", { email }),
    signup: (data: { name: string; email: string; password: string; guestCart: CartItem[] }) =>
      post<{ user: AuthUser }>("/auth/signup", data),
    login: (data: { email: string; password: string; guestCart: CartItem[] }) =>
      post<{ user: AuthUser }>("/auth/login", data),
    demo: (data: { guestCart: CartItem[] }) => post<{ user: AuthUser }>("/auth/demo", data),
    logout: () => post<void>("/auth/logout"),
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
};
