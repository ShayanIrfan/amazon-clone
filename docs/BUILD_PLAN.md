# Build plan: finish the Harbor Market UI (for Opus 4.8)

Written Sat 26 Sep 2026, 18:45. **Deadline: end of today.** The author also needs time for a
one-minute video and the resubmission, so **code freeze is 22:30 at the latest**. Read
`docs/HANDOFF.md` first for the environment, logins, gotchas and deploy command; this file
covers only *what to build and in what order*.

## Decisions already made (do not revisit)

- **Stitch is dropped.** The author has no time for more Stitch screens. Do **not** call the
  Stitch MCP. The saved mockups in `design/stitch/` (Search + its loading/empty states, and
  Product) are still useful visual references for those two pages. Every other page is
  designed by you, from the design system that the Home page already uses.
- **Home, header, footer, drawer, ProductCard, ProductRow and StarRating are finished.** They
  are the style reference. Look at `components/home/*` and `components/product/ProductCard.tsx`
  before designing anything.
- **Same backend, real data only.** No new fake features (see "Never build" below). Do not
  change API contracts unless a page cannot work without a change, and then add tests.
- Work on branch `redesign/stitch`. **Deploy to production at every checkpoint** (merge
  fast-forward to `main`, then `npx vercel deploy --prod --yes`) so a shippable site always
  exists if time runs out. The live site still shows the *old* design until checkpoint 1.

## Using the UI/UX skill

The `ui-ux-pro-max` skill is installed at `.claude/skills/ui-ux-pro-max/` (untracked; **do not
commit it**). **Python is not installed on this machine**, so its `search.py` does not run.
Read its rules directly instead:

- `references/quick-reference.md` has all 119 rules by category. Read sections 1, 2, 5, 8 and 9 before
  starting, and section 8 (Forms & Feedback) again before checkout and auth.
- `references/pro-rules.md` has the pre-delivery checklist. Run it at each checkpoint.

The rules that matter most here, by ID:

| Rule | What it means in this app |
|---|---|
| `touch-target-size`, `touch-friendly-input` | Every button, input, stepper and chip is at least 44px tall on mobile (`h-11`). Icon buttons are `h-10 w-10` or larger. |
| `loading-buttons` | Async buttons use `<Button loading>` and are disabled while pending (place order, sign in, save address). |
| `progressive-loading`, `layout-shift-avoid` | Skeletons shaped like the final layout, not a centred spinner, on Search, Product, Cart, Orders. |
| `empty-states` | Every empty list gets an icon, a one-line reason and a primary next action. |
| `error-clarity`, `inline-validation`, `aria-live-errors` | Field errors under the field, validated on blur, written as cause + fix; form-level errors in `role="alert"`. |
| `multi-step-progress` | Checkout shows a step indicator and lets the shopper go back to a completed step. |
| `state-preservation` | Search filters, sort and page live in the URL; Back restores them. |
| `redundant-entry` | Checkout offers saved addresses as cards before asking for a new one. |
| `form-labels` | Visible labels on every field. Never use a placeholder as the only label. |
| `breakpoint-consistency` | Check at 390, 768 and 1280. No horizontal scroll at any width. |

## Design recipes (use these exact patterns so every page matches Home)

Tokens are in `client/src/index.css`. **Never use raw hex, `neutral-*`/`gray-*`, or `marigold`
outside star ratings.**

