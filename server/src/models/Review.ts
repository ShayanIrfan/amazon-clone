import { Schema, model, Types } from "mongoose";
import type { InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" }, // absent for seeded DummyJSON reviews
    reviewerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type Review = InferSchemaType<typeof reviewSchema> & { _id: Types.ObjectId };
export const ReviewModel = model("Review", reviewSchema);
