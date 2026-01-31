import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Inbox,
  Upload,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { listInvoices } from '../api/invoices';
import type { InvoiceStatus, InvoiceListItem } from '../types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; icon: React.ReactNode; classes: string }> = {
  PENDING_REVIEW: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5" />,
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  PENDING_SENIOR_APPROVAL: {
    label: 'Pending Senior',
    icon: <Clock className="h-3.5 w-3.5" />,
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  PENDING_FINAL_APPROVAL: {
    label: 'Pending Final',
    icon: <Clock className="h-3.5 w-3.5" />,
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  APPROVED: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle className="h-3.5 w-3.5" />,
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  PAID: {
    label: 'Paid',
    icon: <Banknote className="h-3.5 w-3.5" />,
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  VENDOR_PAYMENT: 'Vendor Payment',
  REIMBURSEMENT: 'Reimbursement',
};

type StatusFilter = 'ALL' | InvoiceStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'PENDING_SENIOR_APPROVAL', label: 'Pending Senior' },
  { value: 'PENDING_FINAL_APPROVAL', label: 'Pending Final' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAID', label: 'Paid' },
];

export default function SubmissionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['submissions', page, statusFilter, search],
    queryFn: () =>
      listInvoices({
        page,
        limit: 10,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-cloud">My Submissions</h1>
          <p className="mt-1 text-sm text-slate dark:text-ash">
            Track your uploaded invoices and their processing status.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Upload className="h-4 w-4" />}
          onClick={() => navigate('/upload')}
        >
          Upload
        </Button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate dark:text-ash" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by filename, vendor, or invoice number..."
            className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-ink dark:text-cloud placeholder:text-slate/50 dark:placeholder:text-ash/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
          />
        </div>
      </form>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" role="tablist">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            role="tab"
            aria-selected={statusFilter === filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? 'bg-ink text-white dark:bg-cloud dark:text-black'
                : 'bg-white dark:bg-zinc-800 text-slate dark:text-ash hover:text-ink dark:hover:text-cloud border border-border-light dark:border-border-dark'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : isError ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-error dark:text-error-dark font-medium">Failed to load submissions</p>
            <p className="text-sm text-slate dark:text-ash mt-1">Please try again later.</p>
          </div>
        </Card>
      ) : data && data.invoices.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-slate/30 dark:text-ash/30 mb-3" />
            <p className="font-semibold text-ink dark:text-cloud">No submissions found</p>
            <p className="text-sm text-slate dark:text-ash mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search query.'
                : 'Upload your first invoice to get started.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                icon={<Upload className="h-4 w-4" />}
                onClick={() => navigate('/upload')}
              >
                Upload Invoice
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Invoice cards */}
          <div className="space-y-3">
            {data!.invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} formatDate={formatDate} formatAmount={formatAmount} />
            ))}
          </div>

          {/* Pagination */}
          {data!.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate dark:text-ash">
                Page {data!.pagination.page} of {data!.pagination.totalPages}
                <span className="ml-1 hidden sm:inline">({data!.pagination.total} total)</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data!.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InvoiceCard({
  invoice,
  formatDate,
  formatAmount,
}: {
  invoice: InvoiceListItem;
  formatDate: (d: string) => string;
  formatAmount: (a: string | null) => string;
}) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[invoice.status];
  const vendorName = invoice.extractedData?.vendorName;
  const grandTotal = invoice.extractedData?.grandTotal ?? null;

  return (
    <Card
      padding={false}
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/invoices/${invoice.id}`)}
      role="article"
    >
      <div className="p-4 sm:p-5">
        {/* Top row: filename + status pill */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center shrink-0">
              <FileText className="h-4.5 w-4.5 text-brand-hover dark:text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-cloud truncate">
                {vendorName || invoice.originalFilename}
              </p>
              {vendorName && (
                <p className="text-xs text-slate dark:text-ash truncate">{invoice.originalFilename}</p>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${status.classes}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Bottom row: meta data */}
        <div className="flex items-center gap-4 text-xs text-slate dark:text-ash">
          <span>{CATEGORY_LABELS[invoice.category] || invoice.category}</span>
          <span className="w-px h-3 bg-border-light dark:bg-border-dark" />
          <span>{formatDate(invoice.createdAt)}</span>
          {grandTotal && (
            <>
              <span className="w-px h-3 bg-border-light dark:bg-border-dark" />
              <span className="font-semibold text-ink dark:text-cloud">{formatAmount(grandTotal)}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
