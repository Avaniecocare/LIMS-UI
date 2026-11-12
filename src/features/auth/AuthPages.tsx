import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useBranding, useSession } from '@/app/providers';
import { Button, Field, Input, Spinner, Textarea, usePageTitle } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { returnPath } from '@/lib/safe-path';

function AuthShell({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  const branding = useBranding();
  usePageTitle({ current: null }, title);
  const links = [
    branding?.supportEmail && { href: `mailto:${branding.supportEmail}`, label: branding.supportEmail },
    branding?.supportPhone && { href: `tel:${branding.supportPhone.replace(/[^+\d]/g, '')}`, label: branding.supportPhone },
    branding?.termsUrl && { href: branding.termsUrl, label: 'Terms' },
    branding?.privacyUrl && { href: branding.privacyUrl, label: 'Privacy' },
    branding?.privacyContactEmail && { href: `mailto:${branding.privacyContactEmail}`, label: 'Privacy requests' },
  ].filter((x): x is { href: string; label: string } => !!x);
  const showPoweredBy = branding?.poweredBy && branding.poweredByName && branding.poweredByName !== branding.productName;
  return (
    <main className="auth-backdrop flex min-h-full items-center justify-center p-4">
      <div
        className={`flex w-full overflow-hidden rounded-xl border-t-4 border-accent-brand bg-surface shadow-lg ${branding?.loginImageUrl ? (wide ? 'max-w-4xl' : 'max-w-3xl') : wide ? 'max-w-xl' : 'max-w-sm'}`}
      >
        {branding?.loginImageUrl && <img src={branding.loginImageUrl} alt="" className="hidden w-1/2 object-cover md:block" />}
        <div className="flex-1 p-6">
          <div className="mb-5 flex items-center gap-3">
            {branding && <img src={branding.logoUrl} alt={`${branding.companyName} logo`} className="size-14 rounded object-contain" />}
            <div>
              <p className="text-sm font-semibold text-gray-900">{branding?.productName}</p>
              {branding?.companyName !== branding?.productName && <p className="text-xs text-gray-600">{branding?.companyName}</p>}
              {branding?.loginTagline && <p className="mt-0.5 text-xs text-gray-700">{branding.loginTagline}</p>}
            </div>
          </div>
          <h1 className="mb-4 text-lg font-semibold text-gray-900">{title}</h1>
          {children}
          {(links.length > 0 || showPoweredBy) && (
            <div className="mt-6 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
              {links.length > 0 && (
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  {links.map((l) => (
                    <a key={l.href} href={l.href} className="underline" target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                      {l.label}
                    </a>
                  ))}
                </p>
              )}
              {showPoweredBy && <p>Powered by {branding!.poweredByName}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const loginSchema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });

export function LoginPage() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const [params] = useSearchParams();
  const changed = params.get('changed') === '1';

  const signedIn = (user: Parameters<typeof setUser>[0]) => {
    setUser(user);
    // Back to the page that sent the user here (a link from an email or notification), never off-site.
    navigate(returnPath(location.state), { replace: true });
  };
  const login = useMutation({
    mutationFn: async (values: z.infer<typeof loginSchema>) => unwrap(await api.POST('/api/v1/auth/login', { body: values })),
    onSuccess: (r) => {
      setError(null);
      if (r.totpChallenge) setChallenge(r.totpChallenge);
      else signedIn(r.user ?? null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not sign in'),
  });
  const totp = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/auth/login/totp', { body: { challenge: challenge!, code } })),
    onSuccess: (r) => signedIn(r.user ?? null),
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not sign in'),
  });

  if (challenge) {
    return (
      <AuthShell title="Enter your code">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            totp.mutate();
          }}
        >
          <Field label="6-digit code from your authenticator app" htmlFor="code" error={error ?? undefined}>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={totp.isPending}>
            Verify
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in">
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
        {changed && !error && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900" role="status">
            Password changed. Sign in with your new password.
          </p>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" autoFocus aria-invalid={!!form.formState.errors.email} {...form.register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!form.formState.errors.password} {...form.register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
        <p className="text-center text-[13px]">
          <Link to="/forgot-password" className="text-gray-700 underline">
            Forgot password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const m = useMutation({ mutationFn: () => api.POST('/api/v1/auth/forgot-password', { body: { email } }) });
  return (
    <AuthShell title="Reset your password">
      {m.isSuccess ? (
        <p className="text-sm text-gray-800">If that email has an account, a reset link is on its way. The link works for one hour.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <Field label="Email" htmlFor="email" error={m.error?.message}>
            <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={m.isPending}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-3 text-center text-[13px]">
        <Link to="/login" className="text-gray-700 underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const m = useMutation({ mutationFn: () => api.POST('/api/v1/auth/reset-password', { body: { token: params.get('token') ?? '', newPassword: password } }) });
  return (
    <AuthShell title="Choose a new password">
      {m.isSuccess ? (
        <p className="text-sm text-gray-800">
          Your password has been changed.{' '}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <Field label="New password" htmlFor="password" hint="At least 10 characters, with upper and lower case, a digit and a symbol." error={m.error?.message}>
            <Input id="password" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={m.isPending}>
            Set password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

const setupSchema = z.object({
  setupToken: z.string().optional(),
  adminName: z.string().min(2, 'Enter a name'),
  adminEmail: z.email('Enter a valid email'),
  adminPassword: z.string().min(10, 'At least 10 characters'),
  gstRate: z.coerce.number<number>().min(0).max(100),
  defaultCreditDays: z.coerce.number<number>().int().min(0),
  sampleRetentionDays: z.coerce.number<number>().int().min(0),
  reportRetentionYears: z.coerce.number<number>().int().min(0),
  quotationTerms: z.string().optional(),
  invoiceTerms: z.string().optional(),
  reportTerms: z.string().optional(),
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** First run only: creates the first Admin and the lab's operating settings. */
export function SetupPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ['setup-status'], queryFn: async () => unwrap(await api.GET('/api/v1/public/setup-status')) });
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]);
  const form = useForm({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      setupToken: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      gstRate: 18,
      defaultCreditDays: 30,
      sampleRetentionDays: 90,
      reportRetentionYears: 5,
      quotationTerms: '',
      invoiceTerms: '',
      reportTerms: '',
    },
  });
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: z.infer<typeof setupSchema>) =>
      unwrap(
        await api.POST('/api/v1/public/setup', {
          body: {
            setupToken: v.setupToken || undefined,
            adminEmail: v.adminEmail,
            adminName: v.adminName,
            adminPassword: v.adminPassword,
            gstRate: v.gstRate,
            defaultCreditDays: v.defaultCreditDays,
            sampleRetentionDays: v.sampleRetentionDays,
            reportRetentionYears: v.reportRetentionYears,
            workingDays,
            terms: { quotation: v.quotationTerms || undefined, invoice: v.invoiceTerms || undefined, report: v.reportTerms || undefined },
          },
        }),
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['setup-status'] });
      navigate('/login');
    },
    onError: (err) => applyServerErrors(err, form.setError),
  });

  return (
    <AuthShell title="Set up your laboratory" wide>
      <form className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        {status.data?.tokenRequired && (
          <Field label="Setup token" htmlFor="setupToken" hint="Provided when this deployment was provisioned." error={e.setupToken?.message}>
            <Input id="setupToken" {...form.register('setupToken')} />
          </Field>
        )}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900">First Admin user</legend>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="adminName" error={e.adminName?.message} required>
              <Input id="adminName" autoComplete="name" {...form.register('adminName')} />
            </Field>
            <Field label="Email" htmlFor="adminEmail" error={e.adminEmail?.message} required>
              <Input id="adminEmail" type="email" autoComplete="username" {...form.register('adminEmail')} />
            </Field>
          </div>
          <Field label="Password" htmlFor="adminPassword" hint="At least 10 characters, with upper and lower case, a digit and a symbol." error={e.adminPassword?.message} required>
            <Input id="adminPassword" type="password" autoComplete="new-password" {...form.register('adminPassword')} />
          </Field>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900">Operating settings</legend>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <Field label="GST rate (%)" htmlFor="gstRate" error={e.gstRate?.message}>
              <Input id="gstRate" type="number" step="1" {...form.register('gstRate')} />
            </Field>
            <Field label="Default credit days" htmlFor="defaultCreditDays" error={e.defaultCreditDays?.message}>
              <Input id="defaultCreditDays" type="number" {...form.register('defaultCreditDays')} />
            </Field>
            <Field label="Sample retention (days)" htmlFor="sampleRetentionDays" error={e.sampleRetentionDays?.message}>
              <Input id="sampleRetentionDays" type="number" {...form.register('sampleRetentionDays')} />
            </Field>
            <Field label="Report retention (years)" htmlFor="reportRetentionYears" error={e.reportRetentionYears?.message}>
              <Input id="reportRetentionYears" type="number" {...form.register('reportRetentionYears')} />
            </Field>
          </div>
          <div>
            <p className="mb-1 text-[13px] font-medium text-gray-700">Working days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={workingDays.includes(i)}
                  className={`rounded-md border px-2.5 py-1 text-[13px] ${workingDays.includes(i) ? 'border-brand bg-brand text-brand-fg' : 'border-gray-300 bg-surface text-gray-800'}`}
                  onClick={() => setWorkingDays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort()))}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900">Terms and conditions</legend>
          <Field label="Quotation terms" htmlFor="quotationTerms">
            <Textarea id="quotationTerms" {...form.register('quotationTerms')} />
          </Field>
          <Field label="Invoice terms" htmlFor="invoiceTerms">
            <Textarea id="invoiceTerms" {...form.register('invoiceTerms')} />
          </Field>
          <Field label="Report terms" htmlFor="reportTerms">
            <Textarea id="reportTerms" {...form.register('reportTerms')} />
          </Field>
        </fieldset>
        <Button type="submit" className="w-full" loading={m.isPending}>
          Finish setup
        </Button>
      </form>
    </AuthShell>
  );
}

