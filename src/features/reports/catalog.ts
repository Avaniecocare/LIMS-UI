import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/app/providers';
import { api, unwrap } from '@/lib/api';

/** The reports this user may open. The server filters the list by permission. */
export function useMisCatalog() {
  const { can } = useSession();
  return useQuery({ queryKey: ['mis-catalog'], enabled: can('mis.view', 'mis.commercial'), staleTime: 300_000, queryFn: async () => unwrap(await api.GET('/api/v1/mis')) });
}
