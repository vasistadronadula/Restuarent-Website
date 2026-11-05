# Pala Pitta Ruchulu

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.4-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" alt="Node.js 22+" />
</p>

Pala Pitta Ruchulu is a restaurant commerce platform for a modern South Indian food brand. It combines customer ordering, reservations, payments, and a full staff/admin operations layer for menu management, table workflows, kitchen coordination, and billing.

This repository includes the main web app and the supporting backend stack used to run restaurant operations.
Admin login:  ADMIN@gmail.com, pass: admin@123

## Live Demo

<p align="center">
  <a href="https://palapittaruchulu.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="https://image.thum.io/get/https://palapittaruchulu.vercel.app/" alt="Pala Pitta Ruchulu website preview" width="1200" />
  </a>
</p>

<p align="center">
  <a href="https://palapittaruchulu.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20Website-00C853?logo=vercel&logoColor=white" alt="Open live demo" />
  </a>
</p>

- Production website: https://palapittaruchulu.vercel.app/
- Explore the live restaurant ordering, reservation, and admin experience in the deployed app.

## Why this project matters

- Customer-friendly ordering experience for dine-in, takeaway, and delivery-style flows
- Real-time restaurant operations: orders, kitchen states, tables, billing, and reports
- Secure role-based access for admins, managers, chefs, cashiers, waiters, and customers
- Supabase-backed data model with server-side authorization patterns
- Integrated payment and communication features such as Razorpay, UPI, and push notifications

## Feature highlights

### Customer experience
- Restaurant landing page and menu browsing
- Table booking and reservation flow
- Cart and checkout experience
- Phone OTP, email/password, and Google sign-in
- UPI and Razorpay payment integration

### Staff and admin operations
- Admin dashboard and operational views
- Order lifecycle management and kitchen dispatch flow
- Billing and POS workflows
- Inventory, menu, and staff management
- Analytics and reporting for restaurant operations

### Architecture and platform
- Next.js App Router frontend with React 19 and Tailwind-based UI
- Zustand state management and TanStack Query data layer
- Supabase for PostgreSQL, Auth, Storage, and Row Level Security
- Go + Spring Boot backend services for gatewaying, business logic, and API orchestration

## Tech stack

- Frontend: Next.js, React 19, TypeScript, Tailwind CSS, Radix UI
- State/data: Zustand, TanStack Query
- Backend: Go Gateway + Java 21 / Spring Boot
- Database/auth: Supabase (PostgreSQL, Auth, Storage, RLS)
- Payments: Razorpay, UPI
- Notifications: Firebase + Web Push
- Testing: Vitest, Playwright

## Repository structure

```text
.
├── src/                       # Frontend application and app routes
├── public/                    # Static assets
├── supabase/                  # Database schema, migrations, and RLS policies
├── backend/                   # Go + Spring Boot backend services
├── docs/                      # Launch and operational documentation
├── scripts/                   # Seed/data scripts
├── package.json               # Frontend scripts and dependencies
├── next.config.ts             # Next.js config
├── tsconfig.json              # TypeScript config
├── .env.example               # Example environment file
├── README.md                  # GitHub landing page
└── ...
```

## Getting started

### Prerequisites

- Node.js 22+
- npm
- A Supabase project
- Optional: Java 21 and Go 1.25 for backend services

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local` in the project root with your project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

NEXT_PUBLIC_UPI_ID=your_upi_id
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:you@example.com
```

> Keep service-role and secret values on the server only. Never expose them in browser code.

### 3) Run the app locally

```bash
npm run dev
```

The app runs at:

- `http://localhost:3001`

### 4) Production build and quality checks

```bash
npm run build
npm run lint
npm run typecheck
npm test
```

## Backend services

The project uses a dedicated backend stack under [`backend/`](backend/README.md):

- Go gateway on port `8080`
- Spring Boot business service on port `8081`
- Supabase-backed PostgreSQL database and auth layer

See [backend/README.md](backend/README.md) for full API details, environment configuration, and service startup instructions.

## Authentication model

The app supports:

- Phone OTP sign-in
- Email/password sign-in
- Google OAuth

Roles such as `admin`, `manager`, `chef`, `cashier`, `waiter`, and `customer` are derived from the user profile in Supabase and enforced through application and database authorization checks.

## Documentation

- [Backend README](backend/README.md)
- [Launch review](docs/LAUNCH_REVIEW.md)
- Supabase database migrations under `supabase/migrations/`

## License

This project is currently a private/internal implementation for the restaurant brand and may not be intended for public reuse without written permission.

## Maintainers

This repository is designed for restaurant operations, product, and engineering work across the web application and backend services.

---

If you want, I can also generate a more premium GitHub landing page version with a hero banner, architecture diagram, feature cards, and a screenshot-ready section layout for this repo.
