# Cityflo Invoice Processing System - Plan of Action

> **This file is the golden reference for the entire project.**
> When starting a new session, read this file FIRST to understand what's been done and what's next.

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Repo structure | **Single monorepo** | Easier for evaluators, single commit history, assignment requirement |
| Testing | **Sanity-level TDD** (Jest + Supertest backend, Vitest + RTL frontend) | Confidence without exhaustiveness |
| .env location | **Root `.env`** (git-ignored) | Shared by backend (dotenv) and frontend (Vite VITE_ prefix) |
| .gitignore | **Single root `.gitignore`** | Covers both backend and frontend |
| PDF extraction | **Gemini 2.5 Flash API** | Avoids complex OCR pipeline, handles all invoice formats via LLM |
| Background jobs | **In-process async** (no Redis) | Simple fire-and-forget after HTTP response, free tier friendly |
| Database | **Render PostgreSQL** (free tier) | Managed, no local Docker needed |
| Backend hosting | **Render** (Docker deploy from `/backend`) | Free tier, Docker support |
| Frontend hosting | **Vercel** (from `/frontend`) | Free tier, great for Vite/React |
| ORM | **Prisma v5** (not v7 - v7 has breaking config changes) | Stable, well-documented |
| DB migrations | **`prisma db push`** (not `migrate dev`) | Render free-tier PG lacks superuser for shadow DB required by migrate |

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS v4, React Router, React Query, Axios, Lucide Icons, React Dropzone, React Hot Toast | **Vercel** (free tier) |
| Backend | Node.js + Express 5 + TypeScript, Multer, Morgan, Helmet, CORS, express-rate-limit | **Render** (free tier, Docker deploy) |
| Database | PostgreSQL | **Render PostgreSQL** (free tier) |
| ORM | Prisma v5 (`prisma@5`, `@prisma/client@5`) | - |
| Auth | JWT (jsonwebtoken) + bcryptjs | - |
| PDF Extraction | **Google Gemini 2.5 Flash** (`@google/generative-ai`) | - |
| CSV Export | csv-writer | - |
| Containerization | Dockerfile for backend | - |

---

## Database Schema

Defined in `backend/prisma/schema.prisma`. 6 models:

1. **User** (`users` table) - id (uuid), email (unique), username (unique), password_hash, role (EMPLOYEE | ACCOUNTS | SENIOR_ACCOUNTS), created_at
2. **Invoice** (`invoices` table) - id (uuid), submitted_by (FK→User), category (VENDOR_PAYMENT | REIMBURSEMENT), status (PENDING_REVIEW | APPROVED | REJECTED | PAID), notes, file_path, original_filename, extraction_status (PENDING | PROCESSING | COMPLETED | FAILED), is_duplicate, duplicate_of, created_at, updated_at
3. **ExtractedData** (`extracted_data` table) - id (uuid), invoice_id (FK→Invoice, unique 1:1), vendor_name, invoice_number, invoice_date, due_date, subtotal (Decimal 12,2), tax (Decimal 12,2), grand_total (Decimal 12,2), payment_terms, bank_details, raw_text, confidence_scores (JSON), created_at, updated_at
4. **LineItem** (`line_items` table) - id (uuid), extracted_data_id (FK→ExtractedData), description, quantity (Decimal 10,3), unit_price (Decimal 12,2), total (Decimal 12,2)
5. **InvoiceAction** (`invoice_actions` table) - id (uuid), invoice_id (FK→Invoice), user_id (FK→User), action (SUBMITTED | VIEWED | EDITED | APPROVED | REJECTED | MARKED_PAID), comment, created_at
6. **Notification** (`notifications` table) - id (uuid), user_id (FK→User), invoice_id (FK→Invoice, optional), message, read (bool), created_at

Cascade deletes: Invoice deletion cascades to ExtractedData, LineItems, InvoiceActions, Notifications.

---

## Implementation Phases

### Phase 1: Project Scaffolding & Setup -- COMPLETED

