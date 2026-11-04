import type { LucideIcon } from 'lucide-react';
import { Building2, ClipboardList, Database, FileText, FlaskConical, Home, Inbox, Settings } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** shown when the user holds any of these; omit to show to everyone */
  permissions?: string[];
}

/** Order follows the product's left navigation. Items appear once their module ships. */
export const NAV: NavItem[] = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Orders', to: '/orders', icon: Inbox, permissions: ['orders.view'] },
  { label: 'Quotations', to: '/quotations', icon: FileText, permissions: ['quotations.view'] },
  { label: 'Samples', to: '/samples', icon: FlaskConical, permissions: ['jobs.view'] },
  { label: 'Planning', to: '/planning', icon: ClipboardList, permissions: ['planning.view'] },
  { label: 'Customers', to: '/customers', icon: Building2, permissions: ['customers.view'] },
  { label: 'Masters', to: '/masters', icon: Database, permissions: ['masters.view', 'rates.view'] },
  {
    label: 'Admin',
    to: '/admin',
    icon: Settings,
    permissions: ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view'],
  },
];
