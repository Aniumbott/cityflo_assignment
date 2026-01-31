import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsStats } from '../api/analytics';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Banknote,
  IndianRupee,
  Calendar,
  Filter,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import type { InvoiceCategory } from '../types';

// Cityflo color palette
const COLORS = {
  yellow: '#FFC72C', // Brand yellow
  green: '#2ECC71',
  red: '#E74C3C',
  blue: '#3498DB',
  purple: '#9B59B6',
  orange: '#E67E22',
  slate: '#64748b',
  emerald: '#10B981',
};

const STATUS_COLORS = {
  PENDING_REVIEW: COLORS.yellow,
  APPROVED: COLORS.green,
  REJECTED: COLORS.red,
  PAID: COLORS.emerald,
};

const CATEGORY_COLORS = {
  VENDOR_PAYMENT: COLORS.blue,
  REIMBURSEMENT: COLORS.purple,
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [categoryFilter, setCategoryFilter] = useState<InvoiceCategory | ''>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', dateRange.start, dateRange.end, categoryFilter],
    queryFn: () =>
      getAnalyticsStats({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        category: categoryFilter || undefined,
      }),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setCategoryFilter('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <p className="text-ink dark:text-cloud font-medium">Failed to load analytics</p>
          <p className="text-sm text-slate dark:text-ash mt-1">Please try again later</p>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const statusData = [
    { name: 'Pending', value: data.overview.pendingCount, color: STATUS_COLORS.PENDING_REVIEW },
    { name: 'Approved', value: data.overview.approvedCount, color: STATUS_COLORS.APPROVED },
    { name: 'Rejected', value: data.overview.rejectedCount, color: STATUS_COLORS.REJECTED },
    { name: 'Paid', value: data.overview.paidCount, color: STATUS_COLORS.PAID },
  ];

  const categoryData = data.categoryBreakdown.map((item) => ({
    name: item.category === 'VENDOR_PAYMENT' ? 'Vendor Payment' : 'Reimbursement',
    value: item.count,
    color: CATEGORY_COLORS[item.category],
  }));

  const timelineData = data.statusTimeline.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink dark:text-cloud">Analytics Dashboard</h1>
          <p className="text-slate dark:text-ash mt-1">Insights and trends for invoice processing</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-ink dark:text-cloud mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-ink dark:text-cloud focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-ink dark:text-cloud mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-ink dark:text-cloud focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-ink dark:text-cloud mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as InvoiceCategory | '')}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-ink dark:text-cloud focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              <option value="">All Categories</option>
              <option value="VENDOR_PAYMENT">Vendor Payment</option>
              <option value="REIMBURSEMENT">Reimbursement</option>
            </select>
          </div>
          {(dateRange.start || dateRange.end || categoryFilter) && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Total Invoices</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">{data.overview.totalInvoices}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Pending Review</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">{data.overview.pendingCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Approved</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">{data.overview.approvedCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Banknote className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Paid</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">{data.overview.paidCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Total Amount</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">
                {formatCurrency(data.overview.totalAmount)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Avg. Processing Time</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">
                {formatDuration(data.overview.avgProcessingTimeMs)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate dark:text-ash">Rejected</p>
              <p className="text-2xl font-bold text-ink dark:text-cloud">{data.overview.rejectedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1: Status Distribution & Submissions Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-ink dark:text-cloud mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Submissions Over Time Line Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-ink dark:text-cloud mb-4">Submissions Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="count" stroke={COLORS.yellow} strokeWidth={3} dot={{ fill: COLORS.yellow }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2: Category Breakdown & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie Chart */}
        {categoryData.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-ink dark:text-cloud mb-4">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Recent High-Value Invoices */}
        <Card>
          <h2 className="text-lg font-semibold text-ink dark:text-cloud mb-4">Recent Invoices</h2>
          <div className="space-y-3">
            {data.recentInvoices.length === 0 ? (
              <p className="text-center text-slate dark:text-ash py-8">No recent invoices</p>
            ) : (
              data.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-canvas dark:bg-zinc-900 border border-border-light dark:border-border-dark"
                >
                  <div className="flex-1">
                    <p className="font-medium text-ink dark:text-cloud text-sm">{invoice.vendor}</p>
                    <p className="text-xs text-slate dark:text-ash">{invoice.filename}</p>
                  </div>
                  <div className="text-right">
                    {invoice.amount !== null && (
                      <p className="font-semibold text-ink dark:text-cloud">{formatCurrency(invoice.amount)}</p>
                    )}
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : invoice.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : invoice.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {invoice.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