- [x] Monorepo structure with root `package.json` (concurrently for parallel dev)
- [x] Backend: Express + TypeScript, all dependencies installed
- [x] Backend: Prisma v5 schema with all 6 models + enums (NOT yet migrated - needs DATABASE_URL)
- [x] Backend: Dockerfile for Render deployment (multi-stage build, runs migrate on start)
- [x] Backend: Jest + Supertest configured, health check test passing
- [x] Backend: Config module loading `.env` from root then fallback to local
- [x] Backend: Seed script for 4 default users
- [x] Frontend: Vite + React 18 + TypeScript + Tailwind CSS v4
- [x] Frontend: Dev proxy configured (`/api` → `localhost:3000`)
- [x] Frontend: Boilerplate cleaned, type checks pass
- [x] Root `.gitignore`, root `.env`, `.env.example`
- [x] **MANUAL (DONE)**: Created Render PostgreSQL (Singapore region), external URL set in `.env`
- [x] **MANUAL (DONE)**: Gemini API key obtained and set in `.env`
- [x] Ran `prisma db push` to sync schema to Render PostgreSQL (used `db push` instead of `migrate dev` - Render free tier lacks superuser for shadow DB)
- [x] Ran seed script - 4 users created (employee1, employee2, accounts1, senior_accounts1)

**Key files created in Phase 1:**
```
.gitignore                          # Root gitignore for monorepo
.env                                # Root env file (git-ignored)
.env.example                        # Template
package.json                        # Root monorepo scripts
backend/package.json                # Backend deps & scripts
backend/tsconfig.json               # TS config (target ES2020, commonjs)
backend/Dockerfile                  # Multi-stage Node 20 Alpine
backend/jest.config.js              # Jest + ts-jest config
backend/prisma/schema.prisma        # Full DB schema (6 models, 7 enums)
backend/prisma/seed.ts              # Seeds 4 users (2 employee, 1 accounts, 1 senior)
backend/src/index.ts                # Express app (helmet, cors, morgan, rate-limit, health check)
backend/src/config/index.ts         # Loads .env from root, exports config object
backend/src/types/index.ts          # JwtPayload, AuthenticatedRequest, PaginationQuery, InvoiceFilters, ExtractionResult
frontend/vite.config.ts             # Vite + React + Tailwind plugin + API proxy
frontend/src/index.css              # Tailwind v4 import
frontend/src/App.tsx                # Placeholder app component
```

### Phase 2: Backend - Auth & User Management -- COMPLETED

- [x] `POST /api/auth/login` - validate credentials, return { accessToken, refreshToken, user }
- [x] `POST /api/auth/refresh` - validate refresh token, return new access token
- [x] `GET /api/auth/me` - return current user info from JWT (protected route)
- [x] Auth middleware (`backend/src/middleware/auth.ts`) - verify JWT, attach `user` to request, handles expired/invalid tokens
- [x] Role middleware (`backend/src/middleware/roles.ts`) - `authorize(...roles)` higher-order middleware, checks user.role against allowed roles
- [x] Auth routes (`backend/src/routes/auth.ts`) - wired into Express app at `/api/auth`
- [x] Tests: 14 tests covering login success/failure, missing fields, all 3 roles, refresh token flow, /me with valid/invalid/expired tokens, role middleware

**Key files created/modified in Phase 2:**
```
backend/src/lib/prisma.ts          # Shared PrismaClient singleton (used by all route/service modules)
backend/src/middleware/auth.ts      # JWT verification middleware (Bearer token → req.user)
backend/src/middleware/roles.ts     # authorize(...allowedRoles) middleware factory
backend/src/routes/auth.ts         # Login, refresh, me endpoints
backend/src/routes/auth.test.ts    # 14 tests (login, refresh, me, roles)
backend/src/index.ts               # (modified) wired auth routes
backend/src/config/index.ts        # (modified) jwtExpiresIn/jwtRefreshExpiresIn changed to numeric seconds (TS compat with @types/jsonwebtoken v9)
```

