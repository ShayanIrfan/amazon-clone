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
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  images: string[];
  thumbnail: string;
}

export interface Review {
  _id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export type RatingBreakdown = Record<1 | 2 | 3 | 4 | 5, number>;

export interface ReviewListResponse {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  breakdown: RatingBreakdown;
}

export type ReviewSort = "recent" | "highest" | "lowest";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
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

export interface Address {
  _id: string;
  fullName: string;
  phone: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
  deliveryInstructions?: string;
}

export type AddressInput = Omit<Address, "_id" | "isDefault"> & { isDefault?: boolean };

export type DeliverySpeed = "standard" | "expedited";

export interface OrderQuote {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  shortfalls: { productId: string; title: string; requested: number; available: number }[];
}

export interface CardInput {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export interface OrderItem {
  product: string;
  title: string;
  thumbnail?: string;
  unitPrice: number;
  quantity: number;
}

export type OrderStatus = "pending_payment" | "paid" | "cancelled" | "shipped" | "delivered";

export interface Order {
  _id: string;
  items: OrderItem[];
  address: Omit<Address, "_id" | "isDefault" | "deliveryInstructions">;
  deliverySpeed: DeliverySpeed;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment: { brand: string; last4: string };
  placedAt: string;
}
