import { Resend } from "resend";
import { env, resendConfigured } from "../config.js";

export type AuthMailPurpose = "email_verification" | "login_2fa" | "password_reset" | "enable_2fa";
export interface TestMail {
  to: string;
  subject: string;
  code: string;
  purpose: AuthMailPurpose;
}

export const testMailOutbox: TestMail[] = [];

const SUBJECTS: Record<AuthMailPurpose, string> = {
  email_verification: "Verify your amazon-clone account",
  login_2fa: "Your amazon-clone sign-in code",
  password_reset: "Reset your amazon-clone password",
  enable_2fa: "Confirm two-factor authentication",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function ensureResendReady() {
  if (!resendConfigured) {
    throw new Error("Resend is not configured. Use EMAIL_DELIVERY_MODE=log for local development.");
  }
  return new Resend(env.RESEND_API_KEY);
}

export async function sendAuthCode({ to, code, purpose }: { to: string; code: string; purpose: AuthMailPurpose }) {
  const subject = SUBJECTS[purpose];
  if (env.EMAIL_DELIVERY_MODE === "log") {
    const message = { to, subject, code, purpose };
    testMailOutbox.push(message);
    console.log(`[mail:log] ${purpose} code for ${to}: ${code}`);
    return;
  }

  const resend = ensureResendReady();
  const { error } = await resend.emails.send({
    to,
    from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
    subject,
    text: `Your amazon-clone code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${escapeHtml(subject)}</h2><p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p></div>`,
  });
  if (error) throw new Error(`Resend email failed: ${error.message}`);
}
