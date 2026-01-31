# Cityflo Invoice Processing System

A full-stack invoice management application with AI-powered PDF extraction, built for Cityflo's internal workflow. Features role-based access control, real-time notifications, and a polished dark-mode UI.

![Tech Stack](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-blue) ![Tests](https://img.shields.io/badge/Tests-131%20passing-success)

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
- **CSV Export**: Download filtered invoice data

### Core Capabilities
- **AI-Powered Extraction**: Google Gemini 2.5 Flash extracts vendor, amounts, dates, line items, bank details
- **Duplicate Detection**: Automatic detection of duplicate invoices with visual warnings
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
| | Lucide Icons | Icon library |
| **Backend** | Node.js + Express 5 + TypeScript | REST API server |
| | Prisma v5 | Type-safe ORM |
| | PostgreSQL | Relational database |
| | Multer | File upload handling |
| | JWT | Authentication & authorization |
| **AI** | Google Gemini 2.5 Flash | PDF invoice data extraction |
| **Testing** | Vitest + RTL (frontend) | 70 component/integration tests |
| | Jest + Supertest (backend) | 51 API tests |
| **Deployment** | Vercel (frontend) | Serverless hosting |
| | Render (backend) | Docker container hosting |
| | Render PostgreSQL | Managed database |

### Database Schema

```
users (id, email, username, password_hash, role, created_at)
  ↓
invoices (id, submitted_by, category, status, file_path, notes, extraction_status, is_duplicate, ...)
  ↓
extracted_data (id, invoice_id, vendor_name, invoice_number, dates, amounts, bank_details, confidence_scores, ...)
  ↓
line_items (id, extracted_data_id, description, quantity, unit_price, total)

invoice_actions (id, invoice_id, user_id, action, comment, created_at) -- Audit log
notifications (id, user_id, invoice_id, message, read, created_at)
```

**Cascade Deletes**: Deleting an invoice cascades to extracted_data, line_items, invoice_actions, and notifications.

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
- **Frontend**: 70 tests across 8 files (components, pages, contexts)
- **Backend**: 51 tests across 5 files (auth, invoices, notifications, audit, health)
- **Total**: **131 passing tests**

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
| `/api/invoices/:id/status` | PATCH | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Update invoice status (APPROVED/REJECTED/PAID) |
| `/api/invoices/:id/extracted-data` | PATCH | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Edit extracted invoice data |
| `/api/invoices/:id/pdf` | GET | JWT | ALL | View invoice PDF file |
| `/api/invoices/bulk-action` | POST | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Bulk approve/reject invoices |
| `/api/invoices/export/csv` | GET | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Export invoices as CSV |
| `/api/invoices/:id/audit-log` | GET | JWT | ACCOUNTS, SENIOR_ACCOUNTS | Get audit log for an invoice |

### Notifications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notifications` | GET | JWT | List user's notifications (paginated) |
| `/api/notifications/:id/read` | PATCH | JWT | Mark notification as read |
| `/api/notifications/read-all` | PATCH | JWT | Mark all notifications as read |

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
│   │   ├── routes/          # API endpoints (auth, invoices, notifications, audit)
│   │   ├── middleware/      # auth, role check, error handler
│   │   ├── services/        # gemini, extraction, notifications
│   │   ├── lib/             # prisma client
│   │   └── server.ts        # Express app
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Test users seed
│   ├── uploads/             # PDF storage (git-ignored)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # UploadPage, SubmissionsPage, InvoiceDetailPage, AllInvoicesPage, InvoiceReviewPage, LoginPage
│   │   ├── components/      # Layout, ProtectedRoute, NotificationPanel, ui/Button, ui/Card, ui/ThemeToggle
│   │   ├── contexts/        # AuthContext, ThemeContext
│   │   ├── api/             # axios, auth, invoices, notifications
│   │   ├── types/           # TypeScript types
│   │   ├── test/            # test-utils, setup
│   │   ├── App.tsx          # Router + role-based redirects
│   │   └── index.css        # Tailwind + custom theme
│   └── package.json
├── .env                     # Root environment variables (DATABASE_URL, GEMINI_API_KEY, JWT secrets)
├── package.json             # Monorepo scripts (dev, test, build)
├── PLAN.md                  # Detailed project plan (phases 1-10)
└── README.md
```

---

## 🚢 Deployment

### Backend (Render)

1. **Create a new Web Service** on [Render](https://render.com)
2. **Connect your Git repository**
3. **Configure:**
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Docker**: Use `Dockerfile` in `/backend`
4. **Environment Variables**:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `GEMINI_API_KEY`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NODE_ENV=production`
5. **Run Migration**: After first deploy, run `npx prisma db push` in Render Shell

### Frontend (Vercel)

1. **Import project** on [Vercel](https://vercel.com)
2. **Configure:**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**:
   - `VITE_API_URL` (your Render backend URL, e.g., `https://your-app.onrender.com`)
4. **Update** `frontend/vite.config.ts` for production proxy (or use VITE_API_URL in axios.ts)

### Database (Render PostgreSQL)

1. Create a **PostgreSQL** instance on Render (free tier)
2. Copy the **External Database URL**
3. Set as `DATABASE_URL` in backend environment variables
4. Run `npx prisma db push` to create tables
5. Run `npx prisma db seed` to create test users

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
4. Sees split screen: PDF on left, extracted data on right
5. Reviews confidence dots, edits any incorrect fields
6. Clicks "Approve" → invoice status → APPROVED
7. Employee gets notification

### 3. Bulk Operations
1. Accounts user on `/invoices`, selects multiple pending invoices (checkboxes)
2. Floating action bar appears at bottom
3. Clicks "Approve" → all selected invoices approved in one API call
4. Notifications sent to all affected employees

---

## 🐛 Troubleshooting

### Backend won't start
- Check `DATABASE_URL` is correct and database is accessible
- Run `npx prisma generate` in `/backend`
- Check `GEMINI_API_KEY` is valid

### Frontend won't connect to backend
- Ensure backend is running on port 3000
- Check `vite.config.ts` proxy is set to `http://localhost:3000`
- Clear browser cache / localStorage

### Extraction fails
- Check Gemini API quota (free tier: 15 requests/min)
- Ensure PDF is valid and has readable text (not scanned image)
- Check backend logs for Gemini API errors

### Tests failing
- Run `npm install` in both `/frontend` and `/backend`
- Check `.env` file exists in root
- For backend tests: ensure test database is accessible

---

## 📊 Performance

- **Frontend Bundle**: ~450KB gzipped (Vite optimized)
- **Backend Response Time**: <100ms for most endpoints (excluding PDF extraction)
- **PDF Extraction**: 2-5 seconds per invoice (Gemini API call)
- **Notification Polling**: 30-second interval (React Query)
- **Database Queries**: Optimized with Prisma `include` for related data

---

## 🎓 Learning Resources

- [React 19 Docs](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Vitest Docs](https://vitest.dev)

---

## 📜 License

MIT License - feel free to use this project as a learning resource or starting point for your own invoice management system.

---

## 👥 Credits

Built as part of the Cityflo internship assignment. Designed and implemented with:
- **React 19** for modern component architecture
- **Tailwind CSS v4** for rapid, consistent styling
- **Google Gemini 2.5 Flash** for AI-powered invoice extraction
- **PostgreSQL + Prisma** for type-safe database access
- **TypeScript** throughout for type safety and better DX

---

## 🚀 Next Steps / Future Enhancements

- [ ] Two-level approval workflow (ACCOUNTS → SENIOR_ACCOUNTS)
- [ ] Analytics dashboard with charts (Recharts)
- [ ] Email notifications (SendGrid)
- [ ] Webhook support for external integrations
- [ ] Advanced duplicate detection (fuzzy matching)
- [ ] Batch PDF processing queue
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native)

---

**Built with ❤️ for Cityflo**
