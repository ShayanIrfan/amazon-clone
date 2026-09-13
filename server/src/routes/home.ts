import { Router } from "express";
import { ProductModel, CategoryModel } from "../models/index.js";

export const homeRouter = Router();

const ROW_SIZE = 10;

homeRouter.get("/", async (_req, res, next) => {
  try {
    const [dealsOfTheDay, bestSellers, topRated, newArrivals, categories] = await Promise.all([
      ProductModel.find({ discountPercentage: { $gt: 0 } }).sort({ discountPercentage: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find().sort({ ratingCount: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find({ ratingCount: { $gt: 0 } }).sort({ rating: -1, ratingCount: -1 }).limit(ROW_SIZE).lean(),
      ProductModel.find().sort({ createdAt: -1 }).limit(ROW_SIZE).lean(),
      CategoryModel.find().sort({ productCount: -1 }).limit(8).lean(),
    ]);

    res.json({ dealsOfTheDay, bestSellers, topRated, newArrivals, categories });
  } catch (err) {
    next(err);
  }
});
