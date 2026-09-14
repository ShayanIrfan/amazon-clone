// Vercel Function entry: the same Express app as src/index.ts, minus
// app.listen(). Bundled by scripts/build-vercel.mjs into
// .vercel/output/functions/api.func — every /api/* request is routed here.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app.js";
import { connectDB } from "./db.js";

const app = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Cached in db.ts, so warm invocations reuse the open connection.
    await connectDB();
  } catch (err) {
    console.error("[vercel] database connection failed", err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Service temporarily unavailable" }));
    return;
  }
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
