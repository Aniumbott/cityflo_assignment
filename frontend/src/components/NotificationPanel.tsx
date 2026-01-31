import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, FileText, X } from 'lucide-react';
import Card from './ui/Card';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import type { Notification as NotificationType } from '../types';

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ page: 1, limit: 10 }),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleNotificationClick(notification: NotificationType) {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.invoiceId) {
      navigate(`/invoices/${notification.invoiceId}`);
      setIsOpen(false);
    }
  }

  function handleMarkAllRead() {
    markAllReadMutation.mutate();
  }

  function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-brand rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Card padding={false} className="overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-hover/50 dark:bg-charcoal-hover/50">
              <h3 className="text-sm font-semibold text-ink dark:text-cloud">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand hover:text-brand-hover font-medium transition-colors"
                    disabled={markAllReadMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate dark:text-ash hover:text-ink dark:hover:text-cloud transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate dark:text-ash">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="h-10 w-10 text-slate/30 dark:text-ash/30 mb-2" />
                  <p className="text-sm font-medium text-ink dark:text-cloud">All caught up!</p>
                  <p className="text-xs text-slate dark:text-ash mt-1">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      formatRelativeTime={formatRelativeTime}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-border-light dark:border-border-dark bg-surface-hover/50 dark:bg-charcoal-hover/50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Could navigate to a full notifications page if we build one
                  }}
                  className="text-xs text-brand hover:text-brand-hover font-medium transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
  formatRelativeTime,
}: {
  notification: NotificationType;
  onClick: () => void;
  formatRelativeTime: (d: string) => string;
}) {
  const isUnread = !notification.read;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors ${
        isUnread
          ? 'bg-brand/5 dark:bg-brand/10 hover:bg-brand/10 dark:hover:bg-brand/15'
          : 'hover:bg-surface-hover dark:hover:bg-charcoal-hover'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isUnread
              ? 'bg-brand/20 dark:bg-brand/30 text-brand-hover dark:text-brand'
              : 'bg-surface-hover dark:bg-charcoal-hover text-slate dark:text-ash'
          }`}
        >
          <FileText className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              isUnread
                ? 'font-medium text-ink dark:text-cloud'
                : 'text-slate dark:text-ash'
            }`}
          >
            {notification.message}
          </p>
          {notification.invoice && (
            <p className="text-xs text-slate dark:text-ash mt-0.5 truncate">
              {notification.invoice.originalFilename}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3 text-slate/60 dark:text-ash/60" />
            <span className="text-xs text-slate/80 dark:text-ash/80">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />
        )}
      </div>
    </button>
  );
}
