import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, unwrap } from '@/lib/api';
import { cn, formatDate } from '@/lib/format';
import { useSession } from './providers';

/** Tells everyone when the trial or licence is ending, or has ended and nothing can be saved. Silent otherwise. */
export function LicenceBanner() {
  const { can } = useSession();
  const q = useQuery({
    queryKey: ['licence'],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    queryFn: async () => unwrap(await api.GET('/api/v1/licence')),
  });
  const l = q.data;
  if (!l || l.state === 'not-required' || l.state === 'active') return null;
  const what = l.kind === 'trial' ? 'trial' : 'licence';
  const text = l.readOnly
    ? l.state === 'missing'
      ? 'This installation has no licence yet, so nothing can be saved.'
      : `The ${what} has ended. Everything is here to read and export, but nothing new can be saved.`
    : l.state === 'grace'
      ? `The ${what} has ended. Saving stops on ${formatDate(l.readOnlyFrom)}.`
      : `The ${what} ends in ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'}. Nothing is deleted when it ends.`;
  return (
    <div
      role="status"
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[13px]', l.readOnly ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900')}
    >
      <span>{text}</span>
      {can('admin.settings') && (
        <Link to="/admin?tab=licence" className="font-medium underline">
          Open Licence
        </Link>
      )}
    </div>
  );
}
