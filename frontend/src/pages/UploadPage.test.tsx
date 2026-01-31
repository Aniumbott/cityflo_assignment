import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, userEvent } from '../test/test-utils';
import UploadPage from './UploadPage';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the upload API
vi.mock('../api/invoices', () => ({
  uploadInvoices: vi.fn(),
}));

import { uploadInvoices } from '../api/invoices';
const mockUpload = vi.mocked(uploadInvoices);

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function createPdfFile(name = 'invoice.pdf', size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type: 'application/pdf' });
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload page with all elements', () => {
    render(<UploadPage />);

    expect(screen.getByText('Upload Invoice')).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop PDF files here/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/i })).toBeInTheDocument();
  });

  it('has the submit button disabled when no files and no category', () => {
    render(<UploadPage />);

    const submitBtn = screen.getByRole('button', { name: /Upload/i });
    expect(submitBtn).toBeDisabled();
  });

  it('allows selecting a category', async () => {
    const user = userEvent.setup();
    render(<UploadPage />);

    const select = screen.getByLabelText(/Category/);
    await user.selectOptions(select, 'VENDOR_PAYMENT');
    expect(select).toHaveValue('VENDOR_PAYMENT');

    await user.selectOptions(select, 'REIMBURSEMENT');
    expect(select).toHaveValue('REIMBURSEMENT');
  });

  it('allows typing notes', async () => {
    const user = userEvent.setup();
    render(<UploadPage />);

    const textarea = screen.getByLabelText(/Notes/);
    await user.type(textarea, 'Monthly vendor invoice');
    expect(textarea).toHaveValue('Monthly vendor invoice');
  });

  it('shows added files and allows removal', async () => {
    const user = userEvent.setup();
    render(<UploadPage />);

    const input = screen.getByTestId('file-input');
    const file = createPdfFile('test-invoice.pdf');

    await user.upload(input, file);

    expect(screen.getByText('test-invoice.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 file selected')).toBeInTheDocument();

    // Remove the file
    const removeBtn = screen.getByLabelText(/Remove test-invoice.pdf/);
    await user.click(removeBtn);

    expect(screen.queryByText('test-invoice.pdf')).not.toBeInTheDocument();
  });

  it('submits the form and navigates on success', async () => {
    const user = userEvent.setup();
    mockUpload.mockResolvedValueOnce({
      invoices: [{ id: '1', submittedBy: 'u1', category: 'VENDOR_PAYMENT', status: 'PENDING_REVIEW', notes: null, filePath: 'f.pdf', originalFilename: 'test.pdf', extractionStatus: 'PENDING', isDuplicate: false, duplicateOf: null, requiresTwoLevel: false, seniorApprovedBy: null, seniorApprovedAt: null, createdAt: '', updatedAt: '' }],
    });

    render(<UploadPage />);

    // Add a file
    const input = screen.getByTestId('file-input');
    await user.upload(input, createPdfFile());

    // Select category
    await user.selectOptions(screen.getByLabelText(/Category/), 'VENDOR_PAYMENT');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Upload/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/submissions');
    });
  });

  it('shows error state when upload fails', async () => {
    const user = userEvent.setup();
    mockUpload.mockRejectedValueOnce({
      response: { data: { error: 'At least one PDF file is required' } },
    });

    render(<UploadPage />);

    // Add a file and select category
    await user.upload(screen.getByTestId('file-input'), createPdfFile());
    await user.selectOptions(screen.getByLabelText(/Category/), 'REIMBURSEMENT');

    await user.click(screen.getByRole('button', { name: /Upload/i }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledOnce();
    });
  });
});
