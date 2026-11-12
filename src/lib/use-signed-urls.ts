import { useQueries } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

/** Short-lived signed links for showing stored images, fetched once per file and reused for four minutes. */
export function useSignedUrls(ids: string[]): Record<string, string> {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['file-url', id],
      staleTime: 4 * 60_000,
      queryFn: async () => unwrap(await api.GET('/api/v1/files/{id}/url', { params: { path: { id } } })).url,
    })),
  });
  const urls: Record<string, string> = {};
  ids.forEach((id, i) => {
    const url = results[i]?.data;
    if (url) urls[id] = url;
  });
  return urls;
}
