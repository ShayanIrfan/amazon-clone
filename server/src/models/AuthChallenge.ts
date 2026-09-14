import { Schema, model, Types } from "mongoose";

export const AUTH_CHALLENGE_PURPOSES = ["email_verification", "login_2fa", "password_reset", "enable_2fa"] as const;
export type AuthChallengePurpose = (typeof AUTH_CHALLENGE_PURPOSES)[number];

const authChallengeSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    purpose: { type: String, enum: AUTH_CHALLENGE_PURPOSES, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    resendAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authChallengeSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export type AuthChallenge = {
  _id: Types.ObjectId;
  email: string;
  user?: Types.ObjectId;
  purpose: AuthChallengePurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  resendAt: Date;
  consumedAt?: Date;
};

export const AuthChallengeModel = model("AuthChallenge", authChallengeSchema);
