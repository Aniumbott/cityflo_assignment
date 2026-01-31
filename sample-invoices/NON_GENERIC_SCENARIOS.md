# Non-Generic Invoice Scenarios for Realistic Testing

Real-world invoices are messy, inconsistent, and challenging. Here are **20 realistic scenarios** that go beyond generic invoice templates.

---

## 🚨 Challenging Real-World Scenarios

### Scenario 1: Handwritten Emergency Repair Invoice
**Context**: Bus broke down at 2 AM on highway. Local mechanic did emergency repairs and wrote invoice by hand.

**Characteristics**:
- Handwritten on plain paper (no letterhead)
- Messy handwriting with corrections
- No GST number (informal vendor)
- Workshop name and phone number scribbled at top
- List of parts: "Radiator hose - 800, Labor - 1500, Misc - 300"
- Total circled in red pen
- Oil stains and grease marks on paper
- Date format: "15/1/24" (ambiguous - is it DD/MM or MM/DD?)

**Expected Challenges**:
- OCR struggles with handwriting
- Missing structured data (no invoice number, no vendor registration)
- Date ambiguity
- No line item descriptions (just "Misc")
- Physical damage to document (stains)

**AI Should**:
- Extract whatever is legible
- Flag missing critical fields (GST, invoice number)
- Show low confidence scores
- Require manual review

---

### Scenario 2: WhatsApp Photo of Bill
**Context**: Fuel pump manager sent bill via WhatsApp instead of email.

**Characteristics**:
- Photo taken with mobile phone in poor lighting
- Screenshot with WhatsApp UI visible (timestamp, battery icon at top)
- Bill on wrinkled paper on desk
- Finger partially visible holding paper down
- Flash glare covering part of total amount
- Background shows desk clutter (pens, coffee cup)
- Compression artifacts from WhatsApp

**Expected Challenges**:
- UI elements need to be ignored
- Perspective distortion from angle
- Glare obscures critical information
- Low resolution due to WhatsApp compression

**AI Should**:
- Detect and crop out UI elements
- Handle perspective correction
- Flag obscured fields
- Request clearer image

---

### Scenario 3: Thermal Printer Receipt (Fading)
**Context**: Fuel station receipt printed 2 months ago, ink fading.

**Characteristics**:
- Thermal paper starting to fade
- Bottom half (totals section) very light, barely readable
- Top half (date, vendor) still dark
- Curled paper from heat exposure
- Scanned at angle
- Some numbers completely invisible

**Expected Challenges**:
- Low contrast text in faded areas
- Critical totals section unreadable
- Variable text darkness across page

**AI Should**:
- Extract visible portions
- Mark faded sections as "unreadable"
- Suggest rescanning with higher contrast
- Partial extraction better than nothing

---

### Scenario 4: Invoice in Regional Language (Hindi/Kannada)
**Context**: Local vendor in Karnataka uses Kannada invoice template.

**Characteristics**:
- Company name in Kannada script: "ಕುಮಾರ ಆಟೋ ಸ್ಪೇರ್ಸ್"
- Item descriptions mix Kannada and English
- Numbers in both Indian (₹1,50,000) and Western (₹150,000) formats
- Date in DD/MM/YYYY format
- GST section in English (legally required)
- Bilingual layout

**Expected Challenges**:
- OCR must handle Devanagari/Kannada scripts
- Mixed language parsing
- Cultural number formatting (lakhs vs thousands)

**AI Should**:
- Support multi-language OCR
- Standardize number formats
- Translate or flag non-English text
- Extract structured data regardless of language

---

### Scenario 5: Invoice with Multiple Corrections
**Context**: Vendor made pricing error and corrected invoice manually.

**Characteristics**:
- Original price crossed out with strikethrough
- New price written by hand next to crossed-out amount
- "REVISED TOTAL" written in margin in different ink
- Initial totals crossed out
- Vendor signature and stamp next to corrections
- Handwritten note: "Discount applied - see revised total"

**Expected Challenges**:
- OCR sees both original and corrected numbers
- Must determine which is authoritative
- Handwritten additions harder to read

