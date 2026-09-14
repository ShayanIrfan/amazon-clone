# amazon-clone

A rebuild of amazon.com's core shopping loop for the 8x assignment — browse, search, product
detail, cart, sign-in, checkout, orders, and account features (addresses, lists, recently
viewed, reviews). Not affiliated with Amazon.com, Inc.

**Live link:** https://harbor-market-demo.vercel.app
**Repository:** this one, including `.agent-logs/` (see [Agent capture](#agent-capture) below)

## Stack

| | |
|---|---|
| Frontend | Vite + React 19 + TypeScript, React Router, TanStack Query, Tailwind CSS v4 |
| Backend | Express 5 + TypeScript, Mongoose, Zod validation |
| Database | MongoDB (a replica set — Atlas in production — so multi-document transactions work) |
| Auth | Signed JWT in an httpOnly cookie |
| Payments | Stripe (test mode) — PaymentIntents, the Payment Element, and a signed webhook; a tested mock provider takes over when no Stripe key is configured. See [Payments](#payments). |
| Hosting | Vercel — static client plus the Express API as one Vercel Function. See [Deployment](#deployment). |
| Catalog | 194 products / 24 categories snapshotted from [DummyJSON](https://dummyjson.com) |

## Running locally

Requires Node 20+ and a MongoDB instance running as (at least) a one-node replica set —
transactions (used when placing/cancelling an order) don't work on a plain standalone server.
The quickest way to get one:

```bash
docker run -d --name amazon-mongo -p 27017:27017 -v amazon-mongo-data:/data/db \
  mongo:8 --replSet rs0 --bind_ip_all
docker exec amazon-mongo mongosh --eval \
  "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

Then:

```bash
npm install
cp server/.env.example server/.env      # defaults already point at the container above
cp client/.env.example client/.env      # add Stripe test keys to both files, or keep the mock — see Payments
npm run seed                            # loads the 194-product catalog + a demo user
npm run dev                             # API on :4000, client on :5173 (Vite proxies /api)
```

Sign in as the seeded demo account (`demo@amazon-clone.test` / `DemoAccount123!`).

```bash
npm test          # server integration tests (own MongoDB, doesn't touch dev data)
npm run typecheck # both workspaces
npm run build     # production client build
```

## What's built

Each milestone was verified against the live API (and, from milestone 1 onward, against a
running browser session) before being committed — see the commit messages for what was
specifically checked, and what bugs were caught and fixed along the way.

- **Browse & search** — home page (curated rows, categories), full-text-ish search with
  filters (brand/price/rating/stock), sort, pagination, autocomplete.
- **Product detail** — gallery with zoom, specs, reviews with a rating breakdown and
  star-filtering, related products.
- **Cart** — works signed out (kept in `localStorage`); quantity, delete, save for later.
  Merges into the account's own cart on sign-in.
- **Authentication** — dedicated sign-in and sign-up pages with email verification OTPs,
  password reset, optional email two-factor authentication, recovery codes, revocable
  sessions, and idempotent guest-cart merging.
- **Checkout & orders** — address book, delivery speed, Stripe card payment, a live
  order-total preview, then order history with cancel (which refunds and restocks) and Buy Again.
- **Account** — address management, wish lists (add from the product page or the cart),
  recently viewed, and reviews gated to shoppers who've actually bought the item — writing
  one recalculates the product's real average rating.
- **Polish** — a mobile layout pass (see below), loading/error/empty states throughout,
  keyboard-accessible drawers/menus (Escape closes them), the automated test above, and
  this README.

### Mobile layout

The header is two explicit rows on narrow screens (icons on top, full-width search below)
rather than a single wrapping row — more predictable than the flex-wrap approach it started
as. Search results put filters behind a slide-in "Filters" button on mobile instead of
stacking them above the results and pushing products off-screen. Verified with real
screenshots (Playwright, 390×844) rather than by inspection alone, which is how the
DummyJSON rating inconsistency below was actually found.

## Deliberately left out

Scope decisions made up front, revisited as each milestone landed:

- **Prime, Video, Music, Alexa/Rufus** — separate products from the shopping loop this
  assignment is about.
- **Live-mode payments** — Stripe runs in test mode; no real cards are charged.
  Authentication email delivery uses Resend configuration.
- **Sponsored listings, multi-seller marketplace, gift cards, currency/language switching,
  live customer-service chat** — real Amazon complexity that would cost more build time than
  it would add to a 24-hour demo's core loop.
- **Order fulfillment simulation** (shipped/delivered transitions) — orders go straight to
  `paid` and stay there unless cancelled; the status enum supports more, nothing drives it.
- **Guest recently-viewed tracking** — recently viewed is server-side, tied to an account;
  a guest's browsing isn't recorded (the cart is the one thing that deliberately works
  signed-out, per the brief).

## Payments

With `STRIPE_SECRET_KEY` (server) and `VITE_STRIPE_PUBLISHABLE_KEY` (client) set, checkout
uses Stripe:

1. After the delivery step, `POST /api/orders` re-prices the cart on the server, creates a
   `pending_payment` order and a PaymentIntent for its total, and returns the client secret.
2. The Payment Element collects the card inside Stripe's iframe — card data never touches
   this server — and `stripe.confirmPayment` charges it.
3. The order is settled by whichever arrives first: the client calling
   `POST /api/orders/:id/confirm-payment`, or Stripe's signed `payment_intent.succeeded`
   webhook at `POST /api/payments/webhook`. Settling is idempotent — a conditional
   `pending_payment → paid` update, with an atomic stock check in the same transaction. If
   stock ran out while the card was being charged, the payment is refunded and the order is
   cancelled.
4. Cancelling a paid order refunds it in Stripe before restocking.

Test cards: `4242 4242 4242 4242` approves, `4000 0000 0000 9995` declines (any future
expiry, any CVC).

Without a Stripe key, `lib/mockPayments.ts` takes over. It is a fully tested mock that
Luhn-validates the card number, checks expiry and CVV, and recognizes the same two test
numbers, so the integration tests and a key-less local setup still cover both outcomes.

## Deployment

Production runs on Vercel with MongoDB Atlas. `vercel.json` runs `scripts/build-vercel.mjs`,
which writes a [Build Output API](https://vercel.com/docs/build-output-api/v3) bundle:

- `static/` — the Vite client build, with an SPA fallback to `index.html`
- `functions/api.func` — `server/src/vercel.ts` (the Express app) bundled with esbuild;
  every `/api/*` request is routed to it

The build is custom because the repo uses TypeScript 7, which no longer exposes the transpile
API that Vercel's built-in Node builder calls.

Production environment variables (set with `vercel env add … production`): `NODE_ENV`,
`CLIENT_ORIGIN`, `MONGODB_URI`, `SESSION_SECRET`, `OTP_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, plus the `EMAIL_DELIVERY_MODE` /
`RESEND_*` email settings. The Stripe webhook endpoint is
`https://harbor-market-demo.vercel.app/api/payments/webhook`, subscribed to
`payment_intent.succeeded`.

```bash
npx vercel deploy --prod   # build on Vercel and promote to production
```

## Agent capture

Every prompt and final response in this repository was captured automatically to
`.agent-logs/` by a Claude Code hook (set up first, verified with `CAPTURE-TEST.md`, before
any product code was written). One Codex session (initial product recon in
`docs/recon.md`) is also represented there, converted from its raw session file since Codex
had no equivalent hook wired in advance.

## Screenshots

`docs/screenshots/` (git-ignored — it shows a real, signed-in Amazon account) has the
product recon that preceded the build. `docs/recon.md` is the write-up.
