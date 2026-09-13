# Amazon product recon

Date: 2026-09-13

The recon was performed in Chrome against amazon.com. The account was signed in manually by the user; Codex never entered a password, OTP, passkey, or email credential. Screenshots are stored in `docs/screenshots/`.

## 1. Signed-out home

Screenshots: `01-home-top.png`, `02-home-full.png`, `03-home-account-dropdown.png`, `04-home-all-menu.png`.

Steps: Open amazon.com. Inspect the header, hover/open Account & Lists, then open the All menu and scroll through the home page.

What happens: The header exposes Amazon, delivery destination, department selector, search, language, sign-in/account, Returns & Orders, and Cart. The secondary bar contains Prime Video, Coupons, Customer Service, Today's Deals, Registry, Gift Cards, Sell, and accessibility support. Account hover opens sign-in plus list/account shortcuts. All opens a left navigation drawer over a dimmed page. The home page uses a hero carousel followed by card grids, product rails, and a multi-column footer.

Data shown: Hero promotion, category cards, product images/titles/prices/ratings where available, delivery/location messaging, department links, footer legal/help/company/payment links.

Edge cases: The signed-out destination was Pakistan, so Amazon displayed international-shipping messaging and some products were not shippable there.

Notes: The home page is very long and content-heavy; the navigation drawer and account flyout are important reusable states.

## 2. Sign-up and sign-in screens

Screenshots: `11-signin-create-account.png`, `12-signin-empty-validation.png`, `50-signed-out.png` (the shared first screen).

Steps: Open either the sign-in or sign-up flow. Both begin on the same “Sign in or create account” page shown in `50-signed-out.png`. Continue with sign-in or account creation.

What happens: Amazon presents “Sign in or create account” with a mobile-number/email field, Continue, terms/privacy links, Need help?, and a business-account link. Empty submission shows “Enter your mobile number or email.” After continuing, the sign-in and sign-up interfaces look substantially the same. Sign-in proceeds to a password-only screen. Sign-up proceeds to a form for name, password, and password re-entry. After sign-in succeeds, Amazon redirects to the home page. After sign-up, Amazon redirects to an OTP page for the code sent to the account email; account creation completes after that verification step.

Data shown: Email/mobile field, name field for sign-up, password and re-enter-password fields for sign-up, password field for sign-in, OTP entry for sign-up email verification, validation message, legal links, help link, and business-account CTA.

Edge cases: The first screen is shared by sign-in and sign-up, and the UI remains visually similar through the password stages. The sign-up path has the extra email OTP verification step; sign-in redirects directly to home. The password and OTP screens were handled manually and were not captured by Codex. No credentials were entered or viewed by Codex.

## 3. Signed-in home

Screenshots: `13-signed-in-home-top.png`, `14-signed-in-home-full.png`, `15-signed-in-account-dropdown.png`, `16-signed-in-all-menu.png`.

Steps: After the user signed in, reload home, open Account & Lists, then open All.

What happens: The greeting changes to the signed-in customer, the subnav gains personalized links such as Buy Again, Groceries, and Pharmacy, and the page adds recommendation/personalization rails including “Most-loved picks for you.” Account flyout adds account email, Switch Accounts, Sign Out, Your Account, Orders, Recommendations, Returns, Browsing History, and list shortcuts. The All menu also includes signed-in personalization.

Data shown: Greeting, destination, personalized product cards, recently viewed/recommendation areas, account shortcuts, lists, orders, returns, and sign-out.

## 4. Search

Screenshots: `05-search-autocomplete.png`, `06-search-results-top.png`, `07-search-results-full.png`, `08-search-sort-dropdown.png`, `09-search-no-results.png`, `10-search-no-results-full.png`.

Steps: Type `wireless earbuds`, capture autocomplete, submit, open sort, inspect filters and pagination, then search `qzxqzxqzx`.

