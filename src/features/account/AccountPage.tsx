import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSession } from '@/app/providers';
import { Button, Card, CardHeader, Field, Input, PageHeader } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';

function ChangePassword() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const m = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/change-password', { body: { currentPassword, newPassword } }),
    onSuccess: () => {
      toast.success('Password changed. Please sign in again.');
      setUser(null);
      navigate('/login');
    },
  });
  return (
    <Card>
      <CardHeader title="Change password" />
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Field label="Current password" htmlFor="currentPassword">
          <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="newPassword" hint="At least 10 characters, with upper and lower case, a digit and a symbol." error={m.error?.message}>
          <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </Field>
        <Button type="submit" loading={m.isPending}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

function TwoFactor() {
  const { user } = useSession();
  const client = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const refresh = () => client.invalidateQueries({ queryKey: ['session'] });
  const start = useMutation({ mutationFn: async () => unwrap(await api.POST('/api/v1/auth/totp/setup')), onSuccess: setSetup });
  const enable = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/totp/enable', { body: { code } }),
    onSuccess: () => {
      toast.success('Two-factor login is on');
      setSetup(null);
      setCode('');
      refresh();
    },
  });
  const disable = useMutation({
    mutationFn: () => api.POST('/api/v1/auth/totp/disable', { body: { password } }),
    onSuccess: () => {
      toast.success('Two-factor login is off');
      setPassword('');
      refresh();
    },
  });
  if (!user?.totpAvailable) return null;
  return (
    <Card>
      <CardHeader title="Two-factor login" description="Optional for Admin, Signatory and Accounts roles." />
      <div className="space-y-3 p-4">
        {user.totpEnabled ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              disable.mutate();
            }}
          >
            <p className="text-sm text-gray-800">Two-factor login is on.</p>
            <Field label="Confirm your password to turn it off" htmlFor="totpPassword" error={disable.error?.message}>
              <Input id="totpPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={disable.isPending}>
              Turn off
            </Button>
          </form>
        ) : setup ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              enable.mutate();
            }}
          >
            <p className="text-sm text-gray-800">Add this key to your authenticator app, then enter the code it shows.</p>
            <code className="block rounded bg-gray-100 p-2 text-[13px] break-all">{setup.secret}</code>
            <Field label="6-digit code" htmlFor="totpCode" error={enable.error?.message}>
              <Input id="totpCode" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Button type="submit" loading={enable.isPending}>
              Turn on
            </Button>
          </form>
        ) : (
          <Button variant="secondary" loading={start.isPending} onClick={() => start.mutate()}>
            Set up two-factor login
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function AccountPage() {
  const { user } = useSession();
  return (
    <>
      <PageHeader title="My account" description={`${user?.name} · ${user?.email}`} />
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <ChangePassword />
        <TwoFactor />
      </div>
    </>
  );
}
