import { useQuery } from "@tanstack/react-query";
import { api, type ProductQuery } from "../lib/api";
import type { Category, Product } from "../lib/types";

export interface HomeData {
  dealsOfTheDay: Product[];
  bestSellers: Product[];
  topRated: Product[];
  newArrivals: Product[];
  categories: Category[];
}

export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const res = await fetch("/api/home", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load home page");
      return res.json() as Promise<HomeData>;
    },
    staleTime: 60_000,
  });
}

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => api.products(query),
    placeholderData: (prev) => prev,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: api.categories, staleTime: 5 * 60_000 });
}

export function useSuggestions(q: string) {
  return useQuery({
    queryKey: ["suggestions", q],
    queryFn: () => api.suggestions(q),
    enabled: q.trim().length > 1,
    staleTime: 60_000,
  });
}
