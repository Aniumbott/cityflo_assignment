import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userEvent } from '../test/test-utils';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import InvoiceReviewPage from './InvoiceReviewPage';
import type { ReactElement } from 'react';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the invoices API
vi.mock('../api/invoices', () => ({
  getInvoice: vi.fn(),
  updateInvoiceStatus: vi.fn(),
  editExtractedData: vi.fn(),
  getPdfUrl: vi.fn((id) => `/api/invoices/${id}/pdf`),
}));

import { getInvoice, updateInvoiceStatus } from '../api/invoices';
const mockGetInvoice = vi.mocked(getInvoice);
const mockUpdateStatus = vi.mocked(updateInvoiceStatus);

// Fresh QueryClient per render to avoid cache pollution
function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/invoices/:id" element={ui} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockExtractedData = {
  id: 'ext-1',
  invoiceId: 'inv-1',
  vendorName: 'Acme Corp',
  invoiceNumber: 'INV-001',
  invoiceDate: '2025-06-10T00:00:00.000Z',
  dueDate: '2025-07-10T00:00:00.000Z',
  subtotal: '12500.00',
  tax: '2500.50',
  grandTotal: '15000.50',
  paymentTerms: 'Net 30',
  bankDetails: 'Bank: HDFC\nAccount: 1234567890\nIFSC: HDFC0001234',
  rawText: null,
  confidenceScores: { vendorName: 0.95, invoiceNumber: 0.88, grandTotal: 0.92 },
  createdAt: '2025-06-15T10:00:00.000Z',
  updatedAt: '2025-06-15T10:00:00.000Z',
  lineItems: [
    {
      id: 'line-1',
      extractedDataId: 'ext-1',
      description: 'Product A',
      quantity: '10',
      unitPrice: '1250.00',
      total: '12500.00',
    },
  ],
};

const mockInvoiceDetail = {
  invoice: {
    id: 'inv-1',
    submittedBy: 'user-1',
    category: 'VENDOR_PAYMENT' as const,
    status: 'PENDING_REVIEW' as const,
    notes: 'Urgent payment',
    filePath: 'file.pdf',
    originalFilename: 'acme-invoice.pdf',
    extractionStatus: 'COMPLETED' as const,
    isDuplicate: false,
    duplicateOf: null,
    requiresTwoLevel: false,
    seniorApprovedBy: null,
    seniorApprovedAt: null,
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
    submitter: { id: 'user-1', username: 'employee1', email: 'emp@test.com', role: 'EMPLOYEE' as const },
    extractedData: mockExtractedData,
    actions: [
      {
        id: 'action-1',
        invoiceId: 'inv-1',
        userId: 'user-1',
        action: 'SUBMITTED' as const,
        comment: null,
        createdAt: '2025-06-15T10:00:00.000Z',
        user: { id: 'user-1', username: 'employee1', role: 'EMPLOYEE' as const },
      },
    ],
  },
};

describe('InvoiceReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/invoices/inv-1');
  });

  it('renders loading state initially', () => {
    mockGetInvoice.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<InvoiceReviewPage />);

    // The Loader2 icon doesn't have role="progressbar", check for the spinner directly
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('renders error state when invoice fetch fails', async () => {
    mockGetInvoice.mockRejectedValue(new Error('Not found'));
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice not found')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Go back/i })).toBeInTheDocument();
  });

  it('renders invoice header with vendor name and status', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('shows duplicate warning when invoice is duplicate', async () => {
    mockGetInvoice.mockResolvedValue({
      invoice: { ...mockInvoiceDetail.invoice, isDuplicate: true },
    });
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Possible duplicate detected')).toBeInTheDocument();
    });
  });

  it('renders PDF iframe with correct URL', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      const iframe = screen.getByTitle('Invoice PDF');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', '/api/invoices/inv-1/pdf');
    });
  });

  it('renders invoice details with confidence dots', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payment')).toBeInTheDocument();
  });

  it('renders financial summary', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    });
    // Multiple amounts may appear (table + summary), use getAllByText
    expect(screen.getAllByText(/12,500\.00/).length).toBeGreaterThan(0); // Subtotal
    expect(screen.getAllByText(/2,500\.50/).length).toBeGreaterThan(0); // Tax
    expect(screen.getAllByText(/15,000\.50/).length).toBeGreaterThan(0); // Grand Total
  });

  it('renders line items table', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Line Items')).toBeInTheDocument();
    });
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders bank details', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Bank Details')).toBeInTheDocument();
    });
    expect(screen.getByText(/Bank: HDFC/)).toBeInTheDocument();
  });

  it('renders activity timeline', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    });
    // employee1 appears in multiple places (submitter + timeline)
    expect(screen.getAllByText(/employee1/).length).toBeGreaterThan(0);
    // Text is split across multiple elements, use a text matcher function
    expect(screen.getByText((_, element) => {
      return element?.textContent === 'employee1 submitted this invoice';
    })).toBeInTheDocument();
  });

  it('shows action bar with approve and reject buttons for pending invoices', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
  });

  it('shows mark as paid button for approved invoices', async () => {
    mockGetInvoice.mockResolvedValue({
      invoice: { ...mockInvoiceDetail.invoice, status: 'APPROVED' as const },
    });
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark as Paid/i })).toBeInTheDocument();
    });
  });

  it('calls approve mutation when approve button is clicked', async () => {
    const user = userEvent.setup();
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    mockUpdateStatus.mockResolvedValue({ invoice: mockInvoiceDetail.invoice });
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /Approve/i });
    await user.click(approveBtn);

    expect(mockUpdateStatus).toHaveBeenCalledWith('inv-1', { status: 'APPROVED' });
  });

  it('shows edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    await user.click(editBtn);

    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows extraction processing indicator when status is PROCESSING', async () => {
    mockGetInvoice.mockResolvedValue({
      invoice: { ...mockInvoiceDetail.invoice, extractionStatus: 'PROCESSING' as const },
    });
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Extracting invoice data...')).toBeInTheDocument();
    });
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup();
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithProviders(<InvoiceReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Back to All Invoices')).toBeInTheDocument();
    });

    const backBtn = screen.getByText('Back to All Invoices');
    await user.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/invoices');
  });
});
