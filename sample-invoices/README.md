# Sample Test Invoices

This directory is for sample PDF invoices used for testing the Cityflo Invoice Processing System.

## How to Add Sample Invoices

1. Place PDF invoice files in this directory
2. Use them for testing upload functionality via the UI
3. Good test cases include:
   - Standard vendor invoices with clear formatting
   - Invoices with multiple line items
   - Invoices with partial/missing data
   - Duplicate invoices (same vendor + invoice number)

## Testing Tips

- **Vendor Payment**: Professional invoices from suppliers/vendors
- **Reimbursement**: Employee expense receipts (taxi, meals, etc.)
- **File Size**: Max 10MB per file
- **Format**: PDF only
- **Quantity**: Upload up to 10 files at once

## Sample Invoice Requirements

For best extraction results, PDFs should include:
- Vendor/Company name
- Invoice number
- Invoice date and due date
- Line items with descriptions, quantities, unit prices
- Subtotal, tax, grand total
- Payment terms (e.g., "Net 30")
- Bank details (account number, IFSC code)

## Notes

- The Google Gemini API will extract data from these PDFs
- Extraction accuracy depends on PDF quality and formatting
- Scanned images may have lower extraction accuracy
- Digital PDFs (not scanned) work best

---

**To get started**: Upload your first invoice via the employee dashboard at `/upload`!
