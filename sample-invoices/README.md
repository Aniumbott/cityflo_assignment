# Sample Test Invoices - Cityflo Invoice Processing System

This directory contains **realistic sample invoices** tailored to Cityflo's bus transportation business operations.

## 📋 Available Sample Invoices

### Vendor Payment Invoices (Business Operations)

1. **invoice-1-bus-maintenance.html** → Convert to PDF
   - **Vendor**: Ashok Motors Service Center
   - **Invoice #**: AM/BLR/2024/0342
   - **Amount**: ₹1,58,592.00
   - **Type**: Major engine overhaul & brake system repairs
   - **Use Case**: Tests complete vendor invoice with all fields populated
   - **Bus**: KA-01-FC-7845 (Fleet ID: CFB-089)

2. **invoice-2-diesel-fuel.html** → Convert to PDF
   - **Vendor**: Bharat Petroleum (BPCL)
   - **Invoice #**: BPCL/BLR/2024/08921
   - **Amount**: ₹29,49,934.37
   - **Type**: Bulk diesel fuel delivery (26,500 liters over 5 days)
   - **Use Case**: Tests high-value recurring vendor invoice with bulk discount
   - **Delivery**: Cityflo Depot, Electronic City

3. **invoice-3-bus-tires.html** → Convert to PDF
   - **Vendor**: MRF Tyres & Services
   - **Invoice #**: MRF/BLR/24/1567
   - **Amount**: ₹2,90,944.00
   - **Type**: Bus tyre replacement (12 tyres) with installation
   - **Use Case**: Tests vendor invoice with exchange credit (old tyres)
   - **Warranty**: 60,000 km or 36 months

### Employee Reimbursement Invoice

4. **invoice-4-employee-reimbursement.html** → Convert to PDF
   - **Vendor**: Uber India
   - **Receipt #**: UBER-IN-BLR-20240123-9847
   - **Amount**: ₹1,787.60
   - **Type**: Airport pickup - Business trip (Kempegowda Airport to MG Road)
   - **Use Case**: Tests employee reimbursement workflow
   - **Employee**: Rajesh Sharma (Fleet Operations Manager)
   - **Purpose**: Returning from Mumbai vendor meeting

### Edge Case Invoice (Partial Data)

5. **invoice-5-spare-parts-partial.html** → Convert to PDF
   - **Vendor**: Kumar Auto Spares (Small shop)
   - **Bill #**: KAS/2024/897
   - **Amount**: ₹13,990
   - **Type**: Cash memo for brake parts (informal)
   - **Use Case**: Tests AI extraction with **missing fields** (no GSTIN, no bank details, minimal formatting)
   - **Missing**: Due date, payment terms, GST breakdown, proper formatting

### Duplicate Detection Test

6. **invoice-6-duplicate-diesel.html** → Convert to PDF
   - **Vendor**: Bharat Petroleum (BPCL)
   - **Invoice #**: BPCL/BLR/2024/08921 (**Same as invoice #2**)
   - **Amount**: ₹29,49,934.37
   - **Type**: Exact duplicate of invoice #2
   - **Use Case**: Tests **duplicate detection** feature (same vendor + same invoice number)

## 🔄 How to Convert HTML to PDF

See **[CONVERT_TO_PDF.md](./CONVERT_TO_PDF.md)** for detailed conversion instructions.

**Quick Method (Browser Print-to-PDF)**:
1. Open each `.html` file in Chrome/Edge/Firefox
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. Select "Save as PDF" as destination
4. Save with same filename but `.pdf` extension

## 🧪 Testing Scenarios

| Invoice | Type | Test Scenario |
|---------|------|---------------|
| #1 Bus Maintenance | Vendor Payment | Standard complete invoice with all fields |
| #2 Diesel Fuel | Vendor Payment | High-value bulk invoice with discounts |
| #3 Bus Tires | Vendor Payment | Invoice with exchange credit (negative line item) |
| #4 Uber Receipt | Reimbursement | Employee expense claim workflow |
| #5 Spare Parts | Vendor Payment | **Partial data** - tests AI extraction limits |
| #6 Diesel (Duplicate) | Vendor Payment | **Duplicate detection** - same as #2 |

## ✅ What to Test

### Upload Functionality
- Single invoice upload
- Bulk upload (multiple files)
- Invoice type selection (Vendor Payment vs Reimbursement)
- File size validation (max 10MB)
- PDF-only validation

### AI Data Extraction
- Complete invoices (#1, #2, #3) → Should extract all fields accurately
- Employee reimbursement (#4) → Should categorize as reimbursement
- Partial data (#5) → Should handle missing fields gracefully
- Duplicate (#6) → Should flag as duplicate of #2

### Accounts Workflow
- Review queue shows all pending invoices
- Side-by-side PDF preview with extracted data
- Edit/correct extraction errors
- Approve/reject with comments
- Duplicate warning when reviewing #6

### Employee Workflow
- View only own submissions
- Track approval status
- See rejection comments (if rejected)
- No edit or approve permissions

## 📊 Expected Extraction Results

All invoices should extract:
- ✅ Vendor/merchant name
- ✅ Invoice number
- ✅ Invoice date
- ✅ Line items with descriptions & amounts
- ✅ Subtotal, taxes, grand total

Invoice #5 (Partial Data) expected issues:
- ❌ Missing due date
- ❌ Missing GSTIN (GST number)
- ❌ Missing bank details
- ❌ Missing payment terms
- ⚠️ Tests system's ability to handle incomplete data

## 🚀 Quick Start

1. Convert all 6 HTML files to PDF using browser or command line
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. Create test users (employee & accounts roles)
5. Upload invoices via employee account at `/upload`
6. Review & approve via accounts account at `/review`
7. Test duplicate detection by uploading #2 and #6

## 📝 Notes

- **Realistic Context**: All invoices reflect actual Cityflo business operations (bus maintenance, fuel, spare parts, employee travel)
- **Indian Market**: All amounts in ₹ (INR), GSTIN numbers, Indian vendors
- **GST Compliance**: Invoices include CGST/SGST or integrated GST
- **Variety**: Mix of large vendors (BPCL, MRF) and small shops (Kumar Auto Spares)
- **Real Scenarios**: Engine overhauls, bulk fuel contracts, tyre replacements, airport pickups

---

**For complete testing guide**: See [MANUAL_TESTING_GUIDE.md](../MANUAL_TESTING_GUIDE.md) in the root directory.
