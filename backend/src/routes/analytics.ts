import { Router, Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';
import { InvoiceStatus, InvoiceCategory } from '@prisma/client';

const router = Router();

// Helper function to get status timeline
async function getStatusTimeline(where: any) {
  const whereClause = buildWhereClause(where);
  const query = whereClause
    ? `SELECT DATE(created_at) as date, COUNT(*)::int as count FROM invoices WHERE ${whereClause} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`
    : `SELECT DATE(created_at) as date, COUNT(*)::int as count FROM invoices GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`;

  return prisma.$queryRawUnsafe(query);
}

// Helper function to build WHERE clause for raw query
function buildWhereClause(where: any): string {
  const conditions: string[] = [];

  if (where.createdAt?.gte) {
    conditions.push(`created_at >= '${where.createdAt.gte.toISOString()}'`);
  }
  if (where.createdAt?.lte) {
    conditions.push(`created_at <= '${where.createdAt.lte.toISOString()}'`);
  }
  if (where.category) {
    conditions.push(`category = '${where.category}'`);
  }

  return conditions.join(' AND ');
}

// All analytics routes require authentication and ACCOUNTS/SENIOR_ACCOUNTS role
router.use(authenticate);
router.use(requireRoles(['ACCOUNTS', 'SENIOR_ACCOUNTS']));

// GET /api/analytics/stats - Get aggregated analytics data
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate, category } = req.query;

  // Build date filter
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate as string);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate as string);
  }

  // Build where clause
  const where: any = {};
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter;
  }
  if (category && ['VENDOR_PAYMENT', 'REIMBURSEMENT'].includes(category as string)) {
    where.category = category as InvoiceCategory;
  }

  // Get overview stats
  const [
    totalInvoices,
    pendingCount,
    approvedCount,
    rejectedCount,
    paidCount,
    totalAmount,
    categoryBreakdown,
    statusTimeline,
    recentInvoices,
  ] = await Promise.all([
    // Total invoices
    prisma.invoice.count({ where }),

    // Status counts (pending includes all three pending statuses)
    prisma.invoice.count({
      where: {
        ...where,
        status: {
          in: [
            InvoiceStatus.PENDING_REVIEW,
            InvoiceStatus.PENDING_SENIOR_APPROVAL,
            InvoiceStatus.PENDING_FINAL_APPROVAL,
          ],
        },
      },
    }),
    prisma.invoice.count({ where: { ...where, status: InvoiceStatus.APPROVED } }),
    prisma.invoice.count({ where: { ...where, status: InvoiceStatus.REJECTED } }),
    prisma.invoice.count({ where: { ...where, status: InvoiceStatus.PAID } }),

    // Total amount (sum of grand_total from extracted_data)
    prisma.extractedData
      .aggregate({
        where: {
          invoice: where,
        },
        _sum: { grandTotal: true },
      })
      .then((result) => result._sum.grandTotal || 0),

    // Category breakdown
    prisma.invoice.groupBy({
      by: ['category'],
      where,
      _count: true,
    }),

    // Status timeline (submissions over time - group by date)
    getStatusTimeline(where),

    // Recent high-value invoices
    prisma.invoice.findMany({
      where,
      include: {
        extractedData: {
          select: {
            vendorName: true,
            grandTotal: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    }),
  ]);

  // Calculate average processing time (from submission to approval/rejection)
  const processedInvoices = await prisma.invoice.findMany({
    where: {
      ...where,
      status: { in: [InvoiceStatus.APPROVED, InvoiceStatus.REJECTED, InvoiceStatus.PAID] },
    },
    select: {
      createdAt: true,
      updatedAt: true,
    },
  });

  const avgProcessingTime =
    processedInvoices.length > 0
      ? processedInvoices.reduce((sum, inv) => {
          const diff = inv.updatedAt.getTime() - inv.createdAt.getTime();
          return sum + diff;
        }, 0) / processedInvoices.length
      : 0;

  // Format response
  res.json({
    overview: {
      totalInvoices,
      pendingCount,
      approvedCount,
      rejectedCount,
      paidCount,
      totalAmount: Number(totalAmount),
      avgProcessingTimeMs: Math.round(avgProcessingTime),
    },
    categoryBreakdown: categoryBreakdown.map((item) => ({
      category: item.category,
      count: item._count,
    })),
    statusTimeline: (statusTimeline as any[]).reverse(), // Oldest to newest
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      filename: inv.originalFilename,
      status: inv.status,
      vendor: inv.extractedData?.vendorName || 'Unknown',
      amount: inv.extractedData?.grandTotal ? Number(inv.extractedData.grandTotal) : null,
      createdAt: inv.createdAt,
    })),
  });
});

export default router;
