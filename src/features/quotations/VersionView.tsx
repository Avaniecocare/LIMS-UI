import type { components } from '@/api/schema';
import { formatDate, formatINR, humanize } from '@/lib/format';

type Version = components['schemas']['QuotationVersionDto'];

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-6 border-t border-gray-200 pt-1 font-semibold text-gray-900' : 'flex justify-between gap-6 text-gray-800'}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Server-calculated totals. Nothing here is worked out in the browser. */
export function VersionTotals({ version: v }: { version: Version }) {
  const interstate = Number(v.igst) !== 0;
  return (
    <div className="space-y-2">
      <dl className="ml-auto max-w-xs space-y-1 text-[13px]" aria-label="Totals">
        <Row label="Subtotal" value={formatINR(v.subtotal)} />
        <Row label={`Discount (${v.discountPct}%)`} value={formatINR(v.discountAmount)} />
        <Row label="Taxable amount" value={formatINR(v.taxableAmount)} />
        {interstate ? (
          <Row label={`IGST (${v.gstRate}%)`} value={formatINR(v.igst)} />
        ) : (
          <>
            <Row label="CGST" value={formatINR(v.cgst)} />
            <Row label="SGST" value={formatINR(v.sgst)} />
          </>
        )}
        <Row label="Round-off" value={formatINR(v.roundOff)} />
        <Row label="Grand total" value={formatINR(v.grandTotal)} strong />
      </dl>
      <p className="text-right text-[13px] text-gray-800">{v.amountInWords}</p>
    </div>
  );
}

export function VersionLines({ version: v }: { version: Version }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]" aria-label={`Lines of version ${v.versionNo}`}>
        <thead className="bg-gray-50 text-left text-xs text-gray-700">
          <tr>
            {['#', 'Sample', 'Required qty', 'Test', 'Method', 'Qty', 'Rate', 'Rate source', 'Disc. %', 'Amount'].map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {v.lines.map((l) => (
            <tr key={l.id} className="border-t border-gray-100 align-top">
              <td className="px-2 py-1.5">{l.seq}</td>
              <td className="px-2 py-1.5">{l.sampleDescription}</td>
              <td className="px-2 py-1.5">{l.requiredQuantity ?? '—'}</td>
              <td className="px-2 py-1.5">
                {l.testCode} — {l.testName}
              </td>
              <td className="px-2 py-1.5">{l.methodName ?? '—'}</td>
              <td className="px-2 py-1.5 tabular-nums">{l.quantity}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatINR(l.rate)}</td>
              <td className="px-2 py-1.5">
                {humanize(l.rateSource)}
                {l.overrideReason && <p className="text-xs text-gray-600">{l.overrideReason}</p>}
              </td>
              <td className="px-2 py-1.5 tabular-nums">{l.discountPct}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatINR(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VersionTerms({ version: v }: { version: Version }) {
  const items: [string, string | null][] = [
    ['Document', v.documentTitle],
    ['Valid until', formatDate(v.validUntil)],
    ['Estimated days', v.estimatedDays === null ? null : String(v.estimatedDays)],
    ['Contact person', v.contactPerson],
    ['Payment terms', v.paymentTerms],
    ['Delivery address', v.deliveryAddress],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-600">{label}</dt>
          <dd className="whitespace-pre-line text-gray-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
