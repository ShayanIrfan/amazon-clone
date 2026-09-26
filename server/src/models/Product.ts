import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

const dimensionsSchema = new Schema(
  { width: Number, height: Number, depth: Number },
  { _id: false },
);

const productSchema = new Schema(
  {
    // DummyJSON's numeric id, kept as our stable slug-free lookup key
    sourceId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    stock: { type: Number, required: true },
    tags: { type: [String], default: [] },
    brand: { type: String, default: "" },
    sku: { type: String, default: "" },
    weight: Number,
    dimensions: dimensionsSchema,
    warrantyInformation: String,
    shippingInformation: String,
    availabilityStatus: String,
    returnPolicy: String,
    minimumOrderQuantity: { type: Number, default: 1 },
    images: { type: [String], default: [] },
    thumbnail: String,
    // Soft delete: archived products vanish from the storefront but stay in
    // order history and can be restored. Absent means active.
    archivedAt: { type: Date },
    // Seeded products can only be archived; only admin-created ones (that were
    // never ordered) can be deleted for good. Absent means seeded.
    createdVia: { type: String, enum: ["seed", "admin"], default: "seed" },
  },
  { timestamps: true },
);

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model("Product", productSchema);
