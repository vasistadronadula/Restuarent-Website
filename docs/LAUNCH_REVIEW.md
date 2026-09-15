# Public launch review — 14 September 2026

## Required deployment steps

Apply these migrations to the intended Supabase project **before public traffic**:

1. `20260914000000_restore_authorization_boundaries.sql`
2. `20260914010000_durable_checkout_retries.sql`
3. `20260914020000_menu_upload_formats.sql`
4. `20260915000000_order_tenant_and_money_guards.sql`
5. `20260916000000_slot_lock_staff_only.sql`

Use `supabase migration list` to confirm the linked project and migration state,
then `supabase db push`. Deploy the updated Next.js app and Java business service.
The Java checkout endpoint requires the new `checkout_requests` table.

The first migration repairs a critical authorization regression in
`20260913000000_fix_service_role_admin_permissions.sql`: `current_user` inside a
`SECURITY DEFINER` function is its owner, commonly `postgres`, not the API caller.
If that migration was publicly deployed, review existing staff accounts and
`profiles.role` assignments for unauthorized changes. Applying the fix prevents
new privilege escalation; it cannot identify or undo prior unauthorized changes.

The hard-coded admin email override has also been removed. Legitimate owners
must have `role = 'admin'` in their own profile; revoked roles now stay revoked.

Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS public origin, particularly when
running behind a reverse proxy. The Java API requires `SUPABASE_JWT_SECRET` for
its supported HS256 Supabase sessions; it no longer accepts email/UUID credentials
or skips signature verification when this setting is missing.

## Fixed in this review

- Database admin permission escalation and direct customer order inserts that
  bypassed authoritative pricing.
- Java authentication by bare email/UUID and unsigned tokens when configuration
  was missing; missing/expired token claims now fail validation.
- Automatic restoration of revoked admin roles by a hard-coded email list.
- Java role permissions exposing employee data to managers and inventory to
  unrelated staff; customer table assignment through reservation updates.
- Java checkout retries creating duplicates for guests, concurrent requests,
  and process restarts; retry keys are now durable, identity-scoped and basket-bound.
- Ignored `If-Match` headers and ETags that never changed. API records now expose
  PostgreSQL row versions and reject stale conditional updates/deletes.
- Paid orders failing to save after a live menu/coupon change. Server-signed
  checkout quotes preserve the approved basket, and captured payment amounts,
  currency and order binding are still verified against Razorpay.
- Lost UPI success callbacks reported as cancellation. The browser checks captured
  status and can resume the same payment after dismissal or a tab reload.
- Lost checkout responses failing on retry after dishes became unavailable.
- Invalid signed-in sessions silently producing guest orders.
- Missing kitchen push alerts for guest checkouts; the first committed checkout
  now schedules the alert on the server. The separate POS trigger is staff-only.
- Legacy cart lines using the base price instead of the default full portion;
  cart quantities exceeding the server hard cap.
- Cross-origin checks ignoring schemes/ports and allowing localhost on production.
- Phone-account hardening trusting client-writable metadata and profile matching
  by user-editable contact numbers.
- Push notifications failing because `silent` and `vibrate` were specified
  together; offline storefront requests incorrectly displaying the admin shell.
- Upload API accepting AVIF/GIF and 10 MB files while the existing bucket rejected
  those formats/sizes; upload permissions now match menu-management roles.
- Checkout and POS inserts failing on databases without the optional tenant
  columns; tenant fields are now omitted when unconfigured with a 42703 retry.
- Counter UPI/card tickets saved as paid with no transaction reference; a UTR
  or approval code is now required in both the bill panel and order placement.
- Profile updates without throttling or length caps; per-account rate limit
  and field caps added.
- Uploads trusting the browser-supplied MIME type; magic-byte verification added.
- Bill PDF generation without throttling or ID validation; per-IP rate limit
  and strict order-ID shape added.
- Checkout quotes that never expired; 30-minute expiry now enforced.
- Java checkout accepting missing idempotency keys and disclosing other
  callers' orders on key reuse; keys are required and replays are
  caller-scoped.
- Table-slot locks creatable by anyone; restricted to staff or the booking owner.
- Bill PDF links valid for an hour with full-row selects; 15-minute TTL and
  minimal receipt columns.
