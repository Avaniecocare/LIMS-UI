import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { EmptyState, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SetupPage } from '@/features/auth/AuthPages';
import { Layout } from './Layout';
import { useSession } from './providers';

const page = (Component: LazyExoticComponent<ComponentType>, permissions?: string[]): ReactNode => (
  <Suspense fallback={<Spinner />}>
    <RequirePermission permissions={permissions}>
      <Component />
    </RequirePermission>
  </Suspense>
);

/** Only hides routes for a clean experience. The API enforces the same permission regardless. */
function RequirePermission({ permissions, children }: { permissions?: string[]; children: ReactNode }) {
  const { can } = useSession();
  if (permissions && !can(...permissions)) return <EmptyState title="You do not have access to this page" />;
  return children;
}

function RequireAuth() {
  const { user, loading } = useSession();
  const location = useLocation();
  const setup = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => unwrap(await api.GET('/api/v1/public/setup-status')),
    enabled: !loading && !user,
  });
  if (loading || (!user && setup.isLoading)) return <Spinner />;
  if (!user) return <Navigate to={setup.data?.setupRequired ? '/setup' : '/login'} replace state={{ from: location.pathname }} />;
  return <Layout />;
}

function PublicOnly() {
  const { user, loading } = useSession();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

const Home = lazy(() => import('@/features/home/HomePage'));
const Admin = lazy(() => import('@/features/admin/AdminPage'));
const Account = lazy(() => import('@/features/account/AccountPage'));
const Masters = lazy(() => import('@/features/masters/MastersPage'));
const Customers = lazy(() => import('@/features/customers/CustomersPage'));
const CustomerDetail = lazy(() => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomerDetailPage })));

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/setup', element: <SetupPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: page(Home) },
      { path: '/account', element: page(Account) },
      { path: '/admin', element: page(Admin, ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view']) },
      { path: '/masters', element: page(Masters, ['masters.view', 'rates.view']) },
      { path: '/masters/:key', element: page(Masters, ['masters.view', 'rates.view']) },
      { path: '/customers', element: page(Customers, ['customers.view']) },
      { path: '/customers/:id', element: page(CustomerDetail, ['customers.view']) },
      { path: '*', element: <EmptyState title="Page not found" /> },
    ],
  },
]);
