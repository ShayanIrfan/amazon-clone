import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { ListModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

export const listsRouter = Router();
listsRouter.use(requireAuth);

async function allLists(userId: string) {
  return ListModel.find({ owner: userId }).sort({ createdAt: 1 }).lean();
}

listsRouter.get("/", async (req, res, next) => {
  try {
    res.json({ items: await allLists(req.userId!) });
  } catch (err) {
    next(err);
  }
});

const nameSchema = z.object({ name: z.string().trim().min(1, "Name your list").max(100) });

listsRouter.post("/", async (req, res, next) => {
  try {
    const { name } = nameSchema.parse(req.body);
    await ListModel.create({ owner: req.userId, name, items: [] });
    res.status(201).json({ items: await allLists(req.userId!) });
  } catch (err) {
    next(err);
  }
});

listsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    const result = await ListModel.deleteOne({ _id: req.params.id, owner: req.userId });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    res.json({ items: await allLists(req.userId!) });
  } catch (err) {
    next(err);
  }
});

const productIdSchema = z.object({ productId: z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid product id") });

listsRouter.post("/:id/items", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    const { productId } = productIdSchema.parse(req.body);

    const list = await ListModel.findOne({ _id: req.params.id, owner: req.userId });
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    if (!list.items.some((i) => i.product.toString() === productId)) {
      list.items.push({ product: new Types.ObjectId(productId), addedAt: new Date() });
      await list.save();
    }
    res.json({ items: await allLists(req.userId!) });
  } catch (err) {
    next(err);
  }
});

listsRouter.delete("/:id/items/:productId", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    const result = await ListModel.updateOne(
      { _id: req.params.id, owner: req.userId },
      { $pull: { items: { product: req.params.productId } } },
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ error: "List not found" });
      return;
    }
    res.json({ items: await allLists(req.userId!) });
  } catch (err) {
    next(err);
  }
});
