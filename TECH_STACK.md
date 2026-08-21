# Pala Pitta Ruchulu - Technology Stack Documentation

**Project Name:** Pala Pitta Ruchulu  
**Version:** 1.0.0  
**Description:** Authentic Telangana & Hyderabadi Restaurant Web Application & POS System  
**Last Updated:** 2026-08-17

---

## 📋 Table of Contents

1. [Core Technologies](#core-technologies)
2. [Frontend Framework & UI](#frontend-framework--ui)
3. [State Management](#state-management)
4. [Database & Backend Services](#database--backend-services)
5. [Payment Integration](#payment-integration)
6. [Authentication](#authentication)
7. [Push Notifications & Real-time](#push-notifications--real-time)
8. [UI Component Libraries](#ui-component-libraries)
9. [Forms & Validation](#forms--validation)
10. [Data Fetching & Caching](#data-fetching--caching)
11. [Tables & Data Display](#tables--data-display)
12. [Charts & Analytics](#charts--analytics)
13. [Date & Time Handling](#date--time-handling)
14. [Styling & Theme](#styling--theme)
15. [Code Quality & Linting](#code-quality--linting)
16. [Development Tools](#development-tools)
17. [Deployment & Performance](#deployment--performance)
18. [Notifications & Messaging](#notifications--messaging)
19. [Utilities & Helpers](#utilities--helpers)
20. [Project Structure](#project-structure)

---

## 🔧 Core Technologies

### Runtime Environment
- **Node.js** - JavaScript runtime
- **TypeScript 5** - Strongly-typed JavaScript superset
- **Target ES Version:** ES2017
- **Module System:** ESNext

### Version Info
```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19"
}
```

---

## 🎨 Frontend Framework & UI

### Next.js
- **Version:** 16.2.11
- **Build Tool:** Turbopack (configured with root pinning)
- **React Strict Mode:** Enabled (see `reactStrictMode` in `next.config.ts`)
- **Key Features:**
  - App Router (src/app directory)
  - API Routes (src/app/api)
  - Image Optimization
  - Static Site Generation (SSG)
  - Server-Side Rendering (SSR)

### React
- **Version:** 19.2.4
- **React DOM:** 19.2.4
- **JSX Handling:** react-jsx transform

### Next.js Configuration Features
```typescript
// Image Optimization
- Minimum Cache TTL: 30 days
- Formats: AVIF, WebP
- Remote Pattern Support: HTTP/HTTPS
- Cache Control: 31536000s (1 year) for static assets

// Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

// Optimizations
- Package Import Optimization for: lucide-react, recharts, @tanstack/react-table
- HTTP Compression: Enabled
- Powered By Header: Disabled
```

---

## 🗂️ State Management

### Zustand
- **Version:** 5.0.14
- **Purpose:** Lightweight global state management
- **Usage:** 
  - `useAdminStore.ts` - Admin dashboard state
  - `useAuthStore.ts` - Authentication state
  - `useCartStore.ts` - Shopping cart state

### React Context API
- **Location:** `src/context/`
- **Contexts:**
  - `AdminContext.tsx` - Admin-specific context
  - `AuthContext.tsx` - Authentication context
  - `CartContext.tsx` - Cart management context

---

## 💾 Database & Backend Services

### Supabase
- **Version:** @supabase/supabase-js ^2.110.7
- **Type:** PostgreSQL database + Backend-as-a-Service
- **Database Configuration:** `src/lib/supabase.ts`, `src/lib/supabaseAdmin.ts`
- **Schema:** `supabase/migrations/20260808000000_baseline_schema.sql` (see `supabase/README.md`)
- **Features:**
  - Real-time subscriptions
  - PostgreSQL queries
  - Authentication (via Supabase Auth)
  - Row-Level Security (RLS)

### Firebase
- **Version:** 12.17.1
- **Configuration:** `src/lib/firebase.ts`
- **Potential Usage:**
  - Authentication
  - Cloud Storage
  - Firestore/Realtime Database

---

## 💳 Payment Integration

### Razorpay
- **Version:** 2.9.8
- **Integration Point:** `src/app/api/razorpay/`
- **Features:**
  - Payment gateway integration
  - Webhook handling
  - Invoice generation

---

## 🔐 Authentication

### Methods Supported
1. **Supabase Auth** - Primary authentication
2. **Firebase Auth** - Secondary authentication
3. **Phone/OTP Authentication** - `src/lib/phoneIdentity.ts`
4. **WhatsApp Integration** - `src/lib/whatsapp.ts`

### Authentication Files
- `src/context/AuthContext.tsx` - Auth context provider
- `src/store/useAuthStore.ts` - Auth state management
- `src/lib/phoneIdentity.ts` - Phone-based identity verification
- `src/app/login/page.tsx` - Login page
- `src/app/signup/page.tsx` - Signup page
- `src/app/reset-password/page.tsx` - Password reset

---

## 🔔 Push Notifications & Real-time

### Web Push
- **Version:** 3.6.7
- **Types:** @types/web-push ^3.6.4
- **Integration Files:**
  - `src/lib/pushClient.ts` - Client-side push handling
  - `src/lib/pushNotify.ts` - Push notification trigger
  - `src/lib/triggerPush.ts` - Push trigger logic
  - `src/app/api/push/` - Push API endpoints

### Service Worker
- **Location:** `public/sw.js`
- **Purpose:** Handle background push notifications

---

## 🧩 UI Component Libraries

### Radix UI Components
- **Version:** Latest compatible versions
- **Components Included:**
  - Accordion
  - Alert Dialog
  - Avatar
  - Checkbox
  - Dialog
  - Dropdown Menu
  - Label
  - Popover
  - Progress
  - Radio Group
  - Scroll Area
  - Select
  - Separator
  - Slider
  - Slot
  - Switch
  - Tabs
  - Toggle
  - Toggle Group
  - Tooltip

### Lucide React Icons
- **Version:** 1.28.0
- **Purpose:** Icon library for UI components

### Motion Animation
- **Version:** 13.0.0
- **Purpose:** Smooth animations and transitions

### Embla Carousel
- **Version:** 8.6.0
- **Features:**
  - React carousel component
  - Autoplay support

---

## 📝 Forms & Validation

### React Hook Form
- **Version:** 7.84.0
- **Resolvers:** @hookform/resolvers ^5.7.1
- **Purpose:** Efficient, flexible form state management

### Zod
- **Version:** 4.4.3
- **Purpose:** TypeScript-first schema validation
- **Usage:** Admin schemas in `src/lib/adminSchemas.ts`

### OTP Input
- **input-otp:** 1.4.2
- **Purpose:** One-Time Password input component

---

## 🔄 Data Fetching & Caching

### React Query (TanStack Query)
- **Version:** @tanstack/react-query ^5.101.4
- **DevTools:** @tanstack/react-query-devtools ^5.101.4
- **Purpose:**
  - Server state management
  - Data fetching
  - Caching
  - Synchronization

---

## 📊 Tables & Data Display

### React Table (TanStack Table)
- **Version:** @tanstack/react-table ^9.0.0
- **Features:**
  - Headless table component
  - Sorting
  - Filtering
  - Pagination
  - Column visibility

### React Virtual
- **Version:** @tanstack/react-virtual ^3.14.9
- **Purpose:** Virtualization for large lists/tables

### Day Picker
- **react-day-picker:** 10.0.1
- **Purpose:** Date picker component

---

## 📈 Charts & Analytics

### Recharts
- **Version:** 3.9.2
- **Purpose:** Composable React charting library
- **Optimized for package imports**

### QR Code
- **qrcode.react:** 4.2.0
- **Purpose:** QR code generation (for receipts/bills)

---

## ⏰ Date & Time Handling

### date-fns
- **Version:** 4.4.0
- **Purpose:** Modern date utility library

### Custom Hooks
- `src/hooks/useNow.ts` - Real-time current time

---

## 🎨 Styling & Theme

### Tailwind CSS
- **Version:** 4.3.3
- **PostCSS Plugin:** @tailwindcss/postcss ^4.3.3
- **Animations:** tw-animate-css ^1.4.0
- **Purpose:** Utility-first CSS framework

### Theme Configuration
- `src/theme/theme.ts` - Main theme
- `src/theme/adminColors.ts` - Admin panel colors
- `src/theme/posColors.ts` - POS system colors
- `src/app/admin/admin-theme.css` - Admin custom styles
- `src/app/globals.css` - Global styles

### CSS Utilities
- **clsx:** 2.1.1 - Conditional class names
- **tailwind-merge:** 3.6.0 - Merge Tailwind classes
- **class-variance-authority:** 0.7.1 - Component variants

---

## ✔️ Code Quality & Linting

### ESLint
- **Version:** 9
- **Config:** ESLint Config Next 16.2.11
- **Configuration File:** `eslint.config.mjs`
- **Script:** `npm run lint`

---

## 🛠️ Development Tools

### PostCSS
- **Version:** 4.3.3
- **Configuration File:** `postcss.config.mjs`
- **Purpose:** CSS transformation and optimization

### TypeScript Configuration
- **Target:** ES2017
- **Module Resolution:** Bundler
- **Strict Mode:** Enabled
- **Path Alias:** `@/*` → `./src/*`

### Built-in Scripts
```json
{
  "dev": "next dev",        // Start development server
  "build": "next build",    // Production build
  "start": "next start",    // Start production server
  "lint": "eslint"          // Run ESLint
}
```

---

## 🚀 Deployment & Performance

### Image Optimization
- **Formats:** AVIF (modern), WebP (fallback), JPEG/PNG
- **Cache:** 30 days minimum TTL
- **Remote Patterns:** Support for all HTTP/HTTPS images

### Caching Strategy
```
Static Assets (.ico, .png, .jpg, .svg, .webp, .avif, .woff2, .woff, .ttf):
- Cache-Control: public, max-age=31536000, immutable
- 1 year cache validity

Other Assets:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy: strict-origin-when-cross-origin
```

### Build Optimization
- **Turbopack:** Next-gen Rust-based bundler
- **Compression:** Enabled
- **Package Imports Optimization:** lucide-react, recharts, @tanstack/react-table

---

## 💬 Notifications & Messaging

### WhatsApp Integration
- **File:** `src/lib/whatsapp.ts`
- **API Endpoint:** `src/app/api/whatsapp/`
- **Purpose:** Customer notifications via WhatsApp

### Sonner Toast Notifications
- **Version:** 2.0.7
- **Purpose:** Toast notification library

---

## 🎯 Utilities & Helpers

### Core Utilities
- `src/lib/utils.ts` - General utility functions
- `src/lib/validation.ts` - Validation helpers
- `src/lib/errors.ts` - Error handling
- `src/lib/idGenerator.ts` - ID generation

### Business Logic
- `src/lib/billing.ts` - Billing calculations
- `src/lib/billDocument.ts` - Bill document generation
- `src/lib/thermalPrinter.ts` - Thermal printer integration
- `src/lib/roleAccess.ts` - Role-based access control
- `src/lib/roleApps.ts` - Role-based app access
- `src/lib/posOrderTracker.ts` - POS order tracking
- `src/lib/audio.ts` - Audio utilities
- `src/lib/flyToCart.ts` - Animated cart flyout

### Custom Hooks
- `src/hooks/useAutoPrint.ts` - Auto-printing functionality
- `src/hooks/useDishPortion.ts` - Dish portion management
- `src/hooks/useMediaQuery.ts` - Responsive design queries
- `src/hooks/useNow.ts` - Current time hook
- `src/hooks/usePosCart.ts` - POS cart management
- `src/hooks/useRedirectIfSignedIn.ts` - Auth redirect

---

## 📁 Project Structure

### Main Directories
```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── cart/              # Shopping cart
│   ├── cashier/           # Cashier interface
│   ├── checkout/          # Checkout flow
│   ├── menu/              # Menu display
│   ├── orders/            # Order management
│   └── ...                # Other pages
├── components/            # Reusable React components
│   ├── admin/             # Admin components
│   ├── bill/              # Billing components
│   ├── customer/          # Customer components
│   ├── pos/               # POS components
│   ├── ui/                # UI components
│   └── providers/         # Provider components
├── context/               # React Context providers
├── data/                  # Static data
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and helpers
├── store/                 # Zustand stores
├── theme/                 # Theme configuration
└── types/                 # TypeScript type definitions
```

### Configuration Files
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS configuration
- `tailwind.config.ts` - (Tailwind configuration)

### Database
- `supabase/` - Supabase migrations and schema
- `supabase/migrations/20260808000000_baseline_schema.sql` - Baseline database schema (migrations tracked in `supabase/migrations/`)

### Scripts
- `scripts/seedDatabase.mjs` - Database seeding script
- `scripts/updateMenuImages.mjs` - Menu image update script

### Public Assets
- `public/` - Static files, manifest, service worker

---

## 🔒 Security Features

### Headers
- Content-Type sniffing prevention
- Clickjacking protection
- XSS protection
- Strict referrer policy

### Input Security
- Zod validation for all forms
- React Hook Form for form security
- Type-safe database queries

---

## 📦 Production Dependencies Summary

**Total Dependencies:** 40+

**Key Categories:**
- Framework: Next.js, React
- UI: Radix UI, Lucide, Tailwind CSS
- State: Zustand, React Query
- Backend: Supabase, Firebase, Razorpay
- Forms: React Hook Form, Zod
- Utilities: date-fns, clsx, motion

---

## 🎯 Application Modules

### 1. Customer Portal
- Menu browsing
- Shopping cart
- Checkout
- Order tracking
- Profile management
- Notifications

### 2. Admin Dashboard
- Order management
- Menu management
- Employee management
- Performance analytics
- Reports
- Coupon management
- Bill management
- Settings

### 3. POS System
- Bill generation
- Order taking
- Kitchen display
- Payment processing
- Thermal printing
- Real-time order tracking

### 4. Cashier Interface
- Bill settlement
- Payment reconciliation
- Daily reports

---

## 🌐 API Routes Structure

```
src/app/api/
├── admin/       # Admin-specific endpoints
├── auth/        # Authentication endpoints
├── guest/       # Guest/public endpoints
├── push/        # Push notification endpoints
├── razorpay/    # Payment gateway endpoints
├── upload/      # File upload endpoints
├── webhooks/    # Webhook handlers
└── whatsapp/    # WhatsApp integration endpoints
```

---

## 📱 Responsive Design
- **Approach:** Mobile-first Tailwind CSS
- **Media Queries:** `useMediaQuery` hook
- **Breakpoints:** Tailwind default breakpoints

---

## 🔄 Real-time Features
- Supabase real-time subscriptions
- WebSocket support via Supabase
- Push notifications via Service Worker
- Order status updates

---

## 📊 Analytics & Monitoring
- Performance reporting
- Order metrics
- Revenue analytics
- Charts via Recharts

---

## 🚢 Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Service worker configured
- [ ] Push notification certificates set up
- [ ] Razorpay API keys configured
- [ ] WhatsApp API configured
- [ ] Firebase credentials set up
- [ ] Supabase connection verified
- [ ] CDN configured (optional)
- [ ] SSL certificates installed

---

## 📝 Notes
- React Strict Mode disabled to prevent double-renders in development
- Turbopack configured with explicit root pinning
- Image caching optimized for 30 days minimum
- Package imports optimized for lucide-react, recharts, and react-table
- All security headers configured for production

---

**Generated on:** August 17, 2026  
**Last Modified:** $(date)
