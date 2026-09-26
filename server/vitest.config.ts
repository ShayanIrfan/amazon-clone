import fs from "node:fs";
import { defineConfig } from "vitest/config";

// Reads only the named keys from server/.env. The rest of that file (real
// Stripe and Resend keys) is deliberately not loaded into the test process.
function fromDotEnv(name: string): string | undefined {
  try {
    const line = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}

// Tests drop their whole database, so they only ever run against one named
// `*-test` (enforced by test/guard.ts): TEST_MONGODB_URI from server/.env or
// the environment (e.g. a sibling database on Atlas), else a local replica set.
const testMongoUri =
  process.env.TEST_MONGODB_URI ??
  fromDotEnv("TEST_MONGODB_URI") ??
  "mongodb://127.0.0.1:27017/amazon-clone-test?replicaSet=rs0&directConnection=true";
const dnsServers = process.env.DNS_SERVERS ?? fromDotEnv("DNS_SERVERS");

// Env values are supplied here rather than read from server/.env, since
// config.ts validates process.env at import time (before any code in a test
// file itself could set it).
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15_000,
    setupFiles: ["./test/guard.ts"],
    // Every file empties and reuses the same test database, so files run one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      PORT: "4001",
      CLIENT_ORIGIN: "http://localhost:5173",
      MONGODB_URI: testMongoUri,
      ...(dnsServers ? { DNS_SERVERS: dnsServers } : {}),
      SESSION_SECRET: "test-session-secret-not-for-production-use-only",
      STRIPE_SECRET_KEY: "sk_test_REPLACE_ME",
      STRIPE_WEBHOOK_SECRET: "whsec_REPLACE_ME",
      EMAIL_DELIVERY_MODE: "log",
      RESEND_API_KEY: "re_TEST_PLACEHOLDER_REPLACE_ME",
      RESEND_FROM_EMAIL: "no-reply@example.test",
      RESEND_FROM_NAME: "amazon-clone test",
      OTP_SECRET: "test-otp-secret-not-for-production-use",
      ADMIN_EMAILS: "",
    },
  },
});
