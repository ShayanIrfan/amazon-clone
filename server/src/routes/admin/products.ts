import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { UserModel, ProductModel, OrderModel, ReviewModel, ListModel } from "../../models/index.js";
import { parsePagination } from "../../lib/pagination.js";
import {
  ACTIVE_PRODUCT,
  availabilityFor,
  escapeRegex,
  slugifyCategory,
  syncCategoryCounts,
  titleCaseSlug,
} from "../../lib/catalog.js";
import { diffFields, recordAudit } from "../../lib/admin.js";

export const adminProductsRouter = Router();

const ID_PATTERN = /^[a-f0-9]{24}$/i;
const round2 = (n: number) => Math.round(n * 100) / 100;

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Each image must be a valid http(s) URL");

// No .default() anywhere in here: the update schema is this same object made
// partial, and a default would silently reset an omitted field on every PATCH.
// Creation applies its defaults in the handler instead.
const productFields = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  description: z.string().trim().min(1, "Enter a description").max(5000),
  category: z
    .string()
    .trim()
    .min(1, "Choose a department")
    .max(60)
    .transform(slugifyCategory)
    .refine((slug) => slug.length > 0, "Choose a department"),
  brand: z.string().trim().max(80).optional(),
  price: z.number("Enter a price").min(0.01, "Price must be at least $0.01").max(100_000, "Price can't exceed $100,000").transform(round2),
  discountPercentage: z.number().min(0, "Discount can't be negative").max(90, "Discount can't exceed 90%").transform(round2).optional(),
  stock: z.number("Enter a stock quantity").int("Stock must be a whole number").min(0, "Stock can't be negative").max(100_000),
  sku: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20, "Use at most 20 tags").optional(),
  minimumOrderQuantity: z.number().int().min(1).max(99).optional(),
  warrantyInformation: z.string().trim().max(200).optional(),
  shippingInformation: z.string().trim().max(200).optional(),
  returnPolicy: z.string().trim().max(200).optional(),
  images: z.array(imageUrl).min(1, "Add at least one image").max(10, "Use at most 10 images"),
});

const updateSchema = productFields.partial().extend({
  // The product's updatedAt as the editor last saw it. A mismatch means someone else saved first.
  expectedUpdatedAt: z.iso.datetime({ message: "expectedUpdatedAt is required" }),
});

const AUDITED_FIELDS = [
  "title",
  "description",
  "category",
  "brand",
  "price",
  "discountPercentage",
  "stock",
  "sku",
  "tags",
  "minimumOrderQuantity",
  "warrantyInformation",
  "shippingInformation",
  "returnPolicy",
  "images",
];

const SORTS = {
  updated: { updatedAt: -1, _id: -1 },
  title: { title: 1, _id: 1 },
  price_low: { price: 1, _id: 1 },
  price_high: { price: -1, _id: 1 },
  stock_low: { stock: 1, _id: 1 },
  stock_high: { stock: -1, _id: 1 },
} as const;

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  sort: z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]]).default("updated"),
});

function idParam(req: Request, res: Response) {
  const { id } = req.params;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return id;
}

const actorOf = (req: Request) => ({ id: req.admin!.id, email: req.admin!.email });

adminProductsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit ?? 20 });

    const filter: Record<string, unknown> = {};
    if (query.status === "active") Object.assign(filter, ACTIVE_PRODUCT);
    if (query.status === "archived") filter.archivedAt = { $exists: true };
    if (query.category) filter.category = query.category;
    if (query.q) {
      const re = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [{ title: re }, { brand: re }, { sku: re }, { category: re }];
    }

    const [items, total, active, archived, categorySlugs] = await Promise.all([
      ProductModel.find(filter).sort(SORTS[query.sort]).skip(skip).limit(limit).lean(),
      ProductModel.countDocuments(filter),
      ProductModel.countDocuments(ACTIVE_PRODUCT),
      ProductModel.countDocuments({ archivedAt: { $exists: true } }),
      ProductModel.distinct("category"),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totals: { active, archived },
      categories: (categorySlugs as string[])
        .sort()
        .map((slug) => ({ slug, name: titleCaseSlug(slug) })),
    });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const product = await ProductModel.findById(id).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    let deleteBlockedReason: string | null = null;
    if (product.createdVia !== "admin") {
      deleteBlockedReason = "Products from the original catalog can be archived but not deleted.";
    } else if (await OrderModel.exists({ "items.product": product._id })) {
      deleteBlockedReason = "This product appears in past orders, so it can be archived but not deleted.";
    }
    res.json({ product, deleteBlockedReason });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.post("/", async (req, res, next) => {
  try {
    const input = productFields.parse(req.body);

    // sourceId is required and unique (it was DummyJSON's id). Take the next
    // number, retrying if another admin request grabbed it first.
    let product;
    for (let attempt = 0; attempt < 3 && !product; attempt++) {
      const last = await ProductModel.findOne().sort({ sourceId: -1 }).select("sourceId").lean();
      try {
        product = await ProductModel.create({
          ...input,
          brand: input.brand ?? "",
          sku: input.sku ?? "",
          tags: [...new Set(input.tags ?? [])],
          discountPercentage: input.discountPercentage ?? 0,
          minimumOrderQuantity: input.minimumOrderQuantity ?? 1,
          sourceId: (last?.sourceId ?? 0) + 1,
          thumbnail: input.images[0],
          availabilityStatus: availabilityFor(input.stock),
          rating: 0,
          ratingCount: 0,
          createdVia: "admin",
        });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000 || attempt === 2) throw err;
      }
    }
    if (!product) throw new Error("Couldn't allocate a product id");

    await syncCategoryCounts([product.category]);
    await recordAudit({
      actor: actorOf(req),
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      summary: `Created product "${product.title}"`,
    });
    res.status(201).json({ product: product.toObject() });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const { expectedUpdatedAt, ...changes } = updateSchema.parse(req.body);
    if (!Object.keys(changes).length) {
      res.status(400).json({ error: "Nothing to change" });
      return;
    }

    const before = await ProductModel.findById(id).lean();
    if (!before) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const set: Record<string, unknown> = { ...changes };
    if (changes.tags) set.tags = [...new Set(changes.tags)];
    if (changes.stock !== undefined) set.availabilityStatus = availabilityFor(changes.stock);
    if (changes.images) {
      // Keep the current thumbnail while it's still one of the images; otherwise use the first.
      set.thumbnail = before.thumbnail && changes.images.includes(before.thumbnail) ? before.thumbnail : changes.images[0];
    }

    // Compare-and-set on updatedAt: if anyone saved since this editor loaded
    // the product, nothing is written and the editor is told to reload.
    const after = await ProductModel.findOneAndUpdate(
      { _id: id, updatedAt: new Date(expectedUpdatedAt) },
      { $set: set },
      { returnDocument: "after" },
    ).lean();
    if (!after) {
      const current = await ProductModel.findById(id).lean();
      res.status(409).json({
        error: "This product was changed by someone else while you were editing. Reload it to see their changes.",
        code: "CONFLICT",
        product: current,
      });
      return;
    }

    if (changes.category && changes.category !== before.category) {
      await syncCategoryCounts([before.category, changes.category]);
    }

    const changed = diffFields(before as Record<string, unknown>, after as Record<string, unknown>, AUDITED_FIELDS);
    if (Object.keys(changed).length) {
      await recordAudit({
        actor: actorOf(req),
        action: "product.update",
        entityType: "product",
        entityId: id,
        summary: `Edited "${after.title}": ${Object.keys(changed).join(", ")}`,
        changes: changed,
      });
    }
    res.json({ product: after });
  } catch (err) {
    next(err);
  }
});

