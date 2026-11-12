/** shadcn/ui-style primitives: Radix behaviour with Tailwind styling, owned by this repo. */
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowLeft, Check, Inbox, Loader2, Share2, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { Children, cloneElement, forwardRef, isValidElement, useEffect, useLayoutEffect, useRef, type ComponentProps, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBranding } from '@/app/providers';
import { cn } from '@/lib/format';

const buttonVariants = cva(
  // Press feedback is a 2% shrink, on the fast duration; touch screens get 44px targets.
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] duration-(--motion-fast) ease-(--ease-standard) active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress pointer-coarse:min-h-11 [&_svg]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg hover:opacity-90',
        secondary: 'border border-gray-300 bg-surface text-gray-800 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100',
        ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        danger: 'bg-danger text-white hover:bg-danger-hover',
      },
      size: { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9 px-3.5 text-sm', icon: 'size-8 pointer-coarse:min-w-11' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} type={asChild ? undefined : (type ?? 'button')} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}

const fieldClass =
  'h-9 w-full rounded-md border border-gray-300 bg-surface px-2.5 text-sm text-gray-900 transition-[border-color] duration-(--motion-fast) placeholder:text-gray-500 hover:border-gray-400 focus-visible:border-brand-focus disabled:bg-gray-100 disabled:text-gray-600 aria-[invalid=true]:border-red-600 max-md:text-base pointer-coarse:h-11';

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'h-auto min-h-20 py-2 pointer-coarse:h-auto', className)} {...props} />
));
Textarea.displayName = 'Textarea';

/** Native select: fast with long master lists, works with scanners and keyboards. */
export const Select = forwardRef<HTMLSelectElement, ComponentProps<'select'>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClass, className)} {...props} />
));
Select.displayName = 'Select';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('block text-[13px] font-medium text-gray-700', className)} {...props} />;
}

type AriaProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false'; 'aria-required'?: boolean | 'true' | 'false' };

/**
 * Label, control, hint and error. With `htmlFor`, the hint and error get ids and a single child control
 * gets `aria-describedby`, `aria-invalid` and `aria-required`, so a screen reader reads the reason again
 * whenever the field is focused (not just once when the error appears).
 */
export function Field({ label, htmlFor, error, hint, required, className, children }: { label: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  const hintId = htmlFor && hint && !error ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  let control = children;
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  if (htmlFor && isValidElement<AriaProps>(only) && (only.props.id === undefined || only.props.id === htmlFor)) {
    const own = only.props;
    const describedBy = [own['aria-describedby'], errorId, hintId].filter(Boolean).join(' ') || undefined;
    control = cloneElement(only as ReactElement<AriaProps>, {
      'aria-describedby': describedBy,
      'aria-invalid': own['aria-invalid'] ?? (error ? true : undefined),
      'aria-required': own['aria-required'] ?? (required || undefined),
    });
  }
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-red-700" aria-hidden>
            {' '}
            *
          </span>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="animate-enter text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, id, className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root> & { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckboxPrimitive.Root id={id} className={cn('flex size-4 shrink-0 items-center justify-center rounded border border-gray-400 bg-surface transition-colors duration-(--motion-fast) hover:border-gray-500 disabled:opacity-50 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-fg', className)} {...props}>
        <CheckboxPrimitive.Indicator className="animate-check">
          <Check className="size-3" aria-hidden />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label htmlFor={id} className="text-sm text-gray-800">
          {label}
        </label>
      )}
    </span>
  );
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-lg border border-gray-200 bg-surface shadow-sm', className)} {...props} />;
}

export function CardHeader({ title, actions, description }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

const tones = {
  gray: 'bg-gray-100 text-gray-800',
  blue: 'bg-blue-100 text-blue-900',
  amber: 'bg-amber-100 text-amber-900',
  green: 'bg-green-100 text-green-900',
  red: 'bg-red-100 text-red-900',
  purple: 'bg-purple-100 text-purple-900',
};

export function Badge({ tone = 'gray', className, ...props }: ComponentProps<'span'> & { tone?: keyof typeof tones }) {
  return <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)} {...props} />;
}

/** Backdrop and panel shared by every dialog: the backdrop fades, the panel fades and grows from 96%. */
const OVERLAY = 'fixed inset-0 z-(--z-overlay) bg-(--overlay) data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out';
const MODAL =
  'fixed top-1/2 left-1/2 z-(--z-modal) w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-surface-raised shadow-xl data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out ' +
  // Phones: a bottom sheet, full width, within thumb reach, clear of the home indicator.
  'max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:pb-[env(safe-area-inset-bottom)] max-md:data-[state=open]:animate-sheet-in max-md:data-[state=closed]:animate-sheet-out';

/**
 * Swipe down on a bottom sheet's top edge to close it (touch only). The sheet follows the finger; let go past
 * 80px and it closes, otherwise it springs back.
 */
