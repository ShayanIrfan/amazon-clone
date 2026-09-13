import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    image: String,
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Category = InferSchemaType<typeof categorySchema>;
export const CategoryModel = model("Category", categorySchema);
