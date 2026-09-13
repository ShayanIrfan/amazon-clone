// Mock card processor. Stripe test keys aren't configured yet (server/.env
// still has the sk_test_REPLACE_ME placeholder — see config.ts's
// `stripeConfigured`), and wiring real Stripe Elements without ever being
// able to test it against a real account isn't something to ship blind.
// This mock is what's actually used by routes/orders.ts today. It recognizes
// two of Stripe's own published test numbers so the demo can show both a
// successful and a declined charge; anything else that's a validly-formed
// card number is approved. No card data is ever persisted — only a brand
// guess and the last 4 digits, for display on the order.

export interface CardInput {
  number: string;
  expiry: string; // "MM/YY"
  cvv: string;
  name: string;
}

export type ChargeResult =
  | { status: "approved"; brand: string; last4: string }
  | { status: "declined"; reason: string }
  | { status: "invalid"; error: string };

const DECLINED_NUMBERS = new Set(["4000000000009995"]);

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function guessBrand(digits: string): string {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  if (digits.startsWith("6")) return "Discover";
  return "Card";
}

export function chargeCard(card: CardInput): ChargeResult {
  const digits = card.number.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) {
    return { status: "invalid", error: "That card number doesn't look right." };
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(card.expiry.trim());
  if (!match) return { status: "invalid", error: "Enter the expiration date as MM/YY." };
  const [, mm, yy] = match;
  const month = Number(mm);
  if (month < 1 || month > 12) return { status: "invalid", error: "That expiration month isn't valid." };
  const expiryEnd = new Date(2000 + Number(yy), month, 1); // first day of the month *after* expiry
  if (expiryEnd.getTime() <= Date.now()) return { status: "invalid", error: "This card has expired." };

  if (!/^\d{3,4}$/.test(card.cvv.trim())) return { status: "invalid", error: "Enter a valid security code." };
  if (!card.name.trim()) return { status: "invalid", error: "Enter the name on the card." };

  if (DECLINED_NUMBERS.has(digits)) {
    return { status: "declined", reason: "Your card was declined." };
  }

  return { status: "approved", brand: guessBrand(digits), last4: digits.slice(-4) };
}
