import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

// Snapshot of the product at purchase time, so a later price/title change on
// Product never rewrites history for an existing order.
const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    thumbnail: String,
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

const orderAddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    unit: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "cancelled",
  "shipped",
  "delivered",
] as const;

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: orderAddressSchema, required: true },
    deliverySpeed: { type: String, enum: ["standard", "expedited"], default: "standard" },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending_payment", index: true },
    paymentIntentId: { type: String, index: true }, // Stripe "pi_..." id, or a "mock_..." reference
    // Display only — never card numbers. Absent until a Stripe payment succeeds.
    payment: { brand: String, last4: String },
    cancellationReason: {
      type: String,
      enum: ["cancelled_by_customer", "out_of_stock", "superseded", "payment_setup_failed"],
    },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model("Order", orderSchema);
