# Pala Pitta Ruchulu

Restaurant web app and POS for Pala Pitta Ruchulu — Telangana, Andhra and Hyderabadi
food, ordering and table booking for customers, and a full admin/POS workspace for
staff (orders, kitchen display, billing, inventory, reservations, reports).

Next.js App Router · React 19 · Radix UI + Tailwind CSS · Zustand + TanStack Query · Supabase · Razorpay.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Environment

All of these go in `.env.local` locally, and in the hosting provider's
environment for a deployment. The app refuses to start without the two Supabase
values; the rest disable the feature they belong to.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project — **required** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key — **required** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS; needed for phone sign-in, staff creation and push. **Never expose to the browser.** |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (API key, auth domain, project id, storage bucket, sender id, app id) — the SMS gateway for phone sign-in |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Online payments |
| `NEXT_PUBLIC_UPI_ID` | Direct UPI QR payments |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push for staff order and reservation alerts |

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` is read on the server as well as the client —
it is the audience every Firebase ID token is validated against, so a wrong
value there silently breaks all phone sign-in.

## Authentication

Three ways in, all landing on a Supabase session:

- **Phone OTP** (the default for customers)
- **Email + password**
- **Google OAuth**

Roles (`admin`, `manager`, `chef`, `cashier`, `waiter`, `customer`) come from
`profiles.role` and nowhere else — never from `user_metadata`, which any signed-in
user can write to. `lib/roleAccess.ts` maps roles to the pages and notifications
they get; the enforcing boundary is the RLS policy set in `supabase/migrations/`.

### How phone sign-in works

```
browser  ── SMS code ──▶ Firebase          phone ownership proven to Google
browser  ◀── ID token ── Firebase
browser  ── ID token ──▶ /api/auth/phone   signature + claims verified server-side
                       ──▶ Supabase        find-or-create account (service role)
browser  ◀── one-time token hash
browser  ── verifyOtp ──▶ Supabase         session issued
```

Firebase is only the SMS gateway. The trust boundary is
`lib/auth/firebaseIdToken.ts`, which verifies the token's RS256 signature
against Google's published certificates and checks every claim — audience,
issuer, expiry, `sign_in_provider === 'phone'`, and an `auth_time` no older than
ten minutes — before `/api/auth/phone` will mint anything. Nothing the browser
*claims* about its identity is trusted anywhere in the flow.

Because Supabase keys accounts on email and these customers have none, each
number maps to a reserved internal address (`phone_91…@palapitta.internal`,
`.internal` being reserved by RFC 8375). That address is an identifier only: the
password on such accounts is random, never derived and never used, and
`lib/phoneIdentity.ts` keeps the placeholder out of anything a customer sees.

> **Migration note.** Accounts created before this design used a password derived
> from the phone number, which meant anyone knowing a customer's number could
> sign in as them. `/api/auth/phone` rotates that password to random bytes the
> first time each such account signs in. Any of those accounts that never signs
> in again keeps its old password — worth clearing out server-side if the list
> is short.

## Layout

```
src/app/          routes — public site, /admin workspace, /api route handlers
src/components/   customer/, admin/, pos/, bill/
src/context/      Auth, Cart, Admin providers — thin adapters over the stores below
src/store/        Zustand stores (auth, cart, admin UI state)
src/lib/queries/  TanStack Query hooks — all server data (orders, menu, inventory, …)
src/lib/          supabase clients, auth verification, billing, printing, push
supabase/migrations/       tables, RLS policies, role guards, RPCs
scripts/seedDatabase.mjs   seeds the menu from src/data/menuItems.json
```
