import { Router } from "express";
import { ProductModel, CategoryModel } from "../models/index.js";
import { ACTIVE_PRODUCT } from "../lib/catalog.js";

export const homeRouter = Router();

const ROW_SIZE = 10;
const DEPARTMENT_TILES = 12;

homeRouter.get("/", async (_req, res, next) => {
  try {
    const [dealsOfTheDay, bestSellers, topRated, newArrivals, categories, totalProducts, totalCategories] = await Promise.all([
      ProductModel.find({ ...ACTIVE_PRODUCT, discountPercentage: { $gt: 0 } }).sort({ discountPercentage: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find(ACTIVE_PRODUCT).sort({ ratingCount: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find({ ...ACTIVE_PRODUCT, ratingCount: { $gt: 0 } }).sort({ rating: -1, ratingCount: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find(ACTIVE_PRODUCT).sort({ createdAt: -1 }).limit(ROW_SIZE).lean(),
      CategoryModel.find().sort({ productCount: -1, name: 1 }).limit(DEPARTMENT_TILES).lean(),
      ProductModel.countDocuments(ACTIVE_PRODUCT),
      CategoryModel.countDocuments(),
    ]);

    // One representative picture per department tile: its best-rated product that's in stock.
    const pictures = await ProductModel.aggregate<{ _id: string; thumbnail: string }>([
      { $match: { ...ACTIVE_PRODUCT, category: { $in: categories.map((c) => c.slug) }, stock: { $gt: 0 } } },
      { $sort: { rating: -1, ratingCount: -1 } },
      { $group: { _id: "$category", thumbnail: { $first: "$thumbnail" } } },
    ]);
    const pictureBySlug = new Map(pictures.map((p) => [p._id, p.thumbnail]));

    res.json({
      dealsOfTheDay,
      bestSellers,
      topRated,
      newArrivals,
      categories: categories.map((c) => ({ ...c, thumbnail: pictureBySlug.get(c.slug) ?? null })),
      totals: { products: totalProducts, categories: totalCategories },
    });
  } catch (err) {
    next(err);
  }
});
