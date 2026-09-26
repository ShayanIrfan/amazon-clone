import { Router, type Request } from "express";
import { z } from "zod";
import { ProductModel, ReviewModel } from "../../models/index.js";
import { parsePagination } from "../../lib/pagination.js";
import { escapeRegex } from "../../lib/catalog.js";
import { recordAudit } from "../../lib/admin.js";
import { recalcProductRating } from "../../lib/reviews.js";

export const adminReviewsRouter = Router();

const ID_PATTERN = /^[a-f0-9]{24}$/i;

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  productId: z.string().regex(ID_PATTERN, "Invalid product id").optional(),
});

adminReviewsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit ?? 20 });

    const filter: Record<string, unknown> = {};
    if (query.rating) filter.rating = query.rating;
    if (query.productId) filter.product = query.productId;
    if (query.q) {
      const re = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [{ comment: re }, { reviewerName: re }];
    }

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      ReviewModel.countDocuments(filter),
    ]);
    const products = await ProductModel.find({ _id: { $in: reviews.map((r) => r.product) } })
      .select("title thumbnail")
      .lean();
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    res.json({
      items: reviews.map((review) => {
        const product = productById.get(review.product.toString());
        return {
          _id: review._id.toString(),
          product: product ? { id: product._id.toString(), title: product.title, thumbnail: product.thumbnail ?? "" } : null,
          reviewerName: review.reviewerName,
          rating: review.rating,
          comment: review.comment,
          date: review.date,
          verifiedPurchase: !!review.verifiedPurchase,
          // Seeded reviews have no account behind them; ones written in the store do.
          hasAccount: !!review.user,
        };
      }),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

adminReviewsRouter.delete("/:id", async (req: Request, res, next) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    const review = await ReviewModel.findByIdAndDelete(id).lean();
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    // The product's cached average and count come from its reviews, so they must follow.
    await recalcProductRating(review.product);
    const product = await ProductModel.findById(review.product).select("title").lean();
    await recordAudit({
      actor: { id: req.admin!.id, email: req.admin!.email },
      action: "review.delete",
      entityType: "review",
      entityId: id,
      summary: `Deleted a ${review.rating}-star review by ${review.reviewerName} on "${product?.title ?? "a removed product"}"`,
      changes: { rating: review.rating, comment: review.comment.slice(0, 200), product: review.product.toString() },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