**AI Should**:
- Detect crossed-out text and ignore it
- Prioritize handwritten corrections
- Flag document as "amended" for manual review
- Show both versions with confidence scores

---

### Scenario 6: Stapled Multi-Page Invoice
**Context**: Large parts order resulted in 3-page invoice stapled together.

**Characteristics**:
- Page 1: Header and first 15 line items
- Page 2: Line items 16-30 (no header, just continues)
- Page 3: Final 5 line items + totals section
- Scanned as 3 separate images
- Page numbers at bottom: "Page 1 of 3", "Page 2 of 3", etc.
- Staple hole visible on each page
- Slight misalignment between scans

**Expected Challenges**:
- Multi-document relationship recognition
- Continuation of line items across pages
- Total on last page references items on all pages
- Need to merge into single invoice record

**AI Should**:
- Detect "Page X of Y" indicators
- Merge pages into single invoice
- Maintain line item order
- Calculate total from all pages

---

### Scenario 7: Carbon Copy (Duplicate/Triplicate)
**Context**: Vendor uses carbon copy invoice books.

**Characteristics**:
- Faded blue carbon ink
- Customer copy (second or third impression)
- Some text barely visible
- Handwritten portions darker than printed portions
- Perforated edge where torn from book
- Uneven ink distribution
- Some fields completely invisible

**Expected Challenges**:
- Very low contrast in carbon copies
- Text legibility varies by pressure applied
- Background carbon smudges

**AI Should**:
- Apply aggressive contrast enhancement
- Extract what's visible
- Flag illegible sections
- Suggest requesting original instead of copy

---

### Scenario 8: Invoice with Watermark Overlay
**Context**: Vendor adds "ORIGINAL" watermark to prevent photocopying.

**Characteristics**:
- Large diagonal "ORIGINAL" watermark across center
- Semi-transparent gray watermark
- Covers multiple line items
- Text still visible but obscured
- Additional logo watermark in background
- Security feature for authenticity

**Expected Challenges**:
- Watermark interferes with OCR
- Text detection confused by overlapping elements
- Need to filter out watermark

**AI Should**:
- Detect and remove watermark digitally
- Process underlying text
- Preserve watermark info as metadata (indicates authentic document)

---

### Scenario 9: Faxed Invoice (Degraded Quality)
**Context**: Old vendor still uses fax machine.

**Characteristics**:
- Black and white only (no grayscale)
- Horizontal scan lines
- Very low DPI (200 or less)
- Some characters broken/pixelated
- Fax header at top: "FROM: 080-1234567 | DATE: 15-JAN-24 | PAGE: 1/2"
- Text jagged due to compression
- Small text completely illegible

**Expected Challenges**:
- Extremely low quality image
- Binary (no shades of gray) makes OCR hard
- Compression artifacts break characters

**AI Should**:
- Apply image enhancement (anti-aliasing)
- Use specialized low-quality OCR
- Flag as "poor quality source"
- Recommend requesting email/scan instead

---

### Scenario 10: Invoice on Colored Paper
**Context**: Vendor prints on yellow carbonless paper.

**Characteristics**:
- Bright yellow background
- Black text on yellow creates lower contrast
- Colored paper interferes with OCR
- Scanned with yellow tint
- Blue company logo hard to distinguish on yellow

**Expected Challenges**:
- Color background reduces text contrast
- OCR trained on white paper struggles
- Need color filtering/normalization

**AI Should**:
- Convert to grayscale
- Enhance contrast
- Remove color cast
- Process as if white background

---

### Scenario 11: Invoice with Table Borders Misaligned
**Context**: Vendor created invoice in Excel, table formatting broke when printed.

**Characteristics**:
- Table lines don't line up with text
- Column headers shifted from data
- Some cells merged incorrectly
- Numbers in wrong columns
- Totals row missing border
- Visual structure confusing

**Expected Challenges**:
- Table structure detection fails
- Column assignment incorrect
- Parsing row/column relationships broken

**AI Should**:
- Use text position rather than table lines
- Detect columns by text alignment
- Validate data types (numbers in amount column)
- Reconstruct logical table structure

