import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './app/ErrorBoundary';
import { BrandingProvider, queryClient, SessionProvider } from './app/providers';
import { router } from './app/router';
import { installGlobalErrorHandlers } from './lib/error-reporting';
import './index.css';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <SessionProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </SessionProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
