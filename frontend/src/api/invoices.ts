import api from './axios';
import type {
  InvoiceCategory,
  InvoiceDetailResponse,
  InvoiceListParams,
  InvoiceListResponse,
  UploadInvoicesResponse,
  UpdateStatusRequest,
  UpdateStatusResponse,
  EditExtractedDataRequest,
  EditExtractedDataResponse,
  BulkActionRequest,
  BulkActionResponse,
} from '../types';

export async function uploadInvoices(
  files: File[],
  category: InvoiceCategory,
  notes?: string,
): Promise<UploadInvoicesResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('category', category);
  if (notes) {
    formData.append('notes', notes);
  }

  const { data } = await api.post<UploadInvoicesResponse>('/invoices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listInvoices(params?: InvoiceListParams): Promise<InvoiceListResponse> {
  const { data } = await api.get<InvoiceListResponse>('/invoices', { params });
  return data;
}

export async function getInvoice(id: string): Promise<InvoiceDetailResponse> {
  const { data } = await api.get<InvoiceDetailResponse>(`/invoices/${id}`);
  return data;
}

export async function updateInvoiceStatus(
  id: string,
  body: UpdateStatusRequest,
): Promise<UpdateStatusResponse> {
  const { data } = await api.patch<UpdateStatusResponse>(`/invoices/${id}/status`, body);
  return data;
}

export async function editExtractedData(
  id: string,
  body: EditExtractedDataRequest,
): Promise<EditExtractedDataResponse> {
  const { data } = await api.patch<EditExtractedDataResponse>(`/invoices/${id}/extracted-data`, body);
  return data;
}

export async function bulkAction(body: BulkActionRequest): Promise<BulkActionResponse> {
  const { data } = await api.post<BulkActionResponse>('/invoices/bulk-action', body);
  return data;
}

export function getExportCsvUrl(params?: InvoiceListParams): string {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return `/api/invoices/export/csv${query ? `?${query}` : ''}`;
}

export function getPdfUrl(id: string): string {
  return `/api/invoices/${id}/pdf`;
}
