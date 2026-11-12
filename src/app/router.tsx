import { useQuery } from '@tanstack/react-query';
import { PhoneGate } from './DesktopOnly';
import { Fragment, lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { EmptyState, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { returnPath } from '@/lib/safe-path';
import { RouteError } from './ErrorBoundary';
import { Layout } from './Layout';
import { ModuleOff, NoAccess } from './NoAccess';
import { useSession } from './providers';

const page = (Component: LazyExoticComponent<ComponentType>, permissions?: string[], module?: string): ReactNode => (
  <Suspense fallback={<Spinner />}>
    <RequirePermission permissions={permissions} module={module}>
      <Component />
    </RequirePermission>
  </Suspense>
);

/**
 * Remounts its children whenever the `:id` route param changes. React Router otherwise reuses the page
 * instance, so local state (autosave queues, drafts, open dialogs, form values) would carry over from
 * one record to the next, e.g. after scanning the next sample from a test page.
 */
export function KeyedById({ children }: { children: ReactNode }) {
  const { id } = useParams();
  return <Fragment key={id}>{children}</Fragment>;
}

/** A detail page that keeps state per record: see KeyedById. */
const detail = (Component: LazyExoticComponent<ComponentType>, permissions?: string[], module?: string): ReactNode => <KeyedById>{page(Component, permissions, module)}</KeyedById>;


/** Only hides routes for a clean experience. The API enforces the same permission regardless. */
function RequirePermission({ permissions, module, children }: { permissions?: string[]; module?: string; children: ReactNode }) {
  const { can, moduleOn } = useSession();
  if (module && !moduleOn(module)) return <ModuleOff />;
  if (permissions && !can(...permissions)) return <NoAccess />;
  return <PhoneGate>{children}</PhoneGate>;
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
  if (!user) return <Navigate to={setup.data?.setupRequired ? '/setup' : '/login'} replace state={{ from: location.pathname + location.search + location.hash }} />;
  // The API refuses everything else until this is done, so nothing else is offered.
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Layout />;
}

function PublicOnly() {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <Spinner />;
  return user ? <Navigate to={returnPath(location.state)} replace /> : <Outlet />;
}

// Lazy, so zod and the sign-in forms stay out of the bundle every signed-in visit loads. One chunk serves all five.
const authPages = () => import('@/features/auth/AuthPages');
const LoginPage = lazy(() => authPages().then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => authPages().then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => authPages().then((m) => ({ default: m.ResetPasswordPage })));
const SetupPage = lazy(() => authPages().then((m) => ({ default: m.SetupPage })));
const RequiredPasswordChangePage = lazy(() => authPages().then((m) => ({ default: m.RequiredPasswordChangePage })));
const suspended = (Component: LazyExoticComponent<ComponentType>): ReactNode => (
  <Suspense fallback={<Spinner />}>
    <Component />
  </Suspense>
);

const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'));
const Analytics = lazy(() => import('@/features/dashboard/AnalyticsPage'));
const Admin = lazy(() => import('@/features/admin/AdminPage'));
const Account = lazy(() => import('@/features/account/AccountPage'));
const Masters = lazy(() => import('@/features/masters/MastersPage'));
const Files = lazy(() => import('@/features/files/FilesPage'));
const Customers = lazy(() => import('@/features/customers/CustomersPage'));
const CustomerDetail = lazy(() => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomerDetailPage })));
const Orders = lazy(() => import('@/features/orders/OrdersPage'));
const OrderDetail = lazy(() => import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrderDetailPage })));
const Quotations = lazy(() => import('@/features/quotations/QuotationsPage'));
const QuotationEditor = lazy(() => import('@/features/quotations/QuotationEditorPage'));
const QuotationDetail = lazy(() => import('@/features/quotations/QuotationDetailPage'));
const Samples = lazy(() => import('@/features/samples/SamplesPage'));
const Booking = lazy(() => import('@/features/samples/BookingPage'));
const JobDetail = lazy(() => import('@/features/samples/JobDetailPage'));
const Planning = lazy(() => import('@/features/planning/PlanningPage'));
const MyTests = lazy(() => import('@/features/testing/MyTestsPage'));
const TestDetail = lazy(() => import('@/features/testing/TestDetailPage'));
const Approvals = lazy(() => import('@/features/approvals/ApprovalsPage'));
const ReportDetail = lazy(() => import('@/features/approvals/ReportDetailPage'));
const ReportsCatalog = lazy(() => import('@/features/reports/ReportsPage'));
const ReportView = lazy(() => import('@/features/reports/ReportViewPage'));
const Dispatch = lazy(() => import('@/features/dispatch/DispatchPage'));
const Invoices = lazy(() => import('@/features/invoices/InvoicesPage'));
const InvoiceDetail = lazy(() => import('@/features/invoices/InvoiceDetailPage'));
const DueInvoices = lazy(() => import('@/features/invoices/DueInvoicesPage'));
const VerifyReport = lazy(() => import('@/features/verify/VerifyReportPage'));
const PhoneUpload = lazy(() => import('@/features/phone/PhoneUploadPage'));
const LabSetup = lazy(() => import('@/features/setup/LabSetupPage'));
const Quality = lazy(() => import('@/features/quality/QualityPage'));

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: suspended(LoginPage) },
      { path: '/forgot-password', element: suspended(ForgotPasswordPage) },
      { path: '/reset-password', element: suspended(ResetPasswordPage) },
      { path: '/setup', element: suspended(SetupPage) },
    ],
  },
  { path: '/change-password', element: suspended(RequiredPasswordChangePage) },
  // Opened from the QR code on a report: no sign-in, signed-in or not.
  {
    path: '/verify/:code',
    element: (
      <Suspense fallback={<Spinner />}>
        <VerifyReport />
      </Suspense>
    ),
  },
  // Opened on a phone from the QR code on the lab computer: the link itself is the permission, no sign-in.
  {
    path: '/phone/:token',
    element: (
      <Suspense fallback={<Spinner />}>
        <PhoneUpload />
      </Suspense>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        // A page that crashes shows the message inside the layout, so the menu still works.
        errorElement: <RouteError />,
        children: [
      { path: '/', element: page(Dashboard) },
      { path: '/analytics', element: page(Analytics, ['analytics.operations', 'analytics.quality', 'analytics.people', 'analytics.commercial'], 'analytics') },
      { path: '/account', element: page(Account) },
      { path: '/setup/lab', element: page(LabSetup, ['admin.company.edit']) },
      { path: '/admin', element: page(Admin, ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view', 'privacy.manage']) },
      { path: '/files', element: page(Files, ['files.view'], 'files') },
      { path: '/quality', element: page(Quality, ['quality.view'], 'quality') },
      { path: '/masters', element: page(Masters, ['masters.view', 'rates.view']) },
      { path: '/masters/:key', element: page(Masters, ['masters.view', 'rates.view']) },
      { path: '/customers', element: page(Customers, ['customers.view']) },
      { path: '/customers/:id', element: detail(CustomerDetail, ['customers.view']) },
      { path: '/orders', element: page(Orders, ['orders.view'], 'quotations') },
      { path: '/orders/:id', element: detail(OrderDetail, ['orders.view'], 'quotations') },
      { path: '/quotations', element: page(Quotations, ['quotations.view'], 'quotations') },
      { path: '/quotations/new', element: page(QuotationEditor, ['quotations.edit'], 'quotations') },
      { path: '/quotations/:id', element: detail(QuotationDetail, ['quotations.view'], 'quotations') },
      { path: '/quotations/:id/edit', element: detail(QuotationEditor, ['quotations.edit'], 'quotations') },
      { path: '/samples', element: page(Samples, ['jobs.view']) },
      { path: '/samples/new', element: page(Booking, ['jobs.create']) },
      { path: '/samples/jobs/:id', element: detail(JobDetail, ['jobs.view']) },
      { path: '/planning', element: page(Planning, ['planning.view']) },
      { path: '/my-tests', element: page(MyTests, ['tests.work']) },
      { path: '/my-tests/:id', element: detail(TestDetail, ['tests.work', 'tests.viewAll']) },
      { path: '/approvals', element: page(Approvals, ['tests.approve', 'reports.review', 'reports.approve', 'reports.issue', 'reports.view']) },
      { path: '/approvals/reports/:id', element: detail(ReportDetail, ['reports.view']) },
      { path: '/reports', element: page(ReportsCatalog, ['mis.view', 'mis.commercial'], 'analytics') },
      { path: '/reports/:key', element: page(ReportView, ['mis.view', 'mis.commercial'], 'analytics') },
      { path: '/dispatch', element: page(Dispatch, ['dispatch.view'], 'dispatch') },
      { path: '/invoices', element: page(Invoices, ['invoices.view'], 'billing') },
      { path: '/invoices/:id', element: detail(InvoiceDetail, ['invoices.view'], 'billing') },
      { path: '/due-invoices', element: page(DueInvoices, ['invoices.view'], 'billing') },
      { path: '*', element: <EmptyState title="Page not found" /> },
        ],
      },
    ],
  },
    ],
  },
]);
