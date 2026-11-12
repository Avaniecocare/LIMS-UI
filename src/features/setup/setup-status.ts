import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

export const SETUP_KEY = ['lab-setup'];

/** Which setup steps are done, for the wizard and the reminder banner. */
export const useSetupStatus = (enabled = true) => useQuery({ queryKey: SETUP_KEY, enabled, staleTime: 30_000, queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/setup')) });
