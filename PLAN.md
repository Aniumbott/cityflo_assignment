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
| Theming | **Tailwind Dark Mode ('class')** | Manual toggle support + System preference |

---

## Design System & UI Strategy (Cityflo Aesthetic)

The UI follows the "Cityflo" mobile app aesthetic: High contrast, rounded shapes, and a distinctive Yellow/Black palette. It must support **Light** and **Dark** modes seamlessly.

### Color Palette Mappings

| Element | Light Mode | Dark Mode | Notes |
|---------|------------|-----------|-------|
| **Brand Accent** | **Mustard Yellow** (`#FFC72C`) | **Mustard Yellow** (`#FFC72C`) | Primary actions, highlights. Text on top is always **Black**. |
| **Background** | **Canvas Beige** (`#F9F9F7`) | **Midnight Black** (`#09090b`) | Main app background. |
| **Surface/Card** | **Pure White** (`#FFFFFF`) | **Charcoal Grey** (`#18181b`) | Cards, Sidebar, Modals. |
| **Primary Text** | **Ink Black** (`#1A1A1A`) | **Cloud White** (`#EDEDED`) | Headings, main content. |
| **Secondary Text**| **Slate Grey** (`#64748b`) | **Ash Grey** (`#a1a1aa`) | Meta data, labels. |
| **Borders** | **Soft Grey** (`#e2e8f0`) | **Dark Metal** (`#27272a`) | Dividers, inputs. |
| **Success** | **Green** (`#2ECC71`) | **Neon Green** (`#4ADE80`) | Money, Approved status. |
| **Error** | **Red** (`#E74C3C`) | **Salmon Red** (`#F87171`) | Alerts, Rejected status. |

### Typography & Shapes
*   **Font**: Inter or Roboto (Clean sans-serif).
*   **Cards**: `rounded-2xl` (Heavy rounding), `shadow-sm`.
*   **Inputs**: `rounded-xl`, high padding.
*   **Buttons**: `rounded-full` or `rounded-xl`.
*   **Visuals**: Dotted lines for timelines ("Bus Route" style).

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
- [x] Monorepo structure, Backend Setup, DB Schema, Docker
- [x] Frontend Setup, Render PostgreSQL, Gemini API Key
- [x] DB Synced and Seeded

### Phase 2: Backend - Auth & User Management -- COMPLETED
- [x] Login/Refresh/Me endpoints, Auth/Role middleware
- [x] 14 Tests passing

### Phase 3: Backend - Invoice CRUD & File Upload -- COMPLETED
- [x] Upload, List, Detail, Status, Export endpoints
- [x] 22 Tests passing

### Phase 4: Backend - PDF Extraction via Gemini -- COMPLETED
- [x] Gemini Service, Extraction Service
- [x] 3 Tests passing

### Phase 5: Backend - Notifications & Audit Log -- COMPLETED
- [x] Notification, Audit endpoints
- [x] 10 Tests passing

### Phase 6: Frontend - Auth & Layout -- COMPLETED
- [x] Axios, Auth Context, Login Page
- [x] App Shell (Sidebar/Header)
- [x] 12 Tests passing

### Phase 7: Frontend - Theming & Employee Views -- IN PROGRESS

> **Design Goal:** Implement "Cityflo" design system + Dark Mode support.

