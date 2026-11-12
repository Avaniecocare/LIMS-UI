import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared';
import { Badge, Button, Card, CardHeader, ErrorState, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';

/** "Chrome on Windows" from a user-agent string, good enough to recognise your own devices. */
export function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone or iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'unknown system';
  return `${browser} on ${os}`;
}

export function SessionsCard() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ['my-sessions'], queryFn: async () => unwrap(await api.GET('/api/v1/auth/sessions')) });
  const revoke = useMutation({
    mutationFn: async (id: string | null) => unwrap(id ? await api.DELETE('/api/v1/auth/sessions/{id}', { params: { path: { id } } }) : await api.DELETE('/api/v1/auth/sessions')),
    onSuccess: (r) => {
      client.invalidateQueries({ queryKey: ['my-sessions'] });
      toast.success(r.revoked ? `Signed out of ${r.revoked} other session(s)` : 'No other sessions to sign out');
    },
    onError: toastError,
  });
  const others = (q.data ?? []).filter((s) => !s.current).length;
  return (
    <Card className="md:col-span-2">
      <CardHeader
        title="Where you're signed in"
        description="If you see a device you don't recognise, sign it out and change your password."
        actions={
          others > 0 ? (
            <Button variant="secondary" size="sm" loading={revoke.isPending && revoke.variables === null} onClick={() => revoke.mutate(null)}>
              <LogOut aria-hidden />
              Sign out everywhere else
            </Button>
          ) : null
        }
      />
      <div className="p-4">
        {q.isLoading ? (
          <Spinner />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <ul className="divide-y divide-gray-100">
            {(q.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <Laptop className="mt-0.5 size-4 text-gray-500" aria-hidden />
                  <div>
                    <p className="font-medium">
                      {describeDevice(s.userAgent)} {s.current && <Badge tone="green">This browser</Badge>}
                    </p>
                    <p className="text-xs text-gray-600">
                      Signed in {formatDateTime(new Date(s.createdAt).toISOString())}
                      {s.lastSeenAt ? ` · last active ${formatDateTime(new Date(s.lastSeenAt).toISOString())}` : ''}
                      {s.ip ? ` · ${s.ip}` : ''}
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(s.id)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

const ACTION_LABEL: Record<string, string> = { 'auth.login': 'Signed in', 'auth.login.failed': 'Wrong password', 'auth.login.locked': 'Attempt while locked', 'auth.account.locked': 'Account locked' };

export function SignInHistoryCard() {
  const q = useQuery({ queryKey: ['my-sign-ins'], queryFn: async () => unwrap(await api.GET('/api/v1/auth/sign-ins')) });
  return (
    <Card>
      <CardHeader title="Recent sign-ins" description="Your last 50 sign-ins and failed attempts." />
      <div className="max-h-80 overflow-y-auto p-4" tabIndex={0} role="region" aria-label="Recent sign-ins, scrollable">
        {q.isLoading ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {(q.data ?? []).map((e, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5">
                <span className={e.action === 'auth.login' ? '' : 'font-medium text-amber-800'}>{ACTION_LABEL[e.action] ?? e.action}</span>
                <span className="text-xs text-gray-600">
                  {formatDateTime(e.at)}
                  {e.ip ? ` · ${e.ip}` : ''}
                </span>
              </li>
            ))}
            {q.data?.length === 0 && <li className="py-1.5 text-gray-600">Nothing yet.</li>}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function MyAccessRequestsCard() {
  const q = useQuery({ queryKey: ['my-access-requests'], queryFn: async () => unwrap(await api.GET('/api/v1/access-requests/mine')) });
  if (!q.data?.length) return null;
  return (
    <Card>
      <CardHeader title="My access requests" />
      <ul className="divide-y divide-gray-100 p-4 text-sm">
        {q.data.map((r) => (
          <li key={r.id} className="py-1.5">
            <div className="flex items-center justify-between gap-2">
              <code>{r.page}</code>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-xs text-gray-600">
              {formatDateTime(r.createdAt)}
              {r.grantedRoleName ? ` · given ${r.grantedRoleName}` : ''}
              {r.decisionNote ? ` · ${r.decisionNote}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
