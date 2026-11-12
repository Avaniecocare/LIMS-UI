import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

/**
 * Form auto-fill from what the system can already work out: a GSTIN's state and PAN (decoded on the server,
 * no outside call), and a PIN code's city and state (India Post's directory, through the server).
 */
export function useGstStates() {
  return useQuery({
    queryKey: ['gst-states'],
    staleTime: Infinity,
    queryFn: async () => unwrap(await api.GET('/api/v1/lookup/states')),
  });
}

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export async function lookupGstin(gstin: string) {
  const value = gstin.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(value)) return null;
  const res = unwrap(await api.GET('/api/v1/lookup/gstin/{gstin}', { params: { path: { gstin: value } } }));
  return res.valid ? res : null;
}

export async function lookupPincode(pincode: string) {
  if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) return null;
  try {
    const res = unwrap(await api.GET('/api/v1/lookup/pincode/{pincode}', { params: { path: { pincode: pincode.trim() } } }));
    return res.found ? res : null;
  } catch {
    // Auto-fill is a convenience: if it fails, the person types the address as before.
    return null;
  }
}
