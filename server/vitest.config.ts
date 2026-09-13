import { defineConfig } from "vitest/config";

// Tests never touch the dev database or dev cookies — a separate db name on
// the same local replica set, and env values supplied here rather than read
// from server/.env, since config.ts validates process.env at import time
// (before any code in a test file itself could set it).
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15_000,
    env: {
      NODE_ENV: "test",
      PORT: "4001",
      CLIENT_ORIGIN: "http://localhost:5173",
      MONGODB_URI: "mongodb://127.0.0.1:27017/amazon-clone-test?replicaSet=rs0&directConnection=true",
      SESSION_SECRET: "test-session-secret-not-for-production-use-only",
      STRIPE_SECRET_KEY: "sk_test_REPLACE_ME",
      STRIPE_WEBHOOK_SECRET: "whsec_REPLACE_ME",
    },
  },
});
