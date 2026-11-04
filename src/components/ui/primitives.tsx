/** shadcn/ui-style primitives: Radix behaviour with Tailwind styling, owned by this repo. */
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Loader2, X } from 'lucide-react';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/format';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg hover:opacity-90',
        secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9 px-3.5 text-sm', icon: 'size-8' },
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
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} type={asChild ? undefined : (type ?? 'button')} {...props}>
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
  'h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-600 aria-[invalid=true]:border-red-600';

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'h-auto min-h-20 py-2', className)} {...props} />
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

export function Field({ label, htmlFor, error, hint, required, className, children }: { label: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
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
      {children}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, id, className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root> & { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckboxPrimitive.Root id={id} className={cn('flex size-4 shrink-0 items-center justify-center rounded border border-gray-400 bg-white data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-fg', className)} {...props}>
        <CheckboxPrimitive.Indicator>
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
  return <div className={cn('rounded-lg border border-gray-200 bg-white', className)} {...props} />;
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

export function Dialog({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content
          aria-describedby={description ? undefined : undefined}
          className={cn('fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl', wide ? 'max-w-4xl' : 'max-w-lg')}
        >
          <div className="flex items-start justify-between border-b border-gray-200 px-5 py-3">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={description ? 'mt-0.5 text-[13px] text-gray-600' : 'sr-only'}>{description ?? title}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-gray-600 hover:bg-gray-100" aria-label="Close">
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', danger, loading, onConfirm, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; children?: ReactNode }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
          <AlertDialog.Title className="text-base font-semibold text-gray-900">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-gray-700">{description}</div>
          </AlertDialog.Description>
          {children && <div className="mt-3">{children}</div>}
          <div className="mt-4 flex justify-end gap-2">
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
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex gap-1 overflow-x-auto border-b border-gray-200', className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn('-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-gray-600 hover:text-gray-900 data-[state=active]:border-brand data-[state=active]:text-gray-900', className)} {...props} />;
}
export const TabsContent = TabsPrimitive.Content;

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export function DropdownContent({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content sideOffset={4} align="end" className={cn('z-50 min-w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg', className)} {...props} />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn('cursor-pointer rounded px-2 py-1.5 text-sm text-gray-800 outline-none data-[highlighted]:bg-gray-100', className)} {...props} />;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-600" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {children && <div className="mt-1 text-sm text-gray-600">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="px-6 py-10 text-center" role="alert">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <Button className="mt-3" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        {breadcrumb && <div className="mb-0.5 text-xs text-gray-600">{breadcrumb}</div>}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