function useSwipeToClose(onClose: () => void) {
  const start = useRef<{ y: number; el: HTMLElement } | null>(null);
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'touch') return;
      const el = e.currentTarget.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      if (el) start.current = { y: e.clientY, el };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const dy = Math.max(0, e.clientY - s.y);
      s.el.style.transition = 'none';
      s.el.style.transform = `translateY(${dy}px)`;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dy = e.clientY - s.y;
      s.el.style.transition = 'transform var(--motion-base) var(--ease-enter)';
      s.el.style.transform = '';
      if (dy > 80) onClose();
    },
    onPointerCancel: () => {
      if (start.current) start.current.el.style.transform = '';
      start.current = null;
    },
  };
}

function SheetHandle() {
  return <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300 md:hidden" />;
}

export function Dialog({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  const swipe = useSwipeToClose(() => onOpenChange(false));
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(MODAL, 'max-h-[90dvh] overflow-y-auto', wide ? 'max-w-4xl' : 'max-w-lg')}
        >
          <div {...swipe} className="sticky top-0 z-10 touch-pan-x bg-surface-raised max-md:rounded-t-lg">
          <SheetHandle />
          <div className="flex items-start justify-between border-b border-gray-200 px-5 py-3 max-md:px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={description ? 'mt-0.5 text-[13px] text-gray-600' : 'sr-only'}>{description ?? title}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-gray-600 transition-colors duration-(--motion-fast) hover:bg-gray-100 hover:text-gray-900 pointer-coarse:p-2.5" aria-label="Close">
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          </div>
          <div className="px-5 py-4 max-md:px-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', danger, loading, onConfirm, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; children?: ReactNode }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={OVERLAY} />
        <AlertDialog.Content className={cn(MODAL, 'max-h-[90dvh] max-w-md overflow-y-auto p-5 max-md:pt-2')}>
          <div className="max-md:mb-3">
            <SheetHandle />
          </div>
          <AlertDialog.Title className="text-base font-semibold text-gray-900">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-gray-700">{description}</div>
          </AlertDialog.Description>
          {children && <div className="mt-3">{children}</div>}
          <div className="mt-4 flex justify-end gap-2 max-md:flex-col-reverse max-md:[&>*]:w-full">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export const Tabs = TabsPrimitive.Root;
/**
 * The tab row. One underline slides to the chosen tab (transform only), so the eye follows the change; it is
 * measured from the active tab and follows resizes and tabs appearing.
 */
export function TabsList({ className, children, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const list = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    const line = bar.current;
    if (!el || !line) return;
    let placed = false;
    const place = () => {
      const active = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!active) return void (line.style.opacity = '0');
      // The first placement jumps; later ones slide.
      line.style.transition = placed ? '' : 'none';
      line.style.opacity = '1';
      line.style.transform = `translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth})`;
      placed = true;
    };
    place();
    const mo = new MutationObserver(place);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-state'], childList: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(el);
    return () => {
      mo.disconnect();
      ro?.disconnect();
    };
  }, []);
  return (
    <TabsPrimitive.List ref={list} className={cn('relative flex gap-1 overflow-x-auto border-b border-gray-200', className)} {...props}>
      {children}
      <span ref={bar} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-brand opacity-0 transition-transform duration-(--motion-base) ease-(--ease-standard)" />
    </TabsPrimitive.List>
  );
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn('-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-gray-600 transition-colors duration-(--motion-fast) hover:text-gray-900 data-[state=active]:text-gray-900 pointer-coarse:min-h-11', className)} {...props} />;
}
export const TabsContent = TabsPrimitive.Content;

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export function DropdownContent({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content sideOffset={4} align="end" className={cn('z-(--z-popover) min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) rounded-md border border-gray-200 bg-surface-raised p-1 shadow-lg data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out', className)} {...props} />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownLabel({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn('px-2 pt-1.5 pb-1 text-xs font-medium text-gray-600', className)} {...props} />;
}
export function DropdownSeparator({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-gray-100', className)} {...props} />;
}
export const DropdownRadioGroup = DropdownPrimitive.RadioGroup;
export function DropdownRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem className={cn('relative flex cursor-pointer items-center rounded py-1.5 pr-2 pl-7 text-sm text-gray-800 outline-none transition-colors duration-(--motion-fast) data-[highlighted]:bg-gray-100 pointer-coarse:py-3', className)} {...props}>
      <DropdownPrimitive.ItemIndicator className="absolute left-2 animate-check">
        <Check className="size-3.5" aria-hidden />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.RadioItem>
  );
}
export function DropdownItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn('cursor-pointer rounded px-2 py-1.5 text-sm text-gray-800 outline-none transition-colors duration-(--motion-fast) data-[highlighted]:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 pointer-coarse:py-3', className)} {...props} />;
}

