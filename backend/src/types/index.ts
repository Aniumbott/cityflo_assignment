import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceFilters {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  submittedBy?: string;
  amountMin?: string;
  amountMax?: string;
  search?: string;
}

export interface ExtractionResult {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  lineItems: {
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
  }[];
  subtotal: number | null;
  tax: number | null;
  grandTotal: number | null;
  paymentTerms: string | null;
  bankDetails: string | null;
  confidenceScores: Record<string, number>;
}
