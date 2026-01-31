import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Upload,
  ClipboardList,
  FolderOpen,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import type { UserRole } from '../types';
import ThemeToggle from './ui/ThemeToggle';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Upload Invoice',
    to: '/upload',
    icon: <Upload className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'My Submissions',
    to: '/submissions',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'All Invoices',
    to: '/invoices',
    icon: <FolderOpen className="h-5 w-5" />,
    roles: ['ACCOUNTS', 'SENIOR_ACCOUNTS'],
  },
];

const roleBadgeColors: Record<UserRole, string> = {
  EMPLOYEE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ACCOUNTS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SENIOR_ACCOUNTS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const roleLabels: Record<UserRole, string> = {
  EMPLOYEE: 'Employee',
  ACCOUNTS: 'Accounts',
  SENIOR_ACCOUNTS: 'Senior Accounts',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const visibleNavItems = navItems.filter((item) => item.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border-light dark:border-border-dark shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand text-black">
          <FileText className="h-5 w-5" />
        </div>
        <span className="font-bold text-ink dark:text-cloud text-sm tracking-tight">Cityflo Invoices</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand/10 text-brand-hover dark:text-brand'
                  : 'text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover hover:text-ink dark:hover:text-cloud'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-3 py-4 border-t border-border-light dark:border-border-dark shrink-0">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-sm font-bold text-brand-hover dark:text-brand">
            {user.username[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink dark:text-cloud truncate">{user.username}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover hover:text-ink dark:hover:text-cloud rounded-xl transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas dark:bg-midnight transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile (overlay) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface dark:bg-charcoal border-r border-border-light dark:border-border-dark flex flex-col transform transition-transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop (fixed) */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:flex-col lg:bg-surface lg:dark:bg-charcoal lg:border-r lg:border-border-light lg:dark:border-border-dark">
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-surface/80 dark:bg-charcoal/80 backdrop-blur-md border-b border-border-light dark:border-border-dark h-16 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notification bell placeholder */}
          <button className="p-2 rounded-xl text-slate dark:text-ash hover:bg-surface-hover dark:hover:bg-charcoal-hover relative">
            <Bell className="h-5 w-5" />
          </button>

          {/* User info (desktop header) */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-ink dark:text-cloud">{user.username}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
