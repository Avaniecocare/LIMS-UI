import type { LucideIcon } from 'lucide-react';
import { AlarmClock, BadgeCheck, BarChart3, Building2, ClipboardList, Database, FileSpreadsheet, FileText, FlaskConical, Inbox, LayoutDashboard, Microscope, ReceiptText, Send, Settings } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** shown when the user holds any of these; omit to show to everyone */
  permissions?: string[];
}

/** Order follows the product's left navigation. */
export const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Orders', to: '/orders', icon: Inbox, permissions: ['orders.view'] },
  { label: 'Quotations', to: '/quotations', icon: FileText, permissions: ['quotations.view'] },
  { label: 'Samples', to: '/samples', icon: FlaskConical, permissions: ['jobs.view'] },
  { label: 'Planning', to: '/planning', icon: ClipboardList, permissions: ['planning.view'] },
  { label: 'My Tests', to: '/my-tests', icon: Microscope, permissions: ['tests.work'] },
  { label: 'Approvals', to: '/approvals', icon: BadgeCheck, permissions: ['tests.approve', 'reports.review', 'reports.approve', 'reports.issue', 'reports.view'] },
  { label: 'Reports', to: '/reports', icon: FileSpreadsheet, permissions: ['mis.view', 'mis.commercial'] },
  { label: 'Dispatch', to: '/dispatch', icon: Send, permissions: ['dispatch.view'] },
  { label: 'Invoices', to: '/invoices', icon: ReceiptText, permissions: ['invoices.view'] },
  { label: 'Due Invoices', to: '/due-invoices', icon: AlarmClock, permissions: ['invoices.view'] },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, permissions: ['analytics.operations', 'analytics.quality', 'analytics.people', 'analytics.commercial'] },
  { label: 'Customers', to: '/customers', icon: Building2, permissions: ['customers.view'] },
  { label: 'Masters', to: '/masters', icon: Database, permissions: ['masters.view', 'rates.view'] },
  {
    label: 'Admin',
    to: '/admin',
    icon: Settings,
    permissions: ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view'],
  },
];
