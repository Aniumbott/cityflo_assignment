import path from 'path';
import fs from 'fs';
import { processInvoiceExtraction } from './extraction';

// Mock the gemini service
jest.mock('./gemini', () => ({
  extractInvoiceData: jest.fn().mockResolvedValue({
    vendorName: 'Test Vendor Corp',
    invoiceNumber: 'INV-2025-001',
    invoiceDate: '2025-05-15',
    dueDate: '2025-06-15',
    lineItems: [
      { description: 'Widget A', quantity: 10, unitPrice: 25.0, total: 250.0 },
      { description: 'Widget B', quantity: 5, unitPrice: 50.0, total: 250.0 },
    ],
    subtotal: 500.0,
    tax: 50.0,
    grandTotal: 550.0,
    paymentTerms: 'Net 30',
    bankDetails: 'Account: 1234567890',
    confidenceScores: {
      vendorName: 0.95,
      invoiceNumber: 0.9,
      invoiceDate: 0.85,
      dueDate: 0.8,
      lineItems: 0.9,
      subtotal: 0.95,
      tax: 0.9,
      grandTotal: 0.95,
      paymentTerms: 0.7,
      bankDetails: 0.6,
    },
  }),
}));

import prisma from '../lib/prisma';

jest.setTimeout(30000);

// Create a temporary test invoice for extraction testing
let testInvoiceId: string;
let testUserId: string;

beforeAll(async () => {
  // Get a test user
  const user = await prisma.user.findUnique({ where: { username: 'employee1' } });
  testUserId = user!.id;

  // Create a dummy PDF file
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, 'extraction-test.pdf'), '%PDF-1.4 test');

  // Create a test invoice
  const invoice = await prisma.invoice.create({
    data: {
      submittedBy: testUserId,
      category: 'VENDOR_PAYMENT',
      filePath: 'extraction-test.pdf',
      originalFilename: 'extraction-test.pdf',
    },
  });
  testInvoiceId = invoice.id;
});

afterAll(async () => {
  // Clean up
  if (testInvoiceId) {
    await prisma.invoice.delete({ where: { id: testInvoiceId } }).catch(() => {});
  }
  const testPdf = path.join(process.cwd(), 'uploads', 'extraction-test.pdf');
  if (fs.existsSync(testPdf)) fs.unlinkSync(testPdf);
});

describe('Extraction Service', () => {
  it('should extract data from an invoice and save to DB', async () => {
    await processInvoiceExtraction(testInvoiceId);

    // Verify invoice status updated
    const invoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
      include: {
        extractedData: {
          include: { lineItems: true },
        },
      },
    });

    expect(invoice!.extractionStatus).toBe('COMPLETED');
    expect(invoice!.extractedData).toBeDefined();
    expect(invoice!.extractedData!.vendorName).toBe('Test Vendor Corp');
    expect(invoice!.extractedData!.invoiceNumber).toBe('INV-2025-001');
    expect(invoice!.extractedData!.grandTotal?.toString()).toBe('550');
    expect(invoice!.extractedData!.lineItems).toHaveLength(2);
    expect(invoice!.extractedData!.confidenceScores).toBeDefined();
  });

  it('should detect duplicates based on invoice_number + vendor_name', async () => {
    // Create a second invoice with a different file
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    fs.writeFileSync(path.join(uploadsDir, 'extraction-test-dup.pdf'), '%PDF-1.4 dup test');

    const dupInvoice = await prisma.invoice.create({
      data: {
        submittedBy: testUserId,
        category: 'VENDOR_PAYMENT',
        filePath: 'extraction-test-dup.pdf',
        originalFilename: 'extraction-test-dup.pdf',
      },
    });

    try {
      // Process the duplicate — mock returns same vendor + invoice number
      await processInvoiceExtraction(dupInvoice.id);

      const updated = await prisma.invoice.findUnique({
        where: { id: dupInvoice.id },
      });

      expect(updated!.isDuplicate).toBe(true);
      expect(updated!.duplicateOf).toBe(testInvoiceId);
    } finally {
      await prisma.invoice.delete({ where: { id: dupInvoice.id } }).catch(() => {});
      const dupPdf = path.join(uploadsDir, 'extraction-test-dup.pdf');
      if (fs.existsSync(dupPdf)) fs.unlinkSync(dupPdf);
    }
  });

  it('should handle extraction failure gracefully', async () => {
    // Override mock to throw
    const gemini = require('./gemini');
    gemini.extractInvoiceData.mockRejectedValueOnce(new Error('Gemini API error'));

    // Create a new invoice for failure testing
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    fs.writeFileSync(path.join(uploadsDir, 'extraction-test-fail.pdf'), '%PDF-1.4 fail test');

    const failInvoice = await prisma.invoice.create({
      data: {
        submittedBy: testUserId,
        category: 'REIMBURSEMENT',
        filePath: 'extraction-test-fail.pdf',
        originalFilename: 'extraction-test-fail.pdf',
      },
    });

    try {
      await processInvoiceExtraction(failInvoice.id);

      const updated = await prisma.invoice.findUnique({
        where: { id: failInvoice.id },
      });

      expect(updated!.extractionStatus).toBe('FAILED');
    } finally {
      await prisma.invoice.delete({ where: { id: failInvoice.id } }).catch(() => {});
      const failPdf = path.join(uploadsDir, 'extraction-test-fail.pdf');
      if (fs.existsSync(failPdf)) fs.unlinkSync(failPdf);
    }
  });
});
