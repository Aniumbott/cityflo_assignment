import api from './axios';
import type { InvoiceCategory, InvoiceDetailResponse, InvoiceListParams, InvoiceListResponse, UploadInvoicesResponse } from '../types';

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
