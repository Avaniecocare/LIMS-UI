import { useMutation } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, Field, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { useSession } from './providers';

/**
 * Shown instead of a page the person may not open. They can ask an administrator for access with a reason;
 * the administrator approves it by giving a role, and they are notified either way.
 */
export function NoAccess() {
  const { pathname } = useLocation();
  const [reason, setReason] = useState('');
  const m = useMutation({ mutationFn: async () => unwrap(await api.POST('/api/v1/access-requests', { body: { page: pathname, reason } })) });
  const already = m.error instanceof ApiError && m.error.code === 'ALREADY_REQUESTED';
  return (
    <div className="mx-auto mt-10 max-w-lg">
      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-gray-100 p-2">
            <Lock className="size-5 text-gray-600" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">You don't have access to this page</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your role doesn't include it. If you need it for your work, ask an administrator; they'll see your request and you'll be notified of the answer.
            </p>
          </div>
        </div>
        {m.isSuccess || already ? (
          <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-900">
            {already ? 'You have already asked for this page. An administrator will answer it.' : 'Request sent. You will get a notification when an administrator answers.'}
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <Field label="Why do you need it?" htmlFor="na-reason" required error={m.error && !already ? (m.error as Error).message : undefined}>
              <Textarea id="na-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: I cover for accounts on Saturdays" />
            </Field>
            <div className="flex items-center justify-between">
              <Link to="/" className="text-sm text-gray-700 underline">
                Back to the dashboard
              </Link>
              <Button type="submit" disabled={reason.trim().length < 3} loading={m.isPending}>
                Request access
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

/** Shown for a page whose module the laboratory has turned off. */
export function ModuleOff() {
  const { can } = useSession();
  return (
    <div className="mx-auto mt-10 max-w-lg">
      <Card className="space-y-3 p-6">
        <h2 className="text-base font-semibold text-gray-900">This part of the system is turned off</h2>
        <p className="text-sm text-gray-600">Your laboratory has not turned this module on. Nothing has been deleted; it comes back as soon as it is turned on.</p>
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-gray-700 underline">
            Back to the dashboard
          </Link>
          {can('admin.company.edit') && (
            <Link to="/admin?tab=modules" className="text-sm font-medium text-brand underline">
              Open Admin, Modules
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
