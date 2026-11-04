import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { useLookups } from '@/components/pickers';
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/* Header fields shared by booking and the job's edit form. The server validates the same rules. */
export const headerShape = {
  letterRef: z.string().trim().max(200),
  letterDate: z.string(),
  materialSpec: z.string().trim().max(500),
  poNumber: z.string().trim().max(120),
  poDate: z.string(),
  receiptModeId: z.string(),
  reportIssueDetails: z.string().trim().max(1000),
  reportIssueAddress: z.string().trim().max(1000),
  kindAttention: z.string().trim().max(200),
  contactEmail: z.union([z.literal(''), z.email('Enter a valid email')]),
  contactPhone: z.string().trim().max(30),
  urgent: z.boolean(),
  sampleDrawnByLab: z.boolean(),
};
export const headerSchema = z.object(headerShape);
export type HeaderValues = z.infer<typeof headerSchema>;
export const HEADER_FIELDS = Object.keys(headerShape);

export const emptyHeader: HeaderValues = { letterRef: '', letterDate: '', materialSpec: '', poNumber: '', poDate: '', receiptModeId: '', reportIssueDetails: '', reportIssueAddress: '', kindAttention: '', contactEmail: '', contactPhone: '', urgent: false, sampleDrawnByLab: false };

/** Identity fields come back null for roles that may not see the customer, so they are not sent back either. */
export function headerToBody(v: HeaderValues, identity: boolean) {
  return {
    letterDate: v.letterDate || null,
    materialSpec: v.materialSpec || null,
    poDate: v.poDate || null,
    receiptModeId: v.receiptModeId || null,
    urgent: v.urgent,
    sampleDrawnByLab: v.sampleDrawnByLab,
    ...(identity
      ? {
          letterRef: v.letterRef || null,
          poNumber: v.poNumber || null,
          reportIssueDetails: v.reportIssueDetails || null,
          reportIssueAddress: v.reportIssueAddress || null,
          kindAttention: v.kindAttention || null,
          contactEmail: v.contactEmail || null,
          contactPhone: v.contactPhone || null,
        }
      : {}),
  };
}

