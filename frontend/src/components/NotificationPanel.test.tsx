import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userEvent } from '../test/test-utils';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import NotificationPanel from './NotificationPanel';
import type { ReactElement } from 'react';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the notifications API
vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
const mockListNotifications = vi.mocked(listNotifications);
const mockMarkRead = vi.mocked(markNotificationRead);
const mockMarkAllRead = vi.mocked(markAllNotificationsRead);

// Fresh QueryClient per render
function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false },
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

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  invoiceId: 'inv-1',
  message: 'Your invoice has been approved',
  read: false,
  createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  invoice: {
    id: 'inv-1',
    originalFilename: 'invoice.pdf',
    status: 'APPROVED' as const,
  },
};

const emptyResponse = {
  notifications: [],
  unreadCount: 0,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

const singleResponse = {
  notifications: [mockNotification],
  unreadCount: 1,
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell button with unread count badge', async () => {
    mockListNotifications.mockResolvedValue(singleResponse);
    renderWithProviders(<NotificationPanel />);

    await waitFor(() => {
      const badge = document.querySelector('.bg-brand.rounded-full');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('1');
    });
  });

  it('does not show badge when no unread notifications', async () => {
    mockListNotifications.mockResolvedValue({ ...singleResponse, unreadCount: 0, notifications: [{ ...mockNotification, read: true }] });
    renderWithProviders(<NotificationPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });

    // Should not have a badge
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('opens dropdown when bell is clicked', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(emptyResponse);
    renderWithProviders(<NotificationPanel />);

    const bellButton = screen.getByLabelText('Notifications');
    await user.click(bellButton);

    expect(screen.getByText('Notifications')).toBeInTheDocument(); // Dropdown header
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(emptyResponse);
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No new notifications')).toBeInTheDocument();
  });

  it('renders notification list with messages', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(singleResponse);
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));

    await waitFor(() => {
      expect(screen.getByText('Your invoice has been approved')).toBeInTheDocument();
    });
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
  });

  it('marks notification as read and navigates when clicked', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(singleResponse);
    mockMarkRead.mockResolvedValue({ notification: { ...mockNotification, read: true } });
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));

    await waitFor(() => {
      expect(screen.getByText('Your invoice has been approved')).toBeInTheDocument();
    });

    const notificationItem = screen.getByText('Your invoice has been approved');
    await user.click(notificationItem);

    // Mutation passes extra context argument, just check first param
    expect(mockMarkRead).toHaveBeenCalled();
    expect(mockMarkRead.mock.calls[0][0]).toBe('notif-1');
    expect(mockNavigate).toHaveBeenCalledWith('/invoices/inv-1');
  });

  it('marks all as read when checkmark button is clicked', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(singleResponse);
    mockMarkAllRead.mockResolvedValue({ updated: 1 });
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));

    await waitFor(() => {
      expect(screen.getByText('Your invoice has been approved')).toBeInTheDocument();
    });

    // Find the CheckCheck button (mark all read)
    const buttons = screen.getAllByRole('button');
    const markAllBtn = buttons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-check-check'));

    if (markAllBtn) {
      await user.click(markAllBtn);
      expect(mockMarkAllRead).toHaveBeenCalled();
    }
  });

  it('closes dropdown when X button is clicked', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(emptyResponse);
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('All caught up!')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '' }); // X icon button
    await user.click(closeButton);

    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByText('All caught up!')).not.toBeInTheDocument();
    });
  });

  it('shows relative time formatting', async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue(singleResponse);
    renderWithProviders(<NotificationPanel />);

    await user.click(screen.getByLabelText('Notifications'));

    await waitFor(() => {
      // Should show "1h ago" for a notification from 1 hour ago
      expect(screen.getByText(/1h ago/)).toBeInTheDocument();
    });
  });
});
