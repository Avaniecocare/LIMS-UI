import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './app/ErrorBoundary';
import { ReauthDialog } from './app/ReauthDialog';
import { BrandingProvider, queryClient, SessionProvider } from './app/providers';
import { router } from './app/router';
import { installGlobalErrorHandlers } from './lib/error-reporting';
import { installTheme } from './lib/theme';
import { ThemedToaster } from './app/ThemedToaster';
import './index.css';

installGlobalErrorHandlers();
installTheme();

// Production only: the offline page. Development and tests run without a service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <SessionProvider>
            <RouterProvider router={router} />
            <ReauthDialog />
            <ThemedToaster />
          </SessionProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
