import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button, DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { cn } from '@/lib/format';
import { GlobalSearch } from './GlobalSearch';
import { NAV } from './nav';
import { useBranding, useSession } from './providers';

export function Layout() {
  const { user, can, setUser } = useSession();
  const branding = useBranding();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const logout = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/logout'),
    onSettled: () => {
      setUser(null);
      client.clear();
      navigate('/login');
    },
  });
  const items = NAV.filter((n) => !n.permissions || can(...n.permissions));

  return (
    <div className="flex h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Skip to content
      </a>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-3">
          {branding && <img src={branding.logoUrl} alt="" className="size-8 rounded object-contain" />}
          <span className="truncate text-sm font-semibold text-gray-900">{branding?.productName}</span>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X aria-hidden />
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Main">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn('flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium', isActive ? 'bg-brand text-brand-fg' : 'text-gray-700 hover:bg-gray-100')}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <div className="flex-1" id="header-slot">
            <GlobalSearch />
          </div>
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="max-w-40 truncate">{user?.name}</span>
                <ChevronDown aria-hidden />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <div className="border-b border-gray-100 px-2 py-1.5 text-xs text-gray-600">{user?.roles.join(', ')}</div>
              <DropdownItem onSelect={() => navigate('/account')}>My account</DropdownItem>
              <DropdownItem onSelect={() => logout.mutate()}>Sign out</DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
