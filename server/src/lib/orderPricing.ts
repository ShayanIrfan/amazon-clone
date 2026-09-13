import type { HydratedDocument } from "mongoose";
import { ProductModel, type User, type Product } from "../models/index.js";

export const SHIPPING_RATES = { standard: 0, expedited: 9.99 } as const;
export type DeliverySpeed = keyof typeof SHIPPING_RATES;
export const TAX_RATE = 0.08;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function computeTotals(subtotal: number, deliverySpeed: DeliverySpeed): OrderTotals {
  const shipping = SHIPPING_RATES[deliverySpeed];
  const tax = round2((subtotal + shipping) * TAX_RATE);
  return { subtotal: round2(subtotal), shipping, tax, total: round2(subtotal + shipping + tax) };
}

// The items a checkout (quote or actual order placement) acts on: the cart's
// non-saved-for-later lines, resolved against current product data. Shared
// by both GET /orders/quote and POST /orders so they can never compute a
// different total for the same cart.
export async function loadActiveCartItems(user: HydratedDocument<User>) {
  const activeItems = user.cart.filter((c) => !c.savedForLater);
  const products = await ProductModel.find({ _id: { $in: activeItems.map((c) => c.product) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));
  return { activeItems, productById };
}

export interface StockShortfall {
  productId: string;
  title: string;
  requested: number;
  available: number;
}

// Fast, friendly pre-check before even touching payment — the transaction in
// routes/orders.ts still re-checks stock atomically at commit time, since
// this snapshot can go stale between the check and the actual purchase.
export function findStockShortfalls(
  activeItems: { product: { toString(): string }; quantity: number }[],
  productById: Map<string, HydratedDocument<Product>>,
): StockShortfall[] {
  const shortfalls: StockShortfall[] = [];
  for (const item of activeItems) {
    const product = productById.get(item.product.toString());
    if (!product || product.stock < item.quantity) {
      shortfalls.push({
        productId: item.product.toString(),
        title: product?.title ?? "This item",
        requested: item.quantity,
        available: product?.stock ?? 0,
      });
    }
  }
  return shortfalls;
}
