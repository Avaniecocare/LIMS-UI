import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { safeAppPath } from '@/lib/safe-path';

const KEY = ['notifications'];

/** Header bell. Polling pauses by itself while the tab is hidden. */
export function NotificationBell() {
  const client = useQueryClient();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const q = useQuery({
    queryKey: KEY,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () => unwrap(await api.GET('/api/v1/notifications', { params: { query: { pageSize: 20 } } })),
  });
  const refresh = () => client.invalidateQueries({ queryKey: KEY });
  const markRead = useMutation({ mutationFn: (id: string) => api.POST('/api/v1/notifications/{id}/read', { params: { path: { id } } }), onSuccess: refresh, onError: toastError });
  const markAll = useMutation({ mutationFn: () => api.POST('/api/v1/notifications/read-all'), onSuccess: refresh, onError: toastError });

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const unread = q.data?.unread ?? 0;
  const rows = q.data?.data ?? [];
  return (
    <div className="relative" ref={root}>
      <Button ref={button} variant="ghost" size="icon" className="relative size-9" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <Bell aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white" aria-hidden>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>
      <div id={panelId} role="region" aria-label="Notifications" hidden={!open} className="absolute top-full right-0 z-30 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-surface shadow-lg">
        {open && (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
              <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
              <Button variant="ghost" size="sm" disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate()}>
                Mark all read
              </Button>
            </div>
            {q.isLoading && <Spinner />}
            {q.error && <p className="p-3 text-[13px] text-red-800">Notifications could not be loaded.</p>}
            {q.data && !rows.length && <p className="p-6 text-center text-[13px] text-gray-700">You have no notifications.</p>}
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {rows.map((n) => {
                const link = safeAppPath(n.link);
                return (
                <li key={n.id} className={cn('flex items-start justify-between gap-2 px-3 py-2 text-[13px]', !n.readAt && 'bg-blue-50')}>
                  <div className="min-w-0">
                    {link ? (
                      <Link
                        to={link}
                        className="font-medium text-gray-900 underline"
                        onClick={() => {
                          setOpen(false);
                          if (!n.readAt) markRead.mutate(n.id);
                        }}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">{n.title}</span>
                    )}
                    {n.body && <p className="break-words text-gray-800">{n.body}</p>}
                    <p className="text-xs text-gray-600">
                      {formatDateTime(n.createdAt)}
                      {!n.readAt && ' · Unread'}
                    </p>
                  </div>
                  {!n.readAt && (
                    <Button variant="ghost" size="sm" className="shrink-0" aria-label={`Mark read: ${n.title}`} onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
                );
              })}
            </ul>
            {(q.data?.meta.total ?? 0) > rows.length && <p className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-600">Showing the latest {rows.length} of {q.data?.meta.total}.</p>}
          </>
        )}
      </div>
    </div>
  );
}