**Implementation notes:**
- JWT access token expires in 900s (15 min), refresh token in 604800s (7 days)
- `expiresIn` uses numeric seconds (not string like '15m') due to `@types/jsonwebtoken` v9 `StringValue` branded type incompatibility with plain `string`
- All route/service modules use a shared PrismaClient singleton (`backend/src/lib/prisma.ts`) to avoid connection pool exhaustion on Render free tier
- Auth routes use real DB - tests run against seeded Render PostgreSQL
- Login returns `{ accessToken, refreshToken, user: { id, email, username, role } }` (no passwordHash)
- Role middleware is generic: `authorize(UserRole.ACCOUNTS, UserRole.SENIOR_ACCOUNTS)` - ready for Phase 3+ routes

### Phase 3: Backend - Invoice CRUD & File Upload -- COMPLETED

- [x] `POST /api/invoices` - upload PDF(s) + category + notes (Multer: PDF only, 10MB max, up to 10 files)
- [x] `GET /api/invoices` - paginated list with filters (employees=own only, accounts=all, filters: status, category, dateFrom/dateTo, submittedBy, amountMin/Max, search)
- [x] `GET /api/invoices/:id` - single invoice with extractedData + lineItems + actions + submitter
- [x] `GET /api/invoices/:id/pdf` - serve PDF file (stream, inline disposition)
- [x] `PATCH /api/invoices/:id/extracted-data` - edit extracted fields + line items (ACCOUNTS/SENIOR_ACCOUNTS only, creates EDITED audit record)
- [x] `PATCH /api/invoices/:id/status` - approve/reject/mark paid (reject requires comment, creates audit record + notification)
- [x] `GET /api/invoices/export/csv` - export filtered invoices as CSV (ACCOUNTS/SENIOR_ACCOUNTS only)
- [x] `POST /api/invoices/bulk-action` - bulk approve/reject with invoice IDs array (ACCOUNTS/SENIOR_ACCOUNTS only)
- [x] Tests: 22 tests covering upload, validation, pagination, filters, detail view, access control, status changes, bulk actions, CSV export

**Key files created/modified in Phase 3:**
```
backend/src/middleware/upload.ts     # Multer config: disk storage, PDF filter, 10MB limit, unique filenames
backend/src/routes/invoices.ts       # All 8 invoice endpoints
backend/src/routes/invoices.test.ts  # 22 tests
backend/src/index.ts                 # (modified) wired invoice routes, added Multer error handling
```

**Implementation notes:**
- Express 5 types `req.params.id` as `string | string[]` - cast to `string` throughout
- CSV export uses `csv-writer`'s `createObjectCsvStringifier` (string output, not file)
- Multer errors (wrong file type, size limit) caught in global error handler
- `export/csv` route defined BEFORE `/:id` to avoid route collision
- Bulk action only updates invoices that are currently PENDING_REVIEW
- Extraction fires async after upload response (wired in Phase 4)
- Status change and bulk action both create InvoiceAction audit records and Notification for submitters
- Employee access control: employees can only see/access their own invoices (list auto-filters, detail/PDF return 403)

### Phase 4: Backend - PDF Extraction via Gemini -- COMPLETED

- [x] Gemini service (`backend/src/services/gemini.ts`): reads PDF as base64, sends to `gemini-2.5-flash`, structured prompt for JSON with confidence scores, strips code fences, validates structure
- [x] Extraction service (`backend/src/services/extraction.ts`): async fire-and-forget, PENDING→PROCESSING→COMPLETED/FAILED, saves ExtractedData + LineItems, duplicate detection
- [x] Wired into `POST /api/invoices` — extraction fires async after upload response
- [x] Tests: 3 tests (successful extraction with mock, duplicate detection, failure handling) — Gemini mocked via jest.mock