---

### Scenario 12: Invoice with Stamps Covering Text
**Context**: Multiple approval stamps overlap important data.

**Characteristics**:
- Red "PAID" stamp covers invoice number
- Green "APPROVED" stamp covers date
- Circular company seal overlaps subtotal
- Purple date stamp on signature area
- Stamps at different angles
- Some text completely hidden

**Expected Challenges**:
- Critical data obscured by stamps
- Multiple overlapping elements
- Can't read covered text

**AI Should**:
- Detect stamps as separate layer
- Attempt to read text underneath
- Flag obscured fields
- Extract stamp text as metadata (payment status)

---

### Scenario 13: Photographed Invoice Through Window
**Context**: Invoice displayed on glass door, photographed from outside.

**Characteristics**:
- Reflections from outdoor scene
- Glare from sunlight on glass
- Person's reflection visible
- Inverse perspective (text right-to-left if shot from back)
- Parts of invoice not visible due to glare
- Window frame partially obstructs corners

**Expected Challenges**:
- Severe glare and reflections
- Partial obstruction
- Possible reverse image

**AI Should**:
- Detect and reduce reflections
- Flag as "poor quality capture"
- Request proper scan
- Extract visible portions only

---

### Scenario 14: Invoice Printed on Both Sides
**Context**: Vendor economizes by using both sides of paper.

**Characteristics**:
- Front side: Invoice details
- Back side: Terms & conditions
- Bleed-through from other side visible
- Text from back shows through thin paper
- Confusing overlapping text layers
- Scanned as front only, back text ghosted through

**Expected Challenges**:
- Bleed-through text confuses OCR
- Overlapping numbers from both sides
- Need to distinguish primary vs ghosted text

**AI Should**:
- Detect darker (primary) vs lighter (bleed-through) text
- Filter out ghosted text
- Request separate scan of each side if needed

---

### Scenario 15: Invoice with Handwritten Notes in Margins
**Context**: Accounts team added notes during review.

**Characteristics**:
- Typed invoice body
- Handwritten notes in margins: "Check with vendor", "Price too high?"
- Yellow highlighter on certain amounts
- Checkmarks next to verified items
- Arrow pointing to discrepancy
- Different person's handwriting in different colors

**Expected Challenges**:
- Distinguish official invoice text from annotations
- Don't include margin notes in extraction
- Notes might be important context

**AI Should**:
- Extract only printed invoice data
- Preserve annotations as separate metadata
- Flag annotated fields for manual review
- Show confidence: annotations indicate issues

---

### Scenario 16: Invoice Screenshot from Email
**Context**: Someone forwarded invoice as screenshot instead of attachment.

**Characteristics**:
- Screenshot shows email client UI
- Scroll bars visible on right
- Email header visible at top (From, To, Subject)
- Invoice embedded in email body (not as attachment)
- Possible HTML rendering issues (weird fonts)
- Bottom of invoice cut off (need to scroll)

**Expected Challenges**:
- Need to crop out email UI
- Possible truncation/incomplete
- HTML formatting may have broken layout
- Poor resolution if zoomed out

**AI Should**:
- Auto-crop to invoice content
- Ignore email UI elements
- Flag if appears truncated
- Request original PDF attachment

---

### Scenario 17: Low-Ink Printer Streaks
**Context**: Vendor's printer low on toner.

**Characteristics**:
- Horizontal white streaks across page
- Some lines of text completely missing
- Numbers partially visible: "1 8,5 2" instead of "1,58,592"
- Fading toward bottom of page
- Toner drum artifacts (repeated smudges)
- Some sections darker where toner pooled

**Expected Challenges**:
- Missing characters in numbers
- Incomplete text makes parsing hard
- Variable quality across document

**AI Should**:
- Flag as "print quality issues"
- Show low confidence on affected fields
- Attempt to infer missing characters from context
- Request reprint with working printer

---

### Scenario 18: Invoice with Pre-Printed Form + Handwritten Data
**Context**: Old-school vendor uses pre-printed invoice pads.