What happens: Autocomplete suggests wireless earbuds, noise cancelling, for iPhone, JBL, Beats, ear hooks, noise cancellation, long battery life, and brand suggestions. Results show “1-16 of over 10,000 results,” sponsored cards, filters, and sort choices. The page exposes Featured, price low/high, review score, newest, and best-seller sorting. The no-results page is a sparse Results page with “Check each product page for other buying options.”

Data shown: Product image/title, rating, review count, bought-past-month count, current/list/typical price, discount, Prime/delivery date, seller/shipping, sponsored labels, brand/deal/color/noise-control/connectivity/condition filters, and pagination.

## 5. Category browse

Screenshots: `17-electronics-category-top.png`, `18-electronics-category-full.png`.

Steps: Open All, choose See All Departments, choose Electronics, and inspect the Electronics showcase.

What happens: The category landing page provides a department sidebar, category tiles, product rails, and a category-specific subnav.

Data shown: Electronics subcategories such as Camera & Photo, Cell Phones, Computers, Home Audio, Headphones/Earbuds, and accessories; rails for Computers, Headphones, Home Audio, Cell Phones, Wearable Tech, TVs, Video Games, Cameras, JBL, Apple, tech deals, and featured products.

## 6. Product detail

Screenshots: `19-product-detail-top.png`, `20-product-detail-full.png`, `21-product-image-gallery.png`, `22-product-image-zoomed.png`, `23-customer-reviews-page.png`, `24-customer-reviews-full.png`.

Steps: Open Apple AirPods Pro 3 (ASIN B0FQFB8FMG), inspect the gallery, open ImmersiveView and zoom, then open the customer reviews page.

What happens: The page combines image thumbnails/videos, title/byline, rating, Amazon's Choice, bought-past-month proof, price/list-price savings, delivery/stock/quantity, Add to Cart, Buy Now, seller/returns/gift options, AppleCare options, About this item, comparison table, product-information table, Q&A, and reviews. Reviews expose a rating histogram, AI “Customers say” summary, aspect tabs, top reviews, helpful/report actions, and an unusual-activity access warning on the full reviews page.

Data shown: Apple brand; White; In Ear; Bluetooth/Wireless; 4.4/5; 15,052 reviews; 10K+ bought; $199; list $249; free returns; delivery estimate; In Stock; seller Amazon.com; ANC, spatial audio, heart-rate sensing, Live Translation, hearing-health, battery, and fit bullets; dimensions, weight, manufacturer, ASIN, model, batteries, date available, units, contents of box, Q&A prompts, and review counts.

Edge cases: Variant controls were limited on this listing; the signed-out/mobile location later produced “This item cannot be shipped to your selected delivery location.”

## 7. Add to cart

Screenshots: `25-add-to-cart-protection-sheet.png`, `26-cart-with-item.png`, `27-cart-quantity-2.png`, `28-cart-saved-for-later.png`, `30-cart-empty.png`, `31-cart-empty-full.png`.

Steps: Add the AirPods, dismiss the AppleCare side sheet with No thanks, open the cart, increase quantity from 1 to 2, Save for later, Move to cart, then delete the item after confirmation.

What happens: Add to Cart opens an “Add to your order” AppleCare sheet. The cart shows item selection, price, stock, delivery, gift checkbox, quantity controls, Delete, Save for later, Compare, subtotal, related products, and Prime promotion. Quantity 2 updates subtotal to $398. Save for later moves the item to a separate tab with Move to cart/Delete/Add to list controls. Deletion produces an in-place removed-from-cart confirmation and subtotal $0.00.

Data shown: Product title, $199 unit price, quantity, $398 subtotal at quantity 2, stock, delivery date, free returns, best-seller label, related item cards, cart subtotal, gift checkbox, financing/Prime promotions.

Edge cases: Screenshot `29-cart-moved-back.png` was not saved before continuing; the Move to cart state was observed in the accessibility tree and the following empty state was captured. The cart was later repopulated once for checkout inspection, then left signed out with an empty visible cart.

## 8. Checkout

