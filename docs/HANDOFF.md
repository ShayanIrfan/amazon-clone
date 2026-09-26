# Handoff: Harbor Market redesign (Stitch → React)

Read this first if you are picking the work up (another model or a person). It is the
source of truth for state. **Keep the checklist at the bottom current as you go.**

## Goal and deadline

8x's resubmission brief: rebuild the **frontend** with the author's **own design**, keep the
**real backend** (already done and deployed). The design is the Stitch project below.
**Deadline: end of Saturday 26 September 2026.** After that the author also needs a
one-minute intro video and to resubmit at 8x's link (not something code can do).

## What already exists (do not rebuild)

- **Backend:** Express 5 + TypeScript + Mongoose on MongoDB Atlas, Stripe (test mode) with
  webhook, Resend email, auth (OTP, 2FA, sessions, CSRF). ~100 API tests.
- **Admin panel** at `/admin` (dashboard, products, orders, reviews, customers, audit log).
  Fully working and deployed. Its UI uses the *old* look; it is restyled for desktop and mobile in Phase 5 of `docs/BUILD_PLAN.md`.
- **Live site:** https://harbor-market-demo.vercel.app (Vercel project `harbor-market-demo`).
  Repo: https://github.com/ShayanIrfan/amazon-clone (public). `main` = what is deployed.
- **Demo shopper login:** `demo@amazon-clone.test` / `DemoAccount123!`. Test cards:
  `4242 4242 4242 4242` approves, `4000 0000 0000 9995` declines.
- **Admin login:** `admin@harbor-market.test`. Its password is deliberately NOT in the repo
  (the agent logs are public). Ask the author, or create your own admin:
  `npm run create-admin -w server -- --email you@x.com --password '<12+ chars>'`.

## The design: Stitch (DROPPED as of 26 Sep 18:45)

> **The author has no time for more Stitch work. Do not call the Stitch MCP.** The remaining
> pages are designed from the system below. **Follow `docs/BUILD_PLAN.md`** (phased, time-boxed,
> with a cut line). The saved mockups in `design/stitch/` are still references for Search and
> Product only.

- Project: **"Harbor Market E-Commerce Homepage"**, id `3942548850007889312`.
  Fetch with the Stitch MCP (`mcp__stitch__list_screens`, `mcp__stitch__get_screen`) if it is
  connected in your session; the API key lives in the author's `claude mcp` user config.
- Already downloaded to `design/stitch/`: `01-home.html`, `02-search.html`,
  `02-search-loading.html`, `02-search-empty.html`, `03-product.html`, `logo.svg`, plus small
  `.jpg` thumbnails. **Only these 4 storefront screens exist in Stitch.** (Cart/checkout screens were briefly in the project and then removed by the author; do not build from them. Re-run `list_screens` before each page in case the author adds screens.) There is no cart,
  checkout, orders, account or sign-in design, so those pages must be restyled by applying the
  same system (see "Design system") rather than copied from a mockup.
- The HTML is Tailwind (CDN) + Material Symbols. **Do not paste it.** Rebuild with the app's own
  components, Tailwind v4 tokens and `lucide-react` icons. To see a screen: render the HTML with
  Playwright at 1280 wide (`scripts/dev/slice-screenshot.mjs` slices tall screenshots).

## Design system (implemented in `client/src/index.css`)

- Font **Plus Jakarta Sans** (`@fontsource-variable/plus-jakarta-sans`). Headings 700/800 with
  tight negative tracking; prices 800, tabular figures (`.amount`).
- Colours (Tailwind tokens): `harbor #0f3a40` (brand/primary), `harbor-dark #0a272c`,
  `canvas #effcfa` (page bg), `mint #e3f1ea`, `paper #f4f6f5` (image wells, panels),
  `line #d7dedc`, `slate #56656a`, `ink #14201f`, `clay #b3261e` (discount/low stock/destructive),
  `marigold #f2a900` (**star ratings only**), `moss #2f6844`, plus `tint-*` for department tiles.
- Shape: **containers 16px** (`rounded-2xl`), **all buttons/chips/search/badges fully rounded**
  (`rounded-full`). 1px borders, almost no shadow (`--shadow-card/lift/float`).
- Product image wells are `paper` with `mix-blend-multiply` images on white cards.
- Gotcha: `index.css` has an unlayered `a { color: inherit }` that beats Tailwind utilities, so a
  `<Link>` styled as a button needs `text-white!` (trailing `!`). `buttonClasses()` already does.

## Workflow, environment, gotchas