**Characteristics**:
- Pre-printed template with blanks
- Company name, logo printed
- Blanks filled in by hand:
  - Customer name
  - Date
  - Item descriptions
  - Quantities
  - Prices
- Pre-printed fields: "Invoice No:", "Date:", "Total:"
- Mix of perfect printed text and messy handwriting
- Serial number at top (pre-printed)

**Expected Challenges**:
- Must distinguish printed template from filled data
- Handwriting in narrow blank spaces
- Data often outside designated lines
- Serial number vs invoice number confusion

**AI Should**:
- Recognize form template structure
- Extract both printed labels and handwritten values
- Associate fields correctly (label + value pairs)
- Handle misaligned handwriting

---

### Scenario 19: Invoice on Letterhead with Complex Background
**Context**: Luxury vendor uses decorative letterhead.

**Characteristics**:
- Ornate border design
- Textured background (watermark pattern)
- Company logo large and colorful
- Background gradient (light blue to white)
- Decorative fonts for headers
- Text over semi-transparent design elements
- Low contrast in decorative areas

**Expected Challenges**:
- Busy background interferes with OCR
- Decorative elements mistaken for text
- Low contrast in gradient areas
- Complex fonts hard to recognize

**AI Should**:
- Background removal/suppression
- Focus on high-contrast text regions
- Ignore decorative elements
- Binarization to separate text from design

---

### Scenario 20: Invoice in Unusual Format (Landscape, A5, etc.)
**Context**: Vendor uses non-standard paper size/orientation.

**Characteristics**:
- Landscape orientation (horizontal)
- A5 paper size (half of A4)
- Wide layout with many columns
- Small font to fit content
- Scanned at wrong orientation (appears sideways)
- Non-standard aspect ratio

**Expected Challenges**:
- Orientation detection needed
- Small text in compact format
- Column parsing in wide layout
- Unusual dimensions

**AI Should**:
- Auto-detect and rotate orientation
- Handle non-A4 sizes
- Adapt column detection to layout
- Zoom/enhance small text regions

---

### Scenario 21: Water-Damaged Invoice
**Context**: Bus broke down during monsoon, mechanic's invoice got soaked in heavy rain.

**Characteristics**:
- Water stains creating brown discoloration
- Ink bleeding and running in wet sections
- Text blurry from water exposure
- Paper warped and wrinkled after drying
- Some numbers completely washed out
- Water droplet marks visible throughout
- Edges curled from moisture
- Uneven staining across page
- Total amount section partially destroyed
- Emergency repair bill from roadside mechanic

**Expected Challenges**:
- Ink bleeding makes text recognition very difficult
- Water stains create background noise
- Warped paper causes distortion
- Critical fields (totals, dates) often most damaged
- OCR confidence extremely low
- Difficult to distinguish ink from water stains

**AI Should**:
- Detect water damage patterns
- Apply deblurring algorithms to fuzzy text
- Enhance contrast in stained areas
- Flag severely damaged sections as "unreadable"
- Extract partial data from legible portions
- Recommend requesting new invoice from vendor
- Show very low confidence scores

---

### Scenario 22: Wallet-Worn Receipt (Extreme Aging)
**Context**: Employee submits 3-week-old taxi receipt carried in wallet for reimbursement.

**Characteristics**:
- Folded into quarters (4 distinct crease sections)
- Paper worn extremely thin at fold lines
- Visible grid pattern from intersecting creases
- Edges frayed and torn
- Corners rounded from pocket friction
- Thermal paper heavily faded (time + body heat)
- Only header section still readable
- Bottom half (totals) almost completely blank
- Text in fold creases completely illegible
- Slight dirt and sweat stains (yellowish patches)
- Receipt won't lie flat (permanently curved)
- Uber/Ola cab receipt for airport trip

**Expected Challenges**:
- Multiple fold lines obscure text
- Severe thermal paper fading
- Physical damage at creases (ink worn away)
- Background discoloration from sweat/dirt
- Torn edges missing critical data
- Curved surface makes scanning difficult
- Age makes recovery difficult

