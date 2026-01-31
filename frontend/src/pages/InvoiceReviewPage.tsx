import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Save,
  X,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getInvoice, updateInvoiceStatus, editExtractedData, getPdfUrl } from '../api/invoices';
import type { InvoiceStatus, InvoiceActionType, ExtractionStatus, ExtractedData } from '../types';
import toast from 'react-hot-toast';

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

// Confidence thresholds
function confidenceColor(score: number | undefined): string {
  if (score === undefined) return 'bg-zinc-300 dark:bg-zinc-600';
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
}

function confidenceLabel(score: number | undefined): string {
  if (score === undefined) return 'N/A';
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}

export default function InvoiceReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, comment }: { status: 'APPROVED' | 'REJECTED' | 'PAID'; comment?: string }) =>
      updateInvoiceStatus(id!, { status, comment }),
    onSuccess: (_, variables) => {
      toast.success(`Invoice ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      setShowRejectModal(false);
      setRejectComment('');
    },
    onError: () => {
      toast.error('Action failed. Please try again.');
    },
  });

  const editMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => editExtractedData(id!, fields),
    onSuccess: () => {
      toast.success('Invoice data updated');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => {
      toast.error('Failed to save changes');
    },
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
  const isPending = invoice.status === 'PENDING_REVIEW';
  const isApproved = invoice.status === 'APPROVED';
  const pdfUrl = getPdfUrl(invoice.id);

  return (
    <div>
      {/* Back button + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-1.5 text-sm text-slate dark:text-ash hover:text-ink dark:hover:text-cloud transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Invoices
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

      {/* Split layout: PDF + Review panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left: PDF Viewer */}
        <Card padding={false} className="overflow-hidden">
          <div className="p-3 border-b border-border-light dark:border-border-dark bg-zinc-50 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-ink dark:text-cloud flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand" />
              PDF Preview
            </h2>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-950">
            <iframe
              src={pdfUrl}
              title="Invoice PDF"
              className="w-full h-[600px] border-0"
            />
          </div>
        </Card>

        {/* Right: Review panel with extracted data */}
        <div className="space-y-4">
          {/* Invoice meta */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink dark:text-cloud flex items-center gap-2">
                <Hash className="h-4 w-4 text-brand" />
                Invoice Details
              </h2>
              {ed && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditing && ed ? (
              <EditForm
                extractedData={ed}
                onSave={(fields) => editMutation.mutate(fields)}
                onCancel={() => setIsEditing(false)}
                saving={editMutation.isPending}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MetaField label="Category" value={CATEGORY_LABELS[invoice.category] || invoice.category} />
                <MetaField label="Submitted by" value={invoice.submitter.username} />
                <MetaField label="Submitted" value={formatDate(invoice.createdAt)} />
                <MetaField
                  label="Extraction"
                  value={extraction.label}
                  valueClassName={extraction.classes}
                />
                {ed?.invoiceNumber && (
                  <MetaField
                    label="Invoice #"
                    value={ed.invoiceNumber}
                    confidence={ed.confidenceScores?.invoiceNumber}
                  />
                )}
                {ed?.invoiceDate && (
                  <MetaField
                    label="Invoice Date"
                    value={formatDate(ed.invoiceDate)}
                    confidence={ed.confidenceScores?.invoiceDate}
                  />
                )}
                {ed?.dueDate && (
                  <MetaField
                    label="Due Date"
                    value={formatDate(ed.dueDate)}
                    confidence={ed.confidenceScores?.dueDate}
                  />
                )}
                {ed?.paymentTerms && (
                  <MetaField
                    label="Payment Terms"
                    value={ed.paymentTerms}
                    confidence={ed.confidenceScores?.paymentTerms}
                  />
                )}
                {ed?.vendorName && (
                  <MetaField
                    label="Vendor"
                    value={ed.vendorName}
                    confidence={ed.confidenceScores?.vendorName}
                  />
                )}
                {invoice.notes && (
                  <MetaField label="Notes" value={invoice.notes} className="col-span-2" />
                )}
              </div>
            )}
          </Card>

          {/* Financial Summary */}
          {ed && (ed.subtotal || ed.tax || ed.grandTotal) && (
            <Card>
              <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand" />
                Financial Summary
              </h2>
              <div className="space-y-2">
                {ed.subtotal && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate dark:text-ash flex items-center gap-2">
                      Subtotal
                      <ConfidenceDot score={ed.confidenceScores?.subtotal} />
                    </span>
                    <span className="font-medium text-ink dark:text-cloud">{formatAmount(ed.subtotal)}</span>
                  </div>
                )}
                {ed.tax && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate dark:text-ash flex items-center gap-2">
                      Tax
                      <ConfidenceDot score={ed.confidenceScores?.tax} />
                    </span>
                    <span className="font-medium text-ink dark:text-cloud">{formatAmount(ed.tax)}</span>
                  </div>
                )}
                {(ed.subtotal || ed.tax) && ed.grandTotal && (
                  <div className="border-t border-border-light dark:border-border-dark pt-2" />
                )}
                {ed.grandTotal && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-ink dark:text-cloud flex items-center gap-2">
                      Grand Total
                      <ConfidenceDot score={ed.confidenceScores?.grandTotal} />
                    </span>
                    <span className="text-lg font-bold text-ink dark:text-cloud">{formatAmount(ed.grandTotal)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Line items */}
          {ed && ed.lineItems.length > 0 && (
            <Card padding={false}>
              <div className="p-4 pb-0">
                <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand" />
                  Line Items
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark bg-surface-hover/50 dark:bg-charcoal-hover/50">
                      <th className="text-left px-4 py-2.5 font-medium text-slate dark:text-ash">Description</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate dark:text-ash">Qty</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate dark:text-ash">Unit Price</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate dark:text-ash">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ed.lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-border-light dark:border-border-dark last:border-0">
                        <td className="px-4 py-3 text-ink dark:text-cloud">{item.description || '--'}</td>
                        <td className="px-4 py-3 text-right text-ink dark:text-cloud">{item.quantity || '--'}</td>
                        <td className="px-4 py-3 text-right text-ink dark:text-cloud">{formatAmount(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium text-ink dark:text-cloud">{formatAmount(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Bank details */}
          {ed?.bankDetails && (
            <Card>
              <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" />
                Bank Details
              </h2>
              <p className="text-sm text-slate dark:text-ash whitespace-pre-line">{ed.bankDetails}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Activity timeline */}
      {invoice.actions.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-cloud mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            Activity Timeline
          </h2>
          <div className="relative" role="list" aria-label="Activity timeline">
            <div className="absolute left-[15px] top-2 bottom-2 w-px border-l-2 border-dashed border-border-light dark:border-border-dark" />
            <div className="space-y-4">
              {[...invoice.actions].reverse().map((action) => {
                const config = ACTION_CONFIG[action.action];
                return (
                  <div key={action.id} className="relative flex gap-3.5 items-start" role="listitem">
                    <div
                      className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 bg-surface dark:bg-charcoal border-2 border-border-light dark:border-border-dark ${config.color}`}
                    >
                      {config.icon}
                    </div>
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
        <Card className="mb-4">
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

      {/* Action bar */}
      {(isPending || isApproved) && (
        <div className="sticky bottom-0 bg-surface/90 dark:bg-charcoal/90 backdrop-blur-md border-t border-border-light dark:border-border-dark -mx-4 sm:-mx-6 px-4 sm:px-6 py-4" role="toolbar" aria-label="Invoice actions">
          <div className="flex items-center justify-end gap-3">
            {isPending && (
              <>
                <Button
                  variant="danger"
                  size="md"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => setShowRejectModal(true)}
                  loading={statusMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => statusMutation.mutate({ status: 'APPROVED' })}
                  loading={statusMutation.isPending}
                >
                  Approve
                </Button>
              </>
            )}
            {isApproved && (
              <Button
                variant="primary"
                size="md"
                icon={<Banknote className="h-4 w-4" />}
                onClick={() => statusMutation.mutate({ status: 'PAID' })}
                loading={statusMutation.isPending}
              >
                Mark as Paid
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-ink dark:text-cloud mb-3">Reject Invoice</h3>
            <p className="text-sm text-slate dark:text-ash mb-3">
              Please provide a reason for rejection.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-ink dark:text-cloud placeholder:text-slate/50 dark:placeholder:text-ash/50 focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={!rejectComment.trim()}
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ status: 'REJECTED', comment: rejectComment.trim() })
                }
              >
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function ConfidenceDot({ score }: { score: number | undefined }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${confidenceColor(score)}`}
      title={`Confidence: ${confidenceLabel(score)}${score !== undefined ? ` (${Math.round(score * 100)}%)` : ''}`}
    />
  );
}

function MetaField({
  label,
  value,
  valueClassName,
  className,
  confidence,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
  confidence?: number;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate dark:text-ash mb-0.5">{label}</p>
      <p className={`text-sm font-medium flex items-center gap-1.5 ${valueClassName || 'text-ink dark:text-cloud'}`}>
        {value}
        {confidence !== undefined && <ConfidenceDot score={confidence} />}
      </p>
    </div>
  );
}

function EditForm({
  extractedData,
  onSave,
  onCancel,
  saving,
}: {
  extractedData: ExtractedData;
  onSave: (fields: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [vendorName, setVendorName] = useState(extractedData.vendorName || '');
  const [invoiceNumber, setInvoiceNumber] = useState(extractedData.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(extractedData.invoiceDate?.split('T')[0] || '');
  const [dueDate, setDueDate] = useState(extractedData.dueDate?.split('T')[0] || '');
  const [subtotal, setSubtotal] = useState(extractedData.subtotal || '');
  const [tax, setTax] = useState(extractedData.tax || '');
  const [grandTotal, setGrandTotal] = useState(extractedData.grandTotal || '');
  const [paymentTerms, setPaymentTerms] = useState(extractedData.paymentTerms || '');
  const [bankDetails, setBankDetails] = useState(extractedData.bankDetails || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      vendorName: vendorName || null,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate || null,
      dueDate: dueDate || null,
      subtotal: subtotal ? parseFloat(subtotal) : null,
      tax: tax ? parseFloat(tax) : null,
      grandTotal: grandTotal ? parseFloat(grandTotal) : null,
      paymentTerms: paymentTerms || null,
      bankDetails: bankDetails || null,
    });
  }

  const inputCls =
    'w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-cloud placeholder:text-slate/50 dark:placeholder:text-ash/50 focus:outline-none focus:ring-2 focus:ring-brand/50';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Vendor Name</label>
          <input className={inputCls} value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Invoice #</label>
          <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Invoice Date</label>
          <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Due Date</label>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Subtotal</label>
          <input type="number" step="0.01" className={inputCls} value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Tax</label>
          <input type="number" step="0.01" className={inputCls} value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Grand Total</label>
          <input type="number" step="0.01" className={inputCls} value={grandTotal} onChange={(e) => setGrandTotal(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate dark:text-ash mb-1 block">Payment Terms</label>
          <input className={inputCls} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate dark:text-ash mb-1 block">Bank Details</label>
        <textarea rows={2} className={`${inputCls} resize-none`} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