**Key files created/modified in Phase 4:**
```
backend/src/services/gemini.ts         # Gemini API call: PDF base64 → structured JSON extraction
backend/src/services/extraction.ts     # Orchestrator: status updates, save to DB, duplicate detection
backend/src/services/extraction.test.ts # 3 tests with mocked Gemini
backend/src/routes/invoices.ts         # (modified) wired processInvoiceExtraction into POST upload
```

**Implementation notes:**
- Model: `gemini-2.5-flash` (stable, not preview)
- Extraction prompt requests all invoice fields + per-field confidence scores (0.0-1.0)
- Duplicate detection: matches `invoiceNumber + vendorName` against existing extracted data, sets `isDuplicate + duplicateOf`
- Failure handling: if Gemini or parsing fails, invoice marked FAILED, error logged, no crash
- Invoice upload tests show expected "document has no pages" errors in logs (test PDFs are minimal stubs) — extraction gracefully marks them FAILED

### Phase 5: Backend - Notifications & Audit Log -- COMPLETED

- [x] `GET /api/notifications` - paginated list for current user (includes unreadCount, invoice summary)
- [x] `PATCH /api/notifications/:id/read` - mark single notification as read (ownership check)
- [x] `PATCH /api/notifications/read-all` - mark all as read for current user
- [x] `GET /api/invoices/:id/audit-log` - full audit trail (ordered by createdAt asc, includes user info)
- [x] Tests: 10 tests covering notification list, mark read, ownership, audit log access control

**Key files created/modified in Phase 5:**
```
backend/src/routes/notifications.ts       # Notification endpoints (list, mark read, read-all)
backend/src/routes/notifications.test.ts  # 10 tests
backend/src/routes/invoices.ts            # (modified) added GET /:id/audit-log endpoint
backend/src/index.ts                      # (modified) wired notification routes
```

**Implementation notes:**
- Audit records + notifications are created inline during status changes (Phase 3 routes) — no separate audit/notification service needed
- Notification list includes invoice summary (id, filename, status) for frontend display
- `read-all` endpoint defined BEFORE `/:id/read` to avoid route collision
- Employee access control on audit-log: can only view own invoices' audit trail

### Testing Notes

- **Total: 51 tests** across 5 suites (2 health, 14 auth, 22 invoices, 3 extraction, 10 notifications/audit)
- All tests run against the seeded Render PostgreSQL (no local DB needed)
- Tests use the shared PrismaClient singleton (`lib/prisma.ts`) — no `$disconnect()` in individual test `afterAll` blocks
- `jest.setTimeout(30000)` set in invoice, notification, and extraction test files to accommodate remote DB latency
- Run with `--runInBand` to avoid connection pool exhaustion on Render free tier: `npx jest --runInBand`

### Phase 6: Frontend - Auth & Layout -- NOT STARTED

- [ ] Axios instance with interceptors (attach JWT, handle 401 refresh)
- [ ] Auth context (login, logout, current user, role check)
- [ ] Login page
- [ ] Protected route wrapper (redirect to login if not authed)
- [ ] App shell: sidebar navigation (different items per role), header with user info
- [ ] Responsive: sidebar collapses on tablet

### Phase 7: Frontend - Employee Views -- NOT STARTED

- [ ] **Upload Page**: drag-and-drop zone (react-dropzone), category radio (Vendor Payment / Reimbursement), notes textarea, submit with progress bar
- [ ] **My Submissions Page**: table listing own invoices with columns: date, filename, category, status badge, amount. Click row → detail page
- [ ] **Invoice Detail Page**: left panel = PDF viewer (iframe or embed), right panel = extracted data display, status timeline, audit log

### Phase 8: Frontend - Accounts Team Dashboard -- NOT STARTED

- [ ] **All Invoices Page**: full data table with pagination, column sorting, filter panel (status multi-select, date range picker, category, employee dropdown, amount min/max)
- [ ] **Invoice Review Page**: side-by-side layout. Left = PDF viewer. Right = editable form with extracted fields, confidence indicators (green/yellow/red), line items table. Action buttons: Approve, Reject (opens comment modal), Mark as Paid
- [ ] **Bulk Operations**: checkbox column in table, bulk action bar appears when items selected
- [ ] **CSV Export**: button triggers GET /api/invoices/export/csv with current filters

