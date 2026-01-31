import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userEvent } from '../test/test-utils';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import AllInvoicesPage from './AllInvoicesPage';
import type { ReactElement } from 'react';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the invoices API
vi.mock('../api/invoices', () => ({
  listInvoices: vi.fn(),
  bulkAction: vi.fn(),
  getExportCsvUrl: vi.fn(() => '/api/invoices/export/csv'),
}));

import { listInvoices } from '../api/invoices';
const mockList = vi.mocked(listInvoices);

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
        <BrowserRouter>{ui}</BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockInvoice = {
  id: 'inv-1',
  submittedBy: 'user-1',
  category: 'VENDOR_PAYMENT' as const,
  status: 'PENDING_REVIEW' as const,
  notes: null,
  filePath: 'file.pdf',
  originalFilename: 'acme-invoice.pdf',
  extractionStatus: 'COMPLETED' as const,
  isDuplicate: false,
  duplicateOf: null,
  createdAt: '2025-06-15T10:00:00.000Z',
  updatedAt: '2025-06-15T10:00:00.000Z',
  submitter: { id: 'user-1', username: 'employee1', email: 'emp@test.com' },
  extractedData: { vendorName: 'Acme Corp', invoiceNumber: 'INV-001', grandTotal: '15000.50' },
};

const emptyResponse = {
  invoices: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const singleResponse = {
  invoices: [mockInvoice],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('AllInvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and export button', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<AllInvoicesPage />);

    expect(screen.getByText('All Invoices')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('shows empty state when no invoices', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('No invoices found')).toBeInTheDocument();
    });
  });

  it('renders invoice data in table rows', async () => {
    mockList.mockResolvedValue(singleResponse);
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('employee1')).toBeInTheDocument();
    // "Vendor Payment" appears in both the dropdown and table cell
    expect(screen.getAllByText('Vendor Payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15,000\.50/).length).toBeGreaterThan(0);
  });

  it('renders status filter pills', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<AllInvoicesPage />);

    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rejected' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Paid' })).toBeInTheDocument();
  });

  it('clicking a filter pill triggers new query with status filter', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    const approvedTab = screen.getByRole('tab', { name: 'Approved' });
    await user.click(approvedTab);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED', page: 1 }),
      );
    });
  });

  it('navigates to invoice when row is clicked', async () => {
    mockList.mockResolvedValue(singleResponse);
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Click on any text in the row (rows have onClick)
    const rows = screen.getAllByRole('row');
    const dataRow = rows.find(row => row.textContent?.includes('Acme Corp'));

    if (dataRow) {
      const user = userEvent.setup();
      await user.click(dataRow);
      expect(mockNavigate).toHaveBeenCalledWith('/invoices/inv-1');
    }
  });

  it('shows error state when API fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
    });
  });

  it('has category filter dropdown', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<AllInvoicesPage />);

    const select = screen.getByLabelText('Filter by category');
    expect(select).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    mockList.mockResolvedValue(singleResponse);
    renderWithProviders(<AllInvoicesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Submitter')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
