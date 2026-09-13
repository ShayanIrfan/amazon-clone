import { Router } from "express";
import { z } from "zod";
import { ProductModel } from "../models/index.js";
import { parsePagination } from "../lib/pagination.js";

export const productsRouter = Router();

const SORTS = ["featured", "price_low", "price_high", "rating", "newest", "bestseller"] as const;
type Sort = (typeof SORTS)[number];

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(), // comma-separated
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Substring, not MongoDB's word-stemmed $text index: with a 194-product
// catalog a full collection scan is cheap, and it's the difference between
// "phone" finding "iPhone"/"Smartphones" or finding nothing.
function searchMatch(q: string) {
  const re = new RegExp(escapeRegex(q), "i");
  return { $or: [{ title: re }, { brand: re }, { category: re }, { tags: re }] };
}

function sortStage(sort: Sort | undefined): Record<string, 1 | -1> {
  switch (sort) {
    case "price_low":
      return { price: 1 };
    case "price_high":
      return { price: -1 };
    case "rating":
      return { rating: -1, ratingCount: -1 };
    case "newest":
      return { createdAt: -1 };
    case "bestseller":
      return { ratingCount: -1 };
    case "featured":
    default:
      return { rating: -1, ratingCount: -1 };
  }
}

// Filters shared by the results query and the facet counts, minus whichever
// facet is being counted (so picking a brand doesn't hide the other brands).
function baseMatch(parsed: z.infer<typeof listQuerySchema>) {
  const match: Record<string, unknown> = {};
  if (parsed.q) Object.assign(match, searchMatch(parsed.q));
  if (parsed.category) match.category = parsed.category;
  return match;
}

productsRouter.get("/suggestions", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ items: [] });

    const anywhere = new RegExp(escapeRegex(q), "i");
    const startsWith = new RegExp(`^${escapeRegex(q)}`, "i");

    const [titleMatches, brandMatches] = await Promise.all([
      ProductModel.find({ title: anywhere }).select("title").limit(20).lean(),
      ProductModel.find({ brand: anywhere }).select("brand").limit(10).lean(),
    ]);

    // Prefix matches first (closer to what the shopper is typing), then
    // other substring matches, same ordering Amazon's own autocomplete uses.
    const rank = (s: string) => (startsWith.test(s) ? 0 : 1);
    const suggestions = new Set<string>();
    for (const p of [...titleMatches].sort((a, b) => rank(a.title) - rank(b.title))) suggestions.add(p.title);
    for (const p of brandMatches) if (p.brand) suggestions.add(p.brand);

    res.json({ items: [...suggestions].slice(0, 8) });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination(parsed);

    const match = baseMatch(parsed);
    if (parsed.brand) match.brand = { $in: parsed.brand.split(",").filter(Boolean) };
    if (parsed.minRating) match.rating = { $gte: parsed.minRating };
    if (parsed.inStock) match.stock = { $gt: 0 };
    if (parsed.minPrice != null || parsed.maxPrice != null) {
      match.price = {
        ...(parsed.minPrice != null ? { $gte: parsed.minPrice } : {}),
        ...(parsed.maxPrice != null ? { $lte: parsed.maxPrice } : {}),
      };
    }

    const sort = sortStage(parsed.sort);

    const [items, total, facetSource] = await Promise.all([
      ProductModel.find(match).sort(sort).skip(skip).limit(limit).lean(),
      ProductModel.countDocuments(match),
      // Facets ignore brand/price/rating so the sidebar still shows the full
      // set of options for the current search/category, not just what matches.
      ProductModel.find(baseMatch(parsed)).select("brand price").lean(),
    ]);

    const brandCounts = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = 0;
    for (const p of facetSource) {
      if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
      minPrice = Math.min(minPrice, p.price);
      maxPrice = Math.max(maxPrice, p.price);
    }

    res.json({
      items,
      total,
      page,
      limit,
      facets: {
        brands: [...brandCounts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        priceRange: facetSource.length ? { min: Math.floor(minPrice), max: Math.ceil(maxPrice) } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
});
