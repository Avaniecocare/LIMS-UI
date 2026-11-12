import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Field, Input } from '@/components/ui/primitives';
import { ApiError, api, setReauthPrompt, unwrap } from '@/lib/api';

/**
 * Asked when the server wants the password confirmed for a sensitive action (giving roles, changing role
 * permissions, deactivating someone, exporting every customer). Confirming covers the next ten minutes.
 */
export function ReauthDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settle = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    setReauthPrompt(
      () =>
        new Promise<boolean>((resolve) => {
          settle.current = resolve;
          setPassword('');
          setError(null);
          setOpen(true);
        }),
    );
    return () => setReauthPrompt(null);
  }, []);

  const finish = (ok: boolean) => {
    setOpen(false);
    settle.current?.(ok);
    settle.current = null;
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      unwrap(await api.POST('/api/v1/auth/confirm-password', { body: { password } }));
      finish(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not confirm your password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && finish(false)}
      title="Confirm your password"
      description="This action changes who can see or do what, or exports data in bulk, so it needs your password. You won't be asked again for ten minutes."
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <Field label="Your password" htmlFor="reauth-password" error={error ?? undefined}>
          <Input id="reauth-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => finish(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!password} loading={busy}>
            Confirm
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
