import type { LucideIcon } from 'lucide-react';
import { Home, Settings } from 'lucide-react';

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
  {
    label: 'Admin',
    to: '/admin',
    icon: Settings,
    permissions: ['admin.users', 'admin.roles', 'admin.settings', 'admin.audit', 'admin.company.view'],
  },
];
