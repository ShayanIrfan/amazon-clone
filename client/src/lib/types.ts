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
  /** Set once an admin archives the product: still viewable by link, but not for sale. */
  archivedAt?: string;
  /** Only present when the request was authenticated (see GET /products/:id). */
  canReview?: { eligible: boolean; alreadyReviewed: boolean };
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
  isAdmin: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
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

export type PaymentProvider = "stripe" | "mock";

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
  /** Absent until a Stripe payment succeeds. */
  payment?: { brand?: string; last4?: string };
  placedAt: string;
  /** Shipping and cancellation steps with who took them; older orders have none. */
  statusHistory?: StatusHistoryEntry[];
  /** Set once Stripe reports the payment refunded. */
  refund?: { amount: number; at: string };
  cancellationReason?: string;
}

export type StatusActor = "customer" | "admin" | "stripe" | "system";

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
  by: StatusActor;
}

export interface WishList {
  _id: string;
  name: string;
  items: { product: string; addedAt: string; _id: string }[];
}

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
}

export type AuditEntityType = "product" | "order" | "review" | "user" | "system";

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
}

export interface AdminProduct extends Product {
  createdAt: string;
  updatedAt: string;
  createdVia?: "seed" | "admin";
}

export type AdminProductStatus = "active" | "archived" | "all";
export type AdminProductSort = "updated" | "title" | "price_low" | "price_high" | "stock_low" | "stock_high";

export interface AdminProductList {
  items: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  totals: { active: number; archived: number };
  categories: { slug: string; name: string }[];
}

/** The editable fields, exactly what POST/PATCH /admin/products accept. */
export interface AdminProductInput {
  title: string;
  description: string;
  category: string;
  brand?: string;
  price: number;
  discountPercentage?: number;
  stock: number;
  sku?: string;
  tags?: string[];
  minimumOrderQuantity?: number;
  warrantyInformation?: string;
  shippingInformation?: string;
  returnPolicy?: string;
  images: string[];
}

export type AdminOrderStatusFilter = OrderStatus | "all";

export interface AdminOrderRow {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  placedAt: string;
  thumbnails: string[];
  firstItemTitle: string;
  extraItems: number;
  refunded: boolean;
  customer: { id: string; name: string; email: string } | null;
}

export interface AdminOrderList {
  items: AdminOrderRow[];
  total: number;
  page: number;
  limit: number;
  counts: Record<OrderStatus, number>;
}

export interface AdminOrderDetail {
  order: Order & { orderNumber: string; paymentIntentId?: string };
  customer: { id: string; name: string; email: string; orderCount: number; joinedAt: string | null } | null;
}
