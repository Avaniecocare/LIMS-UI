import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { applyBranding, useBranding, useSession } from '@/app/providers';
import { StatePicker } from '@/components/StatePicker';
import { Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, Spinner, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap, uploadFile } from '@/lib/api';
import { lookupGstin } from '@/lib/autofill';
import { isConflict, toastError } from '@/lib/forms';
import { useLeaveGuard } from '@/lib/use-leave-guard';

type Lab = components['schemas']['LabDetailsDto'];
type Profile = Lab['profile'];

const LAB_KEY = ['lab'];
export const useLab = () => useQuery({ queryKey: LAB_KEY, queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab')) });

const opt = z.string().trim();
const profileSchema = z.object({
  companyName: z.string().trim().min(1, 'Enter the laboratory name').max(200),
  legalName: z.string().trim().min(1, 'Enter the legal name').max(250),
  labAddress: opt.max(500),
  registeredAddress: opt.max(500),
  phone: opt.max(40),
  email: opt.max(254),
  website: opt.max(200),
  reportVerificationEmail: opt.max(254),
  gstin: opt.toUpperCase().max(15),
  pan: opt.toUpperCase().max(10),
  cin: opt.toUpperCase().max(21),
  stateName: opt.max(80),
  gstStateCode: opt.max(2),
  sacCode: opt.min(1, 'Enter the SAC code').max(10),
  sacDescription: opt.max(200),
  bank: z.object({ accountName: opt.max(200), accountNumber: opt.max(40), bankName: opt.max(120), branch: opt.max(120), ifsc: opt.toUpperCase().max(11), swift: opt.toUpperCase().max(11) }),
  accreditation: z.object({ certificationText: opt.max(300), nablMode: z.boolean(), nablCertificateNo: opt.max(60), ulrFormat: opt.max(80) }),
  documentPrefix: z.string().trim().regex(/^[A-Za-z0-9-]{1,10}$/, '1-10 letters, digits or hyphens'),
  supportEmail: opt.max(254),
  supportPhone: opt.max(40),
  termsUrl: opt.max(300),
  privacyUrl: opt.max(300),
  privacyContactName: opt.max(200),
  privacyContactEmail: opt.max(254),
});
type ProfileValues = z.infer<typeof profileSchema>;

const toForm = (p: Profile): ProfileValues => ({
  ...p,
  cin: p.cin ?? '',
  website: p.website ?? '',
  bank: { ...p.bank, swift: p.bank.swift ?? '' },
  accreditation: { ...p.accreditation, certificationText: p.accreditation.certificationText ?? '', nablCertificateNo: p.accreditation.nablCertificateNo ?? '', ulrFormat: p.accreditation.ulrFormat ?? '' },
  supportEmail: p.supportEmail ?? '',
  supportPhone: p.supportPhone ?? '',
  termsUrl: p.termsUrl ?? '',
  privacyUrl: p.privacyUrl ?? '',
  privacyContactName: p.privacyContactName ?? '',
  privacyContactEmail: p.privacyContactEmail ?? '',
});
const orNull = (v: string) => v.trim() || null;
const toBody = (v: ProfileValues): Profile => ({
  ...v,
  cin: orNull(v.cin),
  website: orNull(v.website),
  bank: { ...v.bank, swift: orNull(v.bank.swift) },
  accreditation: { nablMode: v.accreditation.nablMode, certificationText: orNull(v.accreditation.certificationText), nablCertificateNo: orNull(v.accreditation.nablCertificateNo), ulrFormat: orNull(v.accreditation.ulrFormat) },
  supportEmail: orNull(v.supportEmail),
  supportPhone: orNull(v.supportPhone),
  termsUrl: orNull(v.termsUrl),
  privacyUrl: orNull(v.privacyUrl),
  privacyContactName: orNull(v.privacyContactName),
  privacyContactEmail: orNull(v.privacyContactEmail),
});

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}

/**
 * The laboratory as it appears on reports, quotations, invoices and emails. Saving needs the password confirmed,
 * applies to new documents at once, and never changes documents already issued.
 */
export function LabProfileForm({ lab, onSaved, submitLabel = 'Save lab profile' }: { lab: Lab; onSaved?: (lab: Lab) => void; submitLabel?: string }) {
  const client = useQueryClient();
  const { can } = useSession();
  const canEdit = can('admin.company.edit');
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: toForm(lab.profile) });
  useEffect(() => form.reset(toForm(lab.profile)), [lab.profile, form]);
  const guard = useLeaveGuard(form.formState.isDirty && canEdit);
  const [gstinNote, setGstinNote] = useState('');
  const e = form.formState.errors;
  const save = useMutation({
    mutationFn: async (v: ProfileValues) => unwrap(await api.PUT('/api/v1/admin/lab/profile', { body: { version: lab.profileVersion, profile: toBody(v) } })),
    onSuccess: (next) => {
      client.setQueryData(LAB_KEY, next);
      void client.invalidateQueries({ queryKey: ['branding'] });
      form.reset(toForm(next.profile));
      toast.success('Lab profile saved. New documents use it from now on.');
      onSaved?.(next);
    },
    onError: (err) => {
      if (isConflict(err)) {
        toast.error('Someone else changed the profile. It has been reloaded.');
        void client.invalidateQueries({ queryKey: LAB_KEY });
      } else if (err instanceof ApiError && err.fields.length) {
        for (const f of err.fields) form.setError(f.field as never, { type: 'server', message: f.message });
      } else toastError(err);
    },
  });
  const onGstin = async (value: string) => {
    const info = await lookupGstin(value);
    if (!info) return;
    const o = { shouldDirty: true, shouldValidate: true };
    if (info.stateName) form.setValue('stateName', info.stateName, o);
    if (info.stateCode) form.setValue('gstStateCode', info.stateCode, o);
    if (info.pan) form.setValue('pan', info.pan, o);
    setGstinNote(`State ${info.stateName ?? ''} (${info.stateCode}) and PAN filled from the GSTIN.`);
  };
  const nabl = form.watch('accreditation.nablMode');
  const text = (name: keyof ProfileValues | `bank.${string}` | `accreditation.${string}`, label: string, opts: { hint?: string; required?: boolean; type?: string; upper?: boolean; full?: boolean } = {}) => {
    const err = name.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], e) as { message?: string } | undefined;
    const id = `lab-${name.replace('.', '-')}`;
    return (
      <Field label={label} htmlFor={id} hint={opts.hint} required={opts.required} error={err?.message} className={opts.full ? 'md:col-span-2' : undefined}>
        <Input id={id} type={opts.type ?? 'text'} className={opts.upper ? 'uppercase' : undefined} aria-invalid={!!err} {...form.register(name as never)} />
      </Field>
    );
  };
  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      {guard.dialog}
      <fieldset disabled={!canEdit} className="space-y-4">
        <Section title="Laboratory" description="Printed on every report, quotation and invoice, and used in emails.">
          {text('companyName', 'Laboratory name', { required: true, hint: 'As people know it, e.g. on the letterhead' })}
          {text('legalName', 'Legal name', { required: true, hint: 'As registered, e.g. ending Private Limited' })}
          <Field label="Laboratory address" htmlFor="lab-labAddress" className="md:col-span-2">
            <Textarea id="lab-labAddress" rows={2} {...form.register('labAddress')} />
          </Field>
          <Field label="Registered office address" htmlFor="lab-registeredAddress" hint="If different from the laboratory" className="md:col-span-2">
            <Textarea id="lab-registeredAddress" rows={2} {...form.register('registeredAddress')} />
          </Field>
          {text('phone', 'Phone', { type: 'tel' })}
          {text('email', 'Email', { type: 'email' })}
          {text('website', 'Website', { hint: 'Starting https://' })}
        </Section>
        <Section title="Tax registration" description="For GST invoices. Entering the GSTIN fills the state and PAN.">
          <Field label="GSTIN" htmlFor="lab-gstin" hint={gstinNote || undefined} error={e.gstin?.message}>
            <Input id="lab-gstin" className="uppercase" maxLength={15} aria-invalid={!!e.gstin} {...form.register('gstin', { onChange: (ev) => void onGstin(ev.target.value) })} />
          </Field>
          {text('pan', 'PAN', { upper: true })}
          <Field label="State" htmlFor="lab-state" error={e.stateName?.message}>
            <Controller
              control={form.control}
              name="stateName"
              render={({ field }) => (
                <StatePicker
                  id="lab-state"
                  value={field.value}
                  onChange={(name, code) => {
                    form.setValue('stateName', name, { shouldDirty: true });
                    form.setValue('gstStateCode', code ?? '', { shouldDirty: true, shouldValidate: true });
                  }}
                />
              )}
            />
          </Field>
          {text('gstStateCode', 'GST state code')}
          {text('cin', 'CIN', { upper: true, hint: 'Companies only' })}
          {text('sacCode', 'SAC code', { required: true, hint: '998346 is technical testing and analysis' })}
          {text('sacDescription', 'SAC description', { full: true })}
        </Section>
        <Section title="Bank account" description="Printed on invoices for payment.">
          {text('bank.accountName', 'Account name')}
          {text('bank.accountNumber', 'Account number')}
          {text('bank.bankName', 'Bank')}
          {text('bank.branch', 'Branch')}
          {text('bank.ifsc', 'IFSC', { upper: true })}
          {text('bank.swift', 'SWIFT', { upper: true, hint: 'Only for payments from abroad' })}
        </Section>
        <Section title="Accreditation" description="NABL mode prints the NABL details and a ULR number on reports of accredited tests.">
          {text('accreditation.certificationText', 'Certification line on reports', { full: true, hint: 'e.g. ISO/IEC 17025:2017 accredited laboratory' })}
          <div className="md:col-span-2">
            <Controller control={form.control} name="accreditation.nablMode" render={({ field }) => <Checkbox id="lab-nabl" label="NABL mode" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
          </div>
          {nabl && text('accreditation.nablCertificateNo', 'NABL certificate number', { required: true })}
          {nabl && text('accreditation.ulrFormat', 'ULR format', { required: true, hint: 'e.g. TC1234{YY}{SEQ:8}F' })}
        </Section>
        <Section title="Documents" description="How document numbers start, and the address on the report verification line.">
          {text('documentPrefix', 'Document prefix', { required: true, hint: 'e.g. SL gives SL/TR/26-27/000001. Applies to new numbers only.' })}
          {text('reportVerificationEmail', 'Report verification email', { type: 'email' })}
        </Section>
        <Section title="Support and legal" description="Shown on the sign-in page and in email footers.">
          {text('supportEmail', 'Support email', { type: 'email' })}
          {text('supportPhone', 'Support phone', { type: 'tel' })}
          {text('termsUrl', 'Terms of service link', { hint: 'Starting https://' })}
          {text('privacyUrl', 'Privacy policy link', { hint: 'Starting https://' })}
          {text('privacyContactName', 'Privacy contact', { hint: 'Who answers privacy requests and grievances (DPDP Act)' })}
          {text('privacyContactEmail', 'Privacy contact email', { type: 'email', hint: 'Shown in email footers and on the sign-in page' })}
        </Section>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty && submitLabel === 'Save lab profile'}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