/**
 * A loading message. It fades in after a short delay, so fast loads never flash a spinner; screen readers and
 * tests still find it at once.
 */
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex animate-[fade-in_var(--motion-base)_var(--ease-enter)_180ms_both] items-center justify-center gap-2 p-8 text-sm text-gray-600" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

/** A grey block in the shape of content that is on its way. Pulses gently, which is how it says "loading". */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('animate-skeleton rounded bg-gray-100', className)} {...props} />;
}

/** Rows of skeleton cells for a table that is loading, so the page keeps its shape. */
export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  const widths = ['w-24', 'w-40', 'w-28', 'w-20', 'w-32', 'w-16'];
  return (
    <div className="divide-y divide-gray-100" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 px-3 py-2.5" style={{ opacity: 1 - r * 0.12 }}>
          {Array.from({ length: Math.max(1, Math.min(columns, 6)) }, (_, c) => (
            <Skeleton key={c} className={cn('h-3.5', widths[(r + c) % widths.length])} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Nothing to show yet: what this is, what to do about it, and the button that does it. */
export function EmptyState({ title, children, icon: Icon = Inbox, action }: { title: string; children?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex animate-enter flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-gray-600">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="flex animate-enter flex-col items-center px-6 py-10 text-center" role="alert">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-red-50 text-red-700">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <Button className="mt-3" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// The path whose heading last took focus. Starts at the first page, so a fresh load leaves focus alone.
let focusedPath = typeof window === 'undefined' ? '' : window.location.pathname;

/**
 * Sets the browser tab title from the visible page heading (WCAG 2.4.2), e.g. "Invoices · Product".
 * Reads the rendered text so headings built from badges and values work too.
 */
export function usePageTitle(heading: { current: HTMLElement | null }, title?: string) {
  const branding = useBranding();
  useEffect(() => {
    const text = (title ?? heading.current?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const product = branding?.productName;
    const next = text && product ? `${text} · ${product}` : text || product || document.title;
    if (document.title !== next) document.title = next;
  });
}

/** After in-app navigation, moves focus to the new page's heading so screen readers announce it. */
function useFocusOnNavigate(heading: { current: HTMLElement | null }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === focusedPath) return;
    focusedPath = pathname;
    const active = document.activeElement;
    // Only take focus that nobody is using: nothing focused, or the menu link that was just followed. Anything else
    // (an autofocus field, a dialog, the header search after a scan, the notifications bell) was put there on purpose.
    if (active && active !== document.body && !active.closest('nav, aside')) return;
    heading.current?.focus({ preventScroll: true });
  }, [pathname, heading]);
}

/** Where Back goes when there is no earlier page in this tab: up to the section, or the dashboard from a section. */
export function parentPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length > 1 ? `/${parts[0]}` : '/';
}

/** Back to the previous page in the app; opened from a link or a new tab, it goes up a level instead. */
export function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const hasHistory = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-md py-0.5 pr-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 hover:underline" onClick={() => (hasHistory ? navigate(-1) : navigate(parentPath(pathname)))}>
      <ArrowLeft className="size-3.5" aria-hidden />
      Back
    </button>
  );
}

export function PageHeader({ title, description, actions, breadcrumb, pageTitle }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode; /** Tab title, when the heading text is not right for it. */ pageTitle?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  usePageTitle(heading, pageTitle);
  useFocusOnNavigate(heading);
  const { pathname } = useLocation();
  // A record (a job, a report, an invoice) can be shared from a phone, e.g. to a colleague on WhatsApp.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && pathname.split('/').filter(Boolean).length >= 2;
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
          <BackButton />
          {breadcrumb && (
            <span className="contents max-md:hidden">
              <span aria-hidden className="text-gray-300">
                |
              </span>
              <span>{breadcrumb}</span>
            </span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <h1 ref={heading} tabIndex={-1} className="min-w-0 text-xl font-semibold break-words text-gray-900 outline-none max-md:text-lg">
            {title}
          </h1>
          {canShare && (
            <Button
              variant="ghost"
              size="icon"
              className="-mt-0.5 shrink-0 md:hidden"
              aria-label="Share"
              onClick={() => void navigator.share({ title: document.title, url: window.location.href }).catch(() => undefined)}
            >
              <Share2 aria-hidden />
            </Button>
          )}
        </div>
        {description && <p className="mt-0.5 text-[13px] text-gray-600">{description}</p>}
      </div>
      {/* On a phone the page's actions sit in a bar above the bottom navigation, within thumb reach. */}
      {actions && (
        <div data-page-actions className="flex flex-wrap items-center gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-(--phone-bottom) max-md:z-20 max-md:flex-nowrap max-md:justify-end max-md:overflow-x-auto max-md:border-t max-md:border-gray-200 max-md:bg-surface/95 max-md:px-3 max-md:py-2 max-md:backdrop-blur max-md:[&>*]:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
