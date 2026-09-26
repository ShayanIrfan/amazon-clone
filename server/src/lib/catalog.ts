import { CategoryModel, ProductModel } from "../models/index.js";

/** Mongo filter for products shoppers may see. `archivedAt` is absent, not null, on active products. */
export const ACTIVE_PRODUCT = { archivedAt: { $exists: false } } as const;

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugifyCategory(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCaseSlug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Mirrors what the seed data used for its availability text, so the two never disagree. */
export function availabilityFor(stock: number) {
  if (stock <= 0) return "Out of Stock";
  return stock <= 5 ? "Low Stock" : "In Stock";
}

/**
 * Brings the Category collection back in line with the products: a department
 * exists while it has at least one active product, with its count, and is
 * removed when it has none. Call it after any change that adds, moves,
 * archives, restores or deletes a product, passing every affected slug.
 */
export async function syncCategoryCounts(slugs: Iterable<string>) {
  for (const slug of new Set(slugs)) {
    if (!slug) continue;
    const productCount = await ProductModel.countDocuments({ ...ACTIVE_PRODUCT, category: slug });
    if (productCount === 0) {
      await CategoryModel.deleteOne({ slug });
    } else {
      await CategoryModel.updateOne(
        { slug },
        { $set: { productCount }, $setOnInsert: { name: titleCaseSlug(slug) } },
        { upsert: true },
      );
    }
  }
}