export function LabProfileTab() {
  const lab = useLab();
  if (lab.isLoading) return <Spinner />;
  if (lab.error || !lab.data) return <ErrorState error={lab.error} onRetry={lab.refetch} />;
  return <LabProfileForm lab={lab.data} />;
}

// ---------------------------------------------------------------- branding

const COLOR = /^#[0-9a-fA-F]{6}$/;
const brandingSchema = z.object({
  appName: z.string().trim().max(60),
  primaryColor: z.string().regex(COLOR, 'A colour like #1a2b3c'),
  accentColor: z.string().regex(COLOR, 'A colour like #1a2b3c'),
  surfaceColor: z.string().regex(COLOR, 'A colour like #1a2b3c'),
  navColor: z.string().regex(COLOR, 'A colour like #1a2b3c'),
  loginTagline: z.string().trim().max(160),
  poweredBy: z.boolean(),
});
type BrandingValues = z.infer<typeof brandingSchema>;

/** Ready-made palettes that pass contrast checks, as a starting point. */
// TODO(product-decision): the palettes offered; each keeps text readable on its colours.
export const PRESETS: { name: string; colors: Pick<BrandingValues, 'primaryColor' | 'accentColor' | 'surfaceColor' | 'navColor'> }[] = [
  // Dark menu
  { name: 'Slate', colors: { primaryColor: '#334155', accentColor: '#475569', surfaceColor: '#f5f6f8', navColor: '#1e293b' } },
  { name: 'Forest', colors: { primaryColor: '#1b6b5a', accentColor: '#c8a24a', surfaceColor: '#f7f8f6', navColor: '#0b1f1c' } },
  { name: 'Ocean', colors: { primaryColor: '#0f4c81', accentColor: '#0e7490', surfaceColor: '#f4f7fb', navColor: '#0b2540' } },
  { name: 'Maroon', colors: { primaryColor: '#7f1d1d', accentColor: '#b45309', surfaceColor: '#faf7f5', navColor: '#2b0b0b' } },
  { name: 'Indigo', colors: { primaryColor: '#3730a3', accentColor: '#6d28d9', surfaceColor: '#f6f6fb', navColor: '#1e1b4b' } },
  { name: 'Teal', colors: { primaryColor: '#0f766e', accentColor: '#0d9488', surfaceColor: '#f4f9f8', navColor: '#042f2e' } },
  { name: 'Emerald', colors: { primaryColor: '#047857', accentColor: '#65a30d', surfaceColor: '#f5faf6', navColor: '#022c22' } },
  { name: 'Navy and gold', colors: { primaryColor: '#1e3a8a', accentColor: '#ca8a04', surfaceColor: '#f5f7fb', navColor: '#0b1736' } },
  { name: 'Royal blue', colors: { primaryColor: '#1d4ed8', accentColor: '#0ea5e9', surfaceColor: '#f4f7fe', navColor: '#172554' } },
  { name: 'Midnight', colors: { primaryColor: '#312e81', accentColor: '#0891b2', surfaceColor: '#f6f6fb', navColor: '#0f0d2e' } },
  { name: 'Plum', colors: { primaryColor: '#6b21a8', accentColor: '#db2777', surfaceColor: '#faf6fc', navColor: '#2e1065' } },
  { name: 'Rose', colors: { primaryColor: '#be123c', accentColor: '#9333ea', surfaceColor: '#fdf6f8', navColor: '#4c0519' } },
  { name: 'Crimson', colors: { primaryColor: '#b91c1c', accentColor: '#d97706', surfaceColor: '#fdf7f6', navColor: '#3f0d0d' } },
  { name: 'Saffron', colors: { primaryColor: '#c2410c', accentColor: '#15803d', surfaceColor: '#fdf8f3', navColor: '#431407' } },
  { name: 'Terracotta', colors: { primaryColor: '#9a3412', accentColor: '#a16207', surfaceColor: '#fbf7f4', navColor: '#2c1206' } },
  { name: 'Cocoa', colors: { primaryColor: '#7c2d12', accentColor: '#b45309', surfaceColor: '#faf7f5', navColor: '#2a1508' } },
  { name: 'Olive', colors: { primaryColor: '#4d7c0f', accentColor: '#a16207', surfaceColor: '#f8faf3', navColor: '#1a2e05' } },
  { name: 'Charcoal', colors: { primaryColor: '#1f2937', accentColor: '#ea580c', surfaceColor: '#f6f7f9', navColor: '#111827' } },
  { name: 'Steel', colors: { primaryColor: '#475569', accentColor: '#0284c7', surfaceColor: '#f5f7fa', navColor: '#1e293b' } },
  // Light menu
  { name: 'Clean white', colors: { primaryColor: '#0369a1', accentColor: '#0ea5e9', surfaceColor: '#f8fafc', navColor: '#ffffff' } },
  { name: 'Mint', colors: { primaryColor: '#0f766e', accentColor: '#10b981', surfaceColor: '#f6fbf9', navColor: '#ecfdf5' } },
  { name: 'Sky', colors: { primaryColor: '#1d4ed8', accentColor: '#38bdf8', surfaceColor: '#f5f9ff', navColor: '#eff6ff' } },
  { name: 'Lavender', colors: { primaryColor: '#6d28d9', accentColor: '#a855f7', surfaceColor: '#faf8ff', navColor: '#f5f3ff' } },
  { name: 'Sand', colors: { primaryColor: '#92400e', accentColor: '#ca8a04', surfaceColor: '#fdfaf5', navColor: '#fef3c7' } },
];

