import { z } from "zod";

// Fails fast on a missing/malformed env var instead of surfacing as a confusing
// runtime error later (e.g. a mistyped MONGODB_URI). --env-file=.env loads process.env
// before this module runs (see package.json dev/start scripts).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  EMAIL_DELIVERY_MODE: z.enum(["log", "send"]).default("log"),
  RESEND_API_KEY: z.string().default("re_TEST_PLACEHOLDER_REPLACE_ME"),
  RESEND_FROM_EMAIL: z.email().default("no-reply@example.test"),
  RESEND_FROM_NAME: z.string().min(1).default("amazon-clone"),
  OTP_SECRET: z.string().min(16).default("local-otp-secret-replace-in-production"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

// Placeholder Stripe keys (see server/.env.example) mean "use the mock payment
// provider" so the app runs fully offline until real test keys are supplied.
export const stripeConfigured = !env.STRIPE_SECRET_KEY.includes("REPLACE_ME");
export const resendConfigured = !env.RESEND_API_KEY.includes("PLACEHOLDER") && !env.RESEND_API_KEY.includes("REPLACE_ME");
