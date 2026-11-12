import { Copy, Mail, Monitor } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, PageHeader } from '@/components/ui/primitives';
import { mobileRule, useIsPhone } from './device';
import { useSession } from './providers';

// Screens the person chose to open on the phone anyway, for this visit.
const continued = new Set<string>();

/**
 * On a phone, a desktop-only screen says what it is for and how to get to it on a computer. Nothing is blocked:
 * "Continue anyway" opens the full screen.
 */
export function PhoneGate({ children }: { children: ReactNode }) {
  const phone = useIsPhone();
  const { pathname } = useLocation();
  const [, force] = useState(0);
  const rule = mobileRule(pathname);
  if (!phone || rule.support !== 'desktop' || continued.has(pathname)) return children;
  return (
    <DesktopOnly
      summary={rule.summary}
      onContinue={() => {
        continued.add(pathname);
        force((n) => n + 1);
      }}
    />
  );
}

function DesktopOnly({ summary, onContinue }: { summary?: string; onContinue: () => void }) {
  const { user } = useSession();
  const url = window.location.href;
  const subject = encodeURIComponent(`Open on a computer: ${document.title}`);
  return (
    <>
      <PageHeader title="Best on a larger screen" pageTitle="Best on a larger screen" />
      <div className="flex animate-enter flex-col items-center rounded-lg border border-gray-200 bg-surface px-5 py-8 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-700">
          <Monitor className="size-6" aria-hidden />
        </span>
        <p className="text-sm text-gray-800">{summary ?? 'This screen has more than a phone can show comfortably.'}</p>
        <p className="mt-1 text-sm text-gray-600">Open it on a computer or tablet, where everything fits.</p>
        <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
          {user?.email && (
            <Button asChild>
              <a href={`mailto:${user.email}?subject=${subject}&body=${encodeURIComponent(url)}`}>
                <Mail aria-hidden />
                Email me the link
              </a>
            </Button>
          )}
          <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(url).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))}>
            <Copy aria-hidden />
            Copy link
          </Button>
          <Button variant="ghost" onClick={onContinue}>
            Continue anyway
          </Button>
        </div>
      </div>
    </>
  );
}