const stockSchema = z.object({
  stock: z.number("Enter a stock quantity").int("Stock must be a whole number").min(0, "Stock can't be negative").max(100_000),
});

// Quick inline edit from the table. Sets an absolute quantity: orders adjust stock
// atomically with $inc, so this never loses a concurrent purchase's decrement
// beyond the moment of the write itself.
adminProductsRouter.patch("/:id/stock", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const { stock } = stockSchema.parse(req.body);

    const before = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { stock, availabilityStatus: availabilityFor(stock) } },
      { returnDocument: "before" },
    ).lean();
    if (!before) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (before.stock !== stock) {
      await recordAudit({
        actor: actorOf(req),
        action: "product.stock",
        entityType: "product",
        entityId: id,
        summary: `Set stock of "${before.title}" from ${before.stock} to ${stock}`,
        changes: { stock: { from: before.stock, to: stock } },
      });
    }
    res.json({ product: { ...before, stock, availabilityStatus: availabilityFor(stock) } });
  } catch (err) {
    next(err);
  }
});

async function setArchived(req: Request, res: Response, archive: boolean) {
  const id = idParam(req, res);
  if (!id) return;

  const filter = { _id: id, archivedAt: archive ? { $exists: false } : { $exists: true } };
  const update = archive ? { $set: { archivedAt: new Date() } } : { $unset: { archivedAt: 1 } };
  const product = await ProductModel.findOneAndUpdate(filter, update, { returnDocument: "after" }).lean();
  if (!product) {
    const exists = await ProductModel.exists({ _id: id });
    res.status(exists ? 409 : 404).json({
      error: exists ? `This product is already ${archive ? "archived" : "active"}.` : "Product not found",
    });
    return;
  }

  await syncCategoryCounts([product.category]);
  await recordAudit({
    actor: actorOf(req),
    action: archive ? "product.archive" : "product.restore",
    entityType: "product",
    entityId: id,
    summary: `${archive ? "Archived" : "Restored"} "${product.title}"`,
  });
  res.json({ product });
}

adminProductsRouter.post("/:id/archive", (req, res, next) => setArchived(req, res, true).catch(next));
adminProductsRouter.post("/:id/restore", (req, res, next) => setArchived(req, res, false).catch(next));

// Hard delete is only for products an admin created that nobody has ordered.
// Everything else is archive-only, so order history and the seeded catalog stay intact.
adminProductsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const product = await ProductModel.findById(id).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.createdVia !== "admin") {
      res.status(409).json({
        error: "Products from the original catalog can't be deleted. Archive it instead.",
        code: "SEEDED_PRODUCT",
      });
      return;
    }
    if (await OrderModel.exists({ "items.product": product._id })) {
      res.status(409).json({
        error: "This product appears in past orders, so it can't be deleted. Archive it instead.",
        code: "HAS_ORDERS",
      });
      return;
    }

    await ProductModel.deleteOne({ _id: id });
    await Promise.all([
      ReviewModel.deleteMany({ product: id }),
      UserModel.updateMany({ "cart.product": id }, { $pull: { cart: { product: id } } }),
      UserModel.updateMany({ "recentlyViewed.product": id }, { $pull: { recentlyViewed: { product: id } } }),
      ListModel.updateMany({ "items.product": id }, { $pull: { items: { product: id } } }),
    ]);
    await syncCategoryCounts([product.category]);
    await recordAudit({
      actor: actorOf(req),
      action: "product.delete",
      entityType: "product",
      entityId: id,
      summary: `Deleted product "${product.title}"`,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
