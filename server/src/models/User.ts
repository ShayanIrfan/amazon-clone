import { Schema, model, Types } from "mongoose";
import type { InferSchemaType } from "mongoose";

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    unit: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true, default: "United States" },
    isDefault: { type: Boolean, default: false },
    deliveryInstructions: String,
  },
  { _id: true },
);

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    savedForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
    addresses: { type: [addressSchema], default: [] },
    cart: { type: [cartItemSchema], default: [] },
    recentlyViewed: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          viewedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type UserAddress = InferSchemaType<typeof addressSchema> & { _id: Types.ObjectId };
export type CartItem = InferSchemaType<typeof cartItemSchema> & { _id: Types.ObjectId };
export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
