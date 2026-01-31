import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Send,
  Eye,
  Pencil,
  Loader2,
  AlertTriangle,
  Calendar,
  Hash,
  Building2,
  CreditCard,
  Receipt,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getInvoice } from '../api/invoices';
import type { InvoiceStatus, InvoiceActionType, ExtractionStatus } from '../types';

// --- Status config ---
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; icon: React.ReactNode; classes: string }> = {
  PENDING_REVIEW: {
    label: 'Pending Review',
    icon: <Clock className="h-4 w-4" />,
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  APPROVED: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-4 w-4" />,
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle className="h-4 w-4" />,
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  PAID: {
    label: 'Paid',
    icon: <Banknote className="h-4 w-4" />,
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
};

const EXTRACTION_STATUS: Record<ExtractionStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Pending', classes: 'text-slate dark:text-ash' },
  PROCESSING: { label: 'Processing...', classes: 'text-brand-hover dark:text-brand' },
  COMPLETED: { label: 'Completed', classes: 'text-success dark:text-success-dark' },
  FAILED: { label: 'Failed', classes: 'text-error dark:text-error-dark' },
};

const CATEGORY_LABELS: Record<string, string> = {
  VENDOR_PAYMENT: 'Vendor Payment',
  REIMBURSEMENT: 'Reimbursement',
};

const ACTION_CONFIG: Record<InvoiceActionType, { label: string; icon: React.ReactNode; color: string }> = {
  SUBMITTED: { label: 'Submitted', icon: <Send className="h-4 w-4" />, color: 'text-brand-hover dark:text-brand' },
  VIEWED: { label: 'Viewed', icon: <Eye className="h-4 w-4" />, color: 'text-slate dark:text-ash' },
  EDITED: { label: 'Edited', icon: <Pencil className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400' },
  APPROVED: { label: 'Approved', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-success dark:text-success-dark' },
  REJECTED: { label: 'Rejected', icon: <XCircle className="h-4 w-4" />, color: 'text-error dark:text-error-dark' },
  MARKED_PAID: { label: 'Marked as Paid', icon: <Banknote className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatAmount(amount: string | null): string {
    if (!amount) return '--';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  // Error
  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-error dark:text-error-dark mb-3" />
            <p className="font-semibold text-ink dark:text-cloud">Invoice not found</p>
            <p className="text-sm text-slate dark:text-ash mt-1">
              The invoice may have been deleted or you don't have access.
            </p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const invoice = data.invoice;
  const status = STATUS_CONFIG[invoice.status];
  const extraction = EXTRACTION_STATUS[invoice.extractionStatus];
  const ed = invoice.extractedData;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate dark:text-ash hover:text-ink dark:hover:text-cloud transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-brand-hover dark:text-brand" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-ink dark:text-cloud truncate">
                {ed?.vendorName || invoice.originalFilename}
              </h1>
              {ed?.vendorName && (
                <p className="text-sm text-slate dark:text-ash truncate">{invoice.originalFilename}</p>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${status.classes}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>
      </div>

      {/* Duplicate warning */}
      {invoice.isDuplicate && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 text-yellow-800 dark:text-yellow-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Possible duplicate detected</span>
        </div>
      )}

      {/* Invoice meta */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetaItem label="Category" value={CATEGORY_LABELS[invoice.category] || invoice.category} />
          <MetaItem label="Submitted" value={formatDate(invoice.createdAt)} />
          <MetaItem label="Extraction" value={extraction.label} valueClassName={extraction.classes} />
          {ed?.invoiceNumber && <MetaItem label="Invoice #" value={ed.invoiceNumber} />}
          {ed?.invoiceDate && <MetaItem label="Invoice Date" value={formatDate(ed.invoiceDate)} />}
          {ed?.dueDate && <MetaItem label="Due Date" value={formatDate(ed.dueDate)} />}
          {ed?.paymentTerms && <MetaItem label="Payment Terms" value={ed.paymentTerms} />}
          {invoice.notes && <MetaItem label="Notes" value={invoice.notes} className="col-span-2 sm:col-span-3" />}
        </div>
      </Card>

      {/* Extracted financial data */}
      {ed && (ed.subtotal || ed.tax || ed.grandTotal) && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-brand" />
            Financial Summary
          </h2>
          <div className="space-y-2">
            {ed.subtotal && (
              <div className="flex justify-between text-sm">
                <span className="text-slate dark:text-ash">Subtotal</span>
                <span className="font-medium text-ink dark:text-cloud">{formatAmount(ed.subtotal)}</span>
              </div>
            )}
            {ed.tax && (
              <div className="flex justify-between text-sm">
                <span className="text-slate dark:text-ash">Tax</span>
                <span className="font-medium text-ink dark:text-cloud">{formatAmount(ed.tax)}</span>
              </div>
            )}
            {(ed.subtotal || ed.tax) && ed.grandTotal && (
              <div className="border-t border-border-light dark:border-border-dark pt-2" />
            )}
            {ed.grandTotal && (
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-ink dark:text-cloud">Grand Total</span>
                <span className="text-lg font-bold text-ink dark:text-cloud">{formatAmount(ed.grandTotal)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Line items */}
      {ed && ed.lineItems.length > 0 && (
        <Card padding={false} className="mb-4">
          <div className="p-4 pb-0 sm:p-6 sm:pb-0">
            <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand" />
              Line Items
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-surface-hover/50 dark:bg-charcoal-hover/50">
                  <th className="text-left px-4 sm:px-6 py-2.5 font-medium text-slate dark:text-ash">Description</th>
                  <th className="text-right px-4 sm:px-6 py-2.5 font-medium text-slate dark:text-ash">Qty</th>
                  <th className="text-right px-4 sm:px-6 py-2.5 font-medium text-slate dark:text-ash">Unit Price</th>
                  <th className="text-right px-4 sm:px-6 py-2.5 font-medium text-slate dark:text-ash">Total</th>
                </tr>
              </thead>
              <tbody>
                {ed.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border-light dark:border-border-dark last:border-0">
                    <td className="px-4 sm:px-6 py-3 text-ink dark:text-cloud">{item.description || '--'}</td>
                    <td className="px-4 sm:px-6 py-3 text-right text-ink dark:text-cloud">{item.quantity || '--'}</td>
                    <td className="px-4 sm:px-6 py-3 text-right text-ink dark:text-cloud">{formatAmount(item.unitPrice)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-medium text-ink dark:text-cloud">{formatAmount(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bank details */}
      {ed?.bankDetails && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand" />
            Bank Details
          </h2>
          <p className="text-sm text-slate dark:text-ash whitespace-pre-line">{ed.bankDetails}</p>
        </Card>
      )}

      {/* Activity timeline — "Bus Route" style */}
      {invoice.actions.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            Activity Timeline
          </h2>
          <div className="relative" role="list" aria-label="Activity timeline">
            {/* Vertical dotted line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px border-l-2 border-dashed border-border-light dark:border-border-dark" />

            <div className="space-y-4">
              {[...invoice.actions].reverse().map((action, index) => {
                const config = ACTION_CONFIG[action.action];
                return (
                  <div key={action.id} className="relative flex gap-3.5 items-start" role="listitem">
                    {/* Node circle */}
                    <div
                      className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 bg-surface dark:bg-charcoal border-2 border-border-light dark:border-border-dark ${config.color}`}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm text-ink dark:text-cloud">
                        <span className="font-semibold">{action.user.username}</span>
                        {' '}
                        <span className={config.color}>{config.label.toLowerCase()}</span>
                        {' this invoice'}
                      </p>
                      {action.comment && (
                        <p className="text-sm text-slate dark:text-ash mt-0.5 italic">"{action.comment}"</p>
                      )}
                      <p className="text-xs text-slate dark:text-ash mt-0.5">{formatDateTime(action.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Extraction processing indicator */}
      {(invoice.extractionStatus === 'PENDING' || invoice.extractionStatus === 'PROCESSING') && (
        <Card>
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <div>
              <p className="font-medium text-ink dark:text-cloud">Extracting invoice data...</p>
              <p className="text-xs text-slate dark:text-ash">
                AI is processing the PDF. This page will update automatically.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MetaItem({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate dark:text-ash mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClassName || 'text-ink dark:text-cloud'}`}>{value}</p>
    </div>
  );
}
