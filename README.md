# Cityflo Invoice Processing System

A full-stack invoice management application with AI-powered PDF extraction, built for Cityflo's internal workflow. Features role-based access control, two-level approval workflow for high-value invoices, real-time notifications, analytics dashboard with interactive charts, and a polished dark-mode UI.

![Tests](https://img.shields.io/badge/tests-121%20passing-brightgreen) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-blue) ![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)

## 📚 Quick Navigation

| Section | Description |
|---------|-------------|
| [Features](#-features) | Complete feature list for all user roles |
| [Architecture](#%EF%B8%8F-architecture) | Tech stack and database schema |
| [Getting Started](#-getting-started) | Installation and setup guide |
| [Testing](#-testing) | Test coverage and running tests |
| [API Reference](#-api-reference) | Complete REST API documentation |
| [Workflows](#-key-workflows) | Common user workflows explained |
| [Deployment](#-deployment) | Production deployment guide |
| [Troubleshooting](#-troubleshooting) | Common issues and solutions |

---

## 🎯 Features

### For Employees
- **Upload Invoices**: Drag-and-drop PDF upload with category selection and notes
- **Track Submissions**: View all submitted invoices with status, search, and filters
- **Invoice Details**: Comprehensive view of extracted data, financial summary, and activity timeline

### For Accounts Team
- **All Invoices Dashboard**: Data table with sorting, filtering, search, pagination, bulk operations
- **Invoice Review Workspace**: Split-screen PDF viewer with editable extracted fields
- **Confidence Indicators**: AI extraction confidence scores (green/yellow/red dots)
- **Approve/Reject/Mark Paid**: Streamlined invoice status management with audit trail
- **Two-Level Approval**: Invoices exceeding ₹50,000 require SENIOR_ACCOUNTS approval after ACCOUNTS review
- **Analytics Dashboard**: Comprehensive insights with interactive charts
  - Overview stats cards (total invoices, pending, approved, rejected, paid, total amount, avg processing time)
  - Status distribution pie chart
  - Submissions over time line chart
  - Category breakdown pie chart
  - Recent high-value invoices list
  - Date range and category filters
- **CSV Export**: Download filtered invoice data

### Core Capabilities
- **AI-Powered Extraction**: Google Gemini 2.5 Flash extracts vendor, amounts, dates, line items, bank details
- **Duplicate Detection**: Automatic detection of duplicate invoices with visual warnings
- **Two-Level Approval Workflow**: High-value invoices (>₹50,000) require senior approval before final processing
- **Real-time Notifications**: Bell icon with unread count, mark as read, 30-second polling
- **Activity Timeline**: "Bus Route" style audit log showing all actions on an invoice
- **Dark Mode**: Full light/dark theme support with smooth transitions
- **Role-Based Access**: 3 roles (EMPLOYEE, ACCOUNTS, SENIOR_ACCOUNTS) with different UI/permissions
- **Responsive Design**: Mobile-friendly with sidebar overlay on small screens

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript + Vite | Modern SPA with type safety |
| | Tailwind CSS v4 | Utility-first styling with custom theme |
| | React Query | Server state management & caching |
| | React Router v7 | Client-side routing |
| | Axios | HTTP client with JWT interceptors |
| | Recharts | Data visualization & charts |
| | Lucide Icons | Icon library |
| **Backend** | Node.js + Express 5 + TypeScript | REST API server |
| | Prisma v5 | Type-safe ORM |
| | PostgreSQL | Relational database |
| | Multer | File upload handling |
| | JWT | Authentication & authorization |
| **AI** | Google Gemini 2.5 Flash | PDF invoice data extraction |
| **Testing** | Vitest + RTL (frontend) | 70 component/integration tests |
| | Jest + Supertest (backend) | 51 API tests |
| **Deployment** | Render (frontend) | Docker container hosting |
| | Render (backend) | Docker container hosting |
| | Render PostgreSQL | Managed database |

### Database Schema

![Database ERD](docs/erd_cityflo.png)

**Entity Relationship Diagram** showing the complete database structure with relationships and cascade rules.

```
users (id, email, username, password_hash, role, created_at)
  ↓
invoices (id, submitted_by, category, status, file_path, notes, extraction_status,
         is_duplicate, requires_two_level, senior_approved_by, senior_approved_at, ...)
  ↓
extracted_data (id, invoice_id, vendor_name, invoice_number, dates, amounts,
               bank_details, confidence_scores, ...)
  ↓
line_items (id, extracted_data_id, description, quantity, unit_price, total)

invoice_actions (id, invoice_id, user_id, action, comment, created_at) -- Audit log
notifications (id, user_id, invoice_id, message, read, created_at)
```

**Cascade Deletes**: Deleting an invoice cascades to extracted_data, line_items, invoice_actions, and notifications.

### Invoice Status Workflow

The system supports a sophisticated approval workflow with automatic two-level approval for high-value invoices:

```
PENDING_REVIEW (initial state after PDF extraction)
    ↓
    ├─→ [Amount ≤ ₹50,000] → APPROVED (by ACCOUNTS)
    │                           ↓
    │                        PAID (by ACCOUNTS)
    │
    └─→ [Amount > ₹50,000] → PENDING_SENIOR_APPROVAL (by ACCOUNTS)
                                ↓
                             APPROVED (by SENIOR_ACCOUNTS)
                                ↓
                             PAID (by ACCOUNTS/SENIOR_ACCOUNTS)

Any stage can be → REJECTED
```

**Status Definitions:**
- `PENDING_REVIEW`: Awaiting initial review by ACCOUNTS team
- `PENDING_SENIOR_APPROVAL`: High-value invoice approved by ACCOUNTS, awaiting SENIOR_ACCOUNTS approval
- `APPROVED`: Invoice approved and ready for payment
- `REJECTED`: Invoice rejected (requires resubmission)
- `PAID`: Payment completed (terminal state)

**Extraction Status (separate field):**
- `PENDING`: File uploaded, extraction not started
- `PROCESSING`: Gemini API extracting data
- `COMPLETED`: Data successfully extracted
- `FAILED`: Extraction failed (Gemini API error)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (local or Render managed)
- **Google Gemini API Key** ([Get one free](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cityflow_assignment
   ```

2. **Set up environment variables**

   Create a `.env` file in the **root directory**:
   ```env
   # Database (Render PostgreSQL or local)
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

   # Google Gemini API
   GEMINI_API_KEY="your_gemini_api_key_here"

   # JWT Secrets (generate with: openssl rand -base64 32)
   JWT_ACCESS_SECRET="your_long_random_access_secret"
   JWT_REFRESH_SECRET="your_long_random_refresh_secret"
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up the database**
   ```bash
   cd backend
   npx prisma db push     # Sync schema to database
   npx prisma db seed     # Seed with 3 test users
   cd ..
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This runs:
   - Backend on `http://localhost:3000`
   - Frontend on `http://localhost:5173` (proxies `/api` to backend)

### Test Users

After seeding, you can log in with:

| Username | Password | Role |
|----------|----------|------|
| `employee1` | `password123` | EMPLOYEE |
| `accounts1` | `password123` | ACCOUNTS |
| `senior_accounts1` | `password123` | SENIOR_ACCOUNTS |

---

## 🧪 Testing

### Run All Tests
```bash
npm test                 # Both frontend + backend
npm run test:frontend    # 70 tests (Vitest + RTL)
npm run test:backend     # 51 tests (Jest + Supertest)
```

### Test Coverage
- **Frontend**: 70 tests across 8 files (components, pages, contexts) - All passing ✓
- **Backend**: 51 tests across 5 files (auth, invoices, notifications, extraction, health) - All passing ✓
- **Total**: **121 passing tests** (100% pass rate)
- **Last Verified**: 2026-01-31

---

## 📖 API Reference

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | - | Login with username/password → returns accessToken + refreshToken |
| `/api/auth/refresh` | POST | - | Refresh expired accessToken with refreshToken |
| `/api/auth/me` | GET | JWT | Get current user profile |

### Invoices

| Endpoint | Method | Auth | Roles | Description |
|----------|--------|------|-------|-------------|
| `/api/invoices` | POST | JWT | EMPLOYEE | Upload invoices (multipart/form-data, max 10 files, 10MB each) |
| `/api/invoices` | GET | JWT | ALL | List invoices with pagination, filters, search, sorting |
| `/api/invoices/:id` | GET | JWT | ALL | Get invoice details with extracted data + actions |
| `/api/invoices/:id/status` | PATCH | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Update invoice status (PENDING_SENIOR_APPROVAL/APPROVED/REJECTED/PAID) |
| `/api/invoices/:id/extracted-data` | PATCH | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Edit extracted invoice data |
| `/api/invoices/:id/pdf` | GET | JWT | ALL | View invoice PDF file (authenticated blob download) |
| `/api/invoices/bulk-action` | POST | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Bulk approve/reject invoices |
| `/api/invoices/export/csv` | GET | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Export invoices as CSV |
| `/api/invoices/:id/audit-log` | GET | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Get audit log for an invoice |

### Notifications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notifications` | GET | JWT | List user's notifications (paginated) |
| `/api/notifications/:id/read` | PATCH | JWT | Mark notification as read |
| `/api/notifications/read-all` | PATCH | JWT | Mark all notifications as read |

### Analytics

| Endpoint | Method | Auth | Roles | Description |
|----------|--------|------|-------|-------------|
| `/api/analytics/stats` | GET | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Get aggregated analytics (overview stats, category breakdown, status timeline, recent invoices). Supports query params: `startDate`, `endDate`, `category` |

---

## 🎨 Design System (Cityflo Aesthetic)

The UI follows a high-contrast, rounded, mobile-first design inspired by the Cityflo brand:

### Colors

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Brand** | Mustard Yellow `#FFC72C` | Mustard Yellow `#FFC72C` |
| **Background** | Canvas Beige `#F9F9F7` | Midnight Black `#09090b` |
| **Surface** | Pure White `#FFFFFF` | Charcoal `#18181b` |
| **Primary Text** | Ink Black `#1A1A1A` | Cloud White `#EDEDED` |
| **Secondary Text** | Slate Grey `#64748b` | Ash Grey `#a1a1aa` |
| **Success** | Green `#2ECC71` | Neon Green `#4ADE80` |
| **Error** | Red `#E74C3C` | Salmon Red `#F87171` |

### Components
- **Cards**: `rounded-2xl` with `shadow-sm`
- **Inputs**: `rounded-xl` with brand focus ring
- **Buttons**: `rounded-full` or `rounded-xl` (primary = yellow, secondary = ink/cloud)
- **Pills**: `rounded-full` status badges with icons
- **Timeline**: Dotted vertical line with circular icon nodes ("Bus Route" style)

---

## 📂 Project Structure

```
cityflow_assignment/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints (auth, invoices, notifications, analytics)
│   │   ├── middleware/      # auth, role check, error handler
│   │   ├── services/        # gemini, extraction, notifications
│   │   ├── lib/             # prisma client
│   │   └── index.ts         # Express app
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Test users seed
│   ├── uploads/             # PDF storage (git-ignored)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # LoginPage, UploadPage, SubmissionsPage, InvoiceDetailPage, AllInvoicesPage, InvoiceReviewPage, AnalyticsPage
│   │   ├── components/      # Layout, ProtectedRoute, NotificationPanel, ui/Button, ui/Card, ui/ThemeToggle
│   │   ├── contexts/        # AuthContext, ThemeContext
│   │   ├── api/             # axios, auth, invoices, notifications, analytics
│   │   ├── types/           # TypeScript types
│   │   ├── test/            # test-utils, setup
│   │   ├── App.tsx          # Router + role-based redirects
│   │   └── index.css        # Tailwind + custom theme
│   └── package.json
├── .env                     # Root environment variables (DATABASE_URL, GEMINI_API_KEY, JWT secrets)
├── package.json             # Monorepo scripts (dev, test, build)
├── PLAN.md                  # Detailed project plan (phases 1-11)
└── README.md
```

---

## 🚢 Deployment

Both frontend and backend are deployed on **Render** using the Blueprint configuration in `render.yaml`.

### Quick Deploy (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
2. Connect your GitHub repository
3. Render auto-detects `render.yaml` and creates all services:
   - **cityflo-assignment-backend** (Docker web service)
   - **cityflo-assignment-frontend** (Docker web service)
   - **cityflo-invoices-db** (PostgreSQL database)
4. Set required environment variables in Render Dashboard:
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - `JWT_ACCESS_SECRET` - Generate with `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET` - Generate with `openssl rand -base64 32`
5. Click **Apply** to deploy

### Live URLs

- **Frontend**: https://cityflo-assignment-frontend.onrender.com
- **Backend API**: https://cityflo-assignment-backend.onrender.com

### Post-Deployment

1. Open the backend service Shell in Render Dashboard
2. Run `npm run prisma:seed` to create test users

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🔐 Security Notes

- **JWT Tokens**: Access tokens expire in 15 minutes, refresh tokens in 7 days
- **Password Hashing**: bcryptjs with 10 rounds
- **CORS**: Configured in `backend/src/server.ts`
- **Rate Limiting**: Express rate limit (100 requests per 15 min window)
- **File Validation**: Only PDF files, max 10MB, max 10 files per upload
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: React auto-escapes JSX, Helmet middleware

---

## 📝 Key Workflows

### 1. Employee Uploads Invoice
1. Employee logs in → redirected to `/submissions`
2. Clicks "Upload" → navigates to `/upload`
3. Drags PDF file, selects category, adds notes, submits
4. Backend receives file, saves to `/uploads`, creates invoice record, triggers Gemini extraction async
5. Frontend shows success toast, redirects to `/submissions`
6. Extraction completes → invoice status changes from PENDING to COMPLETED
7. Accounts team gets notification

### 2. Accounts Team Reviews Invoice
1. Accounts user logs in → redirected to `/invoices` (AllInvoicesPage)
2. Sees data table with all invoices, filters by "Pending Review"
3. Clicks row → navigates to `/invoices/:id` (InvoiceReviewPage)
4. Sees split screen: PDF on left (authenticated blob viewer), extracted data on right
5. Reviews confidence dots, edits any incorrect fields
6. Clicks "Approve":
   - If invoice amount ≤ ₹50,000 → status changes to APPROVED
   - If invoice amount > ₹50,000 → status changes to PENDING_SENIOR_APPROVAL
7. Employee and/or senior accounts get notification

### 3. Bulk Operations
1. Accounts user on `/invoices`, selects multiple pending invoices (checkboxes)
2. Floating action bar appears at bottom
3. Clicks "Approve" → all selected invoices approved in one API call
   - Low-value invoices (≤ ₹50,000) → APPROVED
   - High-value invoices (> ₹50,000) → PENDING_SENIOR_APPROVAL
4. Notifications sent to all affected employees and senior accounts

### 4. Two-Level Approval for High-Value Invoices
1. Accounts user reviews invoice with grand_total > ₹50,000
2. Clicks "Approve" → invoice status changes to PENDING_SENIOR_APPROVAL
3. Senior Accounts user gets notification
4. Senior Accounts logs in, sees invoice in "Pending Senior Approval" tab
5. Reviews invoice, clicks "Approve" → invoice status changes to APPROVED
6. Original submitter gets notification
7. Invoice can now be marked as PAID

### 5. Analytics Dashboard
1. Accounts user clicks "Analytics" in sidebar → navigates to `/analytics`
2. Views overview stats cards (total invoices, pending, approved, rejected, paid, total amount, avg processing time)
3. Sees interactive charts:
   - Status distribution pie chart showing pending/approved/rejected/paid breakdown
   - Submissions over time line chart showing 30-day trend
   - Category breakdown pie chart (VENDOR_PAYMENT vs REIMBURSEMENT)
4. Applies filters:
   - Date range filter (start date, end date)
   - Category filter (VENDOR_PAYMENT, REIMBURSEMENT, or All)
5. Views recent high-value invoices list
6. All charts update in real-time based on selected filters

---

## 📊 Performance & Metrics

- **Frontend Bundle**: ~830KB gzipped (Vite optimized, includes Recharts)
- **Backend Response Time**: <100ms for most endpoints (excluding PDF extraction)
- **PDF Extraction**: 10-15 seconds per invoice (Gemini API call, async processing)
- **PDF Download**: Authenticated blob streaming with ~50ms overhead
- **Analytics Queries**: <200ms with proper database indexing
- **Notification Polling**: 30-second interval (React Query automatic refetch)
- **Database Queries**: Optimized with Prisma `include` for related data joins
- **Test Suite**: 121 tests execute in ~40 seconds (backend: ~34s, frontend: ~6s)
- **Code Quality**: TypeScript strict mode, ESLint configured, 0 breaking bugs

---

### Key Technical Achievements
- ✅ Full dark mode support with CSS variables
- ✅ Responsive design (mobile-first approach)
- ✅ Type-safe API with OpenAPI documentation
- ✅ Secure authentication with JWT refresh tokens
- ✅ Role-based access control with 3 user levels

---

**Built with ❤️ for Cityflo**
