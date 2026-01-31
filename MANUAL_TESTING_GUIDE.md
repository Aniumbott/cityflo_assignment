# Manual Testing Guide - Cityflo Invoice Processing System

This comprehensive guide provides step-by-step scenarios to manually validate all functionality of the platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Converting HTML Invoices to PDF](#converting-html-invoices-to-pdf)
3. [Test User Accounts](#test-user-accounts)
4. [Testing Scenarios](#testing-scenarios)
   - [Scenario 1: Employee Upload Flow](#scenario-1-employee-upload-flow)
   - [Scenario 2: Accounts Review & Approval](#scenario-2-accounts-review--approval)
   - [Scenario 3: Duplicate Detection](#scenario-3-duplicate-detection)
   - [Scenario 4: Bulk Operations](#scenario-4-bulk-operations)
   - [Scenario 5: Search & Filtering](#scenario-5-search--filtering)
   - [Scenario 6: Notifications System](#scenario-6-notifications-system)
   - [Scenario 7: Authentication & Security](#scenario-7-authentication--security)
   - [Scenario 8: Edge Cases & Error Handling](#scenario-8-edge-cases--error-handling)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Security Checklist](#security-checklist)

---

## Prerequisites

### 1. Environment Setup
- Backend running: `cd backend && npm run dev`
- Frontend running: `cd frontend && npm run dev`
- Database initialized with schema
- `.env` file configured with GEMINI_API_KEY

### 2. Initial Data Setup
```bash
# Register test users
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee1",
    "email": "employee1@cityflo.com",
    "password": "Test@1234",
    "role": "employee"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "accounts1",
    "email": "accounts1@cityflo.com",
    "password": "Test@1234",
    "role": "accounts"
  }'
```

---

## Converting HTML Invoices to PDF

You have 4 sample invoices in `sample-invoices/`:
- `invoice-1-standard.html` - Complete vendor invoice with all fields
- `invoice-2-reimbursement.html` - Uber taxi receipt for employee reimbursement
- `invoice-3-partial-data.html` - Invoice with minimal/missing data
- `invoice-4-duplicate.html` - Duplicate of invoice #1 (same vendor + invoice number)

### Method 1: Browser Print-to-PDF (Easiest)
1. Open each HTML file in Chrome/Edge
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. Select "Save as PDF" as destination
4. Click "Save"
5. Save with same filename but `.pdf` extension

### Method 2: Using wkhtmltopdf (Command Line)
```bash
# Install wkhtmltopdf first
# Windows: Download from https://wkhtmltopdf.org/downloads.html
# Mac: brew install wkhtmltopdf
# Linux: sudo apt-get install wkhtmltopdf

cd sample-invoices

wkhtmltopdf invoice-1-standard.html invoice-1-standard.pdf
wkhtmltopdf invoice-2-reimbursement.html invoice-2-reimbursement.pdf
wkhtmltopdf invoice-3-partial-data.html invoice-3-partial-data.pdf
wkhtmltopdf invoice-4-duplicate.html invoice-4-duplicate.pdf
```

### Method 3: Using Python (If you have Python installed)
```python
# Install: pip install pdfkit
import pdfkit

files = [
    'invoice-1-standard.html',
    'invoice-2-reimbursement.html',
    'invoice-3-partial-data.html',
    'invoice-4-duplicate.html'
]

for file in files:
    pdfkit.from_file(file, file.replace('.html', '.pdf'))
```

---

## Test User Accounts

| Username    | Email                     | Password   | Role      | Purpose                    |
|-------------|---------------------------|------------|-----------|----------------------------|
| employee1   | employee1@cityflo.com     | Test@1234  | employee  | Primary upload testing     |
| employee2   | employee2@cityflo.com     | Test@1234  | employee  | Multi-user testing         |
| accounts1   | accounts1@cityflo.com     | Test@1234  | accounts  | Primary review testing     |
| accounts2   | accounts2@cityflo.com     | Test@1234  | accounts  | Multi-user testing         |

---

## Testing Scenarios

### Scenario 1: Employee Upload Flow

**Objective**: Verify employees can upload invoices and view their submissions.

#### Steps:
1. **Login as Employee**
   - Navigate to `http://localhost:5173/login`
   - Login with `employee1@cityflo.com` / `Test@1234`
   - ✅ Verify redirect to `/upload` page
   - ✅ Verify sidebar shows "Upload Invoice" and "My Invoices" only

2. **Single Invoice Upload**
   - Click "Upload Invoice" or navigate to `/upload`
   - Select invoice type: "Vendor Payment"
   - Select `invoice-1-standard.pdf`
   - Click "Upload Invoices"
   - ✅ Verify upload progress indicator appears
   - ✅ Verify success message: "1 invoice(s) uploaded successfully"
   - ✅ Verify automatic redirect to `/my-invoices`

3. **View Extracted Data**
   - On "My Invoices" page, locate the uploaded invoice
   - ✅ Verify status badge shows "Pending Review" (orange)
   - ✅ Verify extracted data displays:
     - Vendor: "TechSupplies Inc."
     - Invoice Number: "TS-2024-001"
     - Invoice Date: "January 15, 2024"
     - Due Date: "February 14, 2024"
     - Total Amount: "₹10,01,820.00"
     - Line items table with 5 items
   - Click "View Details" button
   - ✅ Verify detail page shows complete extraction
   - ✅ Verify PDF preview/download link works

4. **Bulk Upload (Reimbursement)**
   - Return to `/upload`
   - Select invoice type: "Reimbursement"
   - Select multiple files:
     - `invoice-2-reimbursement.pdf`
     - `invoice-3-partial-data.pdf`
   - Click "Upload Invoices"
   - ✅ Verify both invoices upload successfully
   - ✅ Verify invoice type shows as "reimbursement"

5. **Filter and Search**
   - On "My Invoices" page:
     - Filter by Type: "Vendor Payment"
     - ✅ Verify only invoice #1 appears
     - Clear filter
     - Filter by Status: "Pending Review"
     - ✅ Verify all 3 invoices appear
     - Use search box: "TechSupplies"
     - ✅ Verify only invoice #1 appears

**Expected Results**:
- All uploads succeed
- Gemini AI extracts data correctly
- Status shows "Pending Review"
- Employee can only see their own invoices
- No "Approve" or "Reject" actions available to employees

---

### Scenario 2: Accounts Review & Approval

**Objective**: Verify accounts team can review and approve/reject invoices.

#### Steps:
1. **Login as Accounts**
   - Logout from employee account
   - Login with `accounts1@cityflo.com` / `Test@1234`
   - ✅ Verify redirect to `/review` page
   - ✅ Verify sidebar shows "Review Invoices" and "All Invoices"

2. **Review Queue**
   - On "Review Invoices" page (`/review`)
   - ✅ Verify all 3 pending invoices appear
   - ✅ Verify invoices from different employees visible
   - ✅ Verify "Uploaded by" column shows employee username

3. **Approve Invoice**
   - Click on `invoice-1-standard` (TechSupplies)
   - Review extracted data
   - Click "Approve" button
   - ✅ Verify confirmation dialog appears
   - Confirm approval
   - ✅ Verify success message
   - ✅ Verify invoice disappears from review queue
   - ✅ Verify status updates to "Approved" (green)

4. **Reject Invoice with Comment**
   - Click on `invoice-3-partial-data` (PrintPro)
   - Click "Reject" button
   - Enter rejection reason: "Missing GST details and complete vendor address"
   - Confirm rejection
   - ✅ Verify success message
   - ✅ Verify invoice disappears from review queue
   - ✅ Verify status updates to "Rejected" (red)

5. **View All Invoices**
   - Navigate to "All Invoices" (`/invoices`)
   - ✅ Verify can see invoices from ALL employees
   - ✅ Verify can see invoices in ALL statuses
   - Filter by Status: "Approved"
   - ✅ Verify only approved invoice appears
   - Filter by Status: "Rejected"
   - ✅ Verify only rejected invoice appears

6. **View Rejection Details (as Employee)**
   - Logout from accounts
   - Login as `employee1@cityflo.com`
   - Navigate to "My Invoices"
   - Find rejected invoice (PrintPro)
   - ✅ Verify status shows "Rejected" with red badge
   - Click "View Details"
   - ✅ Verify rejection comment displays: "Missing GST details and complete vendor address"
   - ✅ Verify rejection timestamp is shown

**Expected Results**:
- Accounts can see all invoices regardless of uploader
- Approval workflow updates status correctly
- Rejection comments are captured and visible
- Status changes reflect in real-time
- Employees can see rejection reasons

---

### Scenario 3: Duplicate Detection

**Objective**: Verify system detects and flags duplicate invoices.

#### Steps:
1. **Upload Original Invoice**
   - Login as `employee1@cityflo.com`
   - Already uploaded `invoice-1-standard.pdf` in Scenario 1
   - ✅ Verify it exists with Invoice #: "TS-2024-001", Vendor: "TechSupplies Inc."

2. **Attempt Duplicate Upload**
   - Navigate to `/upload`
   - Select `invoice-4-duplicate.pdf` (same invoice #, same vendor)
   - Upload the file
   - ✅ Verify upload completes (system allows upload)
   - Navigate to "My Invoices"
   - Find the newly uploaded invoice
   - ✅ Verify status shows "Duplicate" with yellow/warning badge
   - ✅ Verify warning message indicates duplicate detected

3. **Review as Accounts**
   - Logout, login as `accounts1@cityflo.com`
   - Navigate to "All Invoices"
   - Filter or search for "TS-2024-001"
   - ✅ Verify both invoices appear
   - ✅ Verify duplicate invoice has special indicator/flag
   - ✅ Verify system shows reference to original invoice
   - Click on duplicate invoice
   - ✅ Verify detail page shows warning about duplicate

4. **Handle Duplicate**
   - As accounts user, reject the duplicate invoice
   - Reason: "Duplicate of existing invoice TS-2024-001"
   - ✅ Verify rejection succeeds
   - ✅ Verify original invoice remains unaffected

**Expected Results**:
- System detects duplicates based on vendor name + invoice number
- Duplicate status is clearly marked
- Both accounts and employee can see duplicate indicator
- Duplicates can be handled separately from originals

---

### Scenario 4: Bulk Operations

**Objective**: Verify accounts can perform bulk approve/reject operations.

#### Steps:
1. **Setup - Upload Multiple Invoices**
   - Login as `employee2@cityflo.com` / `Test@1234`
   - Upload 3 invoices of different types
   - ✅ Verify all 3 appear in "My Invoices"

2. **Bulk Approve (as Accounts)**
   - Logout, login as `accounts1@cityflo.com`
   - Navigate to "Review Invoices" (`/review`)
   - ✅ Verify at least 3 pending invoices visible
   - Select checkboxes for 2 invoices
   - ✅ Verify "Bulk Actions" dropdown becomes enabled
   - Select "Approve Selected"
   - ✅ Verify confirmation dialog shows count (2 invoices)
   - Confirm bulk approval
   - ✅ Verify success message: "2 invoice(s) approved"
   - ✅ Verify both invoices disappear from review queue
   - Navigate to "All Invoices"
   - ✅ Verify both show status "Approved"

3. **Bulk Reject**
   - Return to "Review Invoices"
   - Select checkboxes for remaining pending invoices
   - Select "Reject Selected" from bulk actions
   - Enter rejection reason: "Bulk rejection for testing"
   - Confirm
   - ✅ Verify all selected invoices rejected
   - ✅ Verify rejection reason applied to all

4. **Bulk Export (Optional Feature)**
   - Navigate to "All Invoices"
   - Filter by Status: "Approved"
   - Click "Export to CSV" button
   - ✅ Verify CSV file downloads
   - Open CSV file
   - ✅ Verify contains approved invoices with all data fields

**Expected Results**:
- Bulk operations work on multiple invoices simultaneously
- Confirmation dialogs show accurate counts
- Status updates apply to all selected items
- Bulk rejection reason applies to all items
- Export functionality works correctly

---

### Scenario 5: Search & Filtering

**Objective**: Verify search and filtering work across different criteria.

#### Steps:
1. **Filter by Invoice Type**
   - Login as `accounts1@cityflo.com`
   - Navigate to "All Invoices"
   - Filter by Type: "Vendor Payment"
   - ✅ Verify only vendor payment invoices appear
   - Filter by Type: "Reimbursement"
   - ✅ Verify only reimbursement invoices appear
   - Clear filter

2. **Filter by Status**
   - Filter by Status: "Approved"
   - ✅ Verify only approved invoices appear
   - ✅ Verify count matches filter
   - Filter by Status: "Pending Review"
   - ✅ Verify only pending invoices appear
   - Filter by Status: "Rejected"
   - ✅ Verify only rejected invoices appear

3. **Search by Vendor**
   - Clear all filters
   - Search: "TechSupplies"
   - ✅ Verify only TechSupplies invoices appear
   - Search: "Uber"
   - ✅ Verify only Uber invoices appear

4. **Search by Invoice Number**
   - Search: "TS-2024-001"
   - ✅ Verify specific invoice appears
   - ✅ Verify partial search works: "TS-2024"

5. **Search by Amount**
   - Search: "10,01,820"
   - ✅ Verify invoice with exact amount appears
   - Search: "1126" (Uber receipt)
   - ✅ Verify Uber invoice appears

6. **Combined Filters**
   - Filter by Type: "Vendor Payment"
   - AND Filter by Status: "Approved"
   - ✅ Verify only approved vendor payments appear
   - Add search: "Tech"
   - ✅ Verify results match all criteria

7. **Date Range Filter (if implemented)**
   - Filter by date range: Last 7 days
   - ✅ Verify only recent invoices appear
   - Filter by custom date range
   - ✅ Verify results within date range

**Expected Results**:
- All filters work independently
- Combined filters work with AND logic
- Search is case-insensitive
- Partial matches work
- No results message shows when filters match nothing

---

### Scenario 6: Notifications System

**Objective**: Verify real-time notifications work for status changes.

#### Steps:
1. **Setup - Upload as Employee**
   - Login as `employee1@cityflo.com`
   - Upload `invoice-2-reimbursement.pdf`
   - ✅ Verify notification bell shows no unread (count: 0)

2. **Approve Invoice (Trigger Notification)**
   - In a separate browser/incognito window:
     - Login as `accounts1@cityflo.com`
     - Navigate to "Review Invoices"
     - Find employee1's Uber invoice
     - Click "Approve"
   - Back in employee1's window:
     - ✅ Verify notification bell updates with count (1)
     - ✅ Verify red badge appears on bell icon
     - Click notification bell
     - ✅ Verify notification panel opens
     - ✅ Verify notification shows:
       - "Your invoice has been approved"
       - Invoice details (vendor, amount)
       - Timestamp
       - Unread indicator (bold or highlighted)

3. **Click Notification**
   - Click on the notification
   - ✅ Verify navigates to invoice detail page
   - ✅ Verify notification marked as read
   - ✅ Verify bell count decreases to 0

4. **Reject Invoice (Trigger Notification)**
   - As accounts, reject another employee1 invoice
   - Reason: "Test rejection notification"
   - Back in employee1's window:
     - ✅ Verify notification bell shows count (1)
     - Open notification panel
     - ✅ Verify notification shows:
       - "Your invoice has been rejected"
       - Rejection reason preview
       - Click notification
       - ✅ Verify navigates to detail page
       - ✅ Verify full rejection reason visible

5. **Mark All as Read**
   - Generate multiple notifications (approve/reject several invoices)
   - ✅ Verify bell shows accurate count (e.g., 3)
   - Open notification panel
   - Click "Mark all as read" button
   - ✅ Verify all notifications marked as read
   - ✅ Verify bell count updates to 0
   - ✅ Verify notifications still visible but not bold

6. **Notification List Page**
   - Navigate to `/notifications` (if standalone page exists)
   - ✅ Verify paginated list of all notifications
   - ✅ Verify can filter by read/unread
   - ✅ Verify can delete notifications

**Expected Results**:
- Notifications appear in real-time (or on page refresh)
- Bell badge shows accurate unread count
- Clicking notification navigates to relevant invoice
- Mark as read functionality works
- Notification history is preserved

---

### Scenario 7: Authentication & Security

**Objective**: Verify authentication, authorization, and security features.

#### Steps:
1. **Registration Validation**
   - Navigate to `/register`
   - Attempt registration with weak password: "123"
   - ✅ Verify error: "Password must be at least 6 characters"
   - Attempt with invalid email: "notanemail"
   - ✅ Verify error: "Invalid email format"
   - Attempt with existing email
   - ✅ Verify error: "Email already registered"
   - Register successfully with valid credentials
   - ✅ Verify redirect to login page

2. **Login Validation**
   - Navigate to `/login`
   - Attempt login with wrong password
   - ✅ Verify error: "Invalid credentials"
   - Login with correct credentials
   - ✅ Verify JWT tokens stored (check browser DevTools > Application > Local Storage)
   - ✅ Verify redirect to role-appropriate page

3. **Role-Based Access Control**
   - Login as `employee1@cityflo.com` (employee role)
   - Try to access `/review` (accounts-only route)
   - ✅ Verify redirect to `/upload` or error message
   - ✅ Verify sidebar doesn't show "Review Invoices" link
   - Try to access `/invoices` (accounts-only all invoices)
   - ✅ Verify access denied or redirect

4. **Protected Routes**
   - Logout from application
   - Try to access `/upload` directly
   - ✅ Verify redirect to `/login`
   - Try to access `/review` directly
   - ✅ Verify redirect to `/login`

5. **Token Refresh**
   - Login as any user
   - Wait for access token to expire (default: 15 minutes)
   - OR manually delete access token in DevTools
   - Make an API request (navigate to a page)
   - ✅ Verify refresh token used automatically
   - ✅ Verify new access token received
   - ✅ Verify user remains logged in

6. **Logout**
   - Click "Logout" button
   - ✅ Verify redirect to `/login`
   - ✅ Verify tokens cleared from storage
   - Try to access protected route
   - ✅ Verify redirect to login

7. **File Upload Security**
   - Login as employee
   - Try to upload non-PDF file (e.g., .txt, .jpg)
   - ✅ Verify error: "Only PDF files are allowed"
   - Try to upload file > 10MB (create large PDF)
   - ✅ Verify error: "File size exceeds 10MB limit"

8. **SQL Injection Protection**
   - In search box, try: `' OR '1'='1`
   - ✅ Verify no unexpected results (query parameterized)
   - ✅ Verify no SQL error messages exposed

9. **XSS Protection**
   - As accounts, reject invoice with reason: `<script>alert('XSS')</script>`
   - View rejection reason as employee
   - ✅ Verify script doesn't execute (text escaped)
   - ✅ Verify displays as plain text

**Expected Results**:
- All validation rules enforced
- RBAC prevents unauthorized access
- JWT tokens managed correctly
- Automatic token refresh works
- File upload restrictions enforced
- No SQL injection or XSS vulnerabilities

---

### Scenario 8: Edge Cases & Error Handling

**Objective**: Test system behavior with edge cases and error conditions.

#### Steps:
1. **Empty State Testing**
   - Create new employee account: `employee3@cityflo.com`
   - Login and navigate to "My Invoices"
   - ✅ Verify empty state message displayed
   - ✅ Verify helpful message like "No invoices yet. Upload your first invoice!"
   - ✅ Verify "Upload Invoice" button/link present

2. **Network Error Simulation**
   - Login as employee
   - Disconnect from internet (or use DevTools Network throttling > Offline)
   - Try to upload invoice
   - ✅ Verify error message: "Network error. Please check your connection."
   - Reconnect internet
   - Try upload again
   - ✅ Verify upload succeeds

3. **Large File Upload**
   - Try to upload 10 invoices at once
   - ✅ Verify all 10 process successfully
   - ✅ Verify progress indicators for each
   - ✅ Verify success message shows correct count

4. **Corrupted PDF**
   - Create a corrupted PDF (rename .txt to .pdf)
   - Try to upload
   - ✅ Verify error handling (may fail gracefully or show extraction error)
   - ✅ Verify system doesn't crash

5. **Special Characters in Data**
   - Upload invoice with special characters in vendor name (e.g., "Tech&Supplies™")
   - ✅ Verify special characters handled correctly
   - ✅ Verify display shows characters properly
   - ✅ Verify search works with special chars

6. **Pagination Testing**
   - Upload 25+ invoices
   - Navigate to "All Invoices" or "My Invoices"
   - ✅ Verify pagination controls appear
   - ✅ Verify page size selector works (10, 25, 50)
   - ✅ Verify "Next" and "Previous" buttons work
   - ✅ Verify page numbers clickable
   - ✅ Verify URL updates with page parameter

7. **Gemini API Error**
   - Temporarily set invalid GEMINI_API_KEY in backend `.env`
   - Restart backend
   - Upload invoice
   - ✅ Verify graceful error message: "Failed to extract invoice data"
   - ✅ Verify invoice still created with status "Processing Failed"
   - ✅ Verify can retry extraction or manually input data
   - Restore valid API key

8. **Concurrent Users**
   - Login as `employee1` in Browser 1
   - Login as `accounts1` in Browser 2
   - Upload invoice as employee1
   - Switch to Browser 2 (accounts)
   - ✅ Verify new invoice appears in review queue (may need refresh)
   - Approve invoice as accounts
   - Switch to Browser 1 (employee)
   - ✅ Verify status updates to "Approved" (may need refresh or real-time)

9. **Browser Compatibility**
   - Test in Chrome
   - ✅ Verify all features work
   - Test in Firefox
   - ✅ Verify all features work
   - Test in Safari (if Mac available)
   - ✅ Verify all features work
   - Test in Edge
   - ✅ Verify all features work

10. **Mobile Responsiveness**
    - Open app on mobile device or use DevTools Device Emulation
    - ✅ Verify responsive layout
    - ✅ Verify sidebar collapses to hamburger menu
    - ✅ Verify tables scroll horizontally if needed
    - ✅ Verify buttons and inputs are touch-friendly

**Expected Results**:
- Empty states provide helpful guidance
- Network errors handled gracefully
- Large operations (bulk uploads) work smoothly
- Corrupted data doesn't crash system
- Pagination works correctly
- API errors handled with user-friendly messages
- Multi-user scenarios work correctly
- Cross-browser compatible
- Mobile responsive

---

## Performance Benchmarks

### Expected Performance Metrics:

| Operation                    | Expected Time     | Notes                              |
|------------------------------|-------------------|------------------------------------|
| Single invoice upload        | < 5 seconds       | Depends on Gemini API response     |
| Bulk upload (10 files)       | < 30 seconds      | Parallel processing                |
| Page load time               | < 2 seconds       | Initial render                     |
| Search/filter operation      | < 500ms           | Client-side or fast DB query       |
| Approve/reject action        | < 1 second        | API response + UI update           |
| Notification delivery        | < 3 seconds       | On next poll or WebSocket push     |
| PDF file size limit          | 10 MB max         | Per file                           |
| Concurrent uploads           | 10 files max      | Per batch                          |

### Load Testing (Optional):
- Use tools like Apache JMeter or k6 for load testing
- Simulate 10 concurrent users uploading invoices
- ✅ Verify backend handles load without errors
- ✅ Verify response times remain acceptable

---

## Security Checklist

- [ ] **Authentication**
  - [ ] Registration validates all inputs
  - [ ] Login credentials verified securely
  - [ ] Passwords hashed with bcrypt (never stored plain)
  - [ ] JWT tokens used for session management

- [ ] **Authorization**
  - [ ] Employee can only see own invoices
  - [ ] Accounts can see all invoices
  - [ ] Role-based access enforced on frontend and backend
  - [ ] Protected API endpoints check JWT and role

- [ ] **Input Validation**
  - [ ] File uploads restricted to PDF, max 10MB
  - [ ] All form inputs validated (email, password, etc.)
  - [ ] SQL injection protection (parameterized queries)
  - [ ] XSS protection (output escaping)

- [ ] **Data Security**
  - [ ] Sensitive data (passwords, tokens) never logged
  - [ ] HTTPS enforced in production
  - [ ] CORS configured to allow only frontend origin
  - [ ] Rate limiting applied to prevent abuse

- [ ] **Error Handling**
  - [ ] Error messages don't leak sensitive info
  - [ ] Stack traces not exposed in production
  - [ ] Graceful degradation for API failures

---

## Success Criteria

Your platform passes manual validation if:

✅ All 8 testing scenarios complete without critical errors
✅ All expected results match actual behavior
✅ Security checklist items pass
✅ Performance benchmarks met
✅ No data loss or corruption observed
✅ User experience is smooth and intuitive
✅ Edge cases handled gracefully

---

## Reporting Issues

If you find any issues during testing:

1. Note the scenario and step number
2. Describe expected vs. actual behavior
3. Include screenshots if applicable
4. Check browser console for errors (F12 > Console)
5. Check backend logs for API errors

---

## Next Steps After Validation

Once manual testing is complete:
1. Deploy backend to Render (see README.md)
2. Deploy frontend to Vercel (see README.md)
3. Run this entire testing guide again in production environment
4. Set up monitoring and alerting (optional)

---

**Happy Testing! 🚀**

*Last Updated: January 2024*