- Seed script able to wipe a hosted project; refuses non-local targets
  without explicit confirmation.
- Reservation push trigger without origin/rate/ID checks; same-origin,
  throttled, ID-shaped.
- Payment verification returning signature-only success; now binds amount,
  currency, capture state, and receipt from the gateway.
- Delay reasons carrying WhatsApp markdown; sanitized and capped at the
  shared validation choke point.
- Service-worker push clicks opening arbitrary URLs; restricted to app paths.
- Employee create/update without validation or throttling; field rules and
  per-admin rate limits added.
- Java JWT without audience/issuer binding; enforced when present. Prep-time
  notes bounded; profile phone pattern enforced.
- Gateway trusting proxy env vars and a fixed healthcheck address; direct
  connections only, healthcheck follows LISTEN_ADDR.
- Reports, performance, and customer totals counting unpaid orders as revenue;
  paid-only everywhere money is summed.
- Tenant scope cached forever per instance; 5-minute TTL.
- Counter UPI/card reference floor of 3 characters; raised to 6.
- Password-reset PKCE code links landing on "expired"; code exchange added.
- Signup swallowing errors and leaving loading stuck; inline errors and
  try/finally added. Phone signup had no terms gate; consent checkbox wired
  into the OTP send button.
- Menu search crashing on null description/tags; null-safe matching.
- Menu/navbar filters bypassing Next router (frozen UI, broken Back);
  routed through the Next router.
- Bill displays omitting round-off; round-off row shown when non-zero.
- Checkout retry identity ignoring totals; grandTotal fingerprinted.
- Contact form without validation, caps, or opener protection; validated,
  capped, noopener.
- POS retries forking new orders across tabs and on tender/reference edits;
  shared localStorage attempt scoped to the basket; print-dedup flag released
  on save failure and capped.
- Table delete/disable during live orders; occupancy guards added.
- Bills reprint unmounting before async print and missing DUPLICATE on
  thermal; delayed unmount and duplicate marking.
- Orders board toasting success on failed updates and offering stage skips;
  honors the boolean result and offers only the next legal transition.
- Coupon going stale when the cart shrinks; revalidated after fetch.
- Staff flashing customer profile before redirect; render guard added.
- Login mode not syncing to later navigations; synced. Google buttons
  double-firing popups; single-flight guard added.
- Signup coupon-code case drift; normalized at the form.
- OrderTracker promising automatic refunds; reworded to contact-for-refund.
- Dish/category/cart images hidden from assistive tech; labeled alt text.
- Cart bar appearing silently; announced via aria-live.
- Linter-strict effect setStates rewritten as render-synced state.
- CI without least-privilege token or dependency audit; backend without
  run cancellation.
- Dead `/admin/audit` route with no staff-visible trail; real admin-only
  audit viewer (table filter, record/staff search, actor names) with nav
  entry, manager deny rule, and helper tests.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev

# From backend/business
mvn test

# From backend/gateway
go test ./...
go vet ./...
```

Browser tests cover public page rendering on desktop and mobile, portion selection,
guest counter checkout and order tracking. They use isolated API fixtures.
Java integration tests use real embedded PostgreSQL, including concurrent checkout
requests. The authorization test executes the actual corrective migration as
`postgres`, then verifies its behavior as an `authenticator` session with anon,
customer, staff and service-role claims.

Production Supabase migrations, real SMS/Google sign-in, Razorpay capture and
delivery to actual push/WhatsApp devices must be verified in the deployment.
Local passing tests do not establish that those external services are configured
correctly.

### Dormant legacy phone accounts

The phone sign-in route secures returning accounts. To also repair dormant
reserved phone accounts that could still have the old predictable password:

```sh
node --env-file=.env.local scripts/securePhoneAccounts.mjs
node --env-file=.env.local scripts/securePhoneAccounts.mjs --apply
```

The first command reports the target project and candidate count without writing.
The second replaces their passwords with random credentials and records a trusted
`app_metadata` marker. Regular email accounts and already-secured phone accounts
are skipped. No generated password is printed or retained. Outstanding sign-in
links for rotated accounts must be requested again.

The maintenance script is tested with `node --test scripts/securePhoneAccounts.test.mjs`.
