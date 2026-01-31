import { Router, Request, Response } from 'express';
import { UserRole, InvoiceStatus, Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { createObjectCsvStringifier } from 'csv-writer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { upload } from '../middleware/upload';
import { AuthenticatedRequest } from '../types';
import { processInvoiceExtraction } from '../services/extraction';
import prisma from '../lib/prisma';

const router = Router();

// All invoice routes require authentication
router.use(authenticate);

// POST /api/invoices - Upload invoice(s)
router.post('/', upload.array('files', 10), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'At least one PDF file is required' });
    return;
  }

  const { category, notes } = req.body;

  if (!category || !['VENDOR_PAYMENT', 'REIMBURSEMENT'].includes(category)) {
    res.status(400).json({ error: 'Valid category is required (VENDOR_PAYMENT or REIMBURSEMENT)' });
    return;
  }

  const invoices = await Promise.all(
    files.map((file) =>
      prisma.invoice.create({
        data: {
          submittedBy: req.user!.userId,
          category,
          notes: notes || null,
          filePath: file.filename,
          originalFilename: file.originalname,
        },
      })
    )
  );

  // Fire async extraction for each invoice (non-blocking)
  for (const invoice of invoices) {
    processInvoiceExtraction(invoice.id).catch((err) =>
      console.error(`Extraction trigger failed for ${invoice.id}:`, err)
    );
  }

  res.status(201).json({ invoices });
});

// GET /api/invoices/export/csv - Export filtered invoices as CSV
// NOTE: This must be defined BEFORE /:id to avoid route collision
router.get('/export/csv', authorize(UserRole.ACCOUNTS, UserRole.SENIOR_ACCOUNTS), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const where = buildWhereClause(req);

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      submitter: { select: { username: true, email: true } },
      extractedData: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: 'Invoice ID' },
      { id: 'submittedBy', title: 'Submitted By' },
      { id: 'email', title: 'Submitter Email' },
      { id: 'category', title: 'Category' },
      { id: 'status', title: 'Status' },
      { id: 'vendorName', title: 'Vendor Name' },
      { id: 'invoiceNumber', title: 'Invoice Number' },
      { id: 'invoiceDate', title: 'Invoice Date' },
      { id: 'grandTotal', title: 'Grand Total' },
      { id: 'originalFilename', title: 'Filename' },
      { id: 'createdAt', title: 'Upload Date' },
    ],
  });

  const records = invoices.map((inv) => ({
    id: inv.id,
    submittedBy: inv.submitter.username,
    email: inv.submitter.email,
    category: inv.category,
    status: inv.status,
    vendorName: inv.extractedData?.vendorName || '',
    invoiceNumber: inv.extractedData?.invoiceNumber || '',
    invoiceDate: inv.extractedData?.invoiceDate || '',
    grandTotal: inv.extractedData?.grandTotal?.toString() || '',
    originalFilename: inv.originalFilename,
    createdAt: inv.createdAt.toISOString(),
  }));

  const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=invoices-export.csv');
  res.send(csvContent);
});

// GET /api/invoices - Paginated list with filters
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const where = buildWhereClause(req);

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        submitter: { select: { id: true, username: true, email: true } },
        extractedData: { select: { vendorName: true, invoiceNumber: true, grandTotal: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// POST /api/invoices/bulk-action - Bulk approve/reject
router.post('/bulk-action', authorize(UserRole.ACCOUNTS, UserRole.SENIOR_ACCOUNTS), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { invoiceIds, action, comment } = req.body;

  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    res.status(400).json({ error: 'invoiceIds array is required' });
    return;
  }

  if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
    res.status(400).json({ error: 'action must be APPROVED or REJECTED' });
    return;
  }

  if (action === 'REJECTED' && !comment) {
    res.status(400).json({ error: 'Comment is required when rejecting invoices' });
    return;
  }

  const status = action === 'APPROVED' ? InvoiceStatus.APPROVED : InvoiceStatus.REJECTED;
  const auditAction = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

  // Update all invoices and create audit records in a transaction
  // Note: Bulk actions only work on PENDING_REVIEW invoices to prevent
  // bypassing the two-level approval workflow for high-value invoices.
  // Two-level approval invoices (PENDING_SENIOR_APPROVAL, PENDING_FINAL_APPROVAL)
  // must be approved individually through the sequential workflow.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        status: InvoiceStatus.PENDING_REVIEW, // Only update PENDING_REVIEW invoices
      },
      data: { status },
    });

    // Create audit records for each
    const invoices = await tx.invoice.findMany({
      where: { id: { in: invoiceIds }, status },
    });

    await tx.invoiceAction.createMany({
      data: invoices.map((inv) => ({
        invoiceId: inv.id,
        userId: req.user!.userId,
        action: auditAction as any,
        comment: comment || null,
      })),
    });

    // Create notifications for submitters
    await tx.notification.createMany({
      data: invoices.map((inv) => ({
        userId: inv.submittedBy,
        invoiceId: inv.id,
        message: `Your invoice ${inv.originalFilename} has been ${action.toLowerCase()}.`,
      })),
    });

    return updated;
  });

  res.json({ updated: result.count });
});

