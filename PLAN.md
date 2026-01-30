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
- [ ] **MANUAL (NOT DONE)**: Create Render PostgreSQL instance → set `DATABASE_URL` in `.env`
- [ ] **MANUAL (NOT DONE)**: Get Gemini API key from https://aistudio.google.com/apikey → set `GEMINI_API_KEY` in `.env`
- [ ] Run `npx prisma migrate dev` once DATABASE_URL is set

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

### Phase 2: Backend - Auth & User Management -- NOT STARTED

- [ ] `POST /api/auth/login` - validate credentials, return { accessToken, refreshToken, user }
- [ ] `POST /api/auth/refresh` - validate refresh token, return new access token
- [ ] `GET /api/auth/me` - return current user info from JWT
- [ ] Auth middleware (`backend/src/middleware/auth.ts`) - verify JWT, attach `user` to request
- [ ] Role middleware (`backend/src/middleware/roles.ts`) - check user.role against allowed roles
- [ ] Auth routes (`backend/src/routes/auth.ts`)
- [ ] Tests: login success/failure, protected route access, role checking

### Phase 3: Backend - Invoice CRUD & File Upload -- NOT STARTED

- [ ] `POST /api/invoices` - upload PDF(s) + category + notes
  - Multer middleware: PDF only, max 10MB, stored to `UPLOAD_DIR`
  - Creates Invoice record with status PENDING_REVIEW, extraction_status PENDING
  - Fires async extraction (non-blocking, see Phase 4)
  - Returns invoice ID(s) immediately
- [ ] `GET /api/invoices` - paginated list with filters
  - Employees see only their own invoices
  - Accounts see all, with filters: status, category, date range, employee, amount range
  - Query params: page, limit, sortBy, sortOrder, status, category, dateFrom, dateTo, submittedBy, amountMin, amountMax
- [ ] `GET /api/invoices/:id` - single invoice with extractedData + lineItems + actions
- [ ] `GET /api/invoices/:id/pdf` - serve PDF file (stream)
- [ ] `PATCH /api/invoices/:id/extracted-data` - edit extracted fields (ACCOUNTS/SENIOR_ACCOUNTS only)
- [ ] `PATCH /api/invoices/:id/status` - change status (approve/reject/mark paid)
  - Reject REQUIRES comment in body
  - Creates InvoiceAction audit record
  - Creates Notification for submitter
- [ ] `GET /api/invoices/export/csv` - export filtered invoices as CSV download
- [ ] `POST /api/invoices/bulk-action` - bulk approve/reject with array of invoice IDs

### Phase 4: Backend - PDF Extraction via Gemini -- NOT STARTED

- [ ] Gemini service (`backend/src/services/gemini.ts`):
  - Read PDF file buffer, send as base64 inline data to Gemini 2.5 Flash
  - Structured prompt requesting JSON output with all invoice fields + confidence scores (0-1)
  - Parse response, validate, handle errors
- [ ] Extraction service (`backend/src/services/extraction.ts`):
  - Called async after invoice upload (fire-and-forget)
  - Sets extraction_status to PROCESSING
  - Calls Gemini service
  - Saves ExtractedData + LineItems to DB
  - Sets extraction_status to COMPLETED or FAILED
  - Runs duplicate detection (query for matching invoice_number + vendor_name)
  - Sets is_duplicate flag if found

### Phase 5: Backend - Notifications & Audit Log -- NOT STARTED

- [ ] Audit service (`backend/src/services/audit.ts`): log actions to invoice_actions table
- [ ] Notification service (`backend/src/services/notification.ts`):
  - Create notification on status change
  - Console.log simulated email (assignment says just log it)
- [ ] `GET /api/notifications` - list notifications for current user
- [ ] `PATCH /api/notifications/:id/read` - mark notification as read
- [ ] `GET /api/invoices/:id/audit-log` - get full audit trail for an invoice

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
│   │   ├── migrations/        # Generated by prisma migrate dev
│   │   └── seed.ts            # Seeds 4 users
│   └── src/
│       ├── index.ts           # Express app entry (middleware, health check, error handler)
│       ├── index.test.ts      # Health check test (passing)
│       ├── config/
│       │   └── index.ts       # Loads .env from root + local, exports config object
│       ├── middleware/
│       │   ├── auth.ts        # JWT verification middleware (Phase 2)
│       │   └── roles.ts       # Role-based access middleware (Phase 2)
│       ├── routes/
│       │   ├── auth.ts        # Auth routes (Phase 2)
│       │   ├── invoices.ts    # Invoice CRUD routes (Phase 3)
│       │   └── notifications.ts # Notification routes (Phase 5)
│       ├── services/
│       │   ├── gemini.ts      # Gemini API call (Phase 4)
│       │   ├── extraction.ts  # Orchestrates extraction + duplicate check (Phase 4)
│       │   ├── notification.ts # Creates notifications (Phase 5)
│       │   └── audit.ts       # Logs audit actions (Phase 5)
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
| Create Render PostgreSQL | Before Phase 2 | NOT DONE | Render Dashboard → New → PostgreSQL → Free tier → Copy internal DATABASE_URL → Paste in `.env` |
| Get Gemini API key | Before Phase 4 | NOT DONE | https://aistudio.google.com/apikey → Create key → Paste in `.env` as GEMINI_API_KEY |
| Run Prisma migration | After DATABASE_URL set | NOT DONE | `npm run prisma:migrate` from root, or `cd backend && npx prisma migrate dev --name init` |
| Run seed script | After migration | NOT DONE | `npm run prisma:seed` from root, or `cd backend && npx tsx prisma/seed.ts` |
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
