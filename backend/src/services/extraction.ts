import path from 'path';
import { extractInvoiceData } from './gemini';
import { config } from '../config';
import prisma from '../lib/prisma';

/**
 * Process invoice extraction asynchronously (fire-and-forget).
 * Sets extraction_status to PROCESSING → COMPLETED/FAILED.
 * Saves ExtractedData + LineItems, then runs duplicate detection.
 */
export async function processInvoiceExtraction(invoiceId: string): Promise<void> {
  try {
    // Mark as processing
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { extractionStatus: 'PROCESSING' },
    });

    const filePath = path.resolve(config.uploadDir, invoice.filePath);

    // Call Gemini
    const result = await extractInvoiceData(filePath);

    // Save extracted data + line items in a transaction
    await prisma.$transaction(async (tx) => {
      const extractedData = await tx.extractedData.create({
        data: {
          invoiceId,
          vendorName: result.vendorName,
          invoiceNumber: result.invoiceNumber,
          invoiceDate: result.invoiceDate,
          dueDate: result.dueDate,
          subtotal: result.subtotal,
          tax: result.tax,
          grandTotal: result.grandTotal,
          paymentTerms: result.paymentTerms,
          bankDetails: result.bankDetails,
          confidenceScores: result.confidenceScores,
        },
      });

      if (result.lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: result.lineItems.map((item) => ({
            extractedDataId: extractedData.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        });
      }

      // Check if two-level approval is required based on amount
      const grandTotal = result.grandTotal ? parseFloat(result.grandTotal.toString()) : 0;
      const requiresTwoLevel = grandTotal >= config.twoLevelApprovalThreshold;
      const newStatus = requiresTwoLevel ? 'PENDING_SENIOR_APPROVAL' : 'PENDING_REVIEW';

      // Mark as completed and update approval requirements
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          extractionStatus: 'COMPLETED',
          requiresTwoLevel,
          status: newStatus,
        },
      });
    });

    // Run duplicate detection after successful extraction
    await detectDuplicate(invoiceId);

    console.log(`Extraction completed for invoice ${invoiceId}`);
  } catch (error) {
    console.error(`Extraction failed for invoice ${invoiceId}:`, error);

    // Mark as failed
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { extractionStatus: 'FAILED' },
    }).catch(() => {}); // Don't throw if this also fails
  }
}

/**
 * Check if this invoice is a duplicate by matching invoice_number + vendor_name
 * against other invoices. If invoice_number is missing, falls back to matching
 * vendor_name + grand_total + invoice_date as a secondary check.
 */
async function detectDuplicate(invoiceId: string): Promise<void> {
  const extractedData = await prisma.extractedData.findUnique({
    where: { invoiceId },
  });

  if (!extractedData) {
    return; // No extracted data available
  }

  let duplicate = null;

  // Primary strategy: Match by vendor name + invoice number
  if (extractedData.invoiceNumber && extractedData.vendorName) {
    duplicate = await prisma.extractedData.findFirst({
      where: {
        invoiceNumber: extractedData.invoiceNumber,
        vendorName: extractedData.vendorName,
        invoiceId: { not: invoiceId }, // Exclude self
      },
    });
  }

  // Fallback strategy: If no invoice number, match by vendor + amount (+ date if available)
  // This helps catch duplicate scanned receipts or informal invoices
  if (!duplicate && extractedData.vendorName && extractedData.grandTotal) {
    const fallbackWhere: any = {
      vendorName: extractedData.vendorName,
      grandTotal: extractedData.grandTotal,
      invoiceId: { not: invoiceId }, // Exclude self
    };

    // Include date in matching if available (more precise)
    if (extractedData.invoiceDate) {
      fallbackWhere.invoiceDate = extractedData.invoiceDate;
    }

    duplicate = await prisma.extractedData.findFirst({
      where: fallbackWhere,
    });
  }

  if (duplicate) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        isDuplicate: true,
        duplicateOf: duplicate.invoiceId,
      },
    });

    console.log(`Invoice ${invoiceId} flagged as duplicate of ${duplicate.invoiceId}`);
  }
}
