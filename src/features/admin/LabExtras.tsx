import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { Badge, Button, Card, CardHeader, Checkbox, ConfirmDialog, ErrorState, Field, Input, Spinner, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { isConflict, toastError } from '@/lib/forms';
import { useDebounced } from '@/lib/use-debounced';
import { DirtyScope, useDirtyScope, useReportDirty } from '@/lib/use-leave-guard';

// ---------------------------------------------------------------- modules

type ModuleList = components['schemas']['ModuleListDto'];

/** Parts of the product the lab can turn off. Nothing is deleted; turning one back on brings everything back. */
export function ModulesTab() {
  const client = useQueryClient();
  const { can } = useSession();
  const q = useQuery({ queryKey: ['lab-modules'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/modules')) });
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (q.data) setDraft(Object.fromEntries(q.data.modules.map((m) => [m.key, m.enabled])));
  }, [q.data]);
  const dirty = !!q.data && q.data.modules.some((m) => draft[m.key] !== m.enabled);
  useReportDirty(dirty);
  const save = useMutation({
    mutationFn: async (list: ModuleList) =>
      unwrap(
        await api.PUT('/api/v1/admin/lab/modules', {
          body: { version: list.version, enabled: Object.fromEntries(Object.entries(draft).filter(([k, on]) => list.modules.find((m) => m.key === k)?.enabled !== on)) },
        }),
      ),
    onSuccess: async (next) => {
      client.setQueryData(['lab-modules'], next);
      // Menus and pages follow the session's list of modules.
      await client.invalidateQueries({ queryKey: ['session'] });
      toast.success('Modules saved. Menus and pages follow at once.');
    },
    onError: (e) => (isConflict(e) ? (toast.error('Someone else changed the modules. They have been reloaded.'), void q.refetch()) : toastError(e)),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const canEdit = can('admin.company.edit');
  return (
    <Card>
      <CardHeader
        title="Modules"
        description="Turn off what your laboratory does not use, to keep menus simple. Customers, booking, testing, approvals, reports and masters are always on. Turning a module off deletes nothing."
      />
      <ul className="divide-y divide-gray-100">
        {q.data.modules.map((m) => (
          <li key={m.key} className="flex items-start gap-3 px-4 py-3">
            <Checkbox
              id={`mod-${m.key}`}
              className="mt-0.5"
              checked={!!draft[m.key]}
              disabled={!canEdit || !!m.setupNeeded}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, [m.key]: v === true }))}
              aria-label={m.label}
            />
            <label htmlFor={`mod-${m.key}`} className="cursor-pointer text-[13px]">
              <span className="block font-medium text-gray-900">
                {m.label} {m.setupNeeded ? <Badge tone="amber">Not set up</Badge> : !draft[m.key] && <Badge>Off</Badge>}
              </span>
              <span className="block text-gray-600">{m.description}</span>
              {m.setupNeeded && <span className="block text-amber-900">{m.setupNeeded}</span>}
            </label>
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          {dirty && (
            <Button variant="secondary" onClick={() => setDraft(Object.fromEntries(q.data!.modules.map((m) => [m.key, m.enabled])))}>
              Undo changes
            </Button>
          )}
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(q.data!)}>
            Save modules
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- email templates

type TemplateList = components['schemas']['EmailTemplateListDto'];
type Template = TemplateList['templates'][number];

/** The wording of customer emails: the lab's own, with the product's wherever it has not changed it. */
export function EmailTemplatesTab() {
  const q = useQuery({ queryKey: ['email-templates'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/email-templates')) });
  const [selected, setSelected] = useState<string>('acknowledgement');
  // Choosing another email replaces the editor, so unsaved wording is asked about first.
  const scope = useDirtyScope();
  const [pending, setPending] = useState<string | null>(null);
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const current = q.data.templates.find((t) => t.key === selected) ?? q.data.templates[0];
  return (
    <DirtyScope value={scope.report}>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Discard your changes?"
        description="The wording of this email has not been saved."
        confirmLabel="Discard changes"
        danger
        onConfirm={() => {
          if (pending) setSelected(pending);
          setPending(null);
        }}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[15rem_1fr]">
        <Card>
          <CardHeader title="Emails" />
          <ul className="p-1" aria-label="Email templates">
            {q.data.templates.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  aria-current={t.key === current.key ? 'true' : undefined}
                  onClick={() => (scope.dirty && t.key !== current.key ? setPending(t.key) : setSelected(t.key))}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px]',
                    t.key === current.key ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-800 hover:bg-gray-50',
                  )}
                >
                  {t.label}
                  {t.customized && <Badge tone="blue">Edited</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <TemplateEditor key={`${current.key}-${q.data.version}`} template={current} version={q.data.version} />
      </div>
    </DirtyScope>
  );
}

function TemplateEditor({ template, version }: { template: Template; version: number }) {
  const client = useQueryClient();
  const { can } = useSession();
  const canEdit = can('admin.company.edit');
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const lastField = useRef<'subject' | 'body'>('body');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = subject !== template.subject || body !== template.body;
  useReportDirty(dirty && canEdit);

  // Live preview, from the server, in the lab's branded layout.
  const debouncedSubject = useDebounced(subject, 400);
  const debouncedBody = useDebounced(body, 400);
  const preview = useQuery({
    queryKey: ['email-preview', template.key, debouncedSubject, debouncedBody],
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () =>
      unwrap(await api.POST('/api/v1/admin/lab/email-templates/{key}/preview', { params: { path: { key: template.key } }, body: { subject: debouncedSubject, body: debouncedBody } })),
  });
  useEffect(() => {
    const e = preview.error;
    if (e instanceof ApiError && e.fields.length) setErrors(Object.fromEntries(e.fields.map((f) => [f.field, f.message])));
    else if (preview.data) setErrors({});
  }, [preview.error, preview.data]);

  const done = (next: TemplateList, message: string) => {
    client.setQueryData(['email-templates'], next);
    toast.success(message);
  };
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT('/api/v1/admin/lab/email-templates/{key}', { params: { path: { key: template.key } }, body: { version, subject, body } })),
    onSuccess: (next) => done(next, 'Template saved. Emails use it from now on.'),
    onError: (e) => {
      if (isConflict(e)) {
        toast.error('Someone else changed the templates. They have been reloaded.');
        void client.invalidateQueries({ queryKey: ['email-templates'] });
      } else if (e instanceof ApiError && e.fields.length) setErrors(Object.fromEntries(e.fields.map((f) => [f.field, f.message])));
      else toastError(e);
    },
  });
  const reset = useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/api/v1/admin/lab/email-templates/{key}', { params: { path: { key: template.key }, query: { version } } })),
    onSuccess: (next) => {
      setConfirmReset(false);
      done(next, 'Back to the standard wording.');
    },
    onError: toastError,
  });

  /** Puts {{name}} where the cursor was, in the subject or the message. */
  const insert = (name: string) => {
    const token = `{{${name}}}`;
    const el = lastField.current === 'subject' ? subjectRef.current : bodyRef.current;
    const value = lastField.current === 'subject' ? subject : body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    (lastField.current === 'subject' ? setSubject : setBody)(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={template.label} description={template.description} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 xl:grid-cols-2">
          <fieldset disabled={!canEdit} className="space-y-3">
            <Field label="Subject" htmlFor="tpl-subject" error={errors.subject}>
              <Input ref={subjectRef} id="tpl-subject" value={subject} maxLength={200} onFocus={() => (lastField.current = 'subject')} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field
              label="Message"
              htmlFor="tpl-body"
              error={errors.body}
              hint="A blank line starts a new paragraph. **Double asterisks** make bold. {{#name}}…{{/name}} shows a passage only when that value exists."
            >
              <Textarea
                ref={bodyRef}
                id="tpl-body"
                rows={12}
                className="font-mono text-[13px]"
                value={body}
                maxLength={5000}
                onFocus={() => (lastField.current = 'body')}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <div>
              <p className="mb-1 text-[13px] font-medium text-gray-700">Insert a value</p>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    title={`${v.description}, e.g. ${v.example}`}
                    onClick={() => insert(v.name)}
                    className="rounded-full border border-gray-300 bg-surface px-2 py-0.5 font-mono text-xs text-gray-800 hover:border-brand hover:text-brand"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-gray-700">Preview, with example values</p>
            <p className="truncate rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[13px]">
              <span className="text-gray-600">Subject: </span>
              {preview.data?.subject ?? '…'}
            </p>
            {preview.data && (
              <iframe
                title={`Preview of ${template.label}`}
                sandbox=""
                srcDoc={preview.data.html}
                className={cn('h-96 w-full rounded border border-gray-200 bg-surface', preview.isFetching && 'opacity-70')}
              />
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 p-4">
            {template.customized && (
              <Button variant="ghost" onClick={() => setConfirmReset(true)}>
                <RotateCcw aria-hidden />
                Reset to standard wording
              </Button>
            )}
            {dirty && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSubject(template.subject);
                  setBody(template.body);
                }}
              >
                Discard changes
              </Button>
            )}
            <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
              Save template
            </Button>
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`Reset "${template.label}"?`}
        description="Your wording is replaced by the standard wording. This can't be undone, but you can edit it again."
        confirmLabel="Reset"
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </div>
  );
}
