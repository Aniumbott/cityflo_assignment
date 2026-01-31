import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../test/test-utils';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the auth API
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}));

import { loginApi, getMeApi } from '../api/auth';

const mockUser = {
  id: 'user-1',
  email: 'employee1@cityflo.com',
  username: 'employee1',
  role: 'EMPLOYEE' as const,
};

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout, hasRole } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="has-employee">{String(hasRole('EMPLOYEE'))}</div>
      <div data-testid="has-accounts">{String(hasRole('ACCOUNTS'))}</div>
      <button onClick={() => login('employee1', 'password123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts unauthenticated when no token in localStorage', async () => {
    vi.mocked(getMeApi).mockRejectedValue(new Error('No token'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('restores session from localStorage token on mount', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    vi.mocked(getMeApi).mockResolvedValue({ user: { ...mockUser, createdAt: '2024-01-01' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('employee1');
  });

  it('login stores tokens and sets user', async () => {
    vi.mocked(getMeApi).mockRejectedValue(new Error('No token'));
    vi.mocked(loginApi).mockResolvedValue({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      user: mockUser,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('employee1');
    expect(localStorage.getItem('accessToken')).toBe('access-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-123');
  });

  it('logout clears tokens and user', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    vi.mocked(getMeApi).mockResolvedValue({ user: { ...mockUser, createdAt: '2024-01-01' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Logout'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('hasRole returns correct values based on user role', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    vi.mocked(getMeApi).mockResolvedValue({ user: { ...mockUser, createdAt: '2024-01-01' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-employee')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('has-accounts')).toHaveTextContent('false');
  });

  it('clears tokens when getMeApi fails on mount', async () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'old-refresh');
    vi.mocked(getMeApi).mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
