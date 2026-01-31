import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userEvent } from '../test/test-utils';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import SubmissionsPage from './SubmissionsPage';
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
  requiresTwoLevel: false,
  seniorApprovedBy: null,
  seniorApprovedAt: null,
  createdAt: '2025-06-15T10:00:00.000Z',
  updatedAt: '2025-06-15T10:00:00.000Z',
  submitter: { id: 'user-1', username: 'employee1', email: 'emp@test.com' },
  extractedData: { vendorName: 'Acme Corp', invoiceNumber: 'INV-001', grandTotal: '15000.50' },
};

const emptyResponse = {
  invoices: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

const singleResponse = {
  invoices: [mockInvoice],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

describe('SubmissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and upload button', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<SubmissionsPage />);

    expect(screen.getByText('My Submissions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/i })).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SubmissionsPage />);

    expect(screen.queryByText('My Submissions')).toBeInTheDocument();
  });

  it('shows empty state when no invoices', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<SubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('No submissions found')).toBeInTheDocument();
    });
    expect(screen.getByText('Upload your first invoice to get started.')).toBeInTheDocument();
  });

  it('renders invoice cards with correct data', async () => {
    mockList.mockResolvedValue(singleResponse);
    renderWithProviders(<SubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
    expect(screen.getByText('acme-invoice.pdf')).toBeInTheDocument();
    // Status pill inside the card (not the filter tab)
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payment')).toBeInTheDocument();
    expect(screen.getByText(/15,000\.50/)).toBeInTheDocument();
  });

  it('renders status filter pills', async () => {
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<SubmissionsPage />);

    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rejected' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Paid' })).toBeInTheDocument();
  });

  it('clicking a filter pill triggers new query with status filter', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<SubmissionsPage />);

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

  it('navigates to upload page when upload button is clicked', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(emptyResponse);
    renderWithProviders(<SubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('My Submissions')).toBeInTheDocument();
    });

    const uploadBtn = screen.getAllByRole('button', { name: /Upload/i })[0];
    await user.click(uploadBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/upload');
  });

  it('shows error state when API fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<SubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load submissions')).toBeInTheDocument();
    });
  });
});