export function JobHeaderFields({ form: anyForm, identity, idPrefix, disabled }: { form: unknown; identity: boolean; idPrefix: string; disabled?: boolean }) {
  // The booking form extends these fields; they sit at the top level of both forms.
  const form = anyForm as UseFormReturn<HeaderValues>;
  const modes = useLookups('RECEIPT_MODE');
  // A native select shows nothing until its option exists, so re-apply the value once they load.
  useEffect(() => {
    if (modes.data) form.setValue('receiptModeId', form.getValues('receiptModeId'));
  }, [modes.data, form]);
  const e = form.formState.errors;
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {identity && (
        <>
          <Field label="Letter / challan reference" htmlFor={id('letter')} error={e.letterRef?.message}>
            <Input id={id('letter')} {...form.register('letterRef')} />
          </Field>
        </>
      )}
      <Field label="Letter / challan date" htmlFor={id('letter-date')} error={e.letterDate?.message}>
        <Input id={id('letter-date')} type="date" {...form.register('letterDate')} />
      </Field>
      <Field label="Material specification" htmlFor={id('spec')} error={e.materialSpec?.message}>
        <Input id={id('spec')} {...form.register('materialSpec')} />
      </Field>
      {identity && (
        <Field label="PO number" htmlFor={id('po')} error={e.poNumber?.message}>
          <Input id={id('po')} {...form.register('poNumber')} />
        </Field>
      )}
      <Field label="PO date" htmlFor={id('po-date')} error={e.poDate?.message}>
        <Input id={id('po-date')} type="date" {...form.register('poDate')} />
      </Field>
      <Field label="Receipt mode" htmlFor={id('mode')} error={e.receiptModeId?.message}>
        <Select id={id('mode')} {...form.register('receiptModeId')}>
          <option value="">—</option>
          {modes.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      {identity && (
        <>
          <Field label="Kind attention" htmlFor={id('attention')} error={e.kindAttention?.message}>
            <Input id={id('attention')} {...form.register('kindAttention')} />
          </Field>
          <Field label="Contact email" htmlFor={id('email')} error={e.contactEmail?.message}>
            <Input id={id('email')} type="email" aria-invalid={!!e.contactEmail} {...form.register('contactEmail')} />
          </Field>
          <Field label="Contact phone" htmlFor={id('phone')} error={e.contactPhone?.message}>
            <Input id={id('phone')} {...form.register('contactPhone')} />
          </Field>
          <Field label="Report issue details" htmlFor={id('report-details')} error={e.reportIssueDetails?.message} className="md:col-span-3 lg:col-span-1">
            <Textarea id={id('report-details')} rows={2} {...form.register('reportIssueDetails')} />
          </Field>
          <Field label="Report issue address" htmlFor={id('report-address')} error={e.reportIssueAddress?.message} className="md:col-span-3 lg:col-span-2">
            <Textarea id={id('report-address')} rows={2} {...form.register('reportIssueAddress')} />
          </Field>
        </>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-3">
        <Checkbox id={id('urgent')} label="Urgent" disabled={disabled} checked={form.watch('urgent')} onCheckedChange={(v) => form.setValue('urgent', !!v, { shouldDirty: true })} />
        <Checkbox id={id('drawn')} label="Sample drawn by the laboratory" disabled={disabled} checked={form.watch('sampleDrawnByLab')} onCheckedChange={(v) => form.setValue('sampleDrawnByLab', !!v, { shouldDirty: true })} />
      </div>
    </div>
  );
}

export const attributeSchema = z.object({ label: z.string().trim().min(1, 'Enter a label').max(120), value: z.string().trim().min(1, 'Enter a value').max(500) });

export const sampleShape = {
  description: z.string().trim().min(1, 'Describe the sample').max(500),
  condition: z.string().trim().max(200),
  quantity: z.string().trim().max(120),
  size: z.string().trim().max(120),
  returnable: z.boolean(),
  attributes: z.array(attributeSchema).max(50),
};
export const sampleSchema = z.object(sampleShape);
export type SampleValues = z.infer<typeof sampleSchema>;

type SampleForm = UseFormReturn<{ s: SampleValues }>;

/** Fields of one sample, at `prefix` in the surrounding form ("" for a form that is just one sample). */
export function SampleFields({ form: anyForm, prefix, idPrefix }: { form: unknown; prefix: string; idPrefix: string }) {
  // Field paths are built from the prefix, so the two forms that use this share one typed view.
  const form = anyForm as SampleForm;
  const path = (name: string) => `${prefix}${name}` as 's.description';
  const errorAt = (name: string): string | undefined => {
    let node: unknown = form.formState.errors;
    for (const part of path(name).split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
    return (node as { message?: string } | undefined)?.message;
  };
  const attributes = useFieldArray({ control: form.control, name: path('attributes') as 's.attributes' });
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <Field label="Description" htmlFor={id('description')} required error={errorAt('description')}>
          <Input id={id('description')} aria-invalid={!!errorAt('description')} {...form.register(path('description'))} />
        </Field>
        <Field label="Condition" htmlFor={id('condition')} error={errorAt('condition')}>
          <Input id={id('condition')} {...form.register(path('condition'))} />
        </Field>
        <Field label="Quantity" htmlFor={id('quantity')} error={errorAt('quantity')}>
          <Input id={id('quantity')} {...form.register(path('quantity'))} />
        </Field>
        <Field label="Size" htmlFor={id('size')} error={errorAt('size')}>
          <Input id={id('size')} {...form.register(path('size'))} />
        </Field>
      </div>
      <Checkbox id={id('returnable')} label="Returnable" checked={!!form.watch(path('returnable'))} onCheckedChange={(v) => form.setValue(path('returnable'), !!v as never, { shouldDirty: true })} />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-700">Attributes</span>
          <Button variant="secondary" size="sm" onClick={() => attributes.append({ label: '', value: '' })}>
            <Plus aria-hidden />
            Add attribute
          </Button>
        </div>
        {attributes.fields.map((f, i) => (
          <div key={f.id} className="grid items-start gap-2 md:grid-cols-[1fr_2fr_auto]">
            <Field label={`Attribute ${i + 1} label`} htmlFor={id(`attr-${i}-label`)} error={errorAt(`attributes.${i}.label`)}>
              <Input id={id(`attr-${i}-label`)} {...form.register(path(`attributes.${i}.label`))} />
            </Field>
            <Field label={`Attribute ${i + 1} value`} htmlFor={id(`attr-${i}-value`)} error={errorAt(`attributes.${i}.value`)}>
              <Input id={id(`attr-${i}-value`)} {...form.register(path(`attributes.${i}.value`))} />
            </Field>
            <Button variant="ghost" size="icon" className="mt-6" aria-label={`Remove attribute ${i + 1}`} onClick={() => attributes.remove(i)}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
