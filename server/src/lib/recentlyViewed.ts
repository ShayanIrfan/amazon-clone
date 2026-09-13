import { UserModel } from "../models/index.js";

const MAX_ENTRIES = 20;

// Fire-and-forget from the product-detail route — a slow or failed write
// here should never delay or break loading the product itself.
export async function recordView(userId: string, productId: string) {
  try {
    // $pull and $push on the same array path aren't allowed in one update,
    // so de-duplicate first, then push the fresh entry to the front.
    await UserModel.updateOne({ _id: userId }, { $pull: { recentlyViewed: { product: productId } } });
    await UserModel.updateOne(
      { _id: userId },
      { $push: { recentlyViewed: { $each: [{ product: productId, viewedAt: new Date() }], $position: 0, $slice: MAX_ENTRIES } } },
    );
  } catch (err) {
    console.error("[recentlyViewed] failed to record view", err);
  }
}
