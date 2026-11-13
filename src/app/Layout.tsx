import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ExternalLink, LayoutGrid, Menu, Monitor, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Button, DropdownContent, DropdownItem, DropdownLabel, DropdownMenu, DropdownRadioGroup, DropdownRadioItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/primitives';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { api } from '@/lib/api';
import { useSetupStatus } from '@/features/setup/setup-status';
import { cn } from '@/lib/format';
import { BOTTOM_NAV_PRIORITY, mobileRule, useIsPhone } from './device';
import { GlobalSearch } from './GlobalSearch';
import { NAV } from './nav';
import { NotificationBell } from './Notifications';
import { useBranding, useSession } from './providers';

export function Layout() {
  const { user, can, moduleOn, setUser, preview, setPreview } = useSession();
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
  const items = NAV.filter((n) => (!n.permissions || can(...n.permissions)) && (!n.module || moduleOn(n.module)));
  const { preference, setPreference } = useTheme();
  const main = useRef<HTMLElement>(null);
  const location = useLocation();
  const { pathname } = location;
  const navType = useNavigationType();
  const firstPath = useRef(pathname);
  // A new page fades in and rises 4px, so the change of screen registers. Nothing is remounted and nothing waits on it.
  // Going back returns to where the list was scrolled; a new page starts at the top.
  useEffect(() => {
    const el = scroller(main.current);
    const key = location.key;
    if (pathname !== firstPath.current) {
      firstPath.current = '';
      const saved = navType === 'POP' ? scrollPositions.get(key) : undefined;
      // Lists load after the page appears: restore once there is room to scroll to.
      if (saved) requestAnimationFrame(() => restoreScroll(el, saved));
      else el?.scrollTo?.({ top: 0 });
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        main.current?.firstElementChild?.animate?.(
          [
            { opacity: 0, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page
  }, [pathname]);
  // Positions are recorded as the person scrolls, under the history entry being looked at.
  const entry = useRef(location.key);
  entry.current = location.key;
  // On a phone the page itself scrolls (see scroller), so its position is recorded from the window.
  useEffect(() => {
    const onScroll = () => {
      if (pageScrolls()) scrollPositions.set(entry.current, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const phone = useIsPhone();
  // Menu labels stay in place (and with screen readers) when the menu is narrow; they fade out and the menu's edge
  // clips them. On opening they fade in a moment after the width starts to grow.
  const label = 'min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-(--motion-fast)';
  const [searching, setSearching] = useState(false);
  // The phone's bottom bar: the four most useful places for this person, then More (the full menu as a drawer).
  const bottom = BOTTOM_NAV_PRIORITY.map((to) => items.find((i) => i.to === to))
    .filter((i): i is (typeof items)[number] => !!i && mobileRule(i.to).support !== 'desktop')
    .slice(0, 4);
  useEffect(() => {
    if (!phone) setSearching(false);
  }, [phone]);
  // Opening the drawer or a new page closes the phone search.
  useEffect(() => setSearching(false), [pathname]);

  return (
    <div className="flex h-full max-md:h-auto max-md:min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">
        Skip to content
      </a>
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-(--overlay) lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      {/* Keeps room for the icon strip, and on large screens for the expanded menu. Phones use the bottom bar instead. */}
      {/* Same duration and easing as the menu itself, so the page and the menu move as one. */}
      <div className={cn('w-14 shrink-0 transition-[width] duration-(--motion-base) ease-(--ease-standard) max-md:w-0', open && 'lg:w-56')}>
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-nav text-nav-fg transition-[width,translate] duration-(--motion-base) ease-(--ease-standard) max-md:w-72 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]',
            open ? 'w-56 shadow-xl lg:shadow-none' : 'w-14 max-md:-translate-x-full max-md:shadow-none',
          )}
          aria-hidden={phone && !open ? true : undefined}
          inert={phone && !open ? true : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-nav-fg/15 px-3">
            <Button variant="ghost" size="icon" className="shrink-0 text-nav-fg hover:bg-nav-fg/15" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </Button>
            <span aria-hidden className={cn('text-sm font-semibold whitespace-nowrap transition-opacity duration-(--motion-fast)', open ? 'opacity-100 delay-75' : 'opacity-0')}>
              Menu
            </span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto p-2" aria-label="Main">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => {
                  if (!window.matchMedia('(min-width: 64rem)').matches) setOpen(false);
                }}
                className={({ isActive }) =>
                  cn(
                    // The icon stays put (10px in, centred in the 56px strip) whether the menu is open or not;
                    // only the label fades, so nothing jumps while the width animates.
                    'flex h-10 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-sm font-medium transition-colors duration-(--motion-fast) pointer-coarse:h-11',
                    isActive ? 'bg-brand text-brand-fg shadow-[inset_3px_0_0_var(--brand-accent)]' : 'text-nav-fg hover:bg-nav-fg/15',
                  )
                }
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                <span className={cn(label, open ? 'opacity-100 delay-75' : 'opacity-0')}>{item.label}</span>
                {phone && open && mobileRule(item.to).support === 'desktop' && <Monitor className="ml-auto size-4 shrink-0 opacity-60" aria-label="best on a computer" />}
              </NavLink>
            ))}
          </nav>
          {/* The help site, always at the foot of the menu. It opens in a new tab so work in progress is not lost. */}
          <div className="shrink-0 border-t border-nav-fg/15 p-2">
            <a
              href="/help/"
              target="_blank"
              rel="noopener"
              title={open ? undefined : 'Help and documentation'}
              className={cn(
                'flex h-10 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-sm font-medium text-nav-fg transition-colors duration-(--motion-fast) hover:bg-nav-fg/15 pointer-coarse:h-11',
              )}
            >
              <BookOpen className="size-5 shrink-0" aria-hidden />
              <span className={cn(label, open ? 'opacity-100 delay-75' : 'opacity-0')}>
                Documentation<span className="sr-only"> and help (opens in a new tab)</span>
              </span>
              <ExternalLink className={cn('ml-auto size-3.5 shrink-0 transition-opacity duration-(--motion-fast)', open ? 'opacity-60 delay-75' : 'opacity-0')} aria-hidden />
            </a>
          </div>
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative grid h-14 max-md:sticky max-md:top-0 max-md:z-20 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-200 bg-surface px-4 max-md:box-content max-md:gap-2 max-md:px-3 max-md:pt-[env(safe-area-inset-top)] md:grid-cols-[1fr_minmax(0,28rem)_1fr]">
          <Link to="/" className={cn('flex w-fit shrink-0 items-center gap-2', searching && 'max-md:invisible')} aria-label={`${branding?.productName ?? ''} home`}>
            {branding && <img src={branding.logoUrl} alt="" className="size-9 rounded object-contain" />}
            <span className="hidden text-sm font-semibold text-gray-900 md:inline">{branding?.productName}</span>
            <span className="truncate text-sm font-semibold text-gray-900 md:hidden">{branding?.productName}</span>
          </Link>
          {/* On a phone the search is an icon that opens a full-width bar. It stays mounted, so scanners work from any screen. */}
          <div
            id="header-slot"
            className={cn(phone && !searching && 'max-md:hidden', searching && 'max-md:absolute max-md:inset-x-3 max-md:bottom-2.5 max-md:z-10 max-md:flex max-md:items-center max-md:gap-2')}
          >
            <div className="min-w-0 flex-1">
              <GlobalSearch onDone={() => setSearching(false)} />
            </div>
            {searching && (
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSearching(false)}>
                Cancel
              </Button>
            )}
          </div>
          <div className={cn('flex items-center justify-end gap-3 max-md:gap-1', searching && 'max-md:invisible')}>
            {phone && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search or scan"
                onClick={() => {
                  setSearching(true);
                  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#header-slot input')?.focus());
                }}
              >
                <Search className="size-5" aria-hidden />
              </Button>
            )}
            <NotificationBell />
            <DropdownMenu>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={phone ? `${user?.name ?? 'Account'}: account menu` : undefined}>
                  {phone ? (
                    <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-800">
                      {initials(user?.name)}
                    </span>
                  ) : (
                    <span className="max-w-40 truncate">{user?.name}</span>
                  )}
                  <ChevronDown aria-hidden className="max-md:hidden" />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <div className="border-b border-gray-100 px-2 py-1.5 text-xs text-gray-600">
                  {phone && <span className="block text-sm font-medium text-gray-900">{user?.name}</span>}
                  {user?.roles.join(', ')}
                </div>
                <DropdownItem onSelect={() => navigate('/account')}>My account</DropdownItem>
                {/* The help site is a separate set of pages on this address; it opens beside the app. */}
                <DropdownItem onSelect={() => window.open('/help/', '_blank', 'noopener')}>Help and documentation</DropdownItem>
                <DropdownSeparator />
                <DropdownLabel>Appearance</DropdownLabel>
                <DropdownRadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
                  <DropdownRadioItem value="light" onSelect={(e) => e.preventDefault()}>
                    Light
                  </DropdownRadioItem>
                  <DropdownRadioItem value="dark" onSelect={(e) => e.preventDefault()}>
                    Dark
                  </DropdownRadioItem>
                  <DropdownRadioItem value="system" onSelect={(e) => e.preventDefault()}>
                    Same as this device
                  </DropdownRadioItem>
                </DropdownRadioGroup>
                <DropdownSeparator />
                <DropdownItem onSelect={() => logout.mutate()}>Sign out</DropdownItem>
              </DropdownContent>
            </DropdownMenu>
          </div>
        </header>
        <SetupBanner />
        {preview && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-amber-100 px-4 py-1.5 text-[13px] text-amber-900">
            <span>
              Previewing as <strong>{preview.role}</strong>: you see the menus and buttons this role sees. Your own access is unchanged.
            </span>
            <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>
              Exit preview
            </Button>
          </div>
        )}
        {/* relative: hidden labels (sr-only, absolutely placed) stay inside this scroll area instead of stretching the page.
            On a phone the bottom bar (and a page's action bar) sit over the end of the page, so it leaves room for them. */}
        <main
          ref={main}
          onScroll={(e) => scrollPositions.set(entry.current, e.currentTarget.scrollTop)}
          id="main"
          className="relative min-h-0 flex-1 overflow-y-auto p-4 max-md:flex-none max-md:overflow-visible max-md:px-3 max-md:pb-[calc(var(--phone-bottom)+1rem)] lg:p-5"
        >
          <Outlet />
        </main>
        {phone && (
          <nav
            aria-label="Quick"
            className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(3.75rem+env(safe-area-inset-bottom))] border-t border-gray-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
            style={{ gridTemplateColumns: `repeat(${bottom.length + 1}, minmax(0, 1fr))` }}
          >
            {bottom.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-(--motion-fast) active:bg-gray-100',
                    isActive ? 'text-brand' : 'text-gray-600',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 animate-fade-in rounded-full bg-brand" />}
                    <item.icon className="size-5" aria-hidden />
                    <span className="max-w-full truncate px-1">{SHORT_LABEL[item.to] ?? item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-600 active:bg-gray-100"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <LayoutGrid className="size-5" aria-hidden />
              More
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

/** Shorter names for the phone's bottom bar, where each item has a fifth of the width. */
const SHORT_LABEL: Record<string, string> = { '/due-invoices': 'Dues', '/my-tests': 'My tests', '/approvals': 'Approve' };

/**
 * On a phone the whole page scrolls, with the header stuck to the top and the bottom bar fixed. Then the header and
 * bar stay still while the content moves, and Safari and Chrome tuck their own bars away for a full-screen view.
 * On larger screens only the content area scrolls, under a header and menu that never move.
 */
const pageScrolls = () => !!window.matchMedia?.('(max-width: 767px)').matches;
const scroller = (main: HTMLElement | null) => (pageScrolls() ? (document.scrollingElement as HTMLElement | null) : main);

/** Scroll position of each visited page in this tab, by history entry. */
const scrollPositions = new Map<string, number>();

/** Scrolls back to `top`, waiting up to two seconds for the page's data to make it tall enough. */
function restoreScroll(el: HTMLElement | null, top: number, until = performance.now() + 2000) {
  if (!el) return;
  el.scrollTop = top;
  if (Math.abs(el.scrollTop - top) > 2 && performance.now() < until) requestAnimationFrame(() => restoreScroll(el, top, until));
}

function initials(name?: string | null) {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/**
 * Until the lab's setup is finished, its administrators see a reminder, and are taken to the wizard once per visit
 * when they arrive at the dashboard (the first sign-in included).
 */
let setupOffered = false;
function SetupBanner() {
  const { can } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const allowed = can('admin.company.edit');
  const status = useSetupStatus(allowed);
  const pending = allowed && status.data && !status.data.completed;
  useEffect(() => {
    if (pending && pathname === '/' && !setupOffered) {
      setupOffered = true;
      navigate('/setup/lab');
    }
  }, [pending, pathname, navigate]);
  if (!pending || pathname === '/setup/lab') return null;
  const steps = Object.values(status.data!.steps);
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-blue-50 px-4 py-1.5 text-[13px] text-blue-900">
      <span>
        Finish setting up your laboratory: {steps.filter(Boolean).length} of {steps.length} steps done.
      </span>
      <Button size="sm" variant="secondary" onClick={() => navigate('/setup/lab')}>
        Continue setup
      </Button>
    </div>
  );
}
