import { Types } from "mongoose";
import { ProductModel, ReviewModel, OrderModel } from "../models/index.js";

// Recomputes a product's cached rating/ratingCount from its actual reviews.
// Called after every review write so ProductCard, search results, etc. never
// drift from what the reviews collection actually says.
export async function recalcProductRating(productId: Types.ObjectId) {
  const [agg] = await ReviewModel.aggregate<{ _id: null; avg: number; count: number }>([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await ProductModel.updateOne(
    { _id: productId },
    { rating: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count ?? 0 },
  );
}

// A review is only allowed on something you've actually bought (any order
// that isn't cancelled — "paid" is enough, it needn't have shipped).
export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const order = await OrderModel.exists({ user: userId, status: { $ne: "cancelled" }, "items.product": productId });
  return !!order;
}
