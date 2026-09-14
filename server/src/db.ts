import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./config.js";

// Opt-in local workaround: some VPN/DNS setups (e.g. Cloudflare WARP on
// Windows) refuse the SRV lookup that mongodb+srv:// URIs need. Unset in
// production, where the platform resolver works.
if (env.DNS_SERVERS) {
  dns.setServers(env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}

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
