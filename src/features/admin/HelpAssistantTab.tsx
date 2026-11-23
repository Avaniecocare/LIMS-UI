import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Select, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const OUTCOMES: { key: string; label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'gray' }[] = [
  { key: 'ANSWERED', label: 'Answered', tone: 'green' },
  { key: 'CACHED', label: 'Answered from cache', tone: 'green' },
  { key: 'NOT_FOUND', label: 'Not in the docs', tone: 'amber' },
  { key: 'OFF_TOPIC', label: 'Off topic', tone: 'gray' },
  { key: 'BLOCKED', label: 'Blocked', tone: 'red' },
  { key: 'RATE_LIMITED', label: 'Too many questions', tone: 'red' },
  { key: 'CAPTCHA_FAILED', label: 'Failed the human check', tone: 'red' },
  { key: 'BUDGET_REACHED', label: 'Paused: budget reached', tone: 'amber' },
  { key: 'ERROR', label: 'Error', tone: 'red' },
  { key: 'TRUNCATED', label: 'Cut short', tone: 'amber' },
  { key: 'REFUSED', label: 'Declined by the model', tone: 'gray' },
  { key: 'CANCELLED', label: 'Visitor left', tone: 'gray' },
];
const money = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;

/**
 * The help site's "Ask AI": what people ask, what the documentation does not answer (gaps to write up), answers
 * marked unhelpful, cost per day and refused requests. Questions are stored without addresses or personal details.
 */
export function HelpAssistantTab() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['help-analytics', days], queryFn: async () => unwrap(await api.GET('/api/v1/admin/help/analytics', { params: { query: { days } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const a = q.data;
  const total = Object.values(a.outcomes).reduce((s, n) => s + n, 0);
  const cost = a.daily.reduce((s, d) => s + d.cost, 0);
  const today = a.daily[a.daily.length - 1];
  const refused = ['BLOCKED', 'RATE_LIMITED', 'CAPTCHA_FAILED'].reduce((s, k) => s + (a.outcomes[k] ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Help assistant"
          description={`Answers questions on the help site from the documentation only. Model ${a.model}${a.fallbackModel ? `, then ${a.fallbackModel}` : ''}; spent ${money(a.spentToday)} of ${money(a.dailyBudget)} today and ${money(a.spentThisMonth)} of ${money(a.monthlyBudget)} this month. It is set up with environment variables on the server.`}
          actions={
            <div className="flex items-center gap-2">
              <Badge tone={a.enabled ? 'green' : 'gray'}>{a.enabled ? 'On' : 'Off'}</Badge>
              <Select aria-label="Period" className="w-36" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </Select>
            </div>
          }
        />
        <dl className="grid grid-cols-2 gap-3 p-4 text-[13px] md:grid-cols-4">
          <div>
            <dt className="text-gray-600">Questions</dt>
            <dd className="text-xl font-semibold text-gray-900">{total.toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Not in the docs</dt>
            <dd className="text-xl font-semibold text-gray-900">{(a.outcomes.NOT_FOUND ?? 0).toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Cost in this period</dt>
            <dd className="text-xl font-semibold text-gray-900">{money(cost)}</dd>
            {today && <dd className="text-xs text-gray-600">Last day {money(today.cost)}</dd>}
          </div>
          <div>
            <dt className="text-gray-600">Refused requests</dt>
            <dd className="text-xl font-semibold text-gray-900">{refused.toLocaleString('en-IN')}</dd>
          </div>
        </dl>
        <ul className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3" aria-label="Questions by outcome">
          {OUTCOMES.filter((o) => a.outcomes[o.key]).map((o) => (
            <li key={o.key}>
              <Badge tone={o.tone}>
                {o.label}: {a.outcomes[o.key]}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Not answered by the docs" description="Questions the documentation could not answer: the pages worth writing next." />
          {a.unanswered.length ? (
            <ul className="divide-y divide-gray-100 text-[13px]">
              {a.unanswered.map((u, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                  <span className="min-w-0 break-words text-gray-900">{u.question}</span>
                  <span className="text-gray-500">{formatDateTime(u.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing unanswered" />
          )}
        </Card>
        <Card>
          <CardHeader title="Most asked" />
          {a.topQuestions.length ? (
            <ol className="divide-y divide-gray-100 text-[13px]">
              {a.topQuestions.map((t) => (
                <li key={t.question} className="flex justify-between gap-2 px-4 py-2">
                  <span className="min-w-0 break-words text-gray-900">{t.question}</span>
                  <span className="tabular-nums text-gray-600">{t.count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No questions yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Answers marked not helpful" description="Check the linked pages: they may be unclear or out of date." />
          {a.notHelpful.length ? (
            <ul className="divide-y divide-gray-100 text-[13px]">
              {a.notHelpful.map((n, i) => (
                <li key={i} className="px-4 py-2">
                  <span className="block break-words text-gray-900">{n.question ?? '(not kept)'}</span>
                  <span className="block text-xs text-gray-600">{n.sources.map((s) => s.url).join(' · ') || 'no sources'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No answers marked not helpful" />
          )}
        </Card>
        <Card>
          <CardHeader title="Page feedback" description="“Was this page helpful?” on the help site." />
          {a.pages.length ? (
            <ul className="divide-y divide-gray-100 text-[13px]">
              {a.pages.map((p) => (
                <li key={p.path} className="flex justify-between gap-2 px-4 py-2">
                  <a href={p.path} className="min-w-0 break-words text-gray-900 underline">
                    {p.path}
                  </a>
                  <span className="tabular-nums text-gray-600">
                    👍 {p.helpful} · 👎 {p.notHelpful}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No page feedback yet" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="By day" />
        {a.daily.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" aria-label="Questions and cost by day">
              <thead className="bg-gray-50 text-left text-xs text-gray-700">
                <tr>
                  <th className="px-4 py-2">Day</th>
                  <th className="px-4 py-2">Questions</th>
                  <th className="px-4 py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {a.daily.map((d) => (
                  <tr key={d.day} className="border-t border-gray-100">
                    <td className="px-4 py-1.5">{d.day}</td>
                    <td className="px-4 py-1.5 tabular-nums">{d.questions}</td>
                    <td className="px-4 py-1.5 tabular-nums">{money(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No questions in this period" />
        )}
      </Card>
    </div>
  );
}