// GET /api/invoices/:id - Single invoice with details
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, username: true, email: true, role: true } },
      extractedData: {
        include: { lineItems: true },
      },
      actions: {
        include: { user: { select: { id: true, username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  // Employees can only view their own invoices
  if (req.user!.role === UserRole.EMPLOYEE && invoice.submittedBy !== req.user!.userId) {
    res.status(403).json({ error: 'You can only view your own invoices' });
    return;
  }

  res.json({ invoice });
});

// GET /api/invoices/:id/audit-log - Get full audit trail for an invoice
router.get('/:id/audit-log', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, submittedBy: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user!.role === UserRole.EMPLOYEE && invoice.submittedBy !== req.user!.userId) {
    res.status(403).json({ error: 'You can only view your own invoices' });
    return;
  }

  const actions = await prisma.invoiceAction.findMany({
    where: { invoiceId: id },
    include: {
      user: { select: { id: true, username: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ actions });
});

// GET /api/invoices/:id/pdf - Serve PDF file
router.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { filePath: true, originalFilename: true, submittedBy: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  // Employees can only view their own
  if (req.user!.role === UserRole.EMPLOYEE && invoice.submittedBy !== req.user!.userId) {
    res.status(403).json({ error: 'You can only view your own invoices' });
    return;
  }

  const filePath = path.resolve(process.cwd(), 'uploads', invoice.filePath);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'PDF file not found on server' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.originalFilename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// PATCH /api/invoices/:id/extracted-data - Edit extracted fields
router.patch('/:id/extracted-data', authorize(UserRole.ACCOUNTS, UserRole.SENIOR_ACCOUNTS), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { extractedData: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (!invoice.extractedData) {
    res.status(404).json({ error: 'No extracted data found for this invoice' });
    return;
  }

  const { vendorName, invoiceNumber, invoiceDate, dueDate, subtotal, tax, grandTotal, paymentTerms, bankDetails, lineItems } = req.body;

  const updatedData = await prisma.$transaction(async (tx) => {
    const updated = await tx.extractedData.update({
      where: { id: invoice.extractedData!.id },
      data: {
        ...(vendorName !== undefined && { vendorName }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoiceDate !== undefined && { invoiceDate }),
        ...(dueDate !== undefined && { dueDate }),
        ...(subtotal !== undefined && { subtotal }),
        ...(tax !== undefined && { tax }),
        ...(grandTotal !== undefined && { grandTotal }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(bankDetails !== undefined && { bankDetails }),
      },
    });

    // If lineItems provided, replace all
    if (Array.isArray(lineItems)) {
      await tx.lineItem.deleteMany({ where: { extractedDataId: updated.id } });
      if (lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: lineItems.map((item: any) => ({
            extractedDataId: updated.id,
            description: item.description || null,
            quantity: item.quantity ?? null,
            unitPrice: item.unitPrice ?? null,
            total: item.total ?? null,
          })),
        });
      }
    }

    // Record audit action
    await tx.invoiceAction.create({
      data: {
        invoiceId: invoice.id,
        userId: req.user!.userId,
        action: 'EDITED',
      },
    });

    return tx.extractedData.findUnique({
      where: { id: updated.id },
      include: { lineItems: true },
    });
  });

  res.json({ extractedData: updatedData });
});

// PATCH /api/invoices/:id/status - Change status (approve/reject/mark paid)
router.patch('/:id/status', authorize(UserRole.ACCOUNTS, UserRole.SENIOR_ACCOUNTS), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, comment } = req.body;

  if (!status || !['APPROVED', 'REJECTED', 'PAID'].includes(status)) {
    res.status(400).json({ error: 'Valid status is required (APPROVED, REJECTED, or PAID)' });
    return;
  }

  if (status === 'REJECTED' && !comment) {
    res.status(400).json({ error: 'Comment is required when rejecting an invoice' });
    return;
  }

  const id = req.params.id as string;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { extractedData: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const userRole = req.user!.role;
  const userId = req.user!.userId;

  // Handle rejection - can be done by either role at any stage
  if (status === 'REJECTED') {
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.REJECTED },
      });

      await tx.invoiceAction.create({
        data: {
          invoiceId: invoice.id,
          userId,
          action: 'REJECTED',
          comment: comment || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: invoice.submittedBy,
          invoiceId: invoice.id,
          message: `Your invoice ${invoice.originalFilename} has been rejected.`,
        },
      });

      return updated;
    });

    res.json({ invoice: updatedInvoice });
    return;
  }

  // Handle marking as PAID - only for already approved invoices
  if (status === 'PAID') {
    if (invoice.status !== InvoiceStatus.APPROVED) {
      res.status(400).json({ error: 'Only approved invoices can be marked as paid' });
      return;
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID },
      });

      await tx.invoiceAction.create({
        data: {
          invoiceId: invoice.id,
          userId,
          action: 'MARKED_PAID',
          comment: comment || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: invoice.submittedBy,
          invoiceId: invoice.id,
          message: `Your invoice ${invoice.originalFilename} has been marked as paid.`,
        },
      });

      return updated;
    });

    res.json({ invoice: updatedInvoice });
    return;
  }

  // Handle APPROVED - two-level workflow if required
  if (invoice.requiresTwoLevel) {
    // Two-level approval workflow
    if (invoice.status === InvoiceStatus.PENDING_SENIOR_APPROVAL) {
      // First level - must be SENIOR_ACCOUNTS
      if (userRole !== UserRole.SENIOR_ACCOUNTS) {
        res.status(403).json({ error: 'Only senior accountants can give first-level approval for high-value invoices' });
        return;
      }

      const updatedInvoice = await prisma.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PENDING_FINAL_APPROVAL,
            seniorApprovedBy: userId,
            seniorApprovedAt: new Date(),
          },
        });

        await tx.invoiceAction.create({
          data: {
            invoiceId: invoice.id,
            userId,
            action: 'APPROVED',
            comment: comment || 'First-level approval (senior)',
          },
        });

        // Notify submitter
        await tx.notification.create({
          data: {
            userId: invoice.submittedBy,
            invoiceId: invoice.id,
            message: `Your invoice ${invoice.originalFilename} has received senior approval. Awaiting final approval.`,
          },
        });

        // Notify ACCOUNTS users for final approval
        const accountsUsers = await tx.user.findMany({
          where: { role: UserRole.ACCOUNTS },
        });

        for (const accountsUser of accountsUsers) {
          await tx.notification.create({
            data: {
              userId: accountsUser.id,
              invoiceId: invoice.id,
              message: `Invoice ${invoice.originalFilename} requires final approval.`,
            },
          });
        }

        return updated;
      });

      res.json({ invoice: updatedInvoice });
      return;
    }

    if (invoice.status === InvoiceStatus.PENDING_FINAL_APPROVAL) {
      // Second level - must be ACCOUNTS
      if (userRole !== UserRole.ACCOUNTS) {
        res.status(403).json({ error: 'Only accountants can give final approval for high-value invoices' });
        return;
      }

      const updatedInvoice = await prisma.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.APPROVED },
        });

        await tx.invoiceAction.create({
          data: {
            invoiceId: invoice.id,
            userId,
            action: 'APPROVED',
            comment: comment || 'Final approval',
          },
        });

        await tx.notification.create({
          data: {
            userId: invoice.submittedBy,
            invoiceId: invoice.id,
            message: `Your invoice ${invoice.originalFilename} has been fully approved.`,
          },
        });

        return updated;
      });

      res.json({ invoice: updatedInvoice });
      return;
    }
  } else {
    // Single-level approval - either role can approve
    if (invoice.status !== InvoiceStatus.PENDING_REVIEW) {
      res.status(400).json({ error: 'Invoice is not pending review' });
      return;
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.APPROVED },
      });

      await tx.invoiceAction.create({
        data: {
          invoiceId: invoice.id,
          userId,
          action: 'APPROVED',
          comment: comment || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: invoice.submittedBy,
          invoiceId: invoice.id,
          message: `Your invoice ${invoice.originalFilename} has been approved.`,
        },
      });

      return updated;
    });

    res.json({ invoice: updatedInvoice });
    return;
  }

  res.status(400).json({ error: 'Invalid invoice status for approval' });
});

// Helper: build Prisma where clause from query params
function buildWhereClause(req: AuthenticatedRequest): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};

  // Employees see only their own invoices
  if (req.user!.role === UserRole.EMPLOYEE) {
    where.submittedBy = req.user!.userId;
  }

  const { status, category, dateFrom, dateTo, submittedBy, amountMin, amountMax, search } = req.query as Record<string, string>;

  if (status) {
    const statuses = status.split(',') as InvoiceStatus[];
    where.status = { in: statuses };
  }

  if (category) {
    where.category = category as any;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as any).lte = new Date(dateTo);
  }

  // Only accounts/senior can filter by submitter
  if (submittedBy && req.user!.role !== UserRole.EMPLOYEE) {
    where.submittedBy = submittedBy;
  }

  if (amountMin || amountMax) {
    where.extractedData = {
      grandTotal: {
        ...(amountMin && { gte: parseFloat(amountMin) }),
        ...(amountMax && { lte: parseFloat(amountMax) }),
      },
    };
  }

  if (search) {
    where.OR = [
      { originalFilename: { contains: search, mode: 'insensitive' } },
      { extractedData: { vendorName: { contains: search, mode: 'insensitive' } } },
      { extractedData: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

export default router;
