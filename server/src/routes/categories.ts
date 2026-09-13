import { Router } from "express";
import { CategoryModel } from "../models/index.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort({ name: 1 }).lean();
    res.json({ items: categories });
  } catch (err) {
    next(err);
  }
});
