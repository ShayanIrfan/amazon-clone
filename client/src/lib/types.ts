export interface Product {
  _id: string;
  sourceId: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  ratingCount: number;
  stock: number;
  tags: string[];
  brand: string;
  sku: string;
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  returnPolicy?: string;
  images: string[];
  thumbnail: string;
}

export interface Category {
  slug: string;
  name: string;
  productCount: number;
}

export interface Facets {
  brands: { name: string; count: number }[];
  priceRange: { min: number; max: number } | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  facets: Facets;
}

export type SortOption = "featured" | "price_low" | "price_high" | "rating" | "newest" | "bestseller";