Screenshots: `32-cart-before-checkout.png`, `33-checkout-address-step.png`, `34-checkout-address-form.png`, `35-checkout-test-address-filled.png`, `36-checkout-public-test-address.png`, `37-checkout-payment-step.png`, `add-credit-or-debit-card.png`.

Steps: Proceed to checkout, inspect the address step, enter fictional test identity/phone details plus a public business address, leave default-address unchecked, and continue. On the Payment method page, click Add a credit or debit card to open the card-entry modal, then inspect it without entering data or clicking Add and continue.

What happens: The initial checkout page asks for a delivery address and shows the order total. The blank address form contains country, full name, phone, street, unit, city, state, ZIP, default-address checkbox, delivery instructions, and Use this address. Amazon rejected the first fictional street as unverifiable. A public business address was accepted and checkout advanced to Payment method. No saved payment method existed; Amazon offered gift-card entry, credit/debit card, Affirm, checking account, and OTC card paths. Clicking Add a credit or debit card opens a centered modal over a dimmed payment page. The modal says Amazon supports all major credit and debit cards and shows required fields for Card number, Expiration (MM/YY), Security Code (CVV 3–4 digits), and Name on card. It includes Add and continue, a close X, and an encrypted/secure-information notice. No payment method was added and no order/review submission was attempted.

Data shown: Order total initially $199 and later $219.99 on the payment modal screenshot; test shipping identity/address; payment-method categories; gift-card code field and Apply; card-entry fields; Add and continue; encryption notice; Add card/checking-account/OTC links; Use this payment method remained disabled.

Edge cases: Checkout could not reach the final review page without adding a payment method. The card modal is a blocking overlay and all card fields are required. This flow is intentionally incomplete and no purchase action was taken.

## 9. Account

Screenshots: `38-account-hub.png`, `39-account-hub-full.png`, `40-orders-empty.png`, `41-orders-empty-full.png`, `42-addresses.png`, `43-lists-landing.png`, `44-recon-test-list-empty.png`, `45-list-item-added-confirmation.png`, `46-recon-test-list-with-item.png`, `47-browsing-history.png`.

Steps: Visit Your Account, Your Orders, Your Addresses, Lists, create `Recon Test List`, add the AirPods to it, and open Browsing History.

What happens: Account hub groups quick links, settings, rewards, privacy, programs, orders, lists, and sign-out. Orders offers search, time filters, tabs for Buy Again/Not Yet Shipped/Digital Orders/Amazon Pay, and an empty state. Addresses displays the test address with edit/delete/default controls. Lists starts with an onboarding page, then shows a private list. Adding the AirPods produces a confirmation and the list displays the item. Browsing History shows the viewed AirPods with price, rating, delivery, and Remove from view.

Data shown: Account navigation, order count/empty state, address fields, list name/privacy, item title, price/rating/delivery, history settings, and recommendation rails.

## 10. Returns and help

Screenshots: `48-returns-center.png`, `49-customer-service.png`.

Steps: Open Online Return Center, then Customer Service.

What happens: Returns shows return-policy copy, Start a Return in Your Orders, gift-return order-number lookup, return-management link, product support eligibility, FAQ accordions, refund timing, replacements/exchanges, and policy links. Customer Service shows quick actions for tracking, returns, refunds, returns tracking, Prime, settlements, payments, Prime Video, shopping questions, order/device/content/payment/login/privacy issue categories, and an empty-order message.

## 11. Sign out

Screenshots: `50-signed-out.png`.

Steps: Use Sign out from the account flow.

What happens: Amazon returns to the unified Sign in or create account page with an empty mobile/email field.

## 12. Mobile at 390px

Screenshots: `51-mobile-home.png`, `52-mobile-home-full.png`, `53-mobile-search-autocomplete.png`, `54-mobile-search-results-top.png`, `55-mobile-search-results-full.png`, `56-mobile-product-page.png`, `57-mobile-product-full.png`, `58-mobile-cart.png`, `59-mobile-cart-full.png`.

