export type UserRole = 'EMPLOYEE' | 'ACCOUNTS' | 'SENIOR_ACCOUNTS';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User & { createdAt: string };
}

// Invoice types
export type InvoiceCategory = 'VENDOR_PAYMENT' | 'REIMBURSEMENT';
export type InvoiceStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Invoice {
  id: string;
  submittedBy: string;
  category: InvoiceCategory;
  status: InvoiceStatus;
  notes: string | null;
  filePath: string;
  originalFilename: string;
  extractionStatus: ExtractionStatus;
  isDuplicate: boolean;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadInvoicesResponse {
  invoices: Invoice[];
}

// List invoices types (includes relations from backend)
export interface InvoiceListItem extends Invoice {
  submitter: {
    id: string;
    username: string;
    email: string;
  };
  extractedData: {
    vendorName: string | null;
    invoiceNumber: string | null;
    grandTotal: string | null; // Decimal comes as string from Prisma
  } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoiceListResponse {
  invoices: InvoiceListItem[];
  pagination: Pagination;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: InvoiceCategory;
  search?: string;
}

// Invoice detail types
export interface LineItem {
  id: string;
  extractedDataId: string;
  description: string | null;
  quantity: string | null;
  unitPrice: string | null;
  total: string | null;
}

export interface ExtractedData {
  id: string;
  invoiceId: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: string | null;
  tax: string | null;
  grandTotal: string | null;
  paymentTerms: string | null;
  bankDetails: string | null;
  rawText: string | null;
  confidenceScores: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
  lineItems: LineItem[];
}

export type InvoiceActionType = 'SUBMITTED' | 'VIEWED' | 'EDITED' | 'APPROVED' | 'REJECTED' | 'MARKED_PAID';

export interface InvoiceAction {
  id: string;
  invoiceId: string;
  userId: string;
  action: InvoiceActionType;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export interface InvoiceDetail extends Invoice {
  submitter: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  };
  extractedData: ExtractedData | null;
  actions: InvoiceAction[];
}

export interface InvoiceDetailResponse {
  invoice: InvoiceDetail;
}