- [x] **7a. Infrastructure & Theming** -- COMPLETED:
    - [x] Updated `index.css` with Tailwind v4 `@theme` block: brand colors (#FFC72C), canvas/surface/midnight/charcoal, ink/slate/cloud/ash text, border-light/border-dark, success/error, Inter font.
    - [x] Added `@custom-variant dark` for class-based dark mode.
    - [x] Created `ThemeContext` (light/dark/system stored in localStorage, listens to system preference changes).
    - [x] Created reusable UI components: `Button` (primary=yellow, secondary, ghost, danger variants), `Card` (rounded-2xl, dark mode), `ThemeToggle` (Sun/Moon/Monitor 3-way toggle).
    - [x] Updated all Phase 6 components (LoginPage, Layout, ProtectedRoute, App.tsx) with Cityflo color tokens and `dark:` classes.
    - [x] Header includes ThemeToggle + backdrop blur effect.
    - [x] LoginPage uses Card component, brand-yellow submit button, ThemeToggle in corner.
    - [x] 12 frontend tests still passing (added matchMedia mock for jsdom).

    **Key files created/modified in 7a:**
    ```
    frontend/src/index.css                     # (modified) @theme block with Cityflo colors + @custom-variant dark
    frontend/src/contexts/ThemeContext.tsx      # NEW: ThemeProvider + useTheme hook (light/dark/system)
    frontend/src/components/ui/Button.tsx       # NEW: Button with primary/secondary/ghost/danger variants
    frontend/src/components/ui/Card.tsx         # NEW: Card with rounded-2xl + dark mode
    frontend/src/components/ui/ThemeToggle.tsx  # NEW: 3-way theme toggle (Sun/Moon/Monitor)
    frontend/src/pages/LoginPage.tsx            # (modified) Cityflo aesthetic + dark mode + Card/Button components
    frontend/src/components/Layout.tsx          # (modified) Cityflo colors, rounded-xl nav, ThemeToggle in header, backdrop blur
    frontend/src/components/ProtectedRoute.tsx  # (modified) Cityflo colors + dark mode
    frontend/src/App.tsx                        # (modified) ThemeProvider wrapper, Cityflo colors on placeholder/404 pages
    frontend/src/test/setup.ts                  # (modified) added matchMedia mock for jsdom
    frontend/src/test/test-utils.tsx            # (modified) added ThemeProvider to test wrapper
    ```

- [x] **7b. Upload Page** -- COMPLETED:
    - [x] **Card Container**: Uses `Card` component (bg-surface dark:bg-charcoal rounded-2xl shadow-sm).
    - [x] **Dropzone**: `react-dropzone` with `border-dashed`, brand yellow tint on drag-active, hover highlight in both modes.
    - [x] **Inputs**: Category `<select>` and Notes `<textarea>` — rounded-xl, `bg-white dark:bg-zinc-800 border-border-light dark:border-border-dark`, focus ring with brand color.
    - [x] **Submit Button**: Brand Yellow via `Button` primary variant, `rounded-full`, full-width, loading spinner, disabled when no files or no category.
    - [x] **File List**: Shows selected PDFs with name/size, remove button per file, max 10 files / 10MB each.
    - [x] **API Integration**: `uploadInvoices()` sends multipart/form-data (files + category + notes) to `POST /api/invoices`.
    - [x] **Success Flow**: Toast notification + navigate to `/submissions`.
    - [x] **Error Handling**: Toast on rejection (non-PDF, >10MB), inline error on API failure.
    - [x] **Tests**: 7 tests (render, disabled state, category select, notes input, file add/remove, submit success, error state).
    - [x] 19 frontend tests passing (12 existing + 7 new).

    **Key files created/modified in 7b:**
    ```
    frontend/src/types/index.ts                  # (modified) Added Invoice, InvoiceCategory, InvoiceStatus, ExtractionStatus, UploadInvoicesResponse types
    frontend/src/api/invoices.ts                 # NEW: uploadInvoices() — multipart form-data POST to /api/invoices
    frontend/src/pages/UploadPage.tsx            # NEW: Full upload page with dropzone, category select, notes, file list, submit
    frontend/src/pages/UploadPage.test.tsx       # NEW: 7 tests for upload page
    frontend/src/App.tsx                         # (modified) Replaced Upload placeholder with UploadPage component
    ```

- [x] **7c. My Submissions Page** -- COMPLETED:
    - [x] **Card Layout**: Each invoice rendered as a clickable `Card` (rounded-2xl, hover shadow), not a table.
    - [x] **Typography**: High contrast amount display (font-semibold, ink/cloud), INR currency formatting.
    - [x] **Status Pills**: Icon + label, rounded-full:
        - [x] Pending: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400` + Clock icon.
        - [x] Approved: `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400` + CheckCircle icon.
        - [x] Rejected: `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400` + XCircle icon.
        - [x] Paid: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400` + Banknote icon.
    - [x] **Filter Pills**: Horizontal scrollable status filter tabs (All/Pending/Approved/Rejected/Paid), active = `bg-ink text-white dark:bg-cloud dark:text-black`.
    - [x] **Search Bar**: Search by filename/vendor/invoice number, rounded-xl with Search icon.
    - [x] **Pagination**: Previous/Next buttons with page info, 10 items per page.
    - [x] **Empty State**: Inbox icon + "No submissions found" + Upload CTA.
    - [x] **Error State**: "Failed to load submissions" in card.
    - [x] **Loading State**: Brand-colored spinner.
    - [x] **Navigation**: Upload button in header, card click navigates to `/invoices/:id`.
    - [x] **React Query**: `useQuery` with `['submissions', page, statusFilter, search]` key for auto-refetch on filter/page change.
    - [x] **Tests**: 8 tests (header, loading, empty, data render, filter pills, filter click, navigate, error).
    - [x] 27 frontend tests passing (19 existing + 8 new).

    **Key files created/modified in 7c:**
    ```
    frontend/src/types/index.ts                       # (modified) Added InvoiceListItem, Pagination, InvoiceListResponse, InvoiceListParams
    frontend/src/api/invoices.ts                      # (modified) Added listInvoices() — GET /api/invoices with query params
    frontend/src/pages/SubmissionsPage.tsx             # NEW: Full submissions list with cards, filters, search, pagination
    frontend/src/pages/SubmissionsPage.test.tsx        # NEW: 8 tests for submissions page
    frontend/src/App.tsx                              # (modified) Replaced Submissions placeholder with SubmissionsPage component
    ```

- [x] **7d. Invoice Detail (Employee View)** -- COMPLETED:
    - [x] **Timeline**: "Bus Route" dotted line style:
        - [x] Nodes: Circular icons per action type (Send, Eye, Pencil, CheckCircle, XCircle, Banknote).
        - [x] Connector: `border-dashed border-l-2` vertical dotted line.
        - [x] Colors: Action-specific colors, dark mode adapted (brand/green/red/blue/ash).
        - [x] Shows username, action verb, timestamp, and optional comment per entry.
    - [x] **Invoice Header**: Vendor name (or filename fallback), status pill, back button.
    - [x] **Meta Grid**: Category, submitted date, extraction status, invoice #, invoice date, due date, payment terms, notes.
    - [x] **Financial Summary Card**: Subtotal, tax, grand total (INR formatted, high-contrast).
    - [x] **Line Items Table**: Responsive table with description, qty, unit price, total.
    - [x] **Bank Details Card**: Pre-formatted bank info.
    - [x] **Duplicate Warning**: Yellow striped alert banner when `isDuplicate` is true.
    - [x] **Extraction Processing Indicator**: Spinner + message when extraction is pending/processing.
    - [x] **Error/Not Found State**: AlertTriangle icon + "Go back" button.
    - [x] **Tests**: 9 tests (loading, error, header, meta, financial, line items, bank details, timeline, duplicate warning).
    - [x] 36 frontend tests passing (27 existing + 9 new).

    **Key files created/modified in 7d:**
    ```
    frontend/src/types/index.ts                        # (modified) Added LineItem, ExtractedData, InvoiceActionType, InvoiceAction, InvoiceDetail, InvoiceDetailResponse
    frontend/src/api/invoices.ts                       # (modified) Added getInvoice() — GET /api/invoices/:id
    frontend/src/pages/InvoiceDetailPage.tsx            # NEW: Full invoice detail with meta, financials, line items, bank details, "Bus Route" timeline
    frontend/src/pages/InvoiceDetailPage.test.tsx       # NEW: 9 tests for invoice detail page
    frontend/src/App.tsx                               # (modified) Replaced Invoice Detail placeholder with InvoiceDetailPage component
    ```

### Phase 7: COMPLETED
> All employee-facing views (Upload, My Submissions, Invoice Detail) are fully implemented with Cityflo design system, dark mode, and 36 passing tests.

### Phase 8: Frontend - Accounts Team Dashboard -- NOT STARTED

- [ ] **All Invoices Dashboard**:
    - [ ] **Filters**: Horizontal scrollable "Pills" (`bg-white dark:bg-zinc-800` -> `bg-black text-white` when active).
    - [ ] **Data Table**:
        - [ ] Header: `bg-zinc-50 dark:bg-zinc-900`.
        - [ ] Rows: `hover:bg-yellow-50 dark:hover:bg-zinc-800` transition.
- [ ] **Invoice Review Workspace**:
    - [ ] **Review Panel**: Split screen. PDF viewer (dark mode friendly iframe) + Form.
    - [ ] **Confidence Dots**: Green/Yellow/Red indicators next to inputs.
    - [ ] **Action Bar**: Fixed at bottom or top-right.
- [ ] **Bulk Operations**: Floating "Action Bar" at the bottom (Black with white text, or Dark Grey with white text).

### Phase 9: Frontend - Polish & Interactivity -- NOT STARTED

- [ ] **Duplicate Detection Alert**: Construction-style striped warning banner.
- [ ] **Notification Panel**: Floating card in Header.
- [ ] **Animations**: `framer-motion` (optional) or CSS transitions for theme switching and sidebar toggle.

### Phase 10: Polish & Deployment -- NOT STARTED

- [ ] Sample test PDF invoices in `/sample-invoices`
- [ ] Swagger/OpenAPI docs
- [ ] README.md
- [ ] **MANUAL**: Deploy backend to Render
- [ ] **MANUAL**: Deploy frontend to Vercel
- [ ] End-to-end verification

---

## Folder Structure Update (Frontend)

```
cityflow_assignment/
├── ...
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── ThemeContext.tsx    # Manages light/dark mode state
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/                 # Reusable Styled Components
│   │   │   │   ├── Button.tsx      # Variants: primary (yellow), secondary (black/white)
│   │   │   │   ├── Card.tsx        # rounded-2xl, supports dark mode
│   │   │   │   └── ThemeToggle.tsx # Sun/Moon switch
│   │   ├── ...
```

---

## Additional Features

### Priority (Implementing these 4):
1. **Duplicate Detection** - Warning banner on review page.
2. **Audit Log** - **Visualized as a "Bus Route" vertical timeline.**
3. **Bulk Operations** - Floating bottom bar.
4. **OCR Confidence Score** - Color-coded indicators.

### Stretch (if time permits):
5. **Approval Workflow** - Two-level approval.
6. **Analytics Dashboard** - Charts (Recharts) with Cityflo Yellow palette.