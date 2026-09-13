# Go + Spring Boot Backend with Supabase Database

This backend stack provides high-performance API services built with **Go** and **Java 21 / Spring Boot**, connecting directly to your existing **Supabase** PostgreSQL database and authentication infrastructure.

## Architecture

```text
Frontend / API Client (Bearer <Supabase-JWT>)
       │
       ▼
Go Gateway (:8080)
  ├── CORS & Trusted Proxy Configuration
  ├── Per-client Rate Limiting (240 req/min general, 20 req/min sensitive)
  ├── Request ID Tracking (X-Request-ID) & 1MB Body Size Limits
  └── Reverse Proxy & WebSocket (/ws) Routing to Business Service
       │
       ▼
Spring Boot Service (:8081)
  ├── Supabase JWT Authentication (HMAC-SHA256 via SUPABASE_JWT_SECRET)
  ├── Role Resolution from public.profiles (admin, manager, chef, cashier, waiter, customer)
  ├── Server-Side Order Pricing & 5% GST (2.5% CGST + 2.5% SGST)
  ├── Supabase Table CRUD (/api/v1/data/*) directly on Supabase PostgreSQL
  ├── Floor & Kitchen Order Workflows
  └── Operational Audit Logging (public.admin_audit_log)
       │
       ▼ (Direct JDBC / Supavisor Connection)
Supabase PostgreSQL Database
  ├── public.orders, public.menu_items, public.menu_categories
  ├── public.inventory_items, public.employees, public.restaurant_tables
  ├── public.coupons (PK: code), public.reservations, public.table_reservations
  ├── public.profiles, public.admin_audit_log
  └── auth.users (Supabase Auth)
```

## Supported Endpoints

All endpoints below are prefixed with `/api/v1` and accessible through the Go gateway on port `8080`.

| Method & Path | Auth Required | Description |
| --- | --- | --- |
| `GET /auth/me` | Yes (Bearer) | Returns current Supabase user profile & role |
| `PATCH /auth/me` | Yes (Bearer) | Updates customer profile (name, phone) in `public.profiles` |
| `GET /data/menu_items` | No (Public) | Active menu items (staff sees unavailable items) |
| `GET /data/menu_categories` | No (Public) | Active menu categories |
| `GET /data/{resource}` | Role-based | Paged resource list (50 per page, up to 100) |
| `GET /data/{resource}/{id}` | Role-based | Single record retrieval |
| `POST /data/{resource}` | Role-based | Create record with server-assigned ID |
| `PATCH /data/{resource}/{id}` | Role-based | Update record fields |
| `DELETE /data/{resource}/{id}` | Role-based | Delete record |
| `POST /orders/checkout` | Optional (Guest/User) | Authoritative basket calculation, coupon verification, 5% GST |
| `GET /orders` | Yes (Bearer) | Orders for authenticated user (or all orders for staff) |
| `GET /orders/floor` | Staff (Bearer) | Active dining table orders for waiters/managers |
| `GET /orders/{id}` | Yes (Bearer) | Detailed order retrieval |
| `PATCH /orders/{id}/status` | Staff (Bearer) | Order status transition (`pending` -> `preparing` -> `ready` -> `delivered` / `cancelled`) |
| `PATCH /orders/{id}/prep` | Staff (Bearer) | Update preparation delay minutes and kitchen notes |
| `POST /orders/{id}/cash-payment` | Staff (Bearer) | Mark cash payment collected |

### CRUD Resources
- `menu_items`: Menu dishes, portion prices, tags, veg/non-veg status.
- `menu_categories`: Categories with icons, sort orders, and slugs.
- `inventory_items`: Stock tracking, units, reorder points, costs.
- `employees`: Staff management, roles, shifts, contact information.
- `restaurant_tables`: Dining tables and capacities.
- `coupons`: Promotional discounts, order minimums, max discount caps (PK: `code`).
- `reservations`: Table reservations scoped to users and staff.

## Running the Backend

### Prerequisites
- Java 21+
- Go 1.25+
- Supabase Project credentials (Database URL, User, Password, JWT Secret)

### 1. Environment Configuration

Copy `backend/.env.example` to `backend/.env` and supply your Supabase project parameters:

```bash
# Supabase PostgreSQL Connection (from Supabase Dashboard -> Project Settings -> Database)
DATABASE_URL=jdbc:postgresql://db.<your-project-ref>.supabase.co:5432/postgres?sslmode=require
DATABASE_USER=postgres
DATABASE_PASSWORD=your-supabase-db-password

# Supabase JWT Secret (from Supabase Dashboard -> Project Settings -> API -> JWT Settings)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Frontend origin (for CORS enforcement in Go gateway)
WEB_ORIGIN=http://localhost:3000
```

### 2. Run with Docker Compose

To start both the Go gateway and Spring Boot services:

```bash
docker compose --env-file backend/.env -f backend/compose.yml up --build -d
```

Check service readiness:
```bash
curl http://localhost:8080/health/ready
```

### 3. Run Locally for Development

**Spring Boot (`backend/business`):**
```bash
# Set environment variables from your backend/.env
export DATABASE_URL="jdbc:postgresql://..."
export DATABASE_USER="postgres"
export DATABASE_PASSWORD="..."
export SUPABASE_JWT_SECRET="..."

# Run with Maven or compiled JAR
java -jar target/business-1.0.0.jar
```

**Go Gateway (`backend/gateway`):**
```bash
export BUSINESS_URL="http://127.0.0.1:8081"
export WEB_ORIGIN="http://localhost:3000"
export LISTEN_ADDR=":8080"

cd backend/gateway
go run .
```

## Testing

- **Go Gateway Tests**:
  ```bash
  cd backend/gateway
  go test -v ./...
  ```

- **Frontend Client Tests**:
  ```bash
  npx vitest run src/lib/backend/client.test.ts
  ```

- **TypeScript Typecheck**:
  ```bash
  npm run typecheck
  ```
