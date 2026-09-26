// Admin product management: validation, creation, storefront visibility,
// edit conflicts, department counts, stock, archive/restore and deletion.
// Runs against the guarded "*-test" database (see test/guard.ts).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { ListModel, ProductModel, UserModel } from "../src/models/index.js";
import { address, card, makeUser, signIn as signInAs, wipeDatabase, type Session } from "./helpers.js";

const app = createApp();
const signIn = (email: string) => signInAs(app, email);

let admin: Session;
let customer: Session;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await wipeDatabase();
  await makeUser("admin@example.test", { role: "admin" });
  await makeUser("customer@example.test");
  admin = await signIn("admin@example.test");
  customer = await signIn("customer@example.test");
});

afterAll(async () => {
  await wipeDatabase();
  await mongoose.disconnect();
});

type ApiProduct = { _id: string; updatedAt: string; [key: string]: unknown };
const IMG = "https://example.test/images/one.jpg";

const validProduct = (overrides: Record<string, unknown> = {}) => ({
  title: "Zebra Print Dog Bed",
  description: "A cosy bed for medium dogs.",
  category: "Pet Supplies",
  brand: "PawCo",
  price: 39.5,
  discountPercentage: 10,
  stock: 12,
  sku: "PET-001",
  tags: ["Dogs", "beds", "dogs"],
  images: [IMG, "https://example.test/images/two.jpg"],
  ...overrides,
});

const searchIds = async (q: string) =>
  ((await request(app).get(`/api/products?q=${encodeURIComponent(q)}&limit=60`).expect(200)).body.items as { _id: string }[]).map((p) => p._id);
const categories = async () => (await request(app).get("/api/categories").expect(200)).body.items as { slug: string; name: string; productCount: number }[];
const categorySlugs = async () => (await categories()).map((c) => c.slug);
const auditActions = async (entityId: string) =>
  ((await admin.agent.get(`/api/admin/activity?entityType=product&entityId=${entityId}`).expect(200)).body.items as { action: string }[]).map((a) => a.action);