function ColorField({ id, label, hint, value, onChange, error }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-surface p-0.5" value={COLOR.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} />
        <Input id={id} className="font-mono uppercase" maxLength={7} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

const IMAGES: { kind: 'logo' | 'favicon' | 'login'; label: string; hint: string; field: 'logoFileId' | 'faviconFileId' | 'loginImageFileId' }[] = [
  { kind: 'logo', label: 'Logo', hint: 'On screens, reports, quotations and invoices. A wide PNG with a transparent background works best.', field: 'logoFileId' },
  { kind: 'favicon', label: 'Browser tab icon', hint: 'A square PNG, at least 64 × 64.', field: 'faviconFileId' },
  { kind: 'login', label: 'Sign-in picture', hint: 'Beside the sign-in form on wide screens, e.g. the laboratory. Optional.', field: 'loginImageFileId' },
];

function BrandImages({ lab }: { lab: Lab }) {
  const client = useQueryClient();
  const branding = useBranding();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const done = (next: Lab) => {
    client.setQueryData(LAB_KEY, next);
    void client.invalidateQueries({ queryKey: ['branding'] });
  };
  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: string; file: File }) => {
      const form = new FormData();
      form.set('version', String(lab.brandingVersion));
      form.set('file', file);
      return (await uploadFile(`/admin/lab/branding/${kind}`, form)) as Lab;
    },
    onSuccess: (next) => {
      done(next);
      toast.success('Picture saved. It shows everywhere now.');
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (kind: 'logo' | 'favicon' | 'login') => unwrap(await api.DELETE('/api/v1/admin/lab/branding/{kind}', { params: { path: { kind }, query: { version: lab.brandingVersion } } })),
    onSuccess: (next) => {
      done(next);
      toast.success('Picture removed');
    },
    onError: toastError,
  });
  const src = { logo: branding?.logoUrl, favicon: branding?.faviconUrl, login: branding?.loginImageUrl ?? null };
  return (
    <Card>
      <CardHeader title="Pictures" description="PNG, JPEG or WebP, up to 2 MB. Until a logo is uploaded, the lab's initials are used." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-3">
        {IMAGES.map((img) => {
          const saved = !!lab.branding[img.field];
          return (
            <div key={img.kind} className="space-y-2">
              <p className="text-[13px] font-medium text-gray-900">{img.label}</p>
              <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-2">
                {src[img.kind] ? <img src={src[img.kind]!} alt={`Current ${img.label.toLowerCase()}`} className="max-h-24 max-w-full object-contain" /> : <span className="text-xs text-gray-600">None</span>}
              </div>
              <p className="text-xs text-gray-600">{img.hint}</p>
              <input
                ref={(el) => {
                  inputs.current[img.kind] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label={`Upload ${img.label.toLowerCase()}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate({ kind: img.kind, file });
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" loading={upload.isPending && upload.variables?.kind === img.kind} onClick={() => inputs.current[img.kind]?.click()}>
                  <ImagePlus aria-hidden />
                  {saved ? 'Replace' : 'Upload'}
                </Button>
                {saved && (
                  <Button variant="ghost" size="sm" aria-label={`Remove ${img.label.toLowerCase()}`} loading={remove.isPending && remove.variables === img.kind} onClick={() => remove.mutate(img.kind)}>
                    <Trash2 aria-hidden />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Colours, name and pictures. Changes preview on this page as you edit, apply for everyone when saved, and print on
 * documents issued from then on.
 */
export function BrandingForm({ lab, onSaved, submitLabel = 'Save branding' }: { lab: Lab; onSaved?: (lab: Lab) => void; submitLabel?: string }) {
  const client = useQueryClient();
  const current = useBranding();
  const { can } = useSession();
  const canEdit = can('admin.company.edit');
  const start = (l: Lab): BrandingValues => ({ appName: l.branding.appName ?? '', primaryColor: l.branding.primaryColor, accentColor: l.branding.accentColor, surfaceColor: l.branding.surfaceColor, navColor: l.branding.navColor, loginTagline: l.branding.loginTagline ?? '', poweredBy: l.branding.poweredBy });
  const form = useForm<BrandingValues>({ resolver: zodResolver(brandingSchema), defaultValues: start(lab) });
  useEffect(() => form.reset(start(lab)), [lab, form]);
  const guard = useLeaveGuard(form.formState.isDirty && canEdit);
  const v = form.watch();
  const e = form.formState.errors;
  // Live preview: the whole app takes the colours being edited, and goes back if they are not saved.
  const valid = [v.primaryColor, v.accentColor, v.surfaceColor, v.navColor].every((c) => COLOR.test(c));
  useEffect(() => {
    if (current && valid) applyBranding({ ...current, primaryColor: v.primaryColor, accentColor: v.accentColor, surfaceColor: v.surfaceColor, navColor: v.navColor });
  }, [current, valid, v.primaryColor, v.accentColor, v.surfaceColor, v.navColor]);
  useEffect(() => () => {
    if (current) applyBranding(current);
  }, [current]);
  const save = useMutation({
    mutationFn: async (values: BrandingValues) =>
      unwrap(await api.PUT('/api/v1/admin/lab/branding', { body: { version: lab.brandingVersion, branding: { ...values, appName: values.appName.trim() || null, loginTagline: values.loginTagline.trim() || null } } })),
    onSuccess: async (next) => {
      client.setQueryData(LAB_KEY, next);
      await client.invalidateQueries({ queryKey: ['branding'] });
      form.reset(start(next));
      toast.success('Branding saved. Everyone sees it now.');
      onSaved?.(next);
    },
    onError: (err) => (isConflict(err) ? (toast.error('Someone else changed the branding. It has been reloaded.'), void client.invalidateQueries({ queryKey: LAB_KEY })) : toastError(err)),
  });
  const setColor = (name: 'primaryColor' | 'accentColor' | 'surfaceColor' | 'navColor', value: string) => form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  return (
    <div className="space-y-4">
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        {guard.dialog}
        <fieldset disabled={!canEdit} className="space-y-4">
          <Card>
            <CardHeader title="Name and colours" description="The page previews your changes as you edit. Saving applies them for everyone, and to documents issued from then on." />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:grid-cols-[1fr_20rem]">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                <Field label="App name" htmlFor="br-appName" hint={`In the browser tab, menu and emails. Empty uses "${lab.productName}".`} error={e.appName?.message} className="md:col-span-2">
                  <Input id="br-appName" placeholder={lab.productName} {...form.register('appName')} />
                </Field>
                <div className="md:col-span-2">
                  <p className="mb-1 text-[13px] font-medium text-gray-700">Ready-made palettes</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-surface px-2.5 py-1 text-xs hover:border-gray-500"
                        onClick={() => (Object.entries(p.colors) as [keyof typeof p.colors, string][]).forEach(([k, c]) => setColor(k, c))}
                      >
                        <span className="flex" aria-hidden>
                          <span className="size-3 rounded-full" style={{ background: p.colors.primaryColor }} />
                          <span className="-ml-1 size-3 rounded-full border border-white" style={{ background: p.colors.navColor }} />
                        </span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <ColorField id="br-primary" label="Primary colour" hint="Buttons, links and headings on documents" value={v.primaryColor} error={e.primaryColor?.message} onChange={(c) => setColor('primaryColor', c)} />
                <ColorField id="br-accent" label="Accent colour" hint="Rules and highlights on documents" value={v.accentColor} error={e.accentColor?.message} onChange={(c) => setColor('accentColor', c)} />
                <ColorField id="br-nav" label="Menu colour" hint="The side menu; its text colour adjusts itself" value={v.navColor} error={e.navColor?.message} onChange={(c) => setColor('navColor', c)} />
                <ColorField id="br-surface" label="Background colour" hint="Behind the pages; keep it light" value={v.surfaceColor} error={e.surfaceColor?.message} onChange={(c) => setColor('surfaceColor', c)} />
                <Field label="Sign-in page line" htmlFor="br-tagline" hint="A short line under the name on the sign-in page. Optional." error={e.loginTagline?.message} className="md:col-span-2">
                  <Input id="br-tagline" maxLength={160} placeholder="e.g. Accurate results, on time" {...form.register('loginTagline')} />
                </Field>
                <div className="md:col-span-2">
                  <Controller control={form.control} name="poweredBy" render={({ field }) => <Checkbox id="br-powered" label={`Show "Powered by" on the sign-in page`} checked={field.value} onCheckedChange={(x) => field.onChange(x === true)} />} />
                </div>
              </div>
              <BrandPreview values={v} lab={lab} logoUrl={current?.logoUrl} />
            </div>
          </Card>
        </fieldset>
        {canEdit && (
          <div className="flex justify-end gap-2">
            {form.formState.isDirty && (
              <Button variant="secondary" onClick={() => form.reset(start(lab))}>
                <RotateCcw aria-hidden />
                Undo changes
              </Button>
            )}
            <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty && submitLabel === 'Save branding'}>
              {submitLabel}
            </Button>
          </div>
        )}
      </form>
      <BrandImages lab={lab} />
    </div>
  );
}

/** A small mock of the app and a document header in the chosen colours. */
function BrandPreview({ values, lab, logoUrl }: { values: BrandingValues; lab: Lab; logoUrl?: string }) {
  const ok = (c: string, fallback: string) => (COLOR.test(c) ? c : fallback);
  const name = values.appName.trim() || lab.productName;
  return (
    <div aria-label="Preview" className="space-y-3">
      <p className="text-[13px] font-medium text-gray-700">Preview</p>
      <div className="overflow-hidden rounded-md border border-gray-200 text-[11px]" style={{ background: ok(values.surfaceColor, '#f5f6f8') }}>
        <div className="flex">
          <div className="w-10 space-y-1.5 p-1.5" style={{ background: ok(values.navColor, '#f5f6f8') }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-5 rounded" style={{ background: i === 0 ? ok(values.primaryColor, '#334155') : 'rgba(128,128,128,0.25)' }} />
            ))}
          </div>
          <div className="flex-1 space-y-2 p-2">
            <div className="flex items-center gap-1.5">
              {logoUrl && <img src={logoUrl} alt="" className="h-4" />}
              <span className="font-semibold text-gray-900">{name}</span>
            </div>
            <div className="h-10 rounded bg-surface" />
            <span className="inline-block rounded px-2 py-0.5 text-white" style={{ background: ok(values.primaryColor, '#334155') }}>
              Save
            </span>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-gray-200 bg-surface p-2 text-[10px]">
        <p className="font-bold" style={{ color: ok(values.primaryColor, '#334155') }}>
          {lab.profile.companyName.toUpperCase()}
        </p>
        <div className="my-1 h-0.5" style={{ background: ok(values.accentColor, '#475569') }} />
        <p className="py-0.5 text-center font-bold tracking-wider text-white" style={{ background: ok(values.primaryColor, '#334155') }}>
          TEST REPORT
        </p>
      </div>
    </div>
  );
}

export function BrandingTab() {
  const lab = useLab();
  if (lab.isLoading) return <Spinner />;
  if (lab.error || !lab.data) return <ErrorState error={lab.error} onRetry={lab.refetch} />;
  return <BrandingForm lab={lab.data} />;
}
