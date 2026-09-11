# UI/UX and responsive audit

Date: 28 August 2026

## Scope

Reviewed the customer journey and shared admin/POS components. Browser checks used the local application, guest state, and an existing one-item cart. No orders, payments, messages, OTPs, or staff-data changes were submitted. Existing unrelated workspace changes were preserved.

This is a practical audit, not a certification that every screen or workflow is bug-free. Staff workflows and authenticated customer states still require dedicated test accounts and representative data.

## Fixed in this pass

| Area | Problem | Change |
| --- | --- | --- |
| Cart | At 320px the image, name, price, and quantity controls squeezed into one row. | Controls move onto a separate row below 400px; quantity buttons measure about 46px on phones. |
| Menu controls | Small portion, filter, and layout controls were difficult to tap. | Increased mobile targets while retaining denser desktop controls. |
| Forms | Mobile authentication and customer fields used small input text. | Use 16px on narrow screens; retain smaller desktop typography. Added clear sign-in/create-account labels, loading text, and named password controls. |
| Drawers | Non-modal sheets and global CSS defeated background scroll and pointer locking. | Restored modal sheets and library scroll locking; added descriptive titles/text and larger close controls. |
| Footer | Spacing before the footer did not protect its final links from fixed navigation/action bars. | Put responsive clearance inside the footer; menu, cart, and checkout policy links remain above the fixed controls. |
| Payment selection | Buttons with radio roles lacked native radio semantics. | Use labelled native radios with a shared group name and disable them during submission. Click selection verified. Arrow-key selection still needs a real-keyboard check. |
| Admin tables | Sorting only responded to mouse clicks on table headers; nested scroll containers undermined sticky headers. | Sortable headings now contain buttons and expose sort state. Search has an accessible name. One outer region owns scrolling. Regression tests cover the rendered structure. |
| Notifications | Changing the mobile offset did not move a bottom-positioned toast away from bottom actions. | Select top-center positioning below 1024px using the existing SSR-safe media hook; set both regular and mobile offsets to cover Sonner's 600px breakpoint. |
| Header | Tablet labels wrapped, and optional staff/contact actions competed for space. | Keep labels on one line, tighten tablet spacing, and show optional header shortcuts at wider breakpoints. Staff dashboard remains available in the account menu. |
| Ratings | Missing database ratings and bundled menu items received an invented 4.5 rating. | Missing ratings are now zero/hidden; fallback and future seed data no longer invent ratings. Existing database values were not changed. |

## What should happen next

### 1. Make payment recovery durable — highest priority

`src/app/checkout/page.tsx` verifies payment and saves the order in separate requests. A paid-but-unsaved order currently gets a toast warning. Give that state a persistent recovery screen containing the payment reference, order reference, contact action, and a safe retry/refresh status action. Reconcile payment and order state on the server; test duplicate callbacks, refreshes, timeouts, and retries without charging again. This needs payment-provider test mode and failure injection, not a live purchase.

Acceptance: a customer who has already paid can recover after closing the page, and retries cannot create another charge or duplicate kitchen order.

### 2. Show food sooner on mobile

In the loaded menu, the first dish began roughly 740–810px down the document on narrow phones. The restaurant summary, filters, promotion, and category rail consume most of the opening screen. Keep the title and search compact, make the promotion dismissible or smaller, and reduce overlapping menu/cart/navigation controls. Preserve one obvious cart action.

Acceptance: at 390 × 844, at least one useful dish card and its Add action are visible without scrolling. Keep categories reachable after scrolling.

### 3. Validate admin/POS with real role-specific test accounts

Source review covered shared layout, sidebar, tables, and the POS bill panel, but authenticated screens were not browser-tested. Exercise admin, cashier, waiter, and kitchen roles separately. Test many rows, long dish/customer names, multi-portion orders, empty/error states, and a populated bill drawer at short landscape heights. Several staff controls remain compact and deserve a touch-target pass.

Acceptance: basket items, totals, validation messages, and payment/hold actions remain reachable at 360px portrait, 844 × 390 landscape, and tablet widths. Verify role visibility, focus order, and permissions without bypassing authentication.

### 4. Verify customer-facing content

The loaded menu shows many identical ratings and aggregated review counts. The fallback bug is fixed, but existing stored ratings/counts still need owner verification. Use real dish photography and confirm descriptions, portion sizes/servings, spice information, and dietary/allergen details. Check that claims about notifications, preparation times, and restaurant history match actual operations.

Acceptance: no unverified review counts or service promises are presented as measured facts; customers can understand what each portion contains.

### 5. Make loading, unavailable, and error states explicit

`useMenuItems` can return the bundled menu when the database fails, making stale data look live. Show a clear availability warning and prevent customers from mistaking cached prices/stock for confirmed availability. Keep customer details and the basket when retrying. The server should remain authoritative for price and stock.

Acceptance: an offline or failed menu request is distinguishable from a successful live response, and retrying does not lose user input.

### 6. Add repeatable UI and accessibility checks

Add browser regression coverage for menu → cart → checkout, drawer open/close/focus, payment selection, table sorting, and footer clearance. Include long text and unavailable dishes. Measure text/button contrast, test keyboard-only navigation and a screen reader, and check real iOS/Android keyboards and safe areas. Viewport resizing does not simulate these device behaviors.

## Verification

| Route/state | 320px | 390px | 768px | 1440px |
| --- | --- | --- | --- | --- |
| Menu, loaded dishes | No page overflow | No page overflow | No page overflow | No page overflow |
| Cart, one item | No page overflow | No page overflow | No page overflow | No page overflow |
| Checkout, unsubmitted | No page overflow | No page overflow | No page overflow | No page overflow |
| Sign in | No page overflow | No page overflow | No page overflow | No page overflow |
| Create account | No page overflow | No page overflow | No page overflow | No page overflow |
| Contact, unsubmitted | No page overflow | No page overflow | No page overflow | No page overflow |
| Orders, guest empty state | No page overflow | No page overflow | No page overflow | No page overflow |
| Profile, guest sign-in prompt | No page overflow | No page overflow | No page overflow | No page overflow |

Additional checks: 320px cart screenshot; 844 × 390 checkout screenshot; 640 × 360 drawer with its own scrollable content; navigation overlay/background lock; Escape closes and returns focus to the menu trigger; category selection closes the sheet and filters the menu; footer policy links above menu/cart/checkout bars at 390px. Mobile sign-in and contact fields measured 16px. No browser warnings/errors were reported in the final checkout log sample.

Native radio click selection was checked, but automated arrow presses did not demonstrate native keyboard movement. Verify that interaction with a physical keyboard before accessibility sign-off. Admin sorting has semantic regression coverage, not an authenticated browser interaction test. Toast placement was changed in code; a full notification-state visual pass remains outstanding.

Automated checks: all 86 tests pass; ESLint, TypeScript, whitespace checks, and the production build pass. The build generated all 48 static pages successfully. The seed script also passes a syntax check; it was not executed against the database.
