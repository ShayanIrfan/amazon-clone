import type { Category, ProductListResponse, Product, ReviewListResponse, ReviewSort } from "./types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
  reviews: (id: string, opts: { sort?: ReviewSort; star?: number; page?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.star) params.set("star", String(opts.star));
    if (opts.page) params.set("page", String(opts.page));
    const qs = params.toString();
    return get<ReviewListResponse>(`/products/${id}/reviews${qs ? `?${qs}` : ""}`);
  },
};
