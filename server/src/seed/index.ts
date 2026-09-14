import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { connectDB } from "../db.js";
import { ProductModel, ReviewModel, CategoryModel, UserModel } from "../models/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DummyProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  weight: number;
  dimensions: { width: number; height: number; depth: number };
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  returnPolicy: string;
  minimumOrderQuantity: number;
  images: string[];
  thumbnail: string;
  reviews: { rating: number; comment: string; date: string; reviewerName: string }[];
}

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function seed() {
  await connectDB();

  const raw = fs.readFileSync(path.join(__dirname, "data", "products.json"), "utf8");
  const { products } = JSON.parse(raw) as { products: DummyProduct[] };

  console.log(`[seed] loaded ${products.length} products from snapshot`);

  await Promise.all([
    ProductModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    CategoryModel.deleteMany({}),
  ]);

  const categoryCounts = new Map<string, number>();
  for (const p of products) categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);

  await CategoryModel.insertMany(
    [...categoryCounts.entries()].map(([slug, productCount]) => ({
      slug,
      name: titleCase(slug),
      productCount,
    })),
  );

  for (const p of products) {
    // DummyJSON's own `rating` field is an unrelated arbitrary value, not
    // the average of the sample reviews included on the same product —
    // e.g. a product can ship with "rating: 4.99" while its own 3 reviews
    // average 3.0. Computing it here instead keeps the stars shown on a
    // card/PDP consistent with the reviews a shopper can actually read,
    // for every product, not just the ones someone reviews through the app
    // (which is also when lib/reviews.ts's recalcProductRating fixes this).
    const rating = p.reviews.length
      ? Math.round((p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length) * 10) / 10
      : 0;

    const created = await ProductModel.create({
      sourceId: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      price: p.price,
      discountPercentage: p.discountPercentage,
      rating,
      ratingCount: p.reviews.length,
      stock: p.stock,
      tags: p.tags,
      brand: p.brand ?? "",
      sku: p.sku,
      weight: p.weight,
      dimensions: p.dimensions,
      warrantyInformation: p.warrantyInformation,
      shippingInformation: p.shippingInformation,
      availabilityStatus: p.availabilityStatus,
      returnPolicy: p.returnPolicy,
      minimumOrderQuantity: p.minimumOrderQuantity,
      images: p.images,
      thumbnail: p.thumbnail,
    });

    if (p.reviews.length) {
      await ReviewModel.insertMany(
        p.reviews.map((r) => ({
          product: created._id,
          reviewerName: r.reviewerName,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.date),
          verifiedPurchase: true,
        })),
      );
    }
  }

  console.log(`[seed] inserted ${products.length} products, ${categoryCounts.size} categories`);

  // Fixed demo account so the "Try demo account" button (milestone 4) can log
  // straight in without a real signup. Re-seeding resets its password.
  const demoEmail = "demo@amazon-clone.test";
  const demoPassword = "DemoAccount123!";
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  await UserModel.findOneAndUpdate(
    { email: demoEmail },
    { name: "Demo Shopper", email: demoEmail, passwordHash, isDemo: true, emailVerifiedAt: new Date(), twoFactorEnabled: false },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`[seed] demo user ready: ${demoEmail} / ${demoPassword}`);

  await import("mongoose").then((m) => m.default.disconnect());
  console.log("[seed] done");
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
