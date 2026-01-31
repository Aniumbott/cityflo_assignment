import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import InvoiceDetailPage from './InvoiceDetailPage';
import type { ReactElement } from 'react';

// Mock the invoices API
vi.mock('../api/invoices', () => ({
  getInvoice: vi.fn(),
}));

import { getInvoice } from '../api/invoices';
const mockGetInvoice = vi.mocked(getInvoice);

function renderWithRoute(ui: ReactElement, { route = '/invoices/inv-1' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/invoices/:id" element={ui} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockInvoiceDetail = {
  invoice: {
    id: 'inv-1',
    submittedBy: 'user-1',
    category: 'VENDOR_PAYMENT' as const,
    status: 'PENDING_REVIEW' as const,
    notes: 'Monthly payment',
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
    extractedData: {
      id: 'ed-1',
      invoiceId: 'inv-1',
      vendorName: 'Acme Corp',
      invoiceNumber: 'INV-2025-001',
      invoiceDate: '2025-06-01T00:00:00.000Z',
      dueDate: '2025-07-01T00:00:00.000Z',
      subtotal: '12000.00',
      tax: '2160.00',
      grandTotal: '14160.00',
      paymentTerms: 'Net 30',
      bankDetails: 'HDFC Bank\nAccount: 12345',
      rawText: null,
      confidenceScores: { vendorName: 0.95, grandTotal: 0.98 },
      createdAt: '2025-06-15T10:01:00.000Z',
      updatedAt: '2025-06-15T10:01:00.000Z',
      lineItems: [
        { id: 'li-1', extractedDataId: 'ed-1', description: 'Consulting Services', quantity: '10', unitPrice: '1200.00', total: '12000.00' },
      ],
    },
    actions: [
      {
        id: 'act-1',
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

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    mockGetInvoice.mockReturnValue(new Promise(() => {}));
    renderWithRoute(<InvoiceDetailPage />);

    // Spinner is present (animate-spin svg)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when invoice not found', async () => {
    mockGetInvoice.mockRejectedValue(new Error('Not found'));
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice not found')).toBeInTheDocument();
    });
  });

  it('renders invoice header with vendor name and status', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
    expect(screen.getByText('acme-invoice.pdf')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('renders invoice meta information', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Payment')).toBeInTheDocument();
    });
    expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
    expect(screen.getByText('Net 30')).toBeInTheDocument();
    expect(screen.getByText('Monthly payment')).toBeInTheDocument();
  });

  it('renders financial summary with amounts', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    });
    // Subtotal appears in both financial summary and line items table
    expect(screen.getAllByText(/12,000\.00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2,160\.00/)).toBeInTheDocument();
    expect(screen.getByText(/14,160\.00/)).toBeInTheDocument();
  });

  it('renders line items table', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Line Items')).toBeInTheDocument();
    });
    expect(screen.getByText('Consulting Services')).toBeInTheDocument();
  });

  it('renders bank details section', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Bank Details')).toBeInTheDocument();
    });
  });

  it('renders activity timeline with actions', async () => {
    mockGetInvoice.mockResolvedValue(mockInvoiceDetail);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    });
    expect(screen.getByRole('list', { name: 'Activity timeline' })).toBeInTheDocument();
    expect(screen.getByText('employee1')).toBeInTheDocument();
  });

  it('shows duplicate warning when invoice is duplicate', async () => {
    const duplicateInvoice = {
      invoice: { ...mockInvoiceDetail.invoice, isDuplicate: true, duplicateOf: 'inv-other' },
    };
    mockGetInvoice.mockResolvedValue(duplicateInvoice);
    renderWithRoute(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Possible duplicate detected')).toBeInTheDocument();
    });
  });
});