describe("admin products", () => {
  let created: ApiProduct;

  describe("validation and creation", () => {
    it("rejects invalid input with a readable message", async () => {
      const bad = async (overrides: Record<string, unknown>, message: RegExp) => {
        const res = await admin.agent.post("/api/admin/products").send(validProduct(overrides)).expect(400);
        expect(res.body.error).toMatch(message);
      };
      await bad({ price: 0 }, /at least \$0\.01/);
      await bad({ discountPercentage: 95 }, /90%/);
      await bad({ stock: -1 }, /negative/);
      await bad({ stock: 2.5 }, /whole number/);
      await bad({ images: [] }, /at least one image/i);
      await bad({ images: ["javascript:alert(1)"] }, /valid http\(s\) URL/);
      await bad({ title: "   " }, /title/i);
      await bad({ category: "!!!" }, /department/i);
    });

    it("is closed to customers", async () => {
      await customer.agent.post("/api/admin/products").send(validProduct()).expect(403);
    });

    it("creates a product, normalising fields and ignoring ones only the server may set", async () => {
      const res = await admin.agent
        .post("/api/admin/products")
        .send(validProduct({ rating: 5, ratingCount: 99, archivedAt: "2020-01-01", sourceId: 777, createdVia: "seed" }))
        .expect(201);
      created = res.body.product;
      expect(created).toMatchObject({
        title: "Zebra Print Dog Bed",
        category: "pet-supplies",
        price: 39.5,
        stock: 12,
        thumbnail: IMG,
        availabilityStatus: "In Stock",
        rating: 0,
        ratingCount: 0,
        createdVia: "admin",
      });
      expect(created.tags).toEqual(["dogs", "beds"]);
      expect(created.archivedAt).toBeUndefined();
      expect(created.sourceId).toBe(1); // server-assigned (empty database), not the 777 the request asked for
      expect(await auditActions(created._id)).toEqual(["product.create"]);
    });

    it("gives each new product its own sourceId", async () => {
      const second = (await admin.agent.post("/api/admin/products").send(validProduct({ title: "Second Bed" })).expect(201)).body.product;
      expect(second.sourceId).toBe((created.sourceId as number) + 1);
      await admin.agent.delete(`/api/admin/products/${second._id}`).expect(204);
    });

    it("shows the product in the storefront straight away, in a brand-new department", async () => {
      expect(await searchIds("zebra")).toContain(created._id);
      const cat = (await categories()).find((c) => c.slug === "pet-supplies");
      expect(cat).toMatchObject({ name: "Pet Supplies", productCount: 1 });
      const home = (await request(app).get("/api/home").expect(200)).body;
      expect(home.newArrivals.map((p: { _id: string }) => p._id)).toContain(created._id);
    });

    it("reports whether a product can be deleted", async () => {
      const res = await admin.agent.get(`/api/admin/products/${created._id}`).expect(200);
      expect(res.body.deleteBlockedReason).toBeNull();
      await admin.agent.get("/api/admin/products/not-an-id").expect(404);
      await admin.agent.get("/api/admin/products/000000000000000000000000").expect(404);
    });

    it("lists with search, department and status filters plus totals", async () => {
      const res = await admin.agent.get("/api/admin/products?q=zebra&category=pet-supplies&status=active").expect(200);
      expect(res.body.items.map((p: ApiProduct) => p._id)).toEqual([created._id]);
      expect(res.body.totals).toEqual({ active: 1, archived: 0 });
      expect(res.body.categories).toEqual(expect.arrayContaining([{ slug: "pet-supplies", name: "Pet Supplies" }]));
      // Regex characters in a search are treated literally, not as a pattern.
      expect((await admin.agent.get("/api/admin/products?q=%28").expect(200)).body.items).toEqual([]);
    });
  });

  describe("editing", () => {
    it("saves changes, updates the storefront and records exactly what changed", async () => {
      const res = await admin.agent
        .patch(`/api/admin/products/${created._id}`)
        .send({ price: 44, brand: "PawCo Deluxe", expectedUpdatedAt: created.updatedAt })
        .expect(200);
      expect(res.body.product).toMatchObject({ price: 44, brand: "PawCo Deluxe", title: "Zebra Print Dog Bed" });
      const [entry] = (await admin.agent.get(`/api/admin/activity?entityId=${created._id}`).expect(200)).body.items;
      expect(entry.action).toBe("product.update");
      expect(entry.changes).toEqual({ price: { from: 39.5, to: 44 }, brand: { from: "PawCo", to: "PawCo Deluxe" } });
      const storefront = (await request(app).get(`/api/products/${created._id}`).expect(200)).body;
      expect(storefront.price).toBe(44);
      created = res.body.product;
    });

    it("refuses a stale edit with 409 and changes nothing", async () => {
      const stale = new Date(new Date(created.updatedAt).getTime() - 5000).toISOString();
      const res = await admin.agent.patch(`/api/admin/products/${created._id}`).send({ price: 1, expectedUpdatedAt: stale }).expect(409);
      expect(res.body.code).toBe("CONFLICT");
      expect(res.body.product.price).toBe(44);
      expect((await ProductModel.findById(created._id))!.price).toBe(44);
    });

    it("needs a change and a version to edit", async () => {
      await admin.agent.patch(`/api/admin/products/${created._id}`).send({ expectedUpdatedAt: created.updatedAt }).expect(400);
      await admin.agent.patch(`/api/admin/products/${created._id}`).send({ rating: 5, expectedUpdatedAt: created.updatedAt }).expect(400);
      await admin.agent.patch(`/api/admin/products/${created._id}`).send({ price: 5 }).expect(400);
    });

    it("leaves fields it wasn't given alone", async () => {
      const res = await admin.agent
        .patch(`/api/admin/products/${created._id}`)
        .send({ title: "Zebra Print Dog Bed (Large)", expectedUpdatedAt: created.updatedAt })
        .expect(200);
      expect(res.body.product).toMatchObject({ brand: "PawCo Deluxe", sku: "PET-001", discountPercentage: 10, tags: ["dogs", "beds"] });
      created = res.body.product;
    });

    it("keeps the thumbnail while it is still an image, otherwise uses the first", async () => {
      let res = await admin.agent
        .patch(`/api/admin/products/${created._id}`)
        .send({ images: ["https://example.test/images/two.jpg", IMG], expectedUpdatedAt: created.updatedAt })
        .expect(200);
      expect(res.body.product.thumbnail).toBe(IMG);
      res = await admin.agent
        .patch(`/api/admin/products/${created._id}`)
        .send({ images: ["https://example.test/images/new.jpg"], expectedUpdatedAt: res.body.product.updatedAt })
        .expect(200);
      expect(res.body.product.thumbnail).toBe("https://example.test/images/new.jpg");
      created = res.body.product;
    });

    it("moves a product between departments and keeps the counts right", async () => {
      const res = await admin.agent
        .patch(`/api/admin/products/${created._id}`)
        .send({ category: "Dog Beds", expectedUpdatedAt: created.updatedAt })
        .expect(200);
      created = res.body.product;
      const slugs = await categorySlugs();
      expect(slugs).toContain("dog-beds");
      expect(slugs).not.toContain("pet-supplies"); // the old department is now empty
    });
  });

  describe("stock", () => {
    it("sets stock inline, updating availability and the audit trail", async () => {
      const res = await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({ stock: 0 }).expect(200);
      expect(res.body.product).toMatchObject({ stock: 0, availabilityStatus: "Out of Stock" });
      expect((await ProductModel.findById(created._id))!.stock).toBe(0);
      expect(await auditActions(created._id)).toContain("product.stock");
      await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({ stock: 4 }).expect(200);
      expect((await ProductModel.findById(created._id))!.availabilityStatus).toBe("Low Stock");
    });

    it("rejects bad quantities", async () => {
      await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({ stock: -3 }).expect(400);
      await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({ stock: 1.5 }).expect(400);
      await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({}).expect(400);
      await admin.agent.patch("/api/admin/products/000000000000000000000000/stock").send({ stock: 1 }).expect(404);
    });

    it("changes what shoppers can buy", async () => {
      await admin.agent.patch(`/api/admin/products/${created._id}/stock`).send({ stock: 9 }).expect(200);
      const detail = (await request(app).get(`/api/products/${created._id}`).expect(200)).body;
      expect(detail.stock).toBe(9);
    });
  });

  describe("archiving", () => {
    let sibling: ApiProduct;

    beforeAll(async () => {
      // A second product in the same department, so "related" and counts have something to compare.
      sibling = (await admin.agent.post("/api/admin/products").send(validProduct({ title: "Plush Dog Bone", category: "dog-beds" })).expect(201)).body.product;
    });

    it("hides an archived product from search, suggestions, related items and the home page", async () => {
      await admin.agent.post(`/api/admin/products/${created._id}/archive`).expect(200);

      expect(await searchIds("zebra")).not.toContain(created._id);
      const suggestions = (await request(app).get("/api/products/suggestions?q=zebra").expect(200)).body.items as string[];
      expect(suggestions.join(" ")).not.toMatch(/zebra/i);
      const related = (await request(app).get(`/api/products/${sibling._id}/related`).expect(200)).body.items as { _id: string }[];
      expect(related.map((p) => p._id)).not.toContain(created._id);
      const home = (await request(app).get("/api/home").expect(200)).body;
      for (const row of ["dealsOfTheDay", "bestSellers", "topRated", "newArrivals"]) {
        expect(home[row].map((p: { _id: string }) => p._id)).not.toContain(created._id);
      }
      expect((await categories()).find((c) => c.slug === "dog-beds")!.productCount).toBe(1); // only the sibling is left
    });

    it("keeps the product page reachable for order history, marked archived", async () => {
      const detail = (await request(app).get(`/api/products/${created._id}`).expect(200)).body;
      expect(detail.archivedAt).toBeTruthy();
      const bulk = (await request(app).get(`/api/products/bulk?ids=${created._id}`).expect(200)).body.items;
      expect(bulk).toHaveLength(1);
    });

    it("still shows it to admins under the archived filter", async () => {
      expect((await admin.agent.get("/api/admin/products?q=zebra").expect(200)).body.items).toEqual([]);
      const archived = (await admin.agent.get("/api/admin/products?q=zebra&status=archived").expect(200)).body;
      expect(archived.items.map((p: ApiProduct) => p._id)).toEqual([created._id]);
      expect(archived.totals.archived).toBe(1);
      expect((await admin.agent.get("/api/admin/products?q=zebra&status=all").expect(200)).body.items).toHaveLength(1);
    });

    it("stops an archived product from being bought, even with stock left", async () => {
      await customer.agent.put("/api/cart").send({ items: [{ productId: created._id, quantity: 1, savedForLater: false }] }).expect(200);
      const quote = (await customer.agent.get("/api/orders/quote?deliverySpeed=standard").expect(200)).body;
      expect(quote.shortfalls).toEqual([expect.objectContaining({ productId: created._id, available: 0 })]);
      const saved = await customer.agent.post("/api/addresses").send(address).expect(201);
      await customer.agent
        .post("/api/orders")
        .send({ addressId: saved.body.items[0]._id, deliverySpeed: "standard", card })
        .expect(409);
      expect((await ProductModel.findById(created._id))!.stock).toBe(9); // untouched
      await customer.agent.put("/api/cart").send({ items: [] }).expect(200);
    });

    it("restores it everywhere, and refuses to archive or restore twice", async () => {
      await admin.agent.post(`/api/admin/products/${created._id}/archive`).expect(409);
      await admin.agent.post(`/api/admin/products/${created._id}/restore`).expect(200);
      await admin.agent.post(`/api/admin/products/${created._id}/restore`).expect(409);
      expect(await searchIds("zebra")).toContain(created._id);
      expect((await categories()).find((c) => c.slug === "dog-beds")!.productCount).toBe(2);
      expect(await auditActions(created._id)).toEqual(expect.arrayContaining(["product.archive", "product.restore"]));
      await admin.agent.post("/api/admin/products/000000000000000000000000/archive").expect(404);
    });
  });

  describe("deleting", () => {
    it("refuses to delete a product from the original catalog", async () => {
      const seeded = await ProductModel.create({
        sourceId: 999100,
        title: "Seeded Lamp",
        description: "From the seed.",
        category: "lighting",
        price: 20,
        stock: 3,
        images: [IMG],
        thumbnail: IMG,
      });
      const res = await admin.agent.delete(`/api/admin/products/${seeded._id}`).expect(409);
      expect(res.body.code).toBe("SEEDED_PRODUCT");
      const detail = await admin.agent.get(`/api/admin/products/${seeded._id}`).expect(200);
      expect(detail.body.deleteBlockedReason).toMatch(/original catalog/);
      expect(await ProductModel.exists({ _id: seeded._id })).toBeTruthy();
    });

    it("refuses to delete a product that has been ordered, but lets it be archived", async () => {
      const addressId = (await customer.agent.get("/api/addresses").expect(200)).body.items[0]._id;
      await customer.agent.put("/api/cart").send({ items: [{ productId: created._id, quantity: 1, savedForLater: false }] }).expect(200);
      await customer.agent.post("/api/orders").send({ addressId, deliverySpeed: "standard", card }).expect(201);
      const res = await admin.agent.delete(`/api/admin/products/${created._id}`).expect(409);
      expect(res.body.code).toBe("HAS_ORDERS");
      const detail = await admin.agent.get(`/api/admin/products/${created._id}`).expect(200);
      expect(detail.body.deleteBlockedReason).toMatch(/past orders/);
      await admin.agent.post(`/api/admin/products/${created._id}/archive`).expect(200);
      expect(await ProductModel.exists({ _id: created._id })).toBeTruthy();
      await admin.agent.post(`/api/admin/products/${created._id}/restore`).expect(200);
    });

    it("deletes a never-ordered admin product and cleans up everything pointing at it", async () => {
      const bone = (await ProductModel.findOne({ title: "Plush Dog Bone" }))!;
      await customer.agent.put("/api/cart").send({ items: [{ productId: bone.id, quantity: 1, savedForLater: false }] }).expect(200);
      await ListModel.create({ owner: customer.user.id, name: "Wishes", items: [{ product: bone._id }] });

      await admin.agent.delete(`/api/admin/products/${bone.id}`).expect(204);

      expect(await ProductModel.exists({ _id: bone._id })).toBeNull();
      expect((await UserModel.findById(customer.user.id))!.cart).toHaveLength(0);
      expect((await ListModel.findOne({ owner: customer.user.id }))!.items).toHaveLength(0);
      expect(await categorySlugs()).toContain("dog-beds"); // the other product keeps the department alive
      expect(await auditActions(bone.id)).toContain("product.delete");
      await admin.agent.delete(`/api/admin/products/${bone.id}`).expect(404);
    });
  });
});