| Element | Classes / component |
|---|---|
| Page wrapper | `page-shell py-8`, sections separated by `gap-8` (use `gap-14` only on marketing-style pages) |
| Page top | new `PageHeader` component: optional breadcrumbs, `eyebrow`, `h1.page-title text-ink`, `text-sm text-slate` description, actions on the right |
| Card | `Panel` → `rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]`, padding `p-5 sm:p-6` at call site |
| Soft panel (summaries, hints, test-card note) | `rounded-2xl bg-paper p-5` |
| Brand panel (success, sign-in side panel) | `rounded-2xl bg-mint p-6 sm:p-8` |
| Heading inside a card | `text-base font-bold text-ink` plus optional `text-sm text-slate` line |
| Input / select / textarea | `h-11 rounded-xl border border-line-strong bg-white px-4 text-sm focus:border-harbor focus:ring-4 focus:ring-harbor/10`; label `text-sm font-semibold text-ink mb-1.5` |
| Buttons | Only `Button` / `buttonClasses()`: `primary` harbor, `secondary` white + border, `quiet` text, `danger` clay. A `<Link>` styled as a button uses `buttonClasses()` (it already handles the `text-white!` gotcha). |
| Chips / filter pills | `h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold`; active: `border-harbor bg-harbor text-white` |
| Selectable option card (address, delivery speed, list) | `rounded-2xl border border-line p-4`; selected: `border-harbor bg-mint/50 ring-1 ring-harbor`. Built on a real `<input type="radio">`, not a clickable div. |
| Image well | `rounded-xl bg-paper` with `object-contain mix-blend-multiply` image |
| Main + sidebar layout | `grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]`; sidebar `lg:sticky lg:top-36 self-start` (measure the sticky header and adjust `top-*`) |
| Money | `.amount font-extrabold text-ink`; the order total is `text-lg`; the list price is `text-xs text-slate line-through` |
| Status badge | `Badge`: pending → warning, paid/processing/shipped → info, delivered → positive, cancelled/refunded → negative |
| Icons | `lucide-react` 16–20px; decorative icons get `aria-hidden`; icon-only buttons need an `aria-label` |
| Motion | `transition-colors` / `transition-shadow` ~150ms; transforms only; `index.css` already honours reduced motion |

## Never build (Stitch invented these; they are not real)

Colour and storage pickers, "Compare specs", "Refurbished Grade A", box contents, made-up
reviewer names, fake prices or ratings, promo codes, gift cards, or delivery dates the
backend does not return. Promises that **are** true and may be shown: free standard delivery,
secure card payments (Stripe), and cancel for a full refund until the order ships.

---

## Phases, in order, with time boxes

Each phase ends with `npm run typecheck` (clean) and a quick browser look at 1280 and 390
wide. Use the build + `serve-local.mjs` flow from HANDOFF, **not** `npm run dev`.

### Phase 0: shared primitives + sweep (18:55–19:25). Checkpoint 1: deploy

Most of the app's "old look" comes from a handful of shared components. Fixing them first gives
every page, including admin, the new shape before any page-level work starts.

1. `components/ui/`:
   - `Panel`: `rounded-md` becomes `rounded-2xl` (recipe above).
   - `TextField`, `Select`: use the input recipe, `h-11`, `rounded-xl`, bolder label, and give
     errors `role="alert"`. Keep their props API unchanged.
   - `Checkbox`: `accent-harbor`, `h-5 w-5`.
   - `Badge`: the warning tone must stop using marigold. Add the token
     `--color-amber-ink: #6e5200;` in `index.css` and use `bg-tint-butter text-amber-ink`.
     Add a small leading dot to each tone.
   - `EmptyState`: icon inside a 64px `bg-mint` circle with a harbor icon; title
     `text-lg font-extrabold`; description `text-sm text-slate`; action slot.
   - `ErrorState`: same shape, clay icon in a `bg-clay/10` circle, and a "Try again"
     secondary button.
   - `Skeleton`: `rounded-xl bg-line/50 animate-pulse`. `PageLoader`: harbor spinner.
   - `Pagination` (in `components/search/`): 40px round page buttons; the active page is
     `bg-harbor text-white` with `aria-current="page"`; prev/next use chevrons plus labels.
2. New shared components:
   - `components/ui/PageHeader.tsx`
   - `components/ui/Breadcrumbs.tsx` (`nav aria-label="Breadcrumb"`, `›` separators,
     `aria-current="page"` on the last item)
3. **Sweep** of every storefront file listed by
   `grep -rlE "rounded-(md|sm|lg)\b|marigold|(neutral|gray)-[0-9]" client/src/pages client/src/components`:
   - Containers `rounded-md/lg` become `rounded-2xl`, inputs become `rounded-xl`, and buttons,
     chips and badges become `rounded-full`.
   - Any `bg-marigold` button or CTA becomes `buttonClasses("primary")`. Marigold stays only
     in `StarRating`, `RatingBreakdown` and `WriteReviewForm` stars.
   - `neutral-*` / `gray-*` become `text-slate`, `text-line-strong`, `border-line` or
     `bg-paper`.
   - Skip `pages/admin/*` and `components/admin/*` in this sweep; they get their own pass in Phase 5.
