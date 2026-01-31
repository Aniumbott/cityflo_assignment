import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Inbox,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { listInvoices, bulkAction, getExportCsvUrl } from '../api/invoices';
import type { InvoiceStatus, InvoiceListItem, InvoiceCategory } from '../types';
import toast from 'react-hot-toast';

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

const CATEGORY_LABELS: Record<InvoiceCategory, string> = {
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

const CATEGORY_FILTERS: { value: '' | InvoiceCategory; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
];

type SortField = 'createdAt' | 'grandTotal' | 'vendorName';

export default function AllInvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'' | InvoiceCategory>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryParams = useMemo(() => ({
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    category: categoryFilter || undefined,
    search: search || undefined,
    sortBy: sortBy === 'grandTotal' ? 'grandTotal' : sortBy === 'vendorName' ? 'vendorName' : 'createdAt',
    sortOrder,
  }), [page, statusFilter, categoryFilter, search, sortBy, sortOrder]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['allInvoices', queryParams],
    queryFn: () => listInvoices(queryParams),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkAction,
    onSuccess: (result, variables) => {
      toast.success(`${result.updated} invoice(s) ${variables.action.toLowerCase()}`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
    },
    onError: () => {
      toast.error('Bulk action failed. Please try again.');
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleCategoryChange(cat: '' | InvoiceCategory) {
    setCategoryFilter(cat);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  }

  function toggleSelectAll() {
    if (!data) return;
    const pendingIds = data.invoices
      .filter((inv) => inv.status === 'PENDING_REVIEW')
      .map((inv) => inv.id);
    if (pendingIds.length === 0) return;

    const allSelected = pendingIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ invoiceIds: Array.from(selectedIds), action: 'APPROVED' });
  }

  function handleBulkReject() {
    if (selectedIds.size === 0) return;
    const comment = prompt('Reason for rejection:');
    if (!comment) return;
    bulkMutation.mutate({ invoiceIds: Array.from(selectedIds), action: 'REJECTED', comment });
  }

  function handleExportCsv() {
    const url = getExportCsvUrl(queryParams);
    const token = localStorage.getItem('accessToken');
    // Open in new window with auth header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'invoices-export.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error('Export failed'));
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

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  // Computed
  const pendingOnPage = data?.invoices.filter((inv) => inv.status === 'PENDING_REVIEW') ?? [];
  const allPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every((inv) => selectedIds.has(inv.id));
  const somePendingSelected = pendingOnPage.some((inv) => selectedIds.has(inv.id));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-cloud">All Invoices</h1>
          <p className="mt-1 text-sm text-slate dark:text-ash">
            Review, approve, and manage submitted invoices.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          icon={<Download className="h-4 w-4" />}
          onClick={handleExportCsv}
        >
          Export CSV
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

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
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

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value as '' | InvoiceCategory)}
          className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-ink dark:text-cloud focus:outline-none focus:ring-2 focus:ring-brand/50"
          aria-label="Filter by category"
        >
          {CATEGORY_FILTERS.map((cf) => (
            <option key={cf.value} value={cf.value}>{cf.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : isError ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-error dark:text-error-dark font-medium">Failed to load invoices</p>
            <p className="text-sm text-slate dark:text-ash mt-1">Please try again later.</p>
          </div>
        </Card>
      ) : data && data.invoices.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-slate/30 dark:text-ash/30 mb-3" />
            <p className="font-semibold text-ink dark:text-cloud">No invoices found</p>
            <p className="text-sm text-slate dark:text-ash mt-1">
              Try adjusting your filters or search query.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Data table */}
          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-border-light dark:border-border-dark">
                    <th className="w-10 px-4 py-3">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate dark:text-ash hover:text-ink dark:hover:text-cloud"
                        aria-label="Select all pending"
                      >
                        {allPendingSelected && pendingOnPage.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-brand" />
                        ) : somePendingSelected ? (
                          <MinusSquare className="h-4 w-4 text-brand" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate dark:text-ash">
                      <button
                        className="flex items-center gap-1 hover:text-ink dark:hover:text-cloud transition-colors"
                        onClick={() => handleSort('vendorName')}
                      >
                        Vendor / File
                        <SortIcon field="vendorName" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate dark:text-ash">Submitter</th>
                    <th className="text-left px-4 py-3 font-medium text-slate dark:text-ash">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-slate dark:text-ash">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate dark:text-ash">
                      <button
                        className="flex items-center gap-1 ml-auto hover:text-ink dark:hover:text-cloud transition-colors"
                        onClick={() => handleSort('grandTotal')}
                      >
                        Amount
                        <SortIcon field="grandTotal" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate dark:text-ash">
                      <button
                        className="flex items-center gap-1 ml-auto hover:text-ink dark:hover:text-cloud transition-colors"
                        onClick={() => handleSort('createdAt')}
                      >
                        Date
                        <SortIcon field="createdAt" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data!.invoices.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      selected={selectedIds.has(invoice.id)}
                      onToggle={() => toggleSelect(invoice.id)}
                      onNavigate={() => navigate(`/invoices/${invoice.id}`)}
                      formatDate={formatDate}
                      formatAmount={formatAmount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

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

      {/* Bulk action floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-ink dark:bg-zinc-800 text-white px-6 py-3 rounded-2xl shadow-xl border border-border-dark" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5 bg-white/20" />
          <Button
            variant="primary"
            size="sm"
            onClick={handleBulkApprove}
            loading={bulkMutation.isPending}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleBulkReject}
            loading={bulkMutation.isPending}
            icon={<XCircle className="h-3.5 w-3.5" />}
          >
            Reject
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-white/60 hover:text-white ml-1"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  selected,
  onToggle,
  onNavigate,
  formatDate,
  formatAmount,
}: {
  invoice: InvoiceListItem;
  selected: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  formatDate: (d: string) => string;
  formatAmount: (a: string | null) => string;
}) {
  const status = STATUS_CONFIG[invoice.status];
  const vendorName = invoice.extractedData?.vendorName;
  const grandTotal = invoice.extractedData?.grandTotal ?? null;
  const isPending = invoice.status === 'PENDING_REVIEW';

  return (
    <tr
      className="border-b border-border-light dark:border-border-dark last:border-0 hover:bg-yellow-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      onClick={onNavigate}
      role="row"
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {isPending ? (
          <button onClick={onToggle} className="text-slate dark:text-ash hover:text-ink dark:hover:text-cloud" aria-label={`Select ${vendorName || invoice.originalFilename}`}>
            {selected ? (
              <CheckSquare className="h-4 w-4 text-brand" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 block" />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-ink dark:text-cloud truncate max-w-[200px]">
            {vendorName || invoice.originalFilename}
          </p>
          {vendorName && (
            <p className="text-xs text-slate dark:text-ash truncate max-w-[200px]">{invoice.originalFilename}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-slate dark:text-ash">{invoice.submitter.username}</td>
      <td className="px-4 py-3 text-slate dark:text-ash text-xs">
        {CATEGORY_LABELS[invoice.category] || invoice.category}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${status.classes}`}>
          {status.icon}
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium text-ink dark:text-cloud whitespace-nowrap">
        {formatAmount(grandTotal)}
      </td>
      <td className="px-4 py-3 text-right text-slate dark:text-ash whitespace-nowrap">
        {formatDate(invoice.createdAt)}
      </td>
    </tr>
  );
}
