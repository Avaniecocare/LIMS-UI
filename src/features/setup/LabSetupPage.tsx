import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleCheck, Mail, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSession } from '@/app/providers';
import { Button, Card, CardHeader, Checkbox, ConfirmDialog, ErrorState, Field, Input, PageHeader, Spinner } from '@/components/ui/primitives';
import { BrandingForm, LabProfileForm, useLab } from '@/features/admin/LabSettings';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { SETUP_KEY, useSetupStatus } from './setup-status';
import { toastError } from '@/lib/forms';
import { DirtyScope, useDirtyScope, useLeaveGuard } from '@/lib/use-leave-guard';

const STEPS = [
  { id: 'profile', label: 'Lab profile' },
  { id: 'branding', label: 'Branding' },
  { id: 'catalogue', label: 'Lab type' },
  { id: 'team', label: 'Team' },
  { id: 'email', label: 'Email' },
  { id: 'review', label: 'Review' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

/**
 * The guided setup an administrator sees after the first sign-in: the lab's details, its look, a starting test
 * catalogue, the team, email, then a review. Every step can be revisited later in Admin, and none needs a restart.
 */
export default function LabSetupPage() {
  const [step, setStep] = useState<StepId>('profile');
  const lab = useLab();
  const status = useSetupStatus();
  const client = useQueryClient();
  const index = STEPS.findIndex((s) => s.id === step);
  const next = () => {
    void client.invalidateQueries({ queryKey: SETUP_KEY });
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)].id);
    window.scrollTo({ top: 0 });
  };
  // Moving to another step replaces the form, so unsaved details are asked about first.
  const scope = useDirtyScope();
  const guard = useLeaveGuard(scope.dirty);
  const [pending, setPending] = useState<StepId | null>(null);
  const go = (to: StepId) => (scope.dirty && to !== step ? setPending(to) : setStep(to));
  if (lab.isLoading || status.isLoading) return <Spinner />;
  if (lab.error || !lab.data) return <ErrorState error={lab.error} onRetry={lab.refetch} />;
  const done = status.data?.steps;
  return (
    <DirtyScope value={scope.report}>
      {guard.dialog}
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Discard your changes?"
        description="Some details on this step have not been saved."
        confirmLabel="Discard changes"
        danger
        onConfirm={() => {
          if (pending) setStep(pending);
          setPending(null);
        }}
      />
      <PageHeader title="Set up your laboratory" description="A few minutes now saves time on every report and invoice. You can change all of this later in Admin." />
      <ol className="mb-5 flex flex-wrap gap-2" aria-label="Setup steps">
        {STEPS.map((s, i) => {
          const complete = s.id !== 'review' && done?.[s.id as keyof typeof done];
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-current={s.id === step ? 'step' : undefined}
                onClick={() => go(s.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]',
                  s.id === step ? 'border-brand bg-brand text-brand-fg' : 'border-gray-300 bg-surface text-gray-800 hover:border-gray-500',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                    s.id === step ? 'bg-white/20' : complete ? 'bg-green-100 text-green-800' : 'bg-gray-100',
                  )}
                >
                  {complete ? <Check className="size-3" aria-label="done" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      {step === 'profile' && <LabProfileForm lab={lab.data} submitLabel="Save and continue" onSaved={next} />}
      {step === 'branding' && (
        <div className="space-y-3">
          <BrandingForm lab={lab.data} submitLabel="Save and continue" onSaved={next} />
          <SkipRow onSkip={() => go(STEPS[index + 1].id)} />
        </div>
      )}
      {step === 'catalogue' && <TemplatesStep onDone={next} />}
      {step === 'team' && <TeamStep onDone={next} />}
      {step === 'email' && <EmailStep onDone={next} />}
      {step === 'review' && <ReviewStep status={status.data} onGoTo={setStep} />}
    </DirtyScope>
  );
}

function SkipRow({ onSkip, label = 'Skip for now' }: { onSkip: () => void; label?: string }) {
  return (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={onSkip}>
        {label}
      </Button>
    </div>
  );
}

function TemplatesStep({ onDone }: { onDone: () => void }) {
  const templates = useQuery({ queryKey: ['lab-templates'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/templates')) });
  const [chosen, setChosen] = useState<string[]>([]);
  const client = useQueryClient();
  const apply = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/lab/templates/apply', { body: { templates: chosen } })),
    onSuccess: (r) => {
      void client.invalidateQueries({ queryKey: ['test-options'] });
      const tests = r.created.tests ?? 0;
      toast.success(tests ? `${tests} tests added, with their parameters, methods and limits.` : 'Everything in these templates was already there.');
      onDone();
    },
    onError: toastError,
  });
  if (templates.isLoading) return <Spinner />;
  if (templates.error) return <ErrorState error={templates.error} onRetry={templates.refetch} />;
  return (
    <Card>
      <CardHeader
        title="What does your laboratory test?"
        description="Pick one or more to start with a ready test catalogue: tests, parameters, methods, regulatory limits and packages, built from public standards. Prices and accreditation are not set; you add those. Nothing you already have is changed."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 md:grid-cols-2">
        {templates.data?.map((t) => {
          const on = chosen.includes(t.id);
          return (
            <label key={t.id} htmlFor={`tpl-${t.id}`} className={cn('flex cursor-pointer gap-3 rounded-lg border p-3', on ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-400')}>
              <Checkbox id={`tpl-${t.id}`} checked={on} onCheckedChange={(v) => setChosen((c) => (v === true ? [...c, t.id] : c.filter((x) => x !== t.id)))} aria-label={t.name} />
              <span className="space-y-1 text-[13px]">
                <span className="block font-semibold text-gray-900">{t.name}</span>
                <span className="block text-gray-700">{t.description}</span>
                <span className="block text-xs text-gray-600">
                  {t.tests} tests{t.packages ? ` · ${t.packages} package${t.packages === 1 ? '' : 's'}` : ''}
                  {t.specifications.length ? ` · limits: ${t.specifications.join(', ')}` : ''}
                </span>
                <span className="block text-xs text-gray-600">e.g. {t.sample.slice(0, 4).join(', ')}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 p-4">
        <span className="mr-auto text-xs text-gray-600">Testing something else? Skip this and add tests in Masters, or import them from a spreadsheet.</span>
        <Button variant="ghost" onClick={onDone}>
          Skip for now
        </Button>
        <Button disabled={!chosen.length} loading={apply.isPending} onClick={() => apply.mutate()}>
          Add {chosen.length ? `${chosen.length} ` : ''}to my catalogue
        </Button>
      </div>
    </Card>
  );
}

function TeamStep({ onDone }: { onDone: () => void }) {
  return (
    <Card>
      <CardHeader
        title="Bring in your team"
        description="Give each person their own sign-in and a role: reception, planner, analyst, reviewer, signatory, accounts and so on. Each role sees only what its work needs."
      />
      <div className="space-y-3 p-4 text-[13px] text-gray-800">
        <p className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
          Add people in Admin, Users. Each gets a temporary password to change at first sign-in. You can do this now in a new tab, or later.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => window.open('/admin?tab=users', '_blank', 'noopener')}>
            Open Users in a new tab
          </Button>
          <Button onClick={onDone}>Continue</Button>
        </div>
      </div>
    </Card>
  );
}

function EmailStep({ onDone }: { onDone: () => void }) {
  const { user } = useSession();
  const [to, setTo] = useState(user?.email ?? '');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const client = useQueryClient();
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/lab/setup/test-email', { body: { to } })),
    onSuccess: () => {
      setResult({ ok: true, text: `Sent to ${to}. Check the inbox (and spam folder): it should carry your lab's name and colours.` });
      void client.invalidateQueries({ queryKey: SETUP_KEY });
    },
    onError: (e) => setResult({ ok: false, text: e instanceof Error ? e.message : 'The email could not be sent.' }),
  });
  return (
    <Card>
      <CardHeader
        title="Check that emails go out"
        description="Acknowledgements, reports, invoices and reminders are emailed from the server's mail account with your lab's name. Send yourself a test."
      />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Send a test email to" htmlFor="setup-email" className="min-w-64 flex-1">
            <Input id="setup-email" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button variant="secondary" loading={send.isPending} disabled={!to.includes('@')} onClick={() => send.mutate()}>
            <Mail aria-hidden />
            Send test email
          </Button>
        </div>
        {result && (
          <p role="status" className={cn('rounded-md border px-3 py-2 text-[13px]', result.ok ? 'border-green-300 bg-green-50 text-green-900' : 'border-red-300 bg-red-50 text-red-900')}>
            {result.text}
            {!result.ok && ' The mail server settings are in the installation’s .env file (SMTP_HOST and the rest); ask whoever installed the system.'}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Skip for now
          </Button>
          <Button onClick={onDone}>Continue</Button>
        </div>
      </div>
    </Card>
  );
}

function ReviewStep({ status, onGoTo }: { status: ReturnType<typeof useSetupStatus>['data']; onGoTo: (s: StepId) => void }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const finish = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/lab/setup/complete')),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: SETUP_KEY });
      toast.success('Your laboratory is set up.');
      navigate('/', { replace: true });
    },
    onError: toastError,
  });
  const items: { id: StepId; label: string; done: boolean; todo: string }[] = [
    { id: 'profile', label: 'Lab profile', done: !!status?.steps.profile, todo: 'Add the laboratory address, email and state, so they print on documents.' },
    { id: 'branding', label: 'Branding', done: !!status?.steps.branding, todo: 'Upload the logo and choose colours. Until then, initials and neutral colours are used.' },
    { id: 'catalogue', label: 'Test catalogue', done: !!status?.steps.catalogue, todo: 'No tests yet: add them from a template, in Masters, or by spreadsheet import.' },
    { id: 'team', label: 'Team', done: !!status?.steps.team, todo: 'Only you can sign in so far.' },
    { id: 'email', label: 'Email', done: !!status?.steps.email, todo: 'Emails have not been tested yet.' },
  ];
  return (
    <Card>
      <CardHeader title="Review" description="Anything not done yet can be finished later; the dashboard reminds you until it is." />
      <ul className="divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
            <span className="flex items-start gap-2">
              <CircleCheck className={cn('mt-0.5 size-4 shrink-0', it.done ? 'text-green-700' : 'text-gray-300')} aria-hidden />
              <span>
                <span className="font-medium text-gray-900">{it.label}</span>
                {!it.done && <span className="block text-gray-600">{it.todo}</span>}
              </span>
            </span>
            {!it.done && (
              <Button variant="secondary" size="sm" onClick={() => onGoTo(it.id)}>
                Do it now
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 p-4">
        <span className="mr-auto text-xs text-gray-600">
          Prices go in{' '}
          <Link to="/masters" className="underline">
            Masters
          </Link>
          ; operating settings (GST rate, working days, numbering) in{' '}
          <Link to="/admin?tab=settings" className="underline">
            Admin, Settings
          </Link>
          .
        </span>
        <Button loading={finish.isPending} onClick={() => finish.mutate()}>
          Finish setup
        </Button>
      </div>
    </Card>
  );
}