4. Typecheck, build, check Home, Search, Product and Cart at 390 and 1280. Then do the
   **first deploy**: merge to `main` fast-forward, run `npx vercel deploy --prod --yes`, and
   load the live Home page.

### Phase 1: Search results `/search` (19:25–19:55)

Reference: `design/stitch/02-search.html`, `02-search-loading.html`, `02-search-empty.html`.
Render the HTML with Playwright to look at it. **Do not paste it.** Files:
`pages/SearchPage.tsx`, `components/search/{FilterSidebar,SortBar,Pagination}.tsx`.
The API already supports `q, category, brand (comma-separated), minPrice, maxPrice,
minRating, inStock, sort, page`, and returns `facets.brands` and `facets.priceRange`.

- Breadcrumbs (Home › department name or "Search"), the heading "Results for “q”" (or the
  department name), and "N items" in slate. The sort `Select` sits on the right of the heading
  row.
- Desktop: a 16rem left sidebar with sections split by `border-line` rules:
  - Department: radio list, with the active one in harbor.
  - Brand: checkboxes with counts. Show the first 6, then a "Show more" toggle.
  - Price: min and max inputs plus an "Apply" pill, with the facet range as placeholders.
  - Customer rating: radio rows "4★ & up", "3★ & up".
  - In stock only: a switch.
- An active-filter chip row above the grid. Each chip has a × with an `aria-label` like
  "Remove brand Apple", and the row ends with a "Clear all" quiet button.
- Grid of `ProductCard`: 2 columns on mobile, 3 at `md`, 4 at `xl`. `Pagination` goes below it.
- Mobile: the sidebar is hidden. A "Filters (n)" pill opens the same filters in a full-height
  drawer, with a sticky "Show N results" footer. Focus is trapped and Esc closes it; reuse the
  pattern from `AllMenu.tsx`.
- Loading: 8 skeleton cards in the same grid, plus a skeleton sidebar.
- Empty: `EmptyState` ("No results for “q”") with "Clear filters" (when filters are set)
  and department chips from `/api/categories`.
- All state stays in the URL (it already does; keep it that way).

### Phase 2: Product detail `/product/:id` (19:55–20:25). Checkpoint 2: deploy

Reference: `design/stitch/03-product.html`, minus everything in "Never build". Files:
`pages/ProductDetailPage.tsx`, `components/product/{ImageGallery,PriceTag,QuantitySelector,SpecsTable,RatingBreakdown,ReviewList,WriteReviewForm}.tsx`.

- Breadcrumbs: Home › Department › title (truncated).
- Two columns at `lg`. **Left:** the gallery, with a large `bg-paper rounded-2xl` well and
  thumbnail buttons (`rounded-xl`, harbor ring on the active one, `aria-label`
  "Show image 2 of 5"). **Right:**
  - the brand eyebrow, then the `h1` (`text-2xl sm:text-3xl font-extrabold tracking-tight`)
  - the rating, as a link to `#reviews`
  - the price block: large price, then the list price struck through and the `-N%` clay pill
    when discounted
  - the stock line: moss "In stock", clay "Only N left" or "Out of stock"
  - the quantity stepper (a pill with − and +, each 44px)
  - a primary "Add to cart" button (full width on mobile), then a round heart
    `AddToListMenu`
  - a `bg-paper` promises list with the three true promises
- Below: the description, then a "Specifications" `Panel` with two-column rows (real fields
  only), then Reviews (`id="reviews"`). Reviews are `RatingBreakdown` on the left and the list
  on the right; the list is a set of cards with the star filter and sort as chips. The write
  form is its own Panel.
- "You may also like": a `ProductRow` fed by `api.relatedProducts(id)`.
- Mobile: a sticky bottom bar with the price and "Add to cart" once the main button scrolls out
  of view. This is optional; skip it if you are behind schedule.
- Skeleton in the same two-column shape. Not found: `EmptyState` with a link back to search.
- **Checkpoint 2:** typecheck, browser pass, merge, deploy.

### Phase 3: Cart `/cart` (20:25–20:40)

Files: `pages/CartPage.tsx`, `components/cart/CartLineItem.tsx`, `components/checkout/OrderSummary.tsx`.

