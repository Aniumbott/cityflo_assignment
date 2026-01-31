import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
export { default as userEvent } from '@testing-library/user-event';
