import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { UserModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get("/", async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("cart").lean();
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({
      items: user.cart.map((c) => ({
        productId: c.product.toString(),
        quantity: c.quantity,
        savedForLater: c.savedForLater,
        addedAt: c.addedAt?.getTime() ?? Date.now(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

const cartItemSchema = z.object({
  productId: z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid product id"),
  quantity: z.number().int().positive(),
  savedForLater: z.boolean(),
  addedAt: z.number().optional(),
});
const putCartSchema = z.object({ items: z.array(cartItemSchema) });

// Replaces the whole cart rather than diffing individual line changes —
// simple, and correct at demo scale/traffic. Mirrors exactly what the guest
// cart already does against localStorage (client/src/lib/cartStorage.ts),
// which is what lets CartContext use the same reducer for both.
cartRouter.put("/", async (req, res, next) => {
  try {
    const { items } = putCartSchema.parse(req.body);

    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    // DocumentArray, not a plain array — splice-in-place is how Mongoose
    // wants a subdocument array replaced (a bare `user.cart = [...]`
    // assignment doesn't type-check against DocumentArray's own interface).
    user.cart.splice(
      0,
      user.cart.length,
      ...items.map((i) => ({
        product: new Types.ObjectId(i.productId),
        quantity: i.quantity,
        savedForLater: i.savedForLater,
        addedAt: i.addedAt ? new Date(i.addedAt) : new Date(),
      })),
    );
    await user.save();

    res.json({ items });
  } catch (err) {
    next(err);
  }
});