/** After an admin sets a temporary password, this is the only thing the account can do. */
export function RequiredPasswordChangePage() {
  const { user, loading, setUser } = useSession();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [repeat, setRepeat] = useState('');
  const [mismatch, setMismatch] = useState(false);
  // Clearing the session re-renders this page, so the redirect below is what takes the user away.
  const [changed, setChanged] = useState(false);
  const change = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/change-password', { body: { currentPassword, newPassword } }),
    onSuccess: () => {
      setChanged(true);
      setUser(null);
    },
  });
  const leave = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/logout'),
    onSettled: () => setUser(null),
  });
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={changed ? '/login?changed=1' : '/login'} replace />;
  if (!user.mustChangePassword) return <Navigate to="/" replace />;
  return (
    <AuthShell title="Choose a new password">
      <p className="mb-3 text-sm text-gray-800">Your password was set by an administrator. Choose your own to continue, then sign in again.</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const same = newPassword === repeat;
          setMismatch(!same);
          if (same) change.mutate();
        }}
      >
        <Field label="Current password" htmlFor="current-password" required>
          <Input id="current-password" type="password" autoComplete="current-password" required autoFocus value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="new-password" required hint="At least 10 characters, with upper and lower case, a digit and a symbol." error={change.error?.message}>
          <Input id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </Field>
        <Field label="Repeat new password" htmlFor="repeat-password" required error={mismatch ? 'The passwords do not match' : undefined}>
          <Input id="repeat-password" type="password" autoComplete="new-password" required aria-invalid={mismatch} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" loading={change.isPending}>
          Change password
        </Button>
        <Button variant="ghost" className="w-full" loading={leave.isPending} onClick={() => leave.mutate()}>
          Sign out
        </Button>
      </form>
    </AuthShell>
  );
}