**AI Should**:
- Recognize fold pattern (grid of 4 sections)
- Apply extreme contrast enhancement for faded thermal
- Interpolate missing data at crease intersections
- Flag as "extremely poor condition"
- Extract date to verify if old expense
- Suggest employee request duplicate from vendor
- Show warning: "Receipt may be too damaged to process"
- Consider partial approval based on visible data

---

## 📊 Testing Priority Matrix

| Scenario | Frequency in Real World | Difficulty | Priority for Testing |
|----------|-------------------------|------------|---------------------|
| #1 Handwritten | High (small vendors) | Very Hard | ⭐⭐⭐⭐⭐ |
| #2 WhatsApp Photo | Very High (mobile users) | Hard | ⭐⭐⭐⭐⭐ |
| #3 Fading Thermal | High (receipts) | Hard | ⭐⭐⭐⭐ |
| #4 Regional Language | Medium (India) | Very Hard | ⭐⭐⭐⭐ |
| #5 Corrections | Medium | Hard | ⭐⭐⭐ |
| #6 Multi-Page | High (detailed orders) | Medium | ⭐⭐⭐⭐ |
| #7 Carbon Copy | Low (older vendors) | Very Hard | ⭐⭐ |
| #8 Watermark | Medium | Medium | ⭐⭐⭐ |
| #9 Faxed | Low (legacy systems) | Very Hard | ⭐⭐ |
| #10 Colored Paper | Low | Medium | ⭐⭐ |
| #11 Misaligned Tables | Medium | Hard | ⭐⭐⭐ |
| #12 Stamps Covering | High (processed docs) | Hard | ⭐⭐⭐⭐ |
| #13 Window/Glare | Low | Very Hard | ⭐ |
| #14 Double-Sided | Low | Hard | ⭐⭐ |
| #15 Handwritten Notes | Very High | Medium | ⭐⭐⭐⭐ |
| #16 Email Screenshot | High | Easy-Medium | ⭐⭐⭐ |
| #17 Low Ink | Medium | Hard | ⭐⭐⭐ |
| #18 Pre-Printed Form | Medium | Hard | ⭐⭐⭐ |
| #19 Decorative | Low | Medium | ⭐⭐ |
| #20 Unusual Format | Low | Medium | ⭐⭐ |
| #21 Water Damaged | Medium (monsoon/spills) | Very Hard | ⭐⭐⭐⭐ |
| #22 Wallet-Worn Receipt | High (old reimbursements) | Very Hard | ⭐⭐⭐⭐ |

---

## 🎯 Recommended Test Subset (Top 7)

For comprehensive non-generic testing, focus on these high-impact scenarios:

1. **Handwritten Emergency Repair** (#1) - Tests handwriting recognition limits
2. **WhatsApp Photo** (#2) - Most common real-world submission method
3. **Fading Thermal Receipt** (#3) - Common for fuel/toll receipts
4. **Multi-Page Stapled** (#6) - Tests document relationship handling
5. **Stamps Covering Text** (#12) - Tests stamp detection and text recovery
6. **Water-Damaged Invoice** (#21) - Tests environmental damage (monsoon/spills) ⭐ NEW
7. **Wallet-Worn Receipt** (#22) - Tests extreme aging and wear ⭐ NEW

These 7 cover the most frequent real-world challenges including environmental damage common in field operations.

---

## 💡 Using These Scenarios

### For Manual Testing:
1. Create mock invoices matching these descriptions
2. Use phone camera to introduce realistic artifacts
3. Print, crumple, scan, or photograph as described
4. Upload and verify AI extraction quality

### For Automated Testing:
1. Generate test images using AI prompts from `IMAGE_GENERATION_PROMPTS.md`
2. Apply programmatic transformations (rotation, noise, blur)
3. Store in test dataset
4. Run extraction and measure accuracy against ground truth

### For Demo/Presentation:
- Show side-by-side: Perfect generic invoice vs real-world messy invoice
- Demonstrate system handling both gracefully
- Highlight confidence scores and manual review workflows
- Prove robustness beyond happy-path scenarios

---

These scenarios ensure your invoice processing system is **battle-tested** for real-world conditions, not just clean, perfect PDFs. 🚀
