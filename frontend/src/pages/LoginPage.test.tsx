import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../test/test-utils';
import { AuthProvider } from '../contexts/AuthContext';
import LoginPage from './LoginPage';

// Mock the auth API
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}));

import { loginApi, getMeApi } from '../api/auth';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getMeApi).mockRejectedValue(new Error('No token'));
  });

  it('renders login form with username, password, and submit button', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error when submitting empty form', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/username and password are required/i)).toBeInTheDocument();
  });

  it('shows API error on invalid credentials', async () => {
    vi.mocked(loginApi).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Invalid credentials' } },
    });

    // Need to mock axios.isAxiosError
    const axios = await import('axios');
    vi.spyOn(axios.default, 'isAxiosError').mockReturnValue(true);

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'wrong');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls login API with correct credentials', async () => {
    vi.mocked(loginApi).mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      user: {
        id: 'user-1',
        email: 'employee1@cityflo.com',
        username: 'employee1',
        role: 'EMPLOYEE',
      },
    });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'employee1');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledWith('employee1', 'password123');
    });
  });

  it('displays app title and subtitle', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Cityflo Invoice System')).toBeInTheDocument();
    });
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });
});