- `PageHeader` "Your cart" with the item count.
- The line items sit in one Panel with dividers. Each row has:
  - a 96px image well
  - the title as a link, and the brand eyebrow
  - the stock note
  - the quantity stepper
  - quiet "Save for later" and "Remove" buttons
  - the line total on the right
- Right sidebar: a sticky summary Panel with Subtotal (N items), Delivery "Free" and Total. A
  full-width primary "Proceed to checkout" follows, then the promises in slate text.
- "Saved for later" is a grid of compact cards with "Move to cart".
- Empty cart: `EmptyState` (ShoppingBag icon, "Your cart is empty", "Start shopping"), then a
  "Top rated" `ProductRow` from `useHome()` (real data).
- Skeleton lines while loading.

### Phase 4: Checkout `/checkout` (20:40–21:15). Checkpoint 3: deploy

Files: `pages/CheckoutPage.tsx`, `components/checkout/*`. **The highest-risk page, because
real Stripe money flow runs through it.** Change markup and classes, not logic.

- New `components/checkout/Stepper.tsx`: Address → Delivery → Payment → Review. Steps are
  numbered circles joined by lines, in the same visual language as `OrderStatusTracker`.
  Set `aria-current="step"`; completed steps are buttons that go back.
- Each step is a Panel. When a step is completed it collapses to a one-line summary with a
  "Change" quiet button.
- Address: saved addresses as selectable option cards (default first, with a "Default" badge),
  then an "Add a new address" dashed-border card that expands `AddressForm`, which uses the
  input recipe in a 2-column grid on `sm`.
- Delivery: option cards showing the real speed, price and ETA from the quote API.
- Payment: keep the Stripe Elements `appearance` in `StripePaymentStep.tsx` matching the tokens:
  `colorPrimary #0f3a40`, `borderRadius 12px`, font Plus Jakarta Sans, `colorDanger #b3261e`.
  Add a `bg-paper` "Test mode" note showing the two test cards from HANDOFF.
- Review: the items, address and delivery summary, then a primary "Place order" with `loading`.
- Sticky `OrderSummary` sidebar. On mobile it appears above the steps as a collapsible panel.
- **Test the full purchase at 390 wide** with `4242…` (approves) and `9995` (declines, and the
  error must be visible and clear). Afterwards cancel the test order from the order page so
  stock is returned. Then run checkpoint 3.

### Phase 5: Admin panel, desktop + mobile (21:15–22:00). Checkpoint 4: deploy

Files: `components/admin/*`, `pages/admin/*`. Admin is part of the "real backend" story, so it
gets a proper pass. **Change markup and classes only; keep every hook, mutation and guard as it
is.** The admin API tests don't need to change.

**Signing in for checks.** The admin password is not in the repo and must not appear in chat,
because `.agent-logs/` is public. Create a throwaway admin with
`npm run create-admin -w server -- --email <throwaway>@harbor-market.test --password <generated>`.
Generate the password inside a script and keep it only in a file in the session scratchpad, never
printed. Delete that user in Phase 9.

**5a. Desktop (~25 min)**

- `AdminLayout`:
  - Main area background `bg-canvas`, to match the store.
  - White sidebar with `Logo` and the "Admin" badge.
  - Nav items are `rounded-xl h-10 px-3`; the active one is `bg-mint text-harbor font-semibold`.
  - At the bottom, a user card: an initial avatar, the email (truncated, with `title`),
    "View store" and "Sign out".
- Every admin page starts with `PageHeader`: the title, a one-line description, and actions on
  the right (for example a primary "New product" on Products).
- Dashboard:
  - `StatCard` is a Panel with a 40px `bg-mint` icon square, an `eyebrow` label, the value in
    `text-2xl font-extrabold .amount`, and the change as a small moss or clay pill.
  - The range picker is a segmented pill control (`role="radiogroup"`).
  - `OrdersChart` uses harbor for the series, `line` for gridlines, and slate for axis text.
    Read the `dataviz` skill before touching it, and keep the existing `sr-only` data table.
  - Recent activity (`ActivityList`) goes in a Panel.
