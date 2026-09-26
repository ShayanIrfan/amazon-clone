# Harbor Market

A full e-commerce marketplace built for the 8x assignment: an original storefront design
("Harbor Market") on a real, working backend — browse, search, product detail, cart, sign-in,
Stripe checkout, orders, an admin panel, and account features (addresses, lists, recently
viewed, reviews). Generic across every category, not a clone of any one store. The catalog is
snapshotted from DummyJSON; nothing is affiliated with any real retailer.

The frontend is the candidate's own design — a coherent system (Plus Jakarta Sans, a harbor-teal
and mint palette, 16px cards, fully-rounded controls) applied across the storefront and admin,
responsive from 390px up. The backend, database, payments, and auth are genuinely live, not
mocked.

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
npm test          # server integration tests (see below: they need a *-test database)
npm run typecheck # both workspaces
npm run build     # production client build
```

Tests empty the database they run against, so they refuse to start unless its name ends in
`-test` (`server/test/guard.ts`). Set `TEST_MONGODB_URI` in `server/.env` to a dedicated database,
for example a sibling of your dev one on the same cluster; without it they use a local replica
set at `mongodb://127.0.0.1:27017/amazon-clone-test`.

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
- **Admin panel** — dashboard, product management, order fulfilment and refunds, review
  moderation and a customer directory behind an admin-only `/admin`, with an audit log of every
  change. See [Admin panel](#admin-panel).
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
- **Carrier and warehouse integration** — shipped and delivered are set by an admin in the
  panel; nothing tracks a real parcel.
- **Guest recently-viewed tracking** — recently viewed is server-side, tied to an account;
  a guest's browsing isn't recorded (the cart is the one thing that deliberately works
  signed-out, per the brief).

## Admin panel

`/admin` is a separate, lazy-loaded area for running the store: shoppers never download any
of its code, and every admin API route (`/api/admin/*`) re-checks the caller's role in the
database on each request, so the client-side guard is only a convenience.

**Getting in.** The `admin` role can't be granted through the API or a signup; there is no
endpoint that touches it. Create an admin from the command line (it works on whichever
database `server/.env` points to, and leaves the catalog alone, unlike `npm run seed`):

```bash
npm run create-admin -w server -- --email you@example.com --password '<12+ characters>'
```

Or set `ADMIN_EMAILS` (comma-separated) in the host's environment to promote accounts whose
email is already verified. The shared demo shopper is never an admin.

| Screen | What it does |
|---|---|
| **Dashboard** | Revenue (net of refunds), orders, units and new customers for 7/30/90 days with the change against the previous period, orders per day, top products, low stock, and what's waiting to ship |
| **Products** | Search, filter and sort the catalog; create and edit products (validation mirrors the server, live storefront preview); inline stock edits; archive and restore; delete |
| **Orders** | Search by order number or customer; mark paid orders shipped, then delivered; cancel and refund; each order shows its customer, address, payment and history |
| **Reviews** | Find and delete reviews; the product's average rating is recalculated |
| **Customers** | Read-only directory with order counts and spend, and a profile per customer. No passwords, sessions, recovery codes or addresses are ever returned |

Rules worth knowing, all enforced on the server and covered by tests:

- **Archive vs delete.** Archiving hides a product from search, suggestions, related items,
  the home page and its department, and makes it unbuyable even with stock left, while its
  page still opens for order history. Only products an admin created and nobody has ordered
  can be deleted; the seeded catalog can only be archived.
- **Departments follow the products.** Counts are recomputed on every change; a department
  is created with its first product and disappears when empty.
- **No lost edits.** Saving a product sends the version it was loaded at; if someone else
  saved first the write is refused (409) and the editor offers the latest version.
- **Orders move forward only:** `paid → shipped → delivered`, each step conditional on the
  current status. Payment is only ever confirmed by Stripe, never by an admin. Shipped
  orders can no longer be cancelled by anyone.
- **One way to cancel.** Customer cancellation, admin cancellation and Stripe refunds all go
  through a single conditional function, so simultaneous cancels restock exactly once.
- **Refunds made in the Stripe Dashboard stay in step.** A `charge.refunded` webhook cancels
  and restocks a paid order; on an order that already shipped it records the refund and
  flags it instead. The app's own refunds carry metadata so the webhook can tell them apart.
- **Audit log.** Every admin change (and every Stripe-driven one) is recorded with who, when
  and the before/after values, and shown on the dashboard and on each product and order.

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
`payment_intent.succeeded` (settles orders) and `charge.refunded` (keeps orders in step with
refunds made in the Stripe Dashboard). `ADMIN_EMAILS` is optional.

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
