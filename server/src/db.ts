import mongoose from "mongoose";
import { env } from "./config.js";

let connectPromise: Promise<typeof mongoose> | null = null;

// Cached so serverless invocations (Vercel) and the dev watcher reuse one
// connection instead of opening a new one per request/reload.
export function connectDB() {
  connectPromise ??= mongoose
    .connect(env.MONGODB_URI)
    .then((m) => {
      console.log(`[db] connected to ${m.connection.name}`);
      return m;
    })
    .catch((err) => {
      connectPromise = null;
      throw err;
    });
  return connectPromise;
}

export function dbState() {
  return mongoose.STATES[mongoose.connection.readyState];
}