- Tables (Products, Orders, Customers, Reviews, Customer detail):
  - Wrap each in a Panel.
  - Above the table, a toolbar: a pill search input, then filters as a `Select` or chips.
  - Header row: `bg-paper text-xs font-bold uppercase tracking-wider text-slate`.
  - Rows: `border-t border-line hover:bg-paper/60`, about 56px tall.
  - Product thumbnails sit in 40px `bg-paper rounded-lg` wells. Status uses `Badge`
    (`AdminOrderStatusBadge`).
  - Row actions are quiet icon buttons with an `aria-label`. Use the shared `Pagination`.
- `ProductForm` / `AdminProductFormPage`:
  - Sections in separate Panels: Basics, Pricing and stock, Images, Visibility. Two columns
    from `md` up. Errors appear under each field.
  - A sticky bottom action bar holds Cancel (secondary) and Save (primary with `loading`).
- `AdminOrderDetailPage`:
  - The same two-column layout as the shopper's order detail: `OrderStatusTracker` and items on
    the left, with customer, address and payment in the sidebar.
  - Actions: "Mark shipped" / "Mark delivered" (primary), and "Cancel and refund" (danger)
    behind `ConfirmDialog`.
- `ConfirmDialog`: a `rounded-2xl` panel on a `bg-harbor-dark/40` backdrop, with focus
  trapped, Esc to close, pill buttons, and the destructive button last.
- `InlineStockEditor`: a pill input with − and + buttons.

**5b. Mobile, below `lg` (~20 min)**

Today, on phones, the nav is a sideways-scrolling tab row, **Sign out is hidden (`hidden
lg:block`), which is a bug to fix**, and the tables are 720–760px wide, so they scroll sideways.

- **Top bar + drawer:**
  - Replace the tab row with a sticky top bar: a menu button (`h-11 w-11`,
    `aria-label="Open admin menu"`, `aria-expanded`), then `Logo compact` and the "Admin"
    badge, then a "View store" icon link on the right.
  - The menu button opens a left drawer holding the nav, the user card and **Sign out**. Reuse
    the `AllMenu.tsx` pattern: focus trap, Esc and backdrop click close it, body scroll is
    locked, and focus returns to the menu button.
  - The drawer closes when the route changes.
- **Tables become cards below `md`:**
  - Products, Orders, Customers and Reviews render a `md:hidden` card list from the same data,
    next to the `hidden md:block` table.
  - Each card is a Panel with: the thumbnail or initial avatar, the title, 2–4 key fields as
    label/value pairs, the status Badge, and the same actions as the row (44px targets).
  - Tapping the card title opens the detail page.
  - Customer detail's small order table can keep `overflow-x-auto` inside its Panel.
- **Toolbars:** the search is full width. Filter chips go in their own `overflow-x-auto` row,
  so only that row scrolls and never the page.
- **Dashboard:** stat cards two across, then the chart full width with fewer axis ticks, then
  activity.
- **Product form:** one column. The sticky save bar gets `pb-[env(safe-area-inset-bottom)]`.
- **Order detail:** the sidebar stacks under the items, with the action buttons full width.
- **Check at 390 and 768:** on every admin route,
  `document.documentElement.scrollWidth <= clientWidth`. The drawer must open and close by
  keyboard, and Sign out must work from the drawer.
- **Checkpoint 4:** typecheck, run `npm test` (a safety net, though the server should be
  unchanged), then commit, merge and deploy. Log into the live `/admin` on a 390-wide viewport.

### Phase 6: Orders `/orders` + order detail `/orders/:id` (22:00–22:15)

Files: `pages/OrdersListPage.tsx`, `pages/OrderDetailPage.tsx`, `components/orders/*`.

- List: `PageHeader` "Your orders". Each order is a Panel:
  - a `bg-paper` header strip with Placed on, Total, Order # and the status Badge
  - a body with up to 4 thumbnails plus "+N more", and a secondary "View order" button
