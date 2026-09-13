# amazon-clone

A rebuild of amazon.com's core shopping loop for the 8x assignment — browse, search, product
detail, cart, sign-in, checkout, orders, and account features (addresses, lists, recently
viewed, reviews). Not affiliated with Amazon.com, Inc.

**Live link:** _pending deployment_
**Repository:** this one, including `.agent-logs/` (see [Agent capture](#agent-capture) below)

## Stack

| | |
|---|---|
| Frontend | Vite + React 19 + TypeScript, React Router, TanStack Query, Tailwind CSS v4 |
| Backend | Express 5 + TypeScript, Mongoose, Zod validation |
| Database | MongoDB (a single-node replica set, so multi-document transactions work) |
| Auth | Signed JWT in an httpOnly cookie |
| Payments | A real mock provider — Luhn/expiry/CVV validation, recognizes Stripe's own test numbers to demo an approval and a decline. Real Stripe test keys were never supplied during the build; see [Payments](#payments) below. |
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
cp client/.env.example client/.env      # placeholder Stripe key is fine — see Payments
npm run seed                            # loads the 194-product catalog + a demo user
npm run dev                             # API on :4000, client on :5173 (Vite proxies /api)
```

Sign in as the seeded demo account (`demo@amazon-clone.test` / `demo1234`), or use the
**"Try demo account"** button on the sign-in page to skip typing that.

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
- **Sign-in** — one page, email first, then branches to a password or create-account
  step, matching the recon'd real-Amazon flow (minus OTP — see below).
- **Checkout & orders** — address book, delivery speed, the mock payment form, a live
  order-total preview, then order history with cancel (which restocks) and Buy Again.
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
- **Real payments, OTP, two-factor login** — meaningfully more engineering risk for a demo
  that gains little from them. See Payments below for the actual reasoning on Stripe.
- **Sponsored listings, multi-seller marketplace, gift cards, currency/language switching,
  live customer-service chat** — real Amazon complexity that would cost more build time than
  it would add to a 24-hour demo's core loop.
- **Order fulfillment simulation** (shipped/delivered transitions) — orders go straight to
  `paid` and stay there unless cancelled; the status enum supports more, nothing drives it.
- **Guest recently-viewed tracking** — recently viewed is server-side, tied to an account;
  a guest's browsing isn't recorded (the cart is the one thing that deliberately works
  signed-out, per the brief).

## Payments

`server/.env` never received real Stripe test keys during this build (`STRIPE_SECRET_KEY`
is still the `sk_test_REPLACE_ME` placeholder). Rather than write Stripe Elements
integration code with no way to run it against a real account, `lib/mockPayments.ts` is a
fully real, fully tested mock: Luhn-validates the card number, checks expiry and CVV, and
recognizes two of Stripe's own published test numbers (`4242 4242 4242 4242` approves,
`4000 0000 0000 9995` declines) so the checkout flow can demo both outcomes honestly. No
card data is ever stored — only a brand guess and the last 4 digits, for display on the
order. `config.ts`'s `stripeConfigured` flag already exists to swap in a real provider
behind the same interface once real keys are available.

## Agent capture

Every prompt and final response in this repository was captured automatically to
`.agent-logs/` by a Claude Code hook (set up first, verified with `CAPTURE-TEST.md`, before
any product code was written). One Codex session (initial product recon in
`docs/recon.md`) is also represented there, converted from its raw session file since Codex
had no equivalent hook wired in advance.

## Screenshots

`docs/screenshots/` (git-ignored — it shows a real, signed-in Amazon account) has the
product recon that preceded the build. `docs/recon.md` is the write-up.
