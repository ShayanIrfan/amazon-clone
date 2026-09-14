import { createHmac, randomInt } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../config.js";
import { AuthChallengeModel, type AuthChallengePurpose } from "../models/index.js";
import { sendAuthCode } from "./mail.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export class ChallengeError extends Error {
  constructor(public readonly code: "COOLDOWN" | "INVALID" | "EXPIRED" | "TOO_MANY_ATTEMPTS") {
    super(code);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCode(challengeId: string, purpose: AuthChallengePurpose, code: string) {
  return createHmac("sha256", env.OTP_SECRET).update(`${challengeId}:${purpose}:${code}`).digest("hex");
}

export async function issueChallenge({ email, userId, purpose }: { email: string; userId?: string; purpose: AuthChallengePurpose }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const latest = await AuthChallengeModel.findOne({ email: normalizedEmail, purpose, consumedAt: { $exists: false } }).sort({ createdAt: -1 });
  if (latest && latest.resendAt > now) throw new ChallengeError("COOLDOWN");

  await AuthChallengeModel.updateMany(
    { email: normalizedEmail, purpose, consumedAt: { $exists: false } },
    { $set: { consumedAt: now } },
  );

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challenge = new AuthChallengeModel({
    email: normalizedEmail,
    user: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    purpose,
    codeHash: "pending",
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    resendAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
    attempts: 0,
  });
  challenge.codeHash = hashCode(challenge._id.toString(), purpose, code);
  await challenge.save();

  try {
    await sendAuthCode({ to: normalizedEmail, code, purpose });
  } catch (error) {
    await AuthChallengeModel.deleteOne({ _id: challenge._id });
    throw error;
  }
  return challenge;
}

export async function consumeChallenge({ email, purpose, code }: { email: string; purpose: AuthChallengePurpose; code: string }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanedCode = code.trim();
  if (!/^\d{6}$/.test(cleanedCode)) throw new ChallengeError("INVALID");

  const now = new Date();
  const latest = await AuthChallengeModel.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });
  if (!latest || latest.expiresAt <= now) throw new ChallengeError("EXPIRED");
  if (latest.consumedAt) throw new ChallengeError("INVALID");
  if (latest.attempts >= MAX_ATTEMPTS) throw new ChallengeError("TOO_MANY_ATTEMPTS");

  const consumed = await AuthChallengeModel.findOneAndUpdate(
    { _id: latest._id, codeHash: hashCode(latest._id.toString(), purpose, cleanedCode), consumedAt: { $exists: false }, expiresAt: { $gt: now }, attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { consumedAt: now } },
    { returnDocument: "after" },
  );
  if (consumed) return consumed;

  const updated = await AuthChallengeModel.findOneAndUpdate(
    { _id: latest._id, consumedAt: { $exists: false }, expiresAt: { $gt: now }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );
  if (updated && updated.attempts >= MAX_ATTEMPTS) throw new ChallengeError("TOO_MANY_ATTEMPTS");
  throw new ChallengeError("INVALID");
}

export function challengeMessage(error: unknown) {
  if (!(error instanceof ChallengeError)) return null;
  if (error.code === "COOLDOWN") return { status: 429, error: "Please wait before requesting another code.", code: error.code };
  if (error.code === "TOO_MANY_ATTEMPTS") return { status: 429, error: "Too many attempts. Request a new code.", code: error.code };
  if (error.code === "EXPIRED") return { status: 400, error: "That code has expired. Request a new code.", code: error.code };
  return { status: 400, error: "That code is not valid.", code: error.code };
}
