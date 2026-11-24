import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST = 'Asia/Kolkata';

function istParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Display only. DD-Mon-YYYY; date-only values (UTC midnight) print as stored. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const dateOnly = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const p = dateOnly ? { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() } : istParts(d);
  return `${String(p.d).padStart(2, '0')}-${MONTHS[p.m - 1]}-${p.y}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const p = istParts(d);
  return `${String(p.d).padStart(2, '0')}-${MONTHS[p.m - 1]}-${p.y} ${time}`;
}

/** Display only: groups a decimal string the server already calculated. No arithmetic here. */
export function formatINR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value);
  const negative = text.startsWith('-');
  const [intRaw, fracRaw = ''] = text.replace('-', '').split('.');
  const frac = fracRaw.padEnd(2, '0').slice(0, 2);
  let grouped = intRaw;
  if (intRaw.length > 3) {
    grouped = `${intRaw.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${intRaw.slice(-3)}`;
  }
  return `${negative ? '-' : ''}${grouped}.${frac}`;
}

/** Turns SOME_STATUS into "Some Status" for display. */
export const humanize = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** A stored date as yyyy-mm-dd for a date input. Dates are stored at UTC midnight, so no zone shift. */
export const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

/** Today's date in IST as yyyy-mm-dd, for date inputs. */
export function todayIso(): string {
  const p = istParts(new Date());
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** A yyyy-mm month as Nov 2026. */
export function formatMonth(value: string): string {
  const [y, m] = value.split('-');
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : value;
}

/** First day of the current month in IST as yyyy-mm-dd. */
export const monthStartIso = () => `${todayIso().slice(0, 8)}01`;

export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
