# Converting HTML Invoices to PDF

This guide shows you how to convert the 4 sample HTML invoices to PDF format for testing.

## Sample Invoices Included

1. **invoice-1-standard.html** - Complete vendor invoice with all fields (TechSupplies Inc.)
2. **invoice-2-reimbursement.html** - Uber taxi receipt for employee reimbursement
3. **invoice-3-partial-data.html** - Invoice with minimal data (PrintPro Services)
4. **invoice-4-duplicate.html** - Duplicate of invoice #1 (tests duplicate detection)

---

## Method 1: Browser Print-to-PDF (Recommended - Easiest)

### Steps:
1. **Open HTML file in browser**
   - Navigate to `sample-invoices/` folder
   - Double-click `invoice-1-standard.html`
   - File opens in your default browser (Chrome, Edge, Firefox)

2. **Print to PDF**
   - Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (Mac)
   - In print dialog:
     - **Destination**: Select "Save as PDF" or "Microsoft Print to PDF"
     - **Layout**: Portrait
     - **Margins**: Default
     - **Scale**: 100%
   - Click "Save" or "Print"
   - Save as `invoice-1-standard.pdf` in same folder

3. **Repeat for all 4 invoices**
   - `invoice-1-standard.html` → `invoice-1-standard.pdf`
   - `invoice-2-reimbursement.html` → `invoice-2-reimbursement.pdf`
   - `invoice-3-partial-data.html` → `invoice-3-partial-data.pdf`
   - `invoice-4-duplicate.html` → `invoice-4-duplicate.pdf`

---

## Method 2: Command Line (wkhtmltopdf)

### Install wkhtmltopdf:

**Windows:**
```bash
# Download installer from:
https://wkhtmltopdf.org/downloads.html

# Or use Chocolatey:
choco install wkhtmltopdf
```

**Mac:**
```bash
brew install wkhtmltopdf
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install wkhtmltopdf
```

### Convert Files:
```bash
cd sample-invoices

# Convert all at once:
wkhtmltopdf invoice-1-standard.html invoice-1-standard.pdf
wkhtmltopdf invoice-2-reimbursement.html invoice-2-reimbursement.pdf
wkhtmltopdf invoice-3-partial-data.html invoice-3-partial-data.pdf
wkhtmltopdf invoice-4-duplicate.html invoice-4-duplicate.pdf

# Or use a loop (Bash/Git Bash):
for file in *.html; do
  wkhtmltopdf "$file" "${file%.html}.pdf"
done
```

---

## Method 3: Python Script (pdfkit)

### Install Python Package:
```bash
pip install pdfkit

# Also need wkhtmltopdf installed (see Method 2)
```

### Create conversion script:

**convert.py:**
```python
import pdfkit
import os

# List of HTML files to convert
html_files = [
    'invoice-1-standard.html',
    'invoice-2-reimbursement.html',
    'invoice-3-partial-data.html',
    'invoice-4-duplicate.html'
]

# Convert each file
for html_file in html_files:
    if os.path.exists(html_file):
        pdf_file = html_file.replace('.html', '.pdf')
        try:
            pdfkit.from_file(html_file, pdf_file)
            print(f'✅ Converted: {html_file} → {pdf_file}')
        except Exception as e:
            print(f'❌ Failed: {html_file} - {e}')
    else:
        print(f'⚠️  File not found: {html_file}')

print('\n🎉 Conversion complete!')
```

### Run:
```bash
cd sample-invoices
python convert.py
```

---

## Method 4: Online Converter (No installation needed)

1. Visit one of these online converters:
   - https://www.ilovepdf.com/html-to-pdf
   - https://cloudconvert.com/html-to-pdf
   - https://www.sejda.com/html-to-pdf

2. Upload each HTML file
3. Download converted PDF
4. Save in `sample-invoices/` folder

**Note**: Be cautious with sensitive data on public converters.

---

## Method 5: Node.js Script (puppeteer)

### Install Puppeteer:
```bash
npm install -g puppeteer
```

### Create conversion script:

**convert.js:**
```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'invoice-1-standard.html',
  'invoice-2-reimbursement.html',
  'invoice-3-partial-data.html',
  'invoice-4-duplicate.html'
];

(async () => {
  const browser = await puppeteer.launch();

  for (const htmlFile of htmlFiles) {
    const htmlPath = path.resolve(__dirname, htmlFile);

    if (!fs.existsSync(htmlPath)) {
      console.log(`⚠️  File not found: ${htmlFile}`);
      continue;
    }

    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    const pdfFile = htmlFile.replace('.html', '.pdf');
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      printBackground: true
    });

    console.log(`✅ Converted: ${htmlFile} → ${pdfFile}`);
  }

  await browser.close();
  console.log('\n🎉 Conversion complete!');
})();
```

### Run:
```bash
cd sample-invoices
node convert.js
```

---

## Verification

After conversion, verify PDFs:

1. **Check file sizes**:
   - Each PDF should be 50-300 KB
   - If larger, may indicate embedded images/fonts (OK)

2. **Open each PDF**:
   - Verify layout matches HTML
   - Verify all text is readable
   - Verify no missing elements

3. **Ready for testing**:
   - All 4 PDFs in `sample-invoices/` folder
   - Can now upload via frontend UI at `http://localhost:5173/upload`

---

## Troubleshooting

### Issue: "wkhtmltopdf not found"
- Ensure wkhtmltopdf is installed and in PATH
- Windows: Add installation directory to PATH environment variable
- Mac/Linux: Try `which wkhtmltopdf` to verify installation

### Issue: Fonts look different in PDF
- This is normal - PDF may use different fonts
- Content/data extraction will still work fine

### Issue: PDF file is too large
- Reduce image quality in HTML (if any)
- Use compression tools like Adobe Acrobat or online compressors
- For testing, size doesn't matter much

---

## Quick Start (TL;DR)

**Fastest method (no installation):**
1. Open each `.html` file in Chrome
2. Press `Ctrl+P`
3. Select "Save as PDF"
4. Save as `.pdf`
5. Done! 🎉

---

**Need help?** Check the main [MANUAL_TESTING_GUIDE.md](../MANUAL_TESTING_GUIDE.md) for complete testing scenarios.
