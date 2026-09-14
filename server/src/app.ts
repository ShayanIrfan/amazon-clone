import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { env } from "./config.js";
import { dbState } from "./db.js";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { homeRouter } from "./routes/home.js";
import { authRouter } from "./routes/auth.js";
import { cartRouter } from "./routes/cart.js";
import { addressesRouter } from "./routes/addresses.js";
import { ordersRouter } from "./routes/orders.js";
import { usersRouter } from "./routes/users.js";
import { listsRouter } from "./routes/lists.js";
import { paymentsRouter, stripeWebhook } from "./routes/payments.js";
import { optionalAuth } from "./middleware/auth.js";
import { csrfCookie, csrfProtection } from "./middleware/csrf.js";

export function createApp() {
  const app = express();

  // Behind Vercel's proxy: lets rate limiting see the real client IP and
  // req.protocol report https.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));

  // Before express.json() and CSRF: signature checks need the raw body, and
  // Stripe can't send our CSRF token. The handler verifies the signature itself.
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfCookie);
  app.use(csrfProtection);
  app.use(optionalAuth);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, db: dbState() });
  });

  app.use("/api/products", productsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/home", homeRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/lists", listsRouter);
  app.use("/api/payments", paymentsRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request", issues: err.issues });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
