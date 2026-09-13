import { Router } from "express";
import { Types } from "mongoose";
import { UserModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/recently-viewed", async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("recentlyViewed").lean();
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({
      items: user.recentlyViewed.map((v) => ({ productId: v.product.toString(), viewedAt: v.viewedAt.getTime() })),
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.delete("/recently-viewed/:productId", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $pull: { recentlyViewed: { product: req.params.productId } } },
      { new: true },
    ).select("recentlyViewed");
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({
      items: user.recentlyViewed.map((v) => ({ productId: v.product.toString(), viewedAt: v.viewedAt.getTime() })),
    });
  } catch (err) {
    next(err);
  }
});