- Empty: `EmptyState` with "Start shopping". Skeleton cards while loading.
- Detail: breadcrumbs (Your orders › #id), then:
  - a mint success banner when arriving from checkout
  - `OrderStatusTracker` (already restyled)
  - an items Panel
  - a sidebar with the shipping address, delivery and a payment summary
  - a danger-secondary "Cancel order" behind a confirm, shown only while the order is
    cancellable

### Phase 7: Sign in / sign up / codes `/login`, `/signup` (22:15–22:30). Checkpoint 5: final deploy

File: `pages/AuthPage.tsx`. It renders outside `Layout`.

- At `lg`, a split layout:
  - Left: a `bg-mint` brand panel with `Logo`, the headline "Everything you need, one market."
    and the three promises.
  - Right: a centred form card, `max-w-md`.
- Mobile: the logo above the form card only.
- Replace every "amazon-clone" string with "Harbor Market" (three occurrences in this file).
- Code inputs (email OTP, 2FA): one `h-12` input with `inputMode="numeric"`,
  `autoComplete="one-time-code"`, `tracking-[0.5em] text-center text-lg`.
- Errors in `role="alert"`, and `loading` on submit.
- **Checkpoint 5:** typecheck, a browser pass through the demo path (Home → Search → Product →
  Cart → sign in → Checkout → Order), merge, deploy, verify live.

### ✂ CUT LINE: 22:15, CODE FREEZE: 22:30

At 22:15, finish whatever phase is in progress in its simplest form and ship. Phase 7 (auth)
already uses the new inputs and buttons from Phase 0, so it can be cut to just the
"amazon-clone" string fix if needed. After 22:30, only Phase 9 remains, and it changes no UI.

### Phase 8 (stretch, after the freeze only if the author agrees): account area

- New `components/account/AccountShell.tsx`. On desktop it is a left nav (Account, Orders,
  Lists, Addresses, Security, with the active item `bg-mint text-harbor`). On mobile it is a
  scrollable pill row. Wrap `AccountPage`, `AddressesPage`, `ListsPage` and `SecurityPage` in it.
- `AccountPage`: a greeting, then tiles (a mint icon square, a title and a one-line
  description).
- `AddressesPage`: address cards with a Default badge and "Set as default" / "Remove", plus
  a dashed "Add address" card.
- `ListsPage`: list pills, then a `ProductCard` grid.
- `SecurityPage`: separate Panels for 2FA, recovery codes and sign out everywhere.
- `NotFoundPage`: `EmptyState` with a search link and "Back to home".

The account pages already inherit Phase 0's primitives, so they look consistent even if this is
never done.

### Phase 9: wrap-up (22:30–22:45; no UI changes, so it can run while the author records the video)

- User-visible "amazon" strings:
  - `server/src/lib/mail.ts` subjects and body text become "Harbor Market".
  - `server/src/config.ts` gets the default `RESEND_FROM_NAME` "Harbor Market" (the env var
    on Vercel may override it; leave it alone).
  - `server/src/routes/orders.ts` gets the Stripe description "Harbor Market order …".
- **Do not** rename the demo email `demo@amazon-clone.test` (it is in the README and the
  submission), the cart `localStorage` keys (renaming them empties shoppers' carts), or the
  repo.
- Delete the throwaway admin user created in Phase 5, and any other test data.
- Run `npm test`, since the server changed.
- README: replace the screenshots or description if time allows.
- Update the HANDOFF checklist and commit. Final merge, deploy, and a live check at
  https://harbor-market-demo.vercel.app of the demo path at 390 and 1280.

---

## Checkpoint procedure (copy for each deploy)

1. Run `npm run typecheck` (it must be clean), plus `npm test` if anything in `server/` changed.
2. Run `npm run build -w client`, start the API and `serve-local.mjs`, and use Playwright at 1280
   and 390 for the pages touched:
   - `document.documentElement.scrollWidth <= clientWidth` (no horizontal scroll)
   - key headings and buttons present
   - no console errors
   - view the screenshots yourself before calling the page done
3. Commit on `redesign/stitch` with a message like "Redesign: search page". End it with the
   Co-Authored-By line the harness gives.
4. `git checkout main && git merge --ff-only redesign/stitch && git push origin main redesign/stitch && git checkout redesign/stitch`
5. Run `npx vercel deploy --prod --yes` (retry once on "Not authorized"), then load the live URL.

Local testing uses the **live** database: delete any throwaway data you create, and cancel
test orders so stock is returned.

## Kick-off prompt for the next session

> Read docs/HANDOFF.md, then docs/BUILD_PLAN.md, and execute BUILD_PLAN.md from the first
> unchecked phase. Stitch is dropped; don't call it. Use the ui-ux-pro-max skill by reading its
> references (Python isn't installed). Deploy at every checkpoint and respect the 22:15 cut
> line and the 22:30 code freeze. Tick phases off in the HANDOFF checklist as you finish them.