### Phase 9: Frontend - Additional Features -- NOT STARTED

- [ ] **Duplicate Detection Alert**: if invoice.is_duplicate is true, show warning banner on detail/review page
- [ ] **Audit Log View**: collapsible timeline component on invoice detail page
- [ ] **Notifications Panel**: bell icon in header, dropdown list of notifications, mark as read
- [ ] **Analytics Dashboard** (stretch): charts using Recharts or similar

### Phase 10: Polish & Deployment -- NOT STARTED

- [ ] Sample test PDF invoices in `/sample-invoices`
- [ ] Swagger/OpenAPI docs at `/api/docs`
- [ ] README.md with setup instructions, architecture explanation, screenshots
- [ ] **MANUAL**: Deploy backend to Render (Docker, set root dir to `/backend`)
- [ ] **MANUAL**: Deploy frontend to Vercel (set root dir to `/frontend`, set `VITE_API_URL`)
- [ ] **MANUAL**: Set all env vars on Render dashboard
- [ ] End-to-end verification on deployed version

---

## Additional Features

### Priority (Implementing these 4):
1. **Duplicate Detection** - check invoice_number + vendor on extraction complete, set is_duplicate flag, UI shows warning
2. **Audit Log** - all actions tracked in invoice_actions table, displayed as timeline on invoice detail
3. **Bulk Operations** - checkbox selection on accounts dashboard, bulk approve/reject endpoint
4. **OCR Confidence Score** - Gemini returns confidence per field in structured output, UI color-codes: green (>0.8), yellow (0.5-0.8), red (<0.5)

### Stretch (if time permits):
5. **Approval Workflow** - two-level approval for invoices above threshold (SENIOR_ACCOUNTS role exists in schema)
6. **Analytics Dashboard** - charts for weekly/monthly totals, avg processing time, category breakdown, top vendors

---

## Folder Structure

```
cityflow_assignment/
├── .gitignore                 # Root gitignore for monorepo
├── .env                       # Shared env vars (git-ignored)
├── .env.example               # Template for .env
├── package.json               # Root scripts: dev, test:backend, prisma:migrate, etc.
├── PLAN.md                    # THIS FILE - golden reference
├── backend/
│   ├── Dockerfile             # Multi-stage Node 20 Alpine, runs prisma migrate on start
│   ├── package.json           # Backend deps (express, prisma, jwt, gemini, multer, etc.)
│   ├── tsconfig.json          # TypeScript config (ES2020, commonjs)
│   ├── jest.config.js         # Jest + ts-jest
│   ├── prisma/
│   │   ├── schema.prisma      # 6 models, 7 enums, PostgreSQL
│   │   └── seed.ts            # Seeds 4 users
│   └── src/
│       ├── index.ts           # Express app entry (middleware, health check, error handler)
│       ├── index.test.ts      # Health check test (passing)
│       ├── config/
│       │   └── index.ts       # Loads .env from root + local, exports config object
│       ├── lib/
│       │   └── prisma.ts      # Shared PrismaClient singleton (avoids connection pool exhaustion)
│       ├── middleware/
│       │   ├── auth.ts        # JWT verification middleware (Phase 2)
│       │   ├── roles.ts       # Role-based access middleware (Phase 2)
│       │   └── upload.ts      # Multer config: PDF filter, 10MB limit (Phase 3)
│       ├── routes/
│       │   ├── auth.ts            # Auth routes (Phase 2)
│       │   ├── auth.test.ts       # 14 auth tests (Phase 2)
│       │   ├── invoices.ts        # Invoice CRUD routes (Phase 3)
│       │   ├── invoices.test.ts   # 22 invoice tests (Phase 3)
│       │   ├── notifications.ts   # Notification routes (Phase 5)
│       │   └── notifications.test.ts # 10 notification/audit tests (Phase 5)
│       ├── services/
│       │   ├── gemini.ts          # Gemini API call (Phase 4)
│       │   ├── extraction.ts      # Orchestrates extraction + duplicate check (Phase 4)
│       │   └── extraction.test.ts # 3 extraction tests (Phase 4)
│       ├── utils/
│       └── types/
│           └── index.ts       # Shared types (JwtPayload, AuthenticatedRequest, etc.)
├── frontend/
│   ├── package.json           # Frontend deps (react, router, query, axios, tailwind, etc.)
│   ├── tsconfig.json          # Vite TS config
│   ├── vite.config.ts         # Vite + React + Tailwind v4 + API proxy to :3000
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── index.css          # Tailwind v4 (@import "tailwindcss")
│       ├── App.tsx            # Placeholder (will become router in Phase 6)
│       ├── api/               # Axios instance + API functions (Phase 6+)
│       ├── components/        # Reusable components (Phase 6+)
│       ├── pages/             # Page components (Phase 6+)
│       ├── contexts/          # AuthContext (Phase 6)
│       ├── hooks/             # Custom hooks (Phase 6+)
│       ├── types/             # Shared frontend types (Phase 6+)
│       └── utils/             # Helpers (Phase 6+)
└── sample-invoices/           # Test PDFs for demo (Phase 10)
```

