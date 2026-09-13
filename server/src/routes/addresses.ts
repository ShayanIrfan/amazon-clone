import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { UserModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

export const addressesRouter = Router();
addressesRouter.use(requireAuth);

const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a full name"),
  phone: z.string().trim().min(1, "Enter a phone number"),
  street: z.string().trim().min(1, "Enter a street address"),
  unit: z.string().trim().optional(),
  city: z.string().trim().min(1, "Enter a city"),
  state: z.string().trim().min(1, "Enter a state"),
  zip: z.string().trim().min(1, "Enter a ZIP code"),
  country: z.string().trim().min(1).default("United States"),
  deliveryInstructions: z.string().trim().optional(),
  isDefault: z.boolean().optional().default(false),
});

addressesRouter.get("/", async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("addresses").lean();
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({ items: user.addresses });
  } catch (err) {
    next(err);
  }
});

addressesRouter.post("/", async (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    // The first address is always the default, regardless of what was asked for.
    const makeDefault = data.isDefault || user.addresses.length === 0;
    if (makeDefault) for (const a of user.addresses) a.isDefault = false;

    user.addresses.push({ ...data, isDefault: makeDefault });
    await user.save();

    res.status(201).json({ items: user.addresses });
  } catch (err) {
    next(err);
  }
});

addressesRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "Address not found" });
      return;
    }
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
      res.status(404).json({ error: "Address not found" });
      return;
    }
    const wasDefault = address.isDefault;
    address.deleteOne();

    // Never leave a non-empty address book with no default.
    if (wasDefault && user.addresses.length > 0) user.addresses[0]!.isDefault = true;
    await user.save();

    res.json({ items: user.addresses });
  } catch (err) {
    next(err);
  }
});

addressesRouter.post("/:id/default", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "Address not found" });
      return;
    }
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    for (const a of user.addresses) a.isDefault = a._id.equals(address._id);
    await user.save();

    res.json({ items: user.addresses });
  } catch (err) {
    next(err);
  }
});
