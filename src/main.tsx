import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BrandingProvider, queryClient, SessionProvider } from './app/providers';
import { router } from './app/router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <SessionProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      </BrandingProvider>
    </QueryClientProvider>
  </StrictMode>,
);
