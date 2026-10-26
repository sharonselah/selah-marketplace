import { CURRENCY, CURRENCY_MINOR_UNIT } from '@/lib/constants/enums';
import type { ISODate, Minor, PriceOrRange } from '@/types';

/** Shillings → integer minor units. The only way to make a Minor. */
export const kes = (shillings: number): Minor => Math.round(shillings * CURRENCY_MINOR_UNIT) as Minor;

export const addMinor = (...values: Minor[]): Minor => values.reduce((a, b) => a + b, 0) as Minor;
export const subMinor = (a: Minor, b: Minor): Minor => (a - b) as Minor;
/** Apply basis points (1000 = 10%), rounded to whole minor units. */
export const bps = (amount: Minor, basisPoints: number): Minor => Math.round((amount * basisPoints) / 10000) as Minor;
/** Basis points as a percentage label: 800 → "8%", 1250 → "12.5%". */
export const formatBps = (basisPoints: number): string => `${Number((basisPoints / 100).toFixed(2))}%`;

export function formatKES(amount: Minor, opts: { compact?: boolean } = {}): string {
  const shillings = amount / CURRENCY_MINOR_UNIT;
  if (opts.compact && Math.abs(shillings) >= 1000) {
    return `${CURRENCY} ${new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(shillings)}`;
  }
  return `${CURRENCY} ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(shillings)}`;
}

export function formatPrice(p: PriceOrRange): string {
  return p.kind === 'FIXED' ? formatKES(p.amount) : `${formatKES(p.min)} – ${formatKES(p.max)}`;
}

export const minPrice = (p: PriceOrRange): Minor => (p.kind === 'FIXED' ? p.amount : p.min);

export function formatDate(iso: ISODate, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-KE', opts).format(new Date(iso));
}

export const formatDateTime = (iso: ISODate) =>
  formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function timeAgo(iso: ISODate): string {
  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  const unit = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  if (mins < 1) return 'just now';
  return future ? `in ${unit}` : `${unit} ago`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\s/g, '');
  return digits.length > 6 ? `${digits.slice(0, 6)}•••${digits.slice(-3)}` : digits;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** 0712345678 / 712345678 / +254712345678 → +254 712 345 678 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let local: string | null = null;
  if (digits.startsWith('254') && digits.length === 12) local = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 10) local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  if (!local || !/^[17]/.test(local)) return null;
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** Client-side id for things the tester creates. */
export const newId = <P extends string>(prefix: P): `${P}_${string}` =>
  `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export const nowISO = () => new Date().toISOString();
