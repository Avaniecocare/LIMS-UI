import { useQuery } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, CircleX, FileCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useBranding } from '@/app/providers';
import { Spinner } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

type Verification = components['schemas']['ReportVerificationDto'];

/** SHA-256 of a file, worked out in the browser: the file is never uploaded. */
async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function Banner({ tone, icon, title, children }: { tone: 'green' | 'amber' | 'red'; icon: ReactNode; title: string; children: ReactNode }) {
  const tones = { green: 'border-green-300 bg-green-50 text-green-900', amber: 'border-amber-300 bg-amber-50 text-amber-900', red: 'border-red-300 bg-red-50 text-red-900' };
  return (
    <div role="status" className={`flex gap-3 rounded-lg border p-4 ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-6" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold">{title}</p>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </div>
  );
}

function Details({ v }: { v: Verification }) {
  const rows: [string, ReactNode][] = [
    ['Laboratory', v.laboratoryName],
    ['Report no.', `${v.reportNo}${v.revisionNo ? `, revision ${v.revisionNo}` : ''}`],
    ...(v.ulrNumber ? ([['ULR', v.ulrNumber]] as [string, ReactNode][]) : []),
    ['Issue date', formatDate(v.issuedAt ?? v.approvedAt)],
    ['Issued to', v.customerName],
    ['Sample no.', v.sampleNo],
    ['Sample description', v.sampleDescription],
    ['Approved by', `${v.approvedByName}, ${formatDateTime(v.approvedAt)}`],
  ];
  return (
    <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
      {rows.map(([k, val]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-3 py-2 sm:grid-cols-[11rem_1fr]">
          <dt className="font-medium text-gray-600">{k}</dt>
          <dd className="break-words text-gray-900">{val}</dd>
        </div>
      ))}
    </dl>
  );
}

function Results({ v }: { v: Verification }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Results on the report</h2>
      <p className="text-sm text-gray-600">Compare these with your copy. Any difference means the copy has been changed.</p>
      {v.tests.map((t, i) => (
        <div key={i} className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <caption className="bg-gray-50 px-3 py-2 text-left font-medium text-gray-900">
              {t.testName}
              {t.methodName && <span className="block text-xs font-normal text-gray-600">{t.methodName}</span>}
            </caption>
            <thead className="sr-only">
              <tr>
                <th>Parameter</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {t.parameters.map((p, j) => (
                <tr key={j}>
                  <td className="px-3 py-1.5 text-gray-700">{p.name}</td>
                  <td className="px-3 py-1.5 text-right font-medium whitespace-nowrap text-gray-900">
                    {p.value ?? '—'}
                    {p.value && p.unit ? ` ${p.unit}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function FileCheckSection({ v }: { v: Verification }) {
  const [state, setState] = useState<{ name: string; match: boolean } | 'working' | null>(null);
  if (!v.pdfSha256) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900">Check a PDF copy</h2>
      <p className="text-sm text-gray-600">
        If you received this report as a PDF file, choose it here to confirm it is exactly the file the laboratory issued. The file is checked on your device and is not uploaded.
      </p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-brand-focus">
        <FileCheck className="size-4" aria-hidden />
        Choose PDF file
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setState('working');
            const hash = await sha256Hex(file);
            setState({ name: file.name, match: hash === v.pdfSha256!.toLowerCase() });
          }}
        />
      </label>
      {state === 'working' && <p className="text-sm text-gray-600">Checking…</p>}
      {state && state !== 'working' && (
        <Banner tone={state.match ? 'green' : 'red'} icon={state.match ? <CircleCheck /> : <CircleX />} title={state.match ? 'The file matches' : 'The file does not match'}>
          {state.match ? (
            <>“{state.name}” is identical to the PDF issued by the laboratory.</>
          ) : (
            <>
              “{state.name}” is not the file the laboratory issued. It may have been edited or it may be a different report. A printed or scanned copy will never match; compare the results above
              instead.
            </>
          )}
        </Banner>
      )}
    </section>
  );
}

export default function VerifyReportPage() {
  const { code = '' } = useParams();
  const branding = useBranding();
  const q = useQuery({
    queryKey: ['verify-report', code],
    queryFn: async () => unwrap(await api.GET('/api/v1/public/reports/verify/{code}', { params: { path: { code } } })),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  const v = q.data;

  return (
    <main className="auth-backdrop min-h-full p-3 max-md:min-h-dvh sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-5 rounded-xl border-t-4 border-accent-brand bg-surface p-4 shadow-lg sm:p-6">
        <header className="flex items-center gap-3">
          {branding && <img src={branding.logoUrl} alt={`${branding.companyName} logo`} className="size-12 rounded object-contain" />}
          <div>
            <p className="text-sm font-semibold text-gray-900">{branding?.companyName}</p>
            <h1 className="text-lg font-semibold text-gray-900">Test report verification</h1>
          </div>
        </header>
        {q.isLoading && <Spinner label="Checking the report" />}
        {notFound && (
          <Banner tone="red" icon={<CircleX />} title="No report matches this code">
            This QR code or link does not belong to a report issued by the laboratory. The document may not be genuine. Contact the laboratory before relying on it.
          </Banner>
        )}
        {q.error && !notFound && (
          <Banner tone="amber" icon={<CircleAlert />} title="The check could not be completed">
            The verification service could not be reached. Check your connection and try again.{' '}
            <button type="button" className="font-medium underline" onClick={() => q.refetch()}>
              Try again
            </button>
          </Banner>
        )}
        {v && (
          <>
            {v.status === 'VALID' ? (
              <Banner tone="green" icon={<CircleCheck />} title="Genuine report">
                Issued by {v.laboratoryName} and approved by {v.approvedByName} on {formatDate(v.approvedAt)}. This is the current version of the report.
              </Banner>
            ) : (
              <Banner tone="amber" icon={<CircleAlert />} title="This report has been replaced">
                It was genuine, but {v.replacedByRevisionNo ? `revision ${v.replacedByRevisionNo}` : 'a newer revision'} replaced it{v.supersededAt ? ` on ${formatDate(v.supersededAt)}` : ''}. Ask the
                laboratory for the current version before relying on it.
              </Banner>
            )}
            <Details v={v} />
            <Results v={v} />
            <FileCheckSection v={v} />
            {v.contentSha256 && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer">Report hash</summary>
                <p className="mt-1 break-all">The report prints this SHA-256 hash under the approval: {v.contentSha256}</p>
              </details>
            )}
          </>
        )}
      </div>
    </main>
  );
}
