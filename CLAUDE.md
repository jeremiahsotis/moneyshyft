# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Location
- GitHub: https://github.com/jeremiahotis/moneyshyft.git

## GitHub Issues & Milestones Policy
- Always use GitHub Issues and Milestones as the source of truth.
- Always mark items done and add notes with status, plan, and current progress.
- Do not start coding until issues/milestones are reviewed and notes are posted.

## Project Overview

MoneyShyft is a family-focused budgeting application built with Vue 3 + TypeScript (frontend) and Node.js + Express + PostgreSQL (backend). It implements envelope budgeting with household-based multi-user support, debt tracking, goal management, and income planning.

## Development Commands

### Backend (src/)
```bash
# Development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production server (requires build first)
npm run start

# Database migrations
npm run migrate:latest              # Run all pending migrations
npm run migrate:rollback            # Rollback last migration batch
npm run migrate:make <name>         # Create new migration file

# Database seeds
npm run seed:run                    # Run seed files

# Testing
npm test                            # Run Jest tests
npm test:watch                      # Run tests in watch mode
```

### Frontend (frontend/)
```bash
# Development server (runs on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker
```bash
# Start all services (postgres + node)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart services
docker-compose restart
```

## Architecture

### Backend Structure (`src/src/`)

**Core Application Flow:**
- `server.ts` - Entry point, starts Express server with graceful shutdown
- `app.ts` - Express app configuration, middleware setup, route mounting
- All routes mounted under `/api/v1/` prefix

**Database Architecture:**
- **ORM:** Knex.js with TypeScript
- **Migrations:** Located in `src/src/migrations/`, use numbered prefixes (001_, 002_, etc.)
- **Connection:** Database pool configured in `config/database.ts`
- **Multi-tenancy:** All data scoped by `household_id` UUID

**Core Domain Models:**
1. **Households & Users** - Multi-user household structure with role-based access (admin/member)
2. **Accounts** - Financial accounts (checking, savings, credit, cash, investment)
3. **Categories** - Organized into sections (spending/savings), supports hierarchical structure
4. **Budgets** - Monthly budget periods with envelope-style category assignments
5. **Assignments** - Money allocated to categories within budget periods
6. **Transactions** - Financial movements between accounts and categories
7. **Goals** - Savings goals with contribution tracking
8. **Debts** - Debt tracking with payment plans and payoff projections
9. **Income** - Expected and actual income tracking

**Authentication & Authorization:**
- JWT tokens stored in HTTP-only cookies (`access_token`)
- Middleware: `authenticateToken()`, `requireHouseholdAccess()`, `requireRole()`
- All authenticated routes verify user belongs to household before data access
- Token utilities in `utils/jwt.ts`

**API Route Pattern:**
- Routes in `routes/api/v1/<resource>.ts`
- Express Router instances mounted in `app.ts`
- Validators using Joi schemas in `validators/` directory
- Standard CRUD operations with household scoping

**Middleware Stack:**
1. CORS (configured for frontend origin)
2. JSON body parser
3. Cookie parser
4. Request logging (Winston)
5. Authentication (where required)
6. Route handlers
7. Error handler (catches all unhandled errors)

### Frontend Structure (`frontend/src/`)

**Framework:** Vue 3 with Composition API + TypeScript

**State Management:**
- **Pinia** stores in `stores/` (10 total)
- Each store corresponds to a domain entity (auth, accounts, budgets, categories, transactions, goals, debts, income, assignments, wizard)
- Stores use Composition API style with `ref()` and `computed()`

**Routing:**
- Vue Router with route guards in `router/index.ts`
- Meta fields: `requiresAuth`, `requiresGuest`
- Authentication check in `beforeEach` guard
- Automatic redirect to login for unauthenticated users

**API Communication:**
- Axios instance configured in `services/api.ts`
- Base URL: `/api/v1` (proxied to backend via Vite in dev, via nginx in production)
- Credentials included for cookie-based auth
- Response interceptor handles 401 errors globally

**Component Organization:**
- `views/` - Route-level pages
- `components/` - Reusable components organized by domain (debts/, goals/, layout/, wizard/)
- `types/index.ts` - TypeScript type definitions

**Key UI Patterns:**
- Modal-based CRUD operations (Create/Edit/Detail modals)
- Wizard-style onboarding for budget setup (`components/wizard/`)
- Mobile-responsive layout with `AppLayout.vue` wrapper
- Tailwind CSS for styling

## Database Schema Notes

**Key Relationships:**
- All tables have `household_id` foreign key for multi-tenancy isolation
- UUIDs used for all primary keys (`uuid_generate_v4()`)
- Timestamps: `created_at`, `updated_at` (auto-managed)
- Soft deletes not used - cascading deletes configured via foreign keys

**Important Tables:**
- `budgets` - One per household per month, tracks overall budget state
- `assignments` - Junction table linking budgets + categories + allocated amounts
- `transactions` - Records with `from_account_id` and optional `category_id`
- `goal_contributions` - Tracks deposits/withdrawals from savings goals
- `debts` - Debt records with embedded payment plan JSON
- `income_entries` - Both expected (recurring) and actual income records

**Migration Strategy:**
- Migrations run automatically in production via Knex
- Development: manually run `npm run migrate:latest` in src/ directory
- Use `ts-node` to execute TypeScript migrations directly

## Development Workflow

**Local Setup:**
1. Copy `docker-compose.example.yml` to `docker-compose.yml` (gitignored)
2. Update database credentials and JWT secrets
3. Start services: `docker-compose up -d`
4. Run migrations: `cd src && npm run migrate:latest`
5. Seed recommended sections: `npm run seed:run`
6. Start frontend: `cd frontend && npm run dev`
7. Start backend dev server: `cd src && npm run dev`

**Environment Variables:**
- Backend: `src/.env` (database URL, JWT secrets, frontend URL)
- Frontend: Vite env vars via `import.meta.env`
- Both `.env` files are gitignored - never commit

**Testing Database Queries:**
```bash
# Connect to database (update credentials as needed)
PGPASSWORD=<password> psql -h localhost -U <username> -d moneyshyft
```

## Feature Completeness Standards

**Definition of "Complete" or "Functional" Feature:**
- A feature is NOT complete until it has a fully working user interface that allows users to perform all CRUD operations
- Backend APIs alone do NOT constitute a "fully functional" feature
- A complete feature requires:
  - ✅ Database schema and migrations
  - ✅ Backend service layer and API endpoints
  - ✅ Frontend types and Pinia store
  - ✅ UI components (forms, modals, lists)
  - ✅ Integration in views/pages where users can access the feature
  - ✅ Full end-to-end user workflow testing

**Example:**
- ❌ "Recurring transactions are fully functional" when only backend API exists
- ✅ "Recurring transactions are fully functional" when users can create, view, edit, and delete them via the UI

## Important Patterns

**Household Data Isolation:**
- Every query MUST filter by `household_id`
- Use `req.user.householdId` from JWT payload (attached by `authenticateToken` middleware)
- Never trust client-provided household IDs

**API Response Format:**
```typescript
// Success
{ data: <payload> } or { user: <user>, invitationCode: <code> }

// Error
{ error: <message> }
```

**Budget Assignment Flow:**
1. User assigns money to categories (creates/updates `assignments`)
2. `ready_to_assign` tracks unallocated money in budget
3. Transactions can optionally link to categories (reduces assigned amounts)
4. Monthly rollover creates new budget period with carried-over values

**Authentication Flow:**
1. Login/Signup → JWT stored in HTTP-only cookie
2. Frontend stores user object in Pinia auth store
3. All API requests automatically include cookie
4. Backend middleware verifies JWT and attaches user to `req.user`

## Remote Deployment Notes

- Nginx runs on host (not containerized) - proxies to backend container
- Docker Compose only runs `postgres` and `node` services
- Production `docker-compose.yml` is environment-specific (not in git)
- Frontend built and served via nginx as static files

## Production Deployment Details (Current)
- Backend container built from `src/Dockerfile` with `NODE_ENV=production`.
- Prod migrations should use `npm run migrate:latest:prod` inside container.
- Nginx serves `frontend/dist` and proxies `/api/` to `127.0.0.1:3000`.
