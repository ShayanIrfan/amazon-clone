import { Schema, model, Types } from "mongoose";

const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    securityVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  securityVersion: number;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
  userAgent?: string;
};

export const SessionModel = model("Session", sessionSchema);