Steps: Set the browser viewport to 390px wide, inspect home, search, product, and cart, then reset the viewport.

What happens: The responsive header compresses search/navigation and the page becomes a single-column/stacked flow. Mobile search results retain the search header and product list but reduce the visible filter/navigation treatment. The product page retains gallery, title, reviews, and details but the selected Pakistan destination makes the AirPods unavailable for shipping. The signed-out cart is empty and offers Shop today's deals, Sign in, and Sign up.

Edge cases: Mobile autocomplete did not expose the desktop suggestion list in the accessibility tree; the screenshot records the filled search state and international-shipping alert.

## Core loop

1. Home/category discovery
2. Search results and filters
3. Product detail/reviews
4. Cart and quantity/save/delete controls
5. Checkout address, delivery, payment, and review
6. Account/order support after purchase

## Data model sketch

- User: id, name, email/mobile, locale, delivery destination, preferences, browsing history.
- Address: id, user id, full name, phone, street, unit, city, state/region, postal code, country, default flag, delivery instructions.
- Category: id, parent id, name, department, navigation links, filters.
- Product: ASIN, title, brand, description/bullets, images/videos, specs, category, seller offers, price/list price, availability, shipping, return policy.
- Variant: product id, color/size/fit/compatibility, availability, price, ASIN.
- Review: id, product id, author, star rating, title, body, date, verified-purchase flag, helpful count, media, report state.
- Question/Answer: product id, question, answer, author, date.
- Recommendation: user/session id, product id, rail/context, ranking metadata, sponsored flag.
- Cart: id, user/session id, items, subtotal, destination, selected-for-checkout state, saved-for-later items.
- CartItem: product/variant id, quantity, unit price, gift flag, save-for-later state, protection-plan choice.
- Order: id, user id, address, delivery option, payment method, items, taxes, total, status, shipment/returns.
- List: id, owner id, name, privacy, collaborators, items, priority, purchase state.
- BrowsingHistory: user/session id, product id, viewed timestamp, removed flag.
- SupportCase/Return: order/item id, reason, status, refund/replacement, return label/drop-off data.

## Nice to have

Prime media promotions, Alexa/Rufus surfaces, extensive recommendation rails, sponsored ads, product comparison tables, AI review summaries, review-media carousels, registries, financing promotions, accessibility call links, international currency/country controls, and detailed footer ecosystem links could be skipped in a 24-hour rebuild.

## NEEDS REDACTION

The following screenshots contain the signed-in account greeting, delivery destination, account/list name, email, or account-linked checkout/cart content and must be blurred or cropped before public release:

`13-signed-in-home-top.png`, `14-signed-in-home-full.png`, `15-signed-in-account-dropdown.png`, `16-signed-in-all-menu.png`, `17-electronics-category-top.png`, `18-electronics-category-full.png`, `19-product-detail-top.png`, `20-product-detail-full.png`, `21-product-image-gallery.png`, `22-product-image-zoomed.png`, `23-customer-reviews-page.png`, `24-customer-reviews-full.png`, `25-add-to-cart-protection-sheet.png`, `26-cart-with-item.png`, `27-cart-quantity-2.png`, `28-cart-saved-for-later.png`, `30-cart-empty.png`, `31-cart-empty-full.png`, `32-cart-before-checkout.png`, `34-checkout-address-form.png`, `37-checkout-payment-step.png`, `add-credit-or-debit-card.png`, `38-account-hub.png`, `39-account-hub-full.png`, `40-orders-empty.png`, `41-orders-empty-full.png`, `42-addresses.png`, `43-lists-landing.png`, `44-recon-test-list-empty.png`, `45-list-item-added-confirmation.png`, `46-recon-test-list-with-item.png`, `47-browsing-history.png`, `48-returns-center.png`, `49-customer-service.png`.

The test details in `35-checkout-test-address-filled.png` and `36-checkout-public-test-address.png` are fictional/public-business data, but review them before publishing. `29-cart-moved-back.png` does not exist because that transient state was not captured.