---

## Seed Users

| Username | Password | Role | Email |
|----------|----------|------|-------|
| employee1 | password123 | EMPLOYEE | employee1@cityflo.com |
| employee2 | password123 | EMPLOYEE | employee2@cityflo.com |
| accounts1 | password123 | ACCOUNTS | accounts1@cityflo.com |
| senior_accounts1 | password123 | SENIOR_ACCOUNTS | senior.accounts@cityflo.com |

---

## Manual Steps Required

| Step | When | Status | Instructions |
|------|------|--------|--------------|
| Create Render PostgreSQL | Before Phase 2 | DONE | Render PostgreSQL (Singapore region), external URL in `.env` |
| Get Gemini API key | Before Phase 4 | DONE | Key set in `.env` as GEMINI_API_KEY |
| Run Prisma db push | After DATABASE_URL set | DONE | `prisma db push` (not migrate - Render free tier limitation) |
| Run seed script | After db push | DONE | 4 users seeded successfully |
| Deploy backend to Render | Phase 10 | NOT DONE | Render → New → Web Service → Docker → Root dir: `backend` → Set env vars |
| Deploy frontend to Vercel | Phase 10 | NOT DONE | Vercel → Import repo → Root dir: `frontend` → Set VITE_API_URL |
| Set production env vars | Phase 10 | NOT DONE | Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, GEMINI_API_KEY, FRONTEND_URL on Render |

---

## Environment Variables

Single `.env` file at project root (git-ignored). See `.env.example` for template.

```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
UPLOAD_DIR=./uploads
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Frontend (VITE_ prefix required for Vite to expose to client)
VITE_API_URL=http://localhost:3000/api
```

> On Render/Vercel, env vars are set via their dashboards - no `.env` file needed in production.

---

## NPM Scripts Reference

**From project root:**
- `npm run dev` - starts both backend and frontend concurrently
- `npm run dev:backend` - starts backend only (tsx watch)
- `npm run dev:frontend` - starts frontend only (vite dev)
- `npm run test:backend` - runs backend Jest tests
- `npm run prisma:migrate` - runs Prisma migration (loads root .env)
- `npm run prisma:seed` - seeds the database
- `npm run prisma:studio` - opens Prisma Studio GUI

**From `/backend`:**
- `npm run dev` - tsx watch src/index.ts
- `npm run build` - tsc compile to dist/
- `npm test` - jest
- `npm run prisma:generate` - generate Prisma client

**From `/frontend`:**
- `npm run dev` - vite dev server on :5173
- `npm run build` - vite build to dist/