- **Branch:** `redesign/stitch` (from `main`). Commit small; merge to `main` (fast-forward) and
  deploy when a page is verified. Commit author is the existing git config; end commit messages
  with the Co-Authored-By line the harness gives you.
- **Never commit:** `.agents/`, `.claude/skills/`, `skills-lock.json`, `docs/screenshots/`, `.env*`, secrets, or
  the admin password. Never print secrets from `.env` files. `.agent-logs/` is committed by a
  hook and is public, so never put a secret in chat.
- **Deploy:** `npx vercel deploy --prod --yes` from the repo root (Git auto-deploy is NOT
  connected). It once returned a transient "Not authorized"; just retry.
- **Do not use `npm run dev` for testing on this Windows machine:** Vite 8 crashes with native
  exit `0xC0000409` under load. Instead: `npm run build -w client`, start the API with
  `cd server && npx tsx --env-file=.env src/index.ts`, then serve the build with
  `node scripts/dev/serve-local.mjs` (static + `/api` proxy on :5173).
- **Local dev talks to the LIVE Atlas database** (same `MONGODB_URI` as production). Any test
  data you create is visible on the live site. Use throwaway names and delete them afterwards.
- **Tests:** `npm test` (server, ~104 tests). They wipe their own database and refuse to run
  unless its name ends in `-test` (`TEST_MONGODB_URI` in `server/.env`). `npm run typecheck`
  must stay clean.
- **Browser checks:** Playwright scripts used in this project lived in a temp folder and are
  not in the repo. Write new ones as needed; sign in through the real login form; wait for
  elements instead of reading immediately (most flaky failures were races in the check itself).
- Stripe/Resend/Mongo keys are in the author's `server/.env` and `client/.env` (git-ignored).

## Page mapping (Stitch screen → route → files)

| Stitch | Route | Main files |
|---|---|---|
| Home | `/` | `pages/HomePage.tsx`, `components/home/*`, `server/src/routes/home.ts` |
| Search results (+ loading, empty) | `/search` | `pages/SearchPage.tsx`, `components/search/*` |
| Product detail | `/product/:id` | `pages/ProductDetailPage.tsx`, `components/product/*` |
| (no design) cart, checkout, orders, account, sign-in, admin | various | restyle with the system |

Shared chrome is done: `components/layout/{Header,Footer,Logo,SearchBar,AccountMenu,AllMenu,Layout}.tsx`.
Header shows a "Deliver to <city>" chip from the shopper's default address (only when signed in).

## Data the design needs that the API now provides

- `GET /api/home` returns `categories[]` with a `thumbnail` and `totals {products, categories}`.
- `GET /api/products?sort=discount` is a new sort ("Price drops").
- Ratings/discount/stock fields are real; Stitch's invented content (colour/storage pickers,
  "Compare specs", "Refurbished Grade A", made-up reviews and prices) must NOT be built as
  fake features. Skip or replace with real data.

## Checklist (update as you go)

- [x] Tokens, font, favicon, page title (`Harbor Market`), pill buttons, removed Amazon colours
- [x] Logo, Header (search pill, nav, cart badge, account avatar), Footer, drawer, Layout
- [x] ProductCard, ProductRow, StarRating, AddToListMenu (icon variant)
- [x] Server: home API extras, `sort=discount`
- [x] Home page (hero, department tiles, price drops, promos, rails) — verified at 1280 and 390
- [x] Build plan for the remaining pages: `docs/BUILD_PLAN.md` (phases and times are there)
- [x] Phase 0: shared primitives + sweep (checkpoint 1 deployed — new design live)
- [x] Phase 1: Search results
- [x] Phase 2: Product detail (checkpoint 2 deployed)
- [x] Phase 3: Cart
- [x] Phase 4: Checkout (checkpoint 3 deployed) — full Stripe flow tested at 390
- [x] Phase 5: Admin panel (checkpoint 4 deployed) — mobile drawer + sign-out fix; tables scroll-in-card (per-row card view still a polish TODO)
- [x] Phase 6: Orders + order detail
- [ ] Phase 7: Sign in / sign up (checkpoint 5, final) ← in progress
- [ ] Phase 8 (stretch): account area (AccountShell, account, addresses, lists, security, 404)
- [ ] Phase 9: user-visible "amazon" strings, tests, README, final deploy + live check
- [ ] Author: intro video, updated walkthrough, resubmit

## Verification standard used so far

After each page: `npm run typecheck`, `npm test` if the server changed, a Playwright pass at
1280 and 390 wide (no horizontal scroll, key elements present, real data matches the API), then
view screenshots before calling it done.
