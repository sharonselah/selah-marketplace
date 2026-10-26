import { CURRENCY_MINOR_UNIT } from '@/lib/constants/enums';
import { byId, partyName, samePartyRef } from '@/lib/selectors';
import type { Minor, PartyRef, World } from '@/types';

// Report exports: plain CSV built in the browser, so they open in Excel or Google Sheets.

export type Cell = string | number | undefined;

/** Money as plain shillings so spreadsheets can sum the column. */
export const csvMoney = (m: Minor) => m / CURRENCY_MINOR_UNIT;
/** ISO dates trimmed to a sortable "YYYY-MM-DD HH:MM". */
export const csvDate = (iso: string | undefined) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');

const escape = (c: Cell) => {
  const s = c === undefined ? '' : String(c);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(head: string[], rows: Cell[][]): string {
  return [head, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, head: string[], rows: Cell[][]) {
  // BOM so Excel reads the file as UTF-8 (names with curly quotes, KES symbols).
  const blob = new Blob(['﻿', toCsv(head, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Every money movement on one account: what sellers hand to their accountant. */
export function statementRows(w: World, ref: PartyRef): { head: string[]; rows: Cell[][] } {
  const head = ['Date', 'Description', 'Direction', 'Status', 'Amount (KES)', 'Reference'];
  const rows = w.transactions
    .filter((t) => samePartyRef(t.party, ref))
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((t) => [csvDate(t.at), t.description, t.direction, t.status, csvMoney((t.direction === 'OUT' ? -t.amount : t.amount) as Minor), 'id' in t.ref ? t.ref.id : t.ref.kind]);
  return { head, rows };
}

export const fileSlug = (w: World, ref: PartyRef) => partyName(w, ref).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const today = () => new Date().toISOString().slice(0, 10);

/** Escrow subject → short human label, for export rows. */
export function subjectLabel(w: World, s: World['escrows'][number]['subject']): string {
  if (s.kind === 'BOOKING') return byId(w.bookings, s.id)?.eventName ?? 'Booking';
  if (s.kind === 'ORDER') return byId(w.orders, s.id)?.lines.map((l) => `${l.qty}× ${l.name}`).join(', ') ?? 'Order';
  if (s.kind === 'JOB') return byId(w.campaigns, byId(w.jobs, s.id)?.campaignId)?.title ?? 'Creator job';
  return byId(w.adCampaigns, s.id)?.name ?? 'Ad campaign';
}
