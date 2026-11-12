import type { LucideIcon } from 'lucide-react';
import {
  ShieldCheck,
  AlarmClock,
  BadgeCheck,
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Microscope,
  ReceiptText,
  Send,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** shown when the user holds any of these; omit to show to everyone */
  permissions?: string[];
  /** hidden when the laboratory has turned this module off */
  module?: string;
}

/** Order follows the product's left navigation. */
export const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Orders', to: '/orders', icon: Inbox, permissions: ['orders.view'], module: 'quotations' },
  { label: 'Quotations', to: '/quotations', icon: FileText, permissions: ['quotations.view'], module: 'quotations' },
  { label: 'Samples', to: '/samples', icon: FlaskConical, permissions: ['jobs.view'] },
  { label: 'Planning', to: '/planning', icon: ClipboardList, permissions: ['planning.view'] },
  { label: 'My Tests', to: '/my-tests', icon: Microscope, permissions: ['tests.work'] },
  { label: 'Approvals', to: '/approvals', icon: BadgeCheck, permissions: ['tests.approve', 'reports.review', 'reports.approve', 'reports.issue', 'reports.view'] },
  { label: 'Reports', to: '/reports', icon: FileSpreadsheet, permissions: ['mis.view', 'mis.commercial'], module: 'analytics' },
  { label: 'Dispatch', to: '/dispatch', icon: Send, permissions: ['dispatch.view'], module: 'dispatch' },
  { label: 'Invoices', to: '/invoices', icon: ReceiptText, permissions: ['invoices.view'], module: 'billing' },
  { label: 'Due Invoices', to: '/due-invoices', icon: AlarmClock, permissions: ['invoices.view'], module: 'billing' },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, permissions: ['analytics.operations', 'analytics.quality', 'analytics.people', 'analytics.commercial'], module: 'analytics' },
  { label: 'Customers', to: '/customers', icon: Building2, permissions: ['customers.view'] },
  { label: 'Quality', to: '/quality', icon: ShieldCheck, permissions: ['quality.view'], module: 'quality' },
  { label: 'Files', to: '/files', icon: FolderOpen, permissions: ['files.view'], module: 'files' },
  { label: 'Masters', to: '/masters', icon: Database, permissions: ['masters.view', 'rates.view'] },
  {
    label: 'Admin',
    to: '/admin',
    icon: Settings,
    permissions: ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view', 'privacy.manage'],
  },
];
